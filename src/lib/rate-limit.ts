// A tiny in-memory fixed-window rate limiter. No external store: it caps bursts
// per warm serverless instance, which is best-effort (each instance keeps its
// own counters and they reset on cold start), but it is enough to stop a single
// authenticated client from hammering a paid upstream in a tight loop. For hard
// global limits, back this with a shared store (e.g. Upstash) later.

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window limit: at most `limit` hits per `windowMs` for a given `key`.
 * Call once per request; a false `allowed` means reject with 429.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

// Opportunistically drop expired windows so the map cannot grow without bound
// on a long-lived instance. Cheap: only runs when asked.
export function sweepExpired(now: number = Date.now()): void {
  for (const [key, win] of buckets) {
    if (now >= win.resetAt) buckets.delete(key);
  }
}
