import "server-only";

/**
 * In-memory sliding-window rate limiter.
 *
 * Dev-grade: fine for a single-instance mill app. If the app ever runs on
 * multiple instances, swap this for a Redis-backed limiter (same API).
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

function sweep(key: string, windowMs: number, now: number): Bucket {
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  buckets.set(key, bucket);
  return bucket;
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check a limit for `key`. Window is sliding: windowMs duration, limit hits allowed.
 * Optionally `consume=false` for a peek (used before a failed login to decide auditing).
 */
export function checkRate(
  key: string,
  limit: number,
  windowMs: number,
  consume = true,
): RateResult {
  const now = Date.now();
  const bucket = sweep(key, windowMs, now);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  if (consume) {
    bucket.timestamps.push(now);
  }

  return { ok: true, remaining: limit - bucket.timestamps.length, retryAfterSeconds: 0 };
}

export function resetKey(key: string): void {
  buckets.delete(key);
}

/** Standard limits */
export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 min per key
  otp: { limit: 5, windowMs: 60 * 60 * 1000 },
  generalMutation: { limit: 120, windowMs: 60 * 60 * 1000 },
} as const;