import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { createSession, destroySession, getVerifiedSession } from '../lib/auth.js';
import { loginSchema, changePasswordSchema } from '../lib/validation.js';
import { rateLimit, rateLimitReset } from '../security/rate-limit.js';
import { logAudit, clientIp } from '../security/audit.js';
import { verifyTotp, generateTotpSecret, buildOtpAuthUri } from '../security/totp.js';
import { requireAuth, requireSameOrigin } from '../middleware/security.js';

export const authRouter = Router();

// Valid bcrypt hash compared against when the account doesn't exist, so response
// timing never reveals whether an email is registered.
const DUMMY_HASH = bcrypt.hashSync('nata-studios-timing-guard', 12);

const IP_MAX_ATTEMPTS = 5;
const IP_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_MAX_ATTEMPTS = 8;
const ACCOUNT_LOCK_MINUTES = 30;

async function registerFailure(userId: string, current: number) {
  const attempts = current + 1;
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedAttempts: attempts,
      lockedUntil:
        attempts >= ACCOUNT_MAX_ATTEMPTS
          ? new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000)
          : null
    }
  });
}

authRouter.post('/login', requireSameOrigin, async (req, res) => {
  const ip = clientIp(req);

  // Layer 1 — per-IP brute-force protection.
  const limited = rateLimit(`login:${ip}`, IP_MAX_ATTEMPTS, IP_WINDOW_MS);
  if (!limited.ok) {
    await logAudit({ action: 'login_rate_limited', ip });
    res.setHeader('Retry-After', String(limited.retryAfterSeconds));
    res.status(429).json({ ok: false, error: 'too_many_requests' });
    return;
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid' });
    return;
  }

  const { email, password, totp } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Layer 2 — per-account lockout (stops distributed, many-IP attacks).
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await logAudit({ action: 'login_locked_out', actor: email, ip });
    res.status(423).json({ ok: false, error: 'account_locked' });
    return;
  }

  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    if (user) await registerFailure(user.id, user.failedAttempts);
    await logAudit({ action: 'login_failed', actor: email, ip });
    res.status(401).json({ ok: false, error: 'credentials' });
    return;
  }

  // Layer 3 — multi-factor when enrolled.
  if (user.totpEnabled && user.totpSecret) {
    if (!totp) {
      res.status(401).json({ ok: false, error: 'mfa_required' });
      return;
    }
    if (!verifyTotp(user.totpSecret, totp)) {
      await registerFailure(user.id, user.failedAttempts);
      await logAudit({ action: 'login_mfa_failed', actor: email, ip });
      res.status(401).json({ ok: false, error: 'mfa_invalid' });
      return;
    }
  }

  rateLimitReset(`login:${ip}`);
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null }
  });
  await createSession(res, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    v: user.sessionVersion
  });
  await logAudit({ action: 'login_success', actor: user.email, ip, meta: { mfa: user.totpEnabled } });

  res.json({ ok: true });
});

authRouter.post('/logout', requireSameOrigin, async (req, res) => {
  const session = await getVerifiedSession(req);
  destroySession(res);
  if (session) await logAudit({ action: 'logout', actor: session.email, ip: clientIp(req) });
  res.json({ ok: true });
});

/** Current user — the frontend uses it to decide what to render. */
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session!.id },
    select: { email: true, name: true, role: true, totpEnabled: true, totpSecret: true }
  });
  res.json({
    ok: true,
    user: {
      email: user?.email,
      name: user?.name,
      role: user?.role,
      totpEnabled: user?.totpEnabled ?? false,
      // Only exposed while enrolling, so the user can add it to their app.
      enrollingSecret: user && !user.totpEnabled && user.totpSecret ? user.totpSecret : null,
      enrollingUri:
        user && !user.totpEnabled && user.totpSecret
          ? buildOtpAuthUri(user.totpSecret, user.email)
          : null
    }
  });
});

/* ------------------------- MFA ------------------------- */

authRouter.post('/mfa/start', requireSameOrigin, requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.session!.id },
    data: { totpSecret: generateTotpSecret(), totpEnabled: false }
  });
  res.json({ ok: true });
});

authRouter.post('/mfa/confirm', requireSameOrigin, requireAuth, async (req, res) => {
  const code = String(req.body?.code ?? '').trim();
  const user = await prisma.user.findUnique({ where: { id: req.session!.id } });
  if (!user?.totpSecret) {
    res.status(400).json({ ok: false, error: 'sem_segredo' });
    return;
  }
  if (!verifyTotp(user.totpSecret, code)) {
    res.status(400).json({ ok: false, error: 'codigo_invalido' });
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
  await logAudit({ action: 'mfa_enabled', actor: user.email, ip: clientIp(req) });
  res.json({ ok: true });
});

/** Disabling MFA requires the password (step-up authentication). */
authRouter.post('/mfa/disable', requireSameOrigin, requireAuth, async (req, res) => {
  const password = String(req.body?.password ?? '');
  const user = await prisma.user.findUnique({ where: { id: req.session!.id } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(400).json({ ok: false, error: 'senha_invalida' });
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null }
  });
  await logAudit({ action: 'mfa_disabled', actor: user.email, ip: clientIp(req) });
  res.json({ ok: true });
});

/* ------------------- sessions & password ------------------- */

authRouter.post('/sessions/revoke', requireSameOrigin, requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.session!.id },
    data: { sessionVersion: { increment: 1 } }
  });
  await logAudit({ action: 'sessions_revoked', actor: req.session!.email, ip: clientIp(req) });
  destroySession(res);
  res.json({ ok: true });
});

authRouter.post('/password', requireSameOrigin, requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'senha_curta' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.session!.id } });
  if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    res.status(400).json({ ok: false, error: 'senha_atual_invalida' });
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.next, 12),
      // Changing the password logs out every other device.
      sessionVersion: { increment: 1 }
    }
  });
  await logAudit({ action: 'password_changed', actor: user.email, ip: clientIp(req) });
  destroySession(res);
  res.json({ ok: true });
});
