import type { Request, Response, NextFunction } from 'express';
import { getVerifiedSession, type SessionUser } from '../lib/auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionUser;
    }
  }
}

const isProd = process.env.NODE_ENV === 'production';

/**
 * Content-Security-Policy and the rest of the hardening headers.
 * 'unsafe-inline' on styles is required by the inline styles Framer Motion emits.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self'${isProd ? '' : " 'unsafe-inline' 'unsafe-eval'"}`,
  "connect-src 'self'",
  "frame-src 'none'",
  "manifest-src 'self'",
  'upgrade-insecure-requests'
].join('; ');

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()'
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
}

/**
 * CSRF defense-in-depth: state-changing requests must come from our own origin.
 * Cross-site forged requests carry a foreign (or missing) Origin and are rejected.
 */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host;
  const source = req.headers.origin || req.headers.referer;
  if (!host || !source) {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return;
  }
  try {
    if (new URL(source).host !== host) {
      res.status(403).json({ ok: false, error: 'forbidden' });
      return;
    }
  } catch {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return;
  }
  next();
}

/** Blocks the request unless there is a valid, non-revoked session. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await getVerifiedSession(req);
  if (!session) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }
  req.session = session;
  next();
}

/** Least privilege: restricts a route to administrators. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.role !== 'admin') {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return;
  }
  next();
}
