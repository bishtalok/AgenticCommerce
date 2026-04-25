/**
 * Simple in-process sliding-window rate limiter.
 * Adequate for a single-instance prototype. Swap for Upstash/Redis at scale.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

const DEFAULT_MAX = Number(process.env.RATE_LIMIT_MAX_PER_MIN ?? "30");

export function rateLimit(
  key: string,
  max: number = DEFAULT_MAX
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1, resetMs: WINDOW_MS };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: WINDOW_MS - (now - existing.windowStart),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, max - existing.count),
    resetMs: WINDOW_MS - (now - existing.windowStart),
  };
}

/** Test helper — reset the in-memory buckets. */
export function __resetRateLimit(): void {
  buckets.clear();
}
