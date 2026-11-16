/**
 * Server-side half of the copy limit for licensed translations (the client
 * half, and the list of which translations it applies to, is
 * lib/bibleCopyPolicy.ts).
 *
 * A licensed translation (HSV, NBG51 is not on the list - see there) leaves the
 * server one chapter at a time, and only to a reader:
 *
 *   - never into a shared cache. A public CDN copy would answer the next
 *     request without this code running, so the throttle below would never
 *     see it, and the text would sit on an edge node we do not control.
 *     `private` lets the reader's own browser keep it for an hour.
 *   - never into a search index (`X-Robots-Tag`).
 *   - at a reader's pace. A person reads a handful of chapters in a sitting;
 *     a scraper walking 1,189 chapters needs hundreds per hour. Per IP, per
 *     instance (see lib/rateLimit.ts), so it is a speed bump rather than a
 *     wall - the wall is that there is no whole-book or whole-version endpoint
 *     and the files never sit under /public.
 */
import { consume, clientIp, type RateLimitRule } from './rateLimit';
import { isCopyRestricted } from './bibleCopyPolicy';

export const RESTRICTED_TEXT_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, max-age=3600',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
};

/** Generous for a reader, hopeless for a scraper. */
export const RESTRICTED_CHAPTERS_PER_HOUR: RateLimitRule = {
  scope: 'restricted-chapter-hour',
  limit: 150,
  windowMs: 60 * 60 * 1000,
};

export const RESTRICTED_CHAPTERS_PER_DAY: RateLimitRule = {
  scope: 'restricted-chapter-day',
  limit: 600,
  windowMs: 24 * 60 * 60 * 1000,
};

/** Search hits a restricted translation may return per query (default is 50, max 200). */
export const RESTRICTED_SEARCH_MAX_HITS = 20;

/**
 * Spends one unit of the restricted-chapter budget for this caller. Returns
 * null when the request may proceed (also for every unrestricted translation),
 * or the seconds to wait when it may not.
 */
export function restrictedChapterThrottle(req: Request, versionId: string | null | undefined): number | null {
  if (!isCopyRestricted(versionId)) return null;
  const ip = clientIp(req);
  const hour = consume(RESTRICTED_CHAPTERS_PER_HOUR, ip);
  if (hour.limited) return Math.max(1, Math.ceil((hour.resetAt - Date.now()) / 1000));
  const day = consume(RESTRICTED_CHAPTERS_PER_DAY, ip);
  if (day.limited) return Math.max(1, Math.ceil((day.resetAt - Date.now()) / 1000));
  return null;
}

/** Copies the restricted-text headers onto a response, in place. */
export function applyRestrictedTextHeaders<T extends { headers: Headers }>(res: T): T {
  for (const [key, value] of Object.entries(RESTRICTED_TEXT_HEADERS)) res.headers.set(key, value);
  return res;
}
