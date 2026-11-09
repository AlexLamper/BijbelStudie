import connectMongoDB from './mongodb';
import StudyLessonState from '../models/StudyLessonState.js';
import StudyProgress from '../models/StudyProgress.js';
import { personalLimitReason, type Limits } from './entitlements';
import { allowanceKey, claimAllowance } from './reverseTrial';
import { upsertLessonState } from './lessonStateWrite';

/**
 * The personal studies limit (lib/entitlements.ts TINY_LESSONS_PER_DAY): may
 * this reader open this lesson?
 *
 * The rule, exactly:
 *  - Pro, and every free account whose personal limit is not studies: always.
 *  - A lesson the reader has already begun (it has a lesson state, on any
 *    day) or finished (it has a StudyProgress row): always. A lesson is never
 *    cut off half-way, and a finished one can be reread.
 *  - Any other lesson is NEW: it takes one of today's slots (Amsterdam day,
 *    website and app together, the same lesson twice in a day is one slot).
 *    The first new lesson of the day is allowed and is marked begun at once,
 *    so finishing it tomorrow is "a lesson already begun". The second is not.
 *
 * One place, used by every route that serves or writes a lesson: the app's
 * /api/v1/studies/:id/lessons/:day and /api/v1/chapter-study, the website's
 * /studie pages, and the lesson-state and quiz writes behind both.
 */
export interface LessonAccess {
  allowed: boolean;
  /** New lessons begun today, this one included when allowed (personal limit only). */
  used?: number;
  cap?: number;
  message?: string;
}

export interface LessonReader {
  id: string;
  isPro: boolean;
  limits?: Pick<Limits, 'lessonsPerDay'> | null;
}

export async function lessonAccess(
  reader: LessonReader | null | undefined,
  studyId: string,
  lessonDay: number,
): Promise<LessonAccess> {
  if (!reader?.id || reader.isPro) return { allowed: true };
  const cap = reader.limits?.lessonsPerDay ?? null;
  if (cap === null) return { allowed: true };

  await connectMongoDB();
  const key = { userId: reader.id, studyId, lessonDay };
  const begun = (await StudyLessonState.exists(key)) || (await StudyProgress.exists(key));
  if (begun) return { allowed: true };

  const claim = await claimAllowance(reader.id, 'studies', allowanceKey('lesson', studyId, lessonDay), cap);
  if (!claim.allowed) {
    return { allowed: false, used: claim.used, cap: claim.cap, message: personalLimitReason('studies') };
  }
  // Begun from now on: tomorrow it is finished, not started.
  await upsertLessonState(key, { $setOnInsert: { ...key, startedAt: new Date() } });
  return { allowed: true };
}

/** The v1 refusal body: a code the app knows, the reason in words. */
export function lessonRefusal(access: LessonAccess) {
  return {
    error: 'PERSONAL_LIMIT',
    feature: 'studies' as const,
    message: access.message ?? personalLimitReason('studies'),
    used: access.used ?? 0,
    cap: access.cap ?? 0,
  };
}
