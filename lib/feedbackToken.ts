/**
 * A short-lived signature binding "this prompt was served to this user".
 *
 * Same reasoning as `app/api/v1/study-quiz/route.ts`, which only grades
 * questions it actually served: without a token a client can post an answer to
 * a prompt it was never shown, which silently poisons the response-rate
 * denominator - the one number that says whether this whole system is working.
 *
 * It is a signature, not a session: it carries no secret, it is useless after
 * its window, and it says nothing the holder does not already know. The secret
 * is NEXTAUTH_SECRET, which every deployment already has.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/** How long a served prompt stays answerable. One reading session, generously. */
export const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET ?? process.env.MOBILE_JWT_SECRET ?? '';
  if (!value) {
    // Failing closed here would make every prompt unanswerable on a
    // misconfigured deployment; failing open would accept unsigned answers.
    // Neither is acceptable silently, so the caller is told.
    throw new Error('feedbackToken: NEXTAUTH_SECRET is not set');
  }
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/**
 * `<issuedAt>.<signature>`. The user, the prompt and what it was about are all
 * inside the signature rather than the token, so a token cannot be edited into
 * one for a different lesson.
 */
export function issueToken(
  userId: string,
  promptId: string,
  context: { studyId?: string | null; lessonDay?: number | null } = {},
  now: Date = new Date(),
): string {
  const issuedAt = now.getTime();
  const payload = [userId, promptId, context.studyId ?? '', context.lessonDay ?? '', issuedAt].join('|');
  return `${issuedAt}.${sign(payload)}`;
}

export function verifyToken(
  token: unknown,
  userId: string,
  promptId: string,
  context: { studyId?: string | null; lessonDay?: number | null } = {},
  now: Date = new Date(),
): boolean {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [issuedRaw, signature] = token.split('.', 2);
  const issuedAt = Number(issuedRaw);
  if (!Number.isFinite(issuedAt)) return false;
  if (now.getTime() - issuedAt > TOKEN_TTL_MS) return false;
  // A token from the future is a clock problem or a forgery; either way it is
  // not one we issued in a state we can reason about.
  if (issuedAt - now.getTime() > 60_000) return false;

  const payload = [userId, promptId, context.studyId ?? '', context.lessonDay ?? '', issuedAt].join('|');
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
