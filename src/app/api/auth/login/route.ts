import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { getClientIp, isSameOrigin } from '@/lib/security/http';
import { rateLimit, rateLimitReset } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/security/audit';

export const runtime = 'nodejs';

// A valid bcrypt hash (cost 12) computed once at module load. Compared against
// when the account doesn't exist so response timing doesn't reveal whether an
// email is registered.
const DUMMY_HASH = bcrypt.hashSync('nata-studios-timing-guard', 12);

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min

export async function POST(request: Request) {
  // CSRF defense-in-depth.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const ip = getClientIp(request);

  // Brute-force protection (per IP).
  const limited = rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
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

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always run a comparison (dummy hash when no user) to avoid user enumeration.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    await logAudit({ action: 'login_failed', actor: email, ip });
    return NextResponse.json({ ok: false, error: 'credentials' }, { status: 401 });
  }

  // Success — clear the attempt counter and start a session.
  rateLimitReset(`login:${ip}`);
  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  await logAudit({ action: 'login_success', actor: user.email, ip });

  return NextResponse.json({ ok: true });
}
