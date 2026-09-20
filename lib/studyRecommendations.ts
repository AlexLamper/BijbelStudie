/**
 * Which studies may still be recommended to someone.
 *
 * The candidate list is static content (`lib/data/curated-studies.ts`), so there
 * is nothing to query for it; the only per-user signal is the enrolment list the
 * dashboard already fetches once from `/api/v1/study-enrollments`. Both helpers
 * here are pure so that filtering costs one pass over an array the client
 * already holds - no second request, no per-study query.
 *
 * "Finished" is the enrolment's own signal (models/StudyEnrollment.js):
 * `status: 'completed'`, written together with `completedAt` by
 * `syncEnrollmentAfterLesson` once every lesson has a StudyProgress row. Either
 * field counts, so an older row that only has one of the two is still treated as
 * finished.
 */

/** The fields of a serialised enrolment that say "this study is finished". */
export interface CompletionSignal {
  studyId: string;
  status?: string | null;
  completedAt?: string | Date | null;
}

/** The ids of every study this user has finished. */
export function completedStudyIds(
  enrollments: readonly CompletionSignal[] | null | undefined,
): Set<string> {
  const done = new Set<string>();
  for (const enrollment of enrollments ?? []) {
    if (!enrollment?.studyId) continue;
    if (enrollment.status === 'completed' || enrollment.completedAt) {
      done.add(enrollment.studyId);
    }
  }
  return done;
}

export interface RecommendationSplit<T> {
  /** "Aanbevolen voor jou". Empty when nothing is left to recommend. */
  recommended: T[];
  /** "Meer om te ontdekken": the next ones, never the study being resumed. */
  more: T[];
}

/**
 * Splits the catalogue into the two dashboard rows, dropping finished studies.
 *
 * `more` backfills from the same filtered list, so removing a finished study
 * pulls the next one up rather than leaving a hole in the row.
 */
export function splitRecommendations<T extends { id: string }>({
  studies,
  completed,
  resumeStudyId = null,
  count = 4,
}: {
  studies: readonly T[];
  completed: ReadonlySet<string>;
  resumeStudyId?: string | null;
  count?: number;
}): RecommendationSplit<T> {
  const open = studies.filter((study) => !completed.has(study.id));
  return {
    recommended: open.slice(0, count),
    more: open.slice(count).filter((study) => study.id !== resumeStudyId).slice(0, count),
  };
}
