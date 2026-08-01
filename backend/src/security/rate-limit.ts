/**
 * In-memory sliding-window rate limiter.
 * Fine for a single instance; back it with Redis if the app is ever scaled out.
 */
type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

let sweeper: ReturnType<typeof setInterval> | null = null;
function ensureSweeper() {
  if (sweeper) return;
  sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, hit] of buckets) if (hit.resetAt <= now) buckets.delete(key);
  }, 60_000);
  sweeper.unref?.();
}

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

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

export function rateLimitReset(key: string) {
  buckets.delete(key);
}
