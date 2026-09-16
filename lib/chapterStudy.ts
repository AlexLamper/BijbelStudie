import type { BibleBook } from './content/bibleBooks';
import { adjacentChapter, chapterRefPayload, findBook } from './chapterStudyRef';
import { BOOK_STUDY_ENTRIES, bookStudyId, findAnyStudy } from './bookStudies';
import type { CuratedStudy, Lesson } from './data/curated-studies';
import { findLesson, parseVerseRange } from './studyFlow';

/**
 * Studying one chapter on its own.
 *
 * A single-chapter study is NOT a new kind of study. It is lesson <chapter> of
 * that book's existing study, opened without an enrollment:
 *
 * - the authored book study when it has a lesson on exactly that chapter
 *   (Daniël 3 is lesson 3 of `daniel`), otherwise
 * - the generated `boek-<slug>` study, whose lesson day IS the chapter.
 *
 * Progress is therefore keyed exactly like every other lesson, (studyId,
 * lessonDay), so it counts toward the book study, never pays XP twice and
 * needs no schema change. No synthetic study id exists anywhere.
 *
 * Pure and client-safe: no database, no authored prose (that lives in the
 * server-only lib/data/study-lessons).
 */

export interface ChapterStudyTarget {
  book: BibleBook;
  chapter: number;
  /** The study whose lesson this is. */
  studyId: string;
  lessonDay: number;
  /** True when the lesson comes from a hand-authored study. */
  authored: boolean;
  /** The study offered as "Heel <boek> als studie volgen": the catalogue's entry for the book. */
  followStudyId: string;
}

function isWholeChapterLesson(lesson: Lesson, book: BibleBook, chapter: number): boolean {
  if (lesson.chapter !== chapter) return false;
  if (findBook(lesson.book)?.slug !== book.slug) return false;
  if (!lesson.verseRange) return true;
  // No verse counts are shipped, so "whole chapter" means the range starts at
  // verse 1. A lesson on 5:12-21 is a study of a passage, not of chapter 5.
  const range = parseVerseRange(lesson.verseRange);
  return !!range && range.start === 1;
}

/** The lesson to open for `chapter` of the book with `slug`, or null when either is unknown. */
export function resolveChapterStudy(slug: string, chapter: number): ChapterStudyTarget | null {
  const book = findBook(slug);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null;

  const entry = BOOK_STUDY_ENTRIES.find((candidate) => candidate.book.slug === book.slug);
  const followStudyId = entry?.study.id ?? bookStudyId(book.slug);

  if (entry?.authored) {
    const matches = entry.study.lessons.filter((lesson) =>
      isWholeChapterLesson(lesson, book, chapter),
    );
    // Exactly one: two authored lessons on one chapter means neither is it.
    if (matches.length === 1) {
      return {
        book,
        chapter,
        studyId: entry.study.id,
        lessonDay: matches[0].day,
        authored: true,
        followStudyId,
      };
    }
  }

  return {
    book,
    chapter,
    studyId: bookStudyId(book.slug),
    lessonDay: chapter,
    authored: false,
    followStudyId,
  };
}

/** The study and lesson objects behind a target. Null only if the catalogue is inconsistent. */
export function chapterStudyLesson(
  target: ChapterStudyTarget,
): { study: CuratedStudy; lesson: Lesson } | null {
  const study = findAnyStudy(target.studyId);
  const lesson = study ? findLesson(study, target.lessonDay) : undefined;
  return study && lesson ? { study, lesson } : null;
}
export * from './chapterStudyRef';

export interface ChapterFollowStudy {
  id: string;
  title: string;
  lessonsTotal: number;
  /** `/studies/<id>`: where a book study is configured and started. */
  href: string;
}

/** What surrounds a chapter lesson: where it is, its neighbours, and the study it belongs to. */
export interface ChapterStudyContext {
  ref: ReturnType<typeof chapterRefPayload>;
  previous: ReturnType<typeof chapterRefPayload> | null;
  next: ReturnType<typeof chapterRefPayload> | null;
  followStudy: ChapterFollowStudy;
  studyId: string;
  lessonDay: number;
}

export function chapterStudyContext(target: ChapterStudyTarget): ChapterStudyContext {
  const previous = adjacentChapter(target.book.slug, target.chapter, -1);
  const next = adjacentChapter(target.book.slug, target.chapter, 1);
  const follow = findAnyStudy(target.followStudyId);
  return {
    ref: chapterRefPayload({ book: target.book, chapter: target.chapter }),
    previous: previous ? chapterRefPayload(previous) : null,
    next: next ? chapterRefPayload(next) : null,
    followStudy: {
      id: target.followStudyId,
      title: follow?.title ?? target.book.name,
      lessonsTotal: follow?.lessons.length ?? target.book.chapters,
      href: `/studies/${target.followStudyId}`,
    },
    studyId: target.studyId,
    lessonDay: target.lessonDay,
  };
}
