/**
 * Fixed-window, per-key request limiter held in process memory.
 *
 * LIMITATION: on serverless platforms each instance has its own memory, so the
 * effective limit is per instance, not global. It still bounds burst abuse
 * from a single client hitting a warm instance, and — more importantly —
 * upstream traffic is bounded independently by the per-source cache and
 * single-flight logic in aggregate.ts. For a global limit, add a platform
 * rule (e.g. a Vercel Firewall rate-limit rule on /api/*) or a shared store.
 */
export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Cap on tracked keys so memory stays bounded under IP spraying. */
  maxKeys?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function createRateLimiter({ limit, windowMs, maxKeys = 10_000 }: RateLimiterOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string, now = Date.now()): RateLimitDecision {
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (!entry && hits.size >= maxKeys) {
        // Evict expired entries first, then the oldest key.
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
        if (hits.size >= maxKeys) {
          const oldest = hits.keys().next().value;
          if (oldest !== undefined) hits.delete(oldest);
        }
      }
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    const allowed = entry.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  };
}

/** Best-effort client identifier from proxy headers (Vercel sets x-forwarded-for). */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip')?.trim() || 'unknown';
}
