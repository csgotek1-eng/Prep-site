/**
 * Minimal rate limiting for the quote endpoint.
 *
 * The default implementation keeps a sliding window of timestamps per key
 * in process memory. That is intentionally simple: it protects a single
 * server (or a single warm serverless instance) from bursts, but state is
 * not shared across instances and resets on cold starts. If real abuse
 * shows up in production, implement the same RateLimiter interface backed
 * by a shared store (e.g. Upstash Redis) and swap it in here — the API
 * route does not need to change.
 */

export interface RateLimiter {
  /** Returns true if the request identified by `key` is allowed. */
  allow(key: string): boolean;
}

export function createMemoryRateLimiter(options: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const { limit, windowMs } = options;
  const hits = new Map<string, number[]>();

  return {
    allow(key: string): boolean {
      const now = Date.now();
      const cutoff = now - windowMs;

      const recent = (hits.get(key) ?? []).filter((time) => time > cutoff);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }

      recent.push(now);
      hits.set(key, recent);

      // Opportunistic cleanup so the map cannot grow without bound.
      if (hits.size > 10000) {
        for (const [otherKey, times] of hits) {
          if (times.every((time) => time <= cutoff)) {
            hits.delete(otherKey);
          }
        }
      }

      return true;
    },
  };
}
