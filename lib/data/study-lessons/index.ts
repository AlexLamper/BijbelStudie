import type { LessonContent, LessonContentRegistry } from './types';
import { opstandingLessons } from './opstanding';
import { danielLessons } from './daniel';
import { getBibleBook } from '../../content/bibleBooks';
import { chapterStudyTemplate, mergeTemplateUnder } from '../../chapterStudyTemplate';

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
  daniel: danielLessons,
};

/** Kept literal rather than imported from lib/bookStudies to avoid a cycle. */
const BOOK_STUDY_PREFIX = 'boek-';

/**
 * The authored content for one lesson, or undefined when nothing is written yet.
 *
 * Generated book studies (boek-<slug>) always get content: the per-genre
 * reading cue and observe/interpret/apply prompts from lib/chapterStudyTemplate,
 * with anything authored for that lesson laid over it. That is what makes a
 * single chapter studied on its own more than a bare passage and a question.
 */
export function getLessonContent(studyId: string, day: number): LessonContent | undefined {
  const authored = lessonContent[studyId]?.[day];
  if (!studyId.startsWith(BOOK_STUDY_PREFIX)) return authored;

  const book = getBibleBook(studyId.slice(BOOK_STUDY_PREFIX.length));
  if (!book || !Number.isInteger(day) || day < 1 || day > book.chapters) return authored;
  return mergeTemplateUnder(chapterStudyTemplate(book.genre), authored);
}
