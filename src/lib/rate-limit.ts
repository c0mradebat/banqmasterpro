import "server-only";

/**
 * Simple in-memory sliding-window rate limiter. Suitable for single-instance deployments —
 * for multi-instance, replace the Map with a Redis-backed implementation behind the same API.
 */
type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the next slot frees up. 0 if `ok` is true. */
  retryAfter: number;
  remaining: number;
};

/**
 * @param key  Stable identifier (e.g. `login:<username>` or `login:ip:<addr>`).
 * @param limit  Max hits allowed in the window.
 * @param windowMs  Window size in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { ok: false, retryAfter, remaining: 0 };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, retryAfter: 0, remaining: limit - bucket.hits.length };
}

/** Manually reset a bucket — used after a successful login so subsequent attempts aren't penalised. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Background sweep so the Map doesn't grow unbounded. Call rarely. */
export function sweepRateLimitBuckets(maxAgeMs = 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [key, b] of buckets) {
    if (b.hits.length === 0 || b.hits[b.hits.length - 1] < cutoff) {
      buckets.delete(key);
    }
  }
}
