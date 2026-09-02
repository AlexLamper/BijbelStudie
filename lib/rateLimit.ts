/**
 * In-memory token buckets, shared by the routes that need a courtesy limit.
 *
 * Lifted out of `app/api/analytics/route.ts`, which had the only copy. The
 * reasoning there still applies and is worth restating, because it is also the
 * limit of what this module promises:
 *
 * The state lives in the process, so it resets on deploy and is per serverless
 * instance - a caller spread across instances gets a multiple of the stated
 * budget. That is fine for what this defends: accidental floods, a stuck
 * client, and a bot cheap enough to give up. It is NOT a security control. Any
 * route whose correctness depends on a hard global limit needs a shared store,
 * and should say so at the call site rather than pretending this is one.
 *
 * No Redis dependency for a non-critical path.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Above this the map is swept of expired entries before inserting. */
const SWEEP_THRESHOLD = 10_000;

export type RateLimitRule = {
  /** Bucket namespace, so two routes cannot collide on the same key. */
  scope: string;
  /** Requests (or units of `cost`) allowed per window. */
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  limited: boolean;
  /** Units left in the current window, after this call. */
  remaining: number;
  /** When the window resets. Useful for a `Retry-After`. */
  resetAt: number;
};

/**
 * Consumes `cost` units against `rule` for `key`. Returns whether the caller
 * is over budget; when it is, nothing is consumed, so a rejected caller cannot
 * push its own reset time further out.
 */
export function consume(
  rule: RateLimitRule,
  key: string,
  cost = 1,
): RateLimitResult {
  const now = Date.now();
  const bucketKey = `${rule.scope}:${key}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || now > bucket.resetAt) {
    // A single call larger than the whole budget is refused on a fresh bucket
    // too. Checking only the second call through - which is what the original
    // copy of this in the analytics route did - lets one oversized request
    // spend more than the limit allows.
    if (cost > rule.limit) {
      return { limited: true, remaining: rule.limit, resetAt: now + rule.windowMs };
    }
    if (buckets.size > SWEEP_THRESHOLD) {
      for (const [k, v] of buckets) {
        if (now > v.resetAt) buckets.delete(k);
      }
    }
    const resetAt = now + rule.windowMs;
    buckets.set(bucketKey, { count: cost, resetAt });
    return { limited: false, remaining: Math.max(0, rule.limit - cost), resetAt };
  }

  if (bucket.count + cost > rule.limit) {
    return { limited: true, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += cost;
  return {
    limited: false,
    remaining: Math.max(0, rule.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/**
 * The caller's IP, from the proxy header Vercel sets.
 *
 * Everything behind one NAT shares a key. That is the correct trade for a
 * courtesy limit - a household or a church hall sharing an address is exactly
 * the population that should not be individually tracked - and it is another
 * reason the budgets here are generous rather than tight.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Test seam. Nothing in production should need to clear these. */
export function resetRateLimits(): void {
  buckets.clear();
}
