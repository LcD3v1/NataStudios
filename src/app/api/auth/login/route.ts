import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { getClientIp, isSameOrigin } from '@/lib/security/http';
import { rateLimit, rateLimitReset } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/security/audit';
import { verifyTotp } from '@/lib/security/totp';

export const runtime = 'nodejs';

// A valid bcrypt hash (cost 12) computed once at module load. Compared against
// when the account doesn't exist so response timing doesn't reveal whether an
// email is registered.
const DUMMY_HASH = bcrypt.hashSync('nata-studios-timing-guard', 12);

const IP_MAX_ATTEMPTS = 5;
const IP_WINDOW_MS = 15 * 60 * 1000;

// Per-account lockout — stops a distributed (many-IP) attack on one account.
const ACCOUNT_MAX_ATTEMPTS = 8;
const ACCOUNT_LOCK_MINUTES = 30;

export async function POST(request: Request) {
  // CSRF defense-in-depth.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const ip = getClientIp(request);

  // Layer 1: per-IP brute-force protection.
  const limited = rateLimit(`login:${ip}`, IP_MAX_ATTEMPTS, IP_WINDOW_MS);
  if (!limited.ok) {
    await logAudit({ action: 'login_rate_limited', ip });
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const { email, password, totp } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Layer 2: per-account lockout.
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await logAudit({ action: 'login_locked_out', actor: email, ip });
    return NextResponse.json({ ok: false, error: 'account_locked' }, { status: 423 });
  }

  // Always run a comparison (dummy hash when no user) to avoid user enumeration.
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    if (user) await registerFailure(user.id, user.failedAttempts);
    await logAudit({ action: 'login_failed', actor: email, ip });
    return NextResponse.json({ ok: false, error: 'credentials' }, { status: 401 });
  }

  // Layer 3: multi-factor, when enrolled.
  if (user.totpEnabled && user.totpSecret) {
    if (!totp) {
      // Password was correct but a second factor is required. Not an auth failure.
      return NextResponse.json({ ok: false, error: 'mfa_required' }, { status: 401 });
    }
    if (!verifyTotp(user.totpSecret, totp)) {
      await registerFailure(user.id, user.failedAttempts);
      await logAudit({ action: 'login_mfa_failed', actor: email, ip });
      return NextResponse.json({ ok: false, error: 'mfa_invalid' }, { status: 401 });
    }
  }

  // Success — clear counters and start a session bound to the current version.
  rateLimitReset(`login:${ip}`);
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null }
  });
  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    v: user.sessionVersion
  });
  await logAudit({ action: 'login_success', actor: user.email, ip, meta: { mfa: user.totpEnabled } });

  return NextResponse.json({ ok: true });
}

/** Increment the failure counter and lock the account once the threshold is hit. */
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
