/**
 * Small HTTP security helpers shared by the API routes.
 */

/** Best-effort client IP from proxy headers (Vercel / nginx / Cloudflare). */
export function getClientIp(request: Request): string {
  const h = request.headers;
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return (
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * CSRF defense-in-depth for JSON/form POST endpoints: require the request's
 * Origin (or Referer) host to match the Host header. Same-Origin state-changing
 * requests pass; cross-site forged requests are rejected.
 * (Server Actions are already Origin-checked by Next.js.)
 */
export function isSameOrigin(request: Request): boolean {
  const host = request.headers.get('host');
  if (!host) return false;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const source = origin || referer;

  // No Origin/Referer on a same-site POST is unusual but not necessarily an
  // attack; be strict and reject to stay on the safe side.
  if (!source) return false;

  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}
