/**
 * Shared plumbing for app/api/v1/bible-year/** - one error shape for every
 * handler (`{error, message}`, message in Dutch where the reader may see it)
 * and a per-account throttle on the mutating routes.
 */

import { errorV1, handleV1Error } from '../apiV1';
import { checkRateLimit } from '../mobileRateLimit';
import { BibleYearError } from './service';

export function bibleYearErrorResponse(error: unknown) {
  if (error instanceof BibleYearError) return errorV1(error.code, error.status, error.message);
  return handleV1Error(error);
}

/**
 * Null when allowed, else the 429. Per account rather than per IP: a family
 * behind one router should not throttle each other. Generous enough for
 * ticking a whole week of backlog chapter by chapter.
 */
export function bibleYearRateLimit(userId: string, bucket: 'write' | 'mark') {
  const limit = bucket === 'mark' ? 120 : 20;
  const result = checkRateLimit(`bible-year:${bucket}:${userId}`, limit, 60);
  if (result.allowed) return null;
  return errorV1('RATE_LIMITED', 429, `Probeer het over ${result.retryAfterSeconds}s opnieuw.`);
}
