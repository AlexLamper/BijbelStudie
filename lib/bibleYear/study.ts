/**
 * The 'studeren' parts of a "Bijbel in een jaar" day: a commentary on one of
 * the day's chapters ('uitleg') and one question ('vraag').
 *
 * Pure and fixed: the commentary chapter is the first chapter of the day, the
 * question the genre question lib/bookStudies.ts gives that same chapter as its
 * Toepassing focus (lib/chapterStudyTemplate.ts, rotated per chapter). So the
 * plan and the book study of that chapter ask the same thing, and nothing is
 * generated at run time.
 *
 * Progress is stored as "day.part" keys ("23.vraag") on the enrollment's
 * `studyDone`; the vraag counts as done once it is opened.
 */

import { chapterStudyTemplate } from '../chapterStudyTemplate';
import { BIBLE_BOOKS } from '../content/bibleBooks';
import { BIBLE_CHAPTER_WEIGHTS } from '../data/bible-chapter-weights';
import type { BibleYearDayStudy, BibleYearScheduleDay, BibleYearStudyPart } from './types';

export const STUDY_PARTS: readonly BibleYearStudyPart[] = ['uitleg', 'vraag'];

const GENERIC_QUESTION = 'Wat betekent dit hoofdstuk voor jou?';

const GENRE_BY_CODE = new Map(
  BIBLE_CHAPTER_WEIGHTS.map((b, i) => [b.code, BIBLE_BOOKS.find((book) => book.position === i + 1)?.genre]),
);

export function isStudyPart(v: unknown): v is BibleYearStudyPart {
  return typeof v === 'string' && (STUDY_PARTS as readonly string[]).includes(v);
}

/** "23.vraag". */
export function studyKey(day: number, part: BibleYearStudyPart): string {
  return `${day}.${part}`;
}

/** The question for one chapter: the genre's questions rotated by chapter, as in lib/bookStudies.ts. */
export function studyQuestion(code: string, chapter: number): string {
  const genre = GENRE_BY_CODE.get(code);
  const questions = genre ? (chapterStudyTemplate(genre)?.questions ?? []) : [];
  return questions.length > 0 ? questions[(chapter - 1) % questions.length] : GENERIC_QUESTION;
}

/** The study parts of a schedule day, or null for a day without chapters. */
export function studyForDay(day: BibleYearScheduleDay): BibleYearDayStudy | null {
  const ref = day.portions[0]?.refs[0];
  if (!ref) return null;
  return { ref: { book: ref.book, code: ref.code, chapter: ref.chapter }, question: studyQuestion(ref.code, ref.chapter) };
}

/** Both study parts of `day` done. */
export function isStudyDone(day: number, done: ReadonlySet<string>): boolean {
  return STUDY_PARTS.every((part) => done.has(studyKey(day, part)));
}
