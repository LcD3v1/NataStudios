import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { SESSION_COOKIE } from './session-config';

export { SESSION_COOKIE };
const MAX_AGE = 60 * 60 * 8; // 8 hours — short-lived sessions limit token theft impact

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  /** Must match the user's current sessionVersion in the DB, else the session is revoked. */
  v: number;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too weak (need >= 32 chars). Generate one with: openssl rand -base64 48'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE
  });
}

/**
 * Decode + verify the session cookie. This only proves the token is well-formed
 * and unexpired — it does NOT check revocation. Use `getVerifiedSession()` for
 * anything that grants access.
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      role: String(payload.role),
      v: Number(payload.v ?? 0)
    };
  } catch {
    return null;
  }
}

/**
 * Zero-Trust session check: validates the token AND confirms against the database
 * that the user still exists and the session hasn't been revoked (sessionVersion).
 * Prefer this everywhere access is granted.
 */
export async function getVerifiedSession(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;

  // Imported lazily so the Edge middleware can import this module's siblings
  // without pulling in Prisma.
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, name: true, role: true, sessionVersion: true }
  });

  if (!user || user.sessionVersion !== session.v) return null;

  // Always return the DB's copy — role changes take effect immediately.
  return { id: user.id, email: user.email, name: user.name, role: user.role, v: user.sessionVersion };
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
