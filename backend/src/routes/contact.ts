import { Router } from 'express';
import { Resend } from 'resend';
import { prisma } from '../lib/prisma.js';
import { contactSchema } from '../lib/validation.js';
import { rateLimit } from '../security/rate-limit.js';
import { logAudit, clientIp } from '../security/audit.js';
import { requireSameOrigin } from '../middleware/security.js';

export const contactRouter = Router();

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

/** Minimal HTML escaping so user input can't break the email markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

contactRouter.post('/', requireSameOrigin, async (req, res) => {
  const ip = clientIp(req);
  const limited = rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000);
  if (!limited.ok) {
    res.setHeader('Retry-After', String(limited.retryAfterSeconds));
    res.status(429).json({ ok: false, error: 'too_many_requests' });
    return;
  }

  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'invalid' });
    return;
  }

  const { name, email, phone, message, company } = parsed.data;

  // Honeypot filled → pretend success, drop silently.
  if (company) {
    res.json({ ok: true });
    return;
  }

  // 1) Persist the lead — this is the part that must succeed.
  try {
    await prisma.lead.create({
      data: { name, email, phone: phone || null, message, source: 'website', status: 'new' }
    });
  } catch (err) {
    console.error('[contact] DB error', err);
    res.status(500).json({ ok: false, error: 'server' });
    return;
  }

  await logAudit({ action: 'contact_submitted', actor: email, ip });

  // 2) Best-effort email notification.
  const client = getResend();
  const to = process.env.CONTACT_TO_EMAIL;
  if (client && to) {
    try {
      await client.emails.send({
        from: process.env.RESEND_FROM ?? 'NATA STUDIOS <onboarding@resend.dev>',
        to,
        replyTo: email,
        subject: `Novo contato: ${name}`,
        text: `Nome: ${name}\nE-mail: ${email}${phone ? `\nTelefone: ${phone}` : ''}\n\n${message}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111">
            <h2 style="margin:0 0 12px">Novo contato pelo site</h2>
            <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
            <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
            ${phone ? `<p><strong>Telefone:</strong> ${escapeHtml(phone)}</p>` : ''}
            <p><strong>Mensagem:</strong></p>
            <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
          </div>`
      });
    } catch (err) {
      console.error('[contact] email error (lead still saved)', err);
    }
  }

  res.json({ ok: true });
});
