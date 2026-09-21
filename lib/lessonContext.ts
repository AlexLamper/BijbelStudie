import { findBook } from './chapterStudyRef';
import { normaliseDashes } from './textFormat';
import type { LessonContent } from './data/study-lessons/types';
import type { Passage } from './studyFlow';

/**
 * Step 2, "Bijbelse context": who wrote this, to whom, when, and where in the
 * book you are standing.
 *
 * THE FALLBACK IS THE POINT. Only a handful of lessons will ever have authored
 * context, but every chapter of the canon has a book behind it, and
 * lib/content/bibleBooks already holds that book's author, date, theme,
 * orientation and outline. So this step is never empty and never invented: it
 * is the same reference text /bijbelboeken shows, cut to the chapter in hand.
 *
 * SERVER-SIDE ONLY in practice - it pulls the whole 66-book reference set in -
 * so it is called from lib/lessonPayload.ts and the result travels to the
 * client as data. Never import this from a client component.
 */

export interface LessonContextPayload {
  /** Null when the lesson's book is not in the canon list (authored-only context). */
  book: { slug: string; name: string; href: string } | null;
  /** Orientation prose: authored when present, otherwise the book's own. */
  body: string[];
  /** Author, date, genre, theme - the answers to "wie, wanneer, wat". */
  facts: { label: string; value: string }[];
  /** The outline section this chapter falls in, with its summary. */
  placement: { range: string; title: string; summary: string } | null;
  /** The whole book in one glance, with the reader's own section marked. */
  outline: { range: string; title: string; current: boolean }[];
  terms: { term: string; meaning: string }[];
  /** Geo photographs of the places in this chapter. */
  showMedia: boolean;
}

/**
 * Whether an outline range like "1-11", "1" or "9–19" covers `chapter`.
 *
 * The reference data is hand-written and mixes hyphen and en-dash, exactly like
 * the verse ranges in lib/studyFlow.ts - so it is normalised the same way
 * rather than trusted.
 */
function rangeCovers(range: string, chapter: number): boolean {
  const parts = normaliseDashes(range).split('-');
  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[parts.length - 1], 10);
  if (Number.isNaN(start)) return false;
  return chapter >= start && chapter <= (Number.isNaN(end) ? start : end);
}

/**
 * The context step's content, or null when there is genuinely nothing to show.
 *
 * Null is the signal `resolveSteps` needs: a step that would render an empty
 * page must not be on the rail at all. In practice it only happens for a lesson
 * whose book cannot be resolved AND has no authored context.
 */
export function buildLessonContext(
  passage: Passage,
  content?: LessonContent,
): LessonContextPayload | null {
  const authored = content?.context;
  const book = findBook(passage.book);

  const body = authored?.body?.length ? authored.body : (book?.summary ?? []);
  if (!book && body.length === 0) return null;

  // Authored facts first: they are about this lesson, the derived ones are
  // about the whole book and are the same on every lesson of the study.
  const facts: { label: string; value: string }[] = [...(authored?.facts ?? [])];
  if (book) {
    facts.push(
      { label: 'Schrijver', value: book.author },
      { label: 'Geschreven', value: book.written },
      { label: 'Soort boek', value: book.genre },
      { label: 'Kern', value: book.theme },
    );
  }

  const sections = book?.outline ?? [];
  const placement = sections.find((section) => rangeCovers(section.range, passage.chapter)) ?? null;

  return {
    book: book ? { slug: book.slug, name: book.name, href: `/bijbelboeken/${book.slug}` } : null,
    body,
    facts,
    placement: placement
      ? { range: placement.range, title: placement.title, summary: placement.summary }
      : null,
    outline: sections.map((section) => ({
      range: section.range,
      title: section.title,
      current: section === placement,
    })),
    terms: authored?.terms ?? [],
    showMedia: authored?.showMedia !== false,
  };
}
