export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSec: number };

export type RateLimiter = {
  check(key: string): RateLimitResult;
  size(): number;
};

/** Fixed-window in-memory limiter. Per process: fine for a single instance, a sane floor for several. */
export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
  maxKeys?: number;
}): RateLimiter {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? 10_000;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const prune = (t: number) => {
    for (const [key, b] of buckets) if (b.resetAt <= t) buckets.delete(key);
    while (buckets.size > maxKeys) {
      const oldest = buckets.keys().next().value;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
  };

  return {
    check(key) {
      const t = now();
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= t) {
        if (buckets.size >= maxKeys) prune(t);
        bucket = { count: 0, resetAt: t + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      const allowed = bucket.count <= limit;
      return {
        allowed,
        remaining: Math.max(0, limit - bucket.count),
        retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt - t) / 1000)),
      };
    },
    size: () => buckets.size,
  };
}

/** Best-effort client address behind a reverse proxy (Caddy sets X-Forwarded-For). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
