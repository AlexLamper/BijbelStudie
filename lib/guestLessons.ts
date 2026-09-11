/**
 * The guest's lesson progress, and how it becomes account progress.
 *
 * A visitor can run a whole lesson without an account: every write the flow
 * would have sent to /api/v1/study-lesson-state is kept in localStorage
 * instead, one entry per lesson (see components/study/flow/StudyFlowShell.tsx).
 * Phase 1 stopped there - signing up afterwards started the lesson clean on the
 * server and the guest entry was simply never read again, so the reader lost
 * the lesson they had just finished at the exact moment they did what we asked
 * them to do.
 *
 * This module is phase 2: the reading side of those entries, plus the replay
 * that turns them into real progress.
 *
 * THE REPLAY GOES THROUGH THE NORMAL ENDPOINTS, from the client, one lesson at
 * a time. There is no bulk import route. That is deliberate:
 *
 * - XP, streak, badges, the enrollment cursor and the reflection-to-note
 *   promotion all hang off `recordLessonCompletion` in lib/studyCompletion. A
 *   second server path into the ledger would be a second place to get that
 *   wrong, and the ledger is the one thing this app cannot repair after the
 *   fact (see models/DeletedAccount.js for what that costs).
 * - `recordLessonCompletion` already refuses to pay twice (ALREADY_RECORDED),
 *   so a replay of a lesson the account somehow has is harmless.
 * - An entry is only cleared once its own replay succeeded, so a tab closed
 *   mid-replay just means the rest happens on the next page load.
 *
 * The cost is one request per lesson step, at sign-in, for a guest who ran at
 * most a handful of lessons - which is why MAX_LESSONS exists.
 */

/** Prefix of every guest lesson entry. `bijbelstudie_guest_lesson_<studyId>_<day>`. */
export const GUEST_LESSON_PREFIX = 'bijbelstudie_guest_lesson_';

/**
 * How many guest lessons one sign-in will replay.
 *
 * Active CPU on Vercel is a standing constraint, and every lesson here is a
 * completion write with a ledger claim behind it. A guest who somehow has more
 * than this keeps the newest ones (they are the ones they remember running);
 * the rest are dropped rather than queued, because a replay that never ends is
 * worse than a lesson that has to be redone.
 */
export const MAX_LESSONS = 12;

export function guestLessonKey(studyId: string, lessonDay: number): string {
  return `${GUEST_LESSON_PREFIX}${studyId}_${lessonDay}`;
}

export interface GuestLessonState {
  currentStep?: string;
  stepsCompleted?: string[];
  viewTranslation?: string | null;
  depthPanel?: string | null;
  reflectionText?: string;
  completedAt?: string | null;
}

export interface GuestLesson extends GuestLessonState {
  /** The localStorage key this came from, so a successful replay can clear it. */
  key: string;
  studyId: string;
  lessonDay: number;
}

/**
 * Splits a key back into its study id and day.
 *
 * A study id may itself contain underscores, so the day is taken from the LAST
 * underscore and the id is everything before it. Anything that does not end in
 * a positive integer is not one of ours.
 */
export function parseGuestLessonKey(key: string): { studyId: string; lessonDay: number } | null {
  if (!key.startsWith(GUEST_LESSON_PREFIX)) return null;
  const rest = key.slice(GUEST_LESSON_PREFIX.length);
  const cut = rest.lastIndexOf('_');
  if (cut <= 0) return null;
  const studyId = rest.slice(0, cut);
  const lessonDay = Number(rest.slice(cut + 1));
  if (!studyId || !Number.isInteger(lessonDay) || lessonDay < 1) return null;
  return { studyId, lessonDay };
}

/** One entry, or null when it is missing, unparseable or not an object. */
export function readGuestLesson(key: string): GuestLessonState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestLessonState;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Applies one `patch` body to a stored guest entry, the way the API would. */
export function writeGuestLesson(key: string, body: Record<string, unknown>): void {
  try {
    const current = readGuestLesson(key) ?? {};
    const next: GuestLessonState = { ...current };
    if (typeof body.currentStep === 'string') next.currentStep = body.currentStep;
    if (typeof body.completeStep === 'string') {
      const done = new Set(current.stepsCompleted ?? []);
      done.add(body.completeStep);
      next.stepsCompleted = [...done];
    }
    if ('viewTranslation' in body) next.viewTranslation = (body.viewTranslation as string | null) ?? null;
    if ('depthPanel' in body) next.depthPanel = (body.depthPanel as string | null) ?? null;
    if (typeof body.reflectionText === 'string') next.reflectionText = body.reflectionText;
    if (body.complete === true) next.completedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* private mode: the step still happens, it is just not remembered */
  }
}

/**
 * Every guest lesson in this browser, finished ones first and newest first
 * inside each group, capped at MAX_LESSONS.
 *
 * Finished first because a finished lesson is what the reader will look for
 * after signing up: it carries XP, a streak day and possibly a note. An
 * unfinished one only carries a cursor.
 */
export function listGuestLessons(): GuestLesson[] {
  const found: GuestLesson[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      const parsed = parseGuestLessonKey(key);
      if (!parsed) continue;
      const state = readGuestLesson(key);
      if (!state) continue;
      found.push({ key, ...parsed, ...state });
    }
  } catch {
    return [];
  }

  const rank = (lesson: GuestLesson) => (lesson.completedAt ? 0 : 1);
  const at = (lesson: GuestLesson) => Date.parse(lesson.completedAt ?? '') || 0;
  found.sort((a, b) => rank(a) - rank(b) || at(b) - at(a) || a.lessonDay - b.lessonDay);
  return found.slice(0, MAX_LESSONS);
}

export function clearGuestLesson(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to do: the replay already happened server-side */
  }
}

/** What `migrateGuestLessons` did, for the caller to report or log. */
export interface MigrationResult {
  /** Lessons whose replay finished and whose local entry is gone. */
  migrated: number;
  /** Lessons that were replayed and counted as finished on the server. */
  completed: number;
  /** Lessons left in localStorage because their replay failed. Retried later. */
  failed: number;
}

async function patchLessonState(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/study-lesson-state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Replays this browser's guest lessons onto the signed-in account.
 *
 * Order per lesson: start the study (idempotent), write the reflection draft,
 * mark each completed step, then finish it if the guest finished it. `complete`
 * is what pays XP and moves the enrollment cursor, so it goes last and only
 * when the guest actually got there.
 *
 * Never throws. A lesson whose replay fails keeps its localStorage entry and is
 * tried again the next time this runs.
 */
export async function migrateGuestLessons(
  steps: readonly string[],
): Promise<MigrationResult> {
  const lessons = listGuestLessons();
  const result: MigrationResult = { migrated: 0, completed: 0, failed: 0 };
  if (lessons.length === 0) return result;

  for (const lesson of lessons) {
    const base = { studyId: lesson.studyId, lessonDay: lesson.lessonDay };
    let ok = true;

    try {
      // Enrolling is what makes the study appear on the dashboard at all. It
      // upserts, so a reader who already started this study keeps their own
      // settings - createEnrollment only fills in what is missing.
      const enrolled = await fetch('/api/v1/study-enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyId: lesson.studyId,
          reminderTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      // A 404 means the study no longer exists: nothing to replay, and keeping
      // the entry would retry it forever.
      if (enrolled.status === 404) {
        clearGuestLesson(lesson.key);
        continue;
      }
      if (!enrolled.ok) ok = false;
    } catch {
      ok = false;
    }

    if (ok && lesson.reflectionText?.trim()) {
      ok = await patchLessonState({ ...base, reflectionText: lesson.reflectionText });
    }

    if (ok) {
      const done = (lesson.stepsCompleted ?? []).filter((step) => steps.includes(step));
      for (const step of done) {
        ok = await patchLessonState({ ...base, completeStep: step });
        if (!ok) break;
      }
    }

    if (ok && !lesson.completedAt && lesson.currentStep && steps.includes(lesson.currentStep)) {
      ok = await patchLessonState({ ...base, currentStep: lesson.currentStep });
    }

    if (ok && lesson.completedAt) {
      ok = await patchLessonState({ ...base, complete: true });
      if (ok) result.completed += 1;
    }

    if (ok) {
      clearGuestLesson(lesson.key);
      result.migrated += 1;
    } else {
      result.failed += 1;
    }
  }

  return result;
}
