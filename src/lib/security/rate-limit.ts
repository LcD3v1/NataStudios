/**
 * In-memory sliding-window rate limiter.
 *
 * Good enough for a single-instance deployment (self-hosted / one Node process).
 * For serverless or multi-instance, back this with Redis / Upstash — see
 * docs/SECURITY.md. The API below stays the same, so only this file changes.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Periodically drop expired buckets so the map can't grow unbounded.
let sweeper: ReturnType<typeof setInterval> | null = null;
function ensureSweeper() {
  if (sweeper) return;
  sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, hit] of buckets) if (hit.resetAt <= now) buckets.delete(key);
  }, 60_000);
  // Don't keep the event loop alive just for the sweeper.
  if (typeof sweeper === 'object' && 'unref' in sweeper) sweeper.unref();
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * @param key     Unique identifier for the caller (e.g. `login:<ip>`).
 * @param limit   Max requests allowed within the window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  ensureSweeper();
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  hit.count += 1;
  if (hit.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((hit.resetAt - now) / 1000))
    };
  }

  return { ok: true, remaining: limit - hit.count, retryAfterSeconds: 0 };
}

/** Clear a bucket early (e.g. reset login attempts after a successful login). */
export function rateLimitReset(key: string) {
  buckets.delete(key);
}
