import { NextResponse } from 'next/server';
import { contactSchema } from '@/lib/validation';
import { getResend, emailConfig, escapeHtml } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { getClientIp, isSameOrigin } from '@/lib/security/http';
import { rateLimit } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/security/audit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const ip = getClientIp(request);
  const limited = rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000); // 5 / 10min
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: 'too_many_requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.message);
    return NextResponse.json({ ok: false, error: 'invalid', fields }, { status: 422 });
  }

  const { name, email, phone, message, company } = parsed.data;

  // Honeypot filled → pretend success, drop silently.
  if (company) return NextResponse.json({ ok: true });

  // 1) Persist the lead — this is the part that must succeed.
  try {
    await prisma.lead.create({
      data: {
        name,
        email,
        phone: phone || null,
        message,
        source: 'website',
        status: 'new'
      }
    });
  } catch (err) {
    console.error('[contact] DB error', err);
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }

  await logAudit({ action: 'contact_submitted', actor: email, ip });

  // 2) Best-effort email notification (skipped silently if Resend isn't configured).
  const resend = getResend();
  if (resend && emailConfig.to) {
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111">
        <h2 style="margin:0 0 12px">Novo contato pelo site</h2>
        <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
        ${phone ? `<p><strong>WhatsApp/Telefone:</strong> ${escapeHtml(phone)}</p>` : ''}
        <p><strong>Mensagem:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>`;
    try {
      await resend.emails.send({
        from: emailConfig.from,
        to: emailConfig.to,
        replyTo: email,
        subject: `Novo contato: ${name}`,
        text: `Nome: ${name}\nE-mail: ${email}${phone ? `\nTelefone: ${phone}` : ''}\n\n${message}`,
        html
      });
    } catch (err) {
      console.error('[contact] email error (lead still saved)', err);
    }
  }

  return NextResponse.json({ ok: true });
}
