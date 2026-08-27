import type { LessonContent, LessonContentRegistry } from './types';
import { opstandingLessons } from './opstanding';

export type { LessonContent, LessonContentRegistry } from './types';

/**
 * Authored prose per study, keyed by the curated study id and lesson day.
 *
 * SERVER-ONLY by convention: import this from route handlers and server
 * components, never from a client component. `lib/data/curated-studies.ts` is
 * the client-safe half.
 *
 * A study with no entry here is not broken - lib/studyFlow.ts falls back to the
 * lesson's own fields for every step. Add studies as they are written.
 */
export const lessonContent: LessonContentRegistry = {
  opstanding: opstandingLessons,
};

/** The authored content for one lesson, or undefined when nothing is written yet. */
export function getLessonContent(studyId: string, day: number): LessonContent | undefined {
  return lessonContent[studyId]?.[day];
}
