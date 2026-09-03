import StudyLessonState from '../models/StudyLessonState.js';

/**
 * The one safe way to write a lesson-state document.
 *
 * `studylessonstate` has a unique index on `{userId, studyId, lessonDay}` and
 * every writer reaches it through an upsert. MongoDB does not serialise
 * concurrent upserts against a unique index: when two of them find no document
 * and both proceed to insert, the loser gets `E11000 duplicate key`. That is a
 * documented behaviour of upsert, not a bug in the query.
 *
 * The flow makes those pairs constantly. Opening the quiz step fires
 * `PATCH /api/v1/study-lesson-state {currentStep:'quiz'}` from StudyFlowShell
 * without awaiting it, while StepQuiz mounts and calls
 * `GET /api/v1/study-quiz`, which upserts the same document. On a lesson opened
 * for the first time those two race on every single reader, and the loser threw
 * - `handleV1Error` has no branch for E11000, so it fell through to a 500.
 * Same shape for the reflection autosave landing at the same moment as
 * "Volgende", and for the mount cursor write plus a fast first click.
 *
 * The retry is correct rather than merely hopeful: E11000 here means the other
 * writer's insert succeeded, so the document now exists and the same update
 * applies cleanly without `upsert`. `$setOnInsert` is dropped on the retry
 * because the insert it described has already happened - keeping it would be
 * harmless (Mongo ignores it on an update) but the intent is clearer without.
 *
 * Retried exactly once. A second E11000 cannot be caused by this race, and a
 * silent retry loop would hide a real index problem.
 */
function isDuplicateKey(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  if (code === 11000) return true;
  // Bulk-write shapes report it one level down.
  const writeErrors = (error as { writeErrors?: { code?: unknown }[] }).writeErrors;
  return Array.isArray(writeErrors) && writeErrors.some((entry) => entry?.code === 11000);
}

export interface LessonStateKey {
  userId: string;
  studyId: string;
  lessonDay: number;
}

export async function upsertLessonState(
  key: LessonStateKey,
  update: Record<string, unknown>,
): Promise<void> {
  try {
    await StudyLessonState.updateOne(key, update, { upsert: true });
    return;
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }

  const rest = { ...update };
  delete rest.$setOnInsert;

  // An upsert that only carried `$setOnInsert` has nothing left to do: the
  // document the caller wanted to exist now does.
  if (Object.keys(rest).length === 0) return;

  await StudyLessonState.updateOne(key, rest);
}
