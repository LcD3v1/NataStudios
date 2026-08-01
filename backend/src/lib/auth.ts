import type { Request, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma.js';

export const SESSION_COOKIE = 'nata_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8h — short sessions limit token-theft impact

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  /** Must match the user's sessionVersion in the DB, else the session is revoked. */
  v: number;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET ausente ou fraco (mínimo 32 caracteres). Gere com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(res: Response, user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS * 1000
  });
}

export function destroySession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** Verifies the cookie signature only — does NOT check revocation. */
export async function readSession(req: Request): Promise<SessionUser | null> {
  const token = req.cookies?.[SESSION_COOKIE];
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
 * Zero-Trust check: validates the token AND confirms against the database that
 * the user still exists and the session wasn't revoked (sessionVersion).
 */
export async function getVerifiedSession(req: Request): Promise<SessionUser | null> {
  const session = await readSession(req);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, name: true, role: true, sessionVersion: true }
  });
  if (!user || user.sessionVersion !== session.v) return null;

  // Return the DB copy so role changes take effect immediately.
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    v: user.sessionVersion
  };
}
