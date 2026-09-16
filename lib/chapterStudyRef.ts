import {
  BIBLE_BOOKS,
  getBibleBook,
  readerBookName,
  type BibleBook,
} from './content/bibleBooks';
import { normaliseBookName, toBookCode } from './bookCanon';

/**
 * The book-and-chapter half of lib/chapterStudy.ts: names, routes and
 * neighbours, with no study catalogue behind it. Split out so the reader
 * (/lezen), which only needs a link, does not pull every study into its bundle.
 */

export interface ChapterRef {
  book: BibleBook;
  chapter: number;
}

const BY_CODE = new Map<string, BibleBook>();
const BY_NORMALISED = new Map<string, BibleBook>();
for (const book of BIBLE_BOOKS) {
  for (const name of [book.name, book.appBook, book.slug.replace(/-/g, ' ')]) {
    if (!name) continue;
    const code = toBookCode(name);
    if (code && !BY_CODE.has(code)) BY_CODE.set(code, book);
    BY_NORMALISED.set(normaliseBookName(name), book);
  }
}

/**
 * A book from anything a caller might hold: its slug, its display name, the
 * reader's key ("2 Corinthiër") or another project's spelling ("1 Korintiërs").
 */
export function findBook(value: string | null | undefined): BibleBook | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    /* keep the raw value */
  }
  const bySlug = getBibleBook(decoded.toLowerCase());
  if (bySlug) return bySlug;
  const code = toBookCode(decoded);
  if (code && BY_CODE.has(code)) return BY_CODE.get(code)!;
  return BY_NORMALISED.get(normaliseBookName(decoded.replace(/-/g, ' '))) ?? null;
}

/** `/studie/hoofdstuk/<slug>/<chapter>` */
export function chapterStudyPath(slug: string, chapter: number): string {
  return `/studie/hoofdstuk/${slug}/${chapter}`;
}

/**
 * The route for studying `chapter` of the book the reader calls `readerBook`,
 * or null when the name is not a book of the canon (or the chapter is out of
 * range) - callers hide the entry point then.
 */
export function chapterStudyHref(readerBook: string, chapter: number): string | null {
  const book = findBook(readerBook);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null;
  return chapterStudyPath(book.slug, chapter);
}

/**
 * The chapter before (`-1`) or after (`1`), crossing book boundaries:
 * Maleachi 4 is followed by Mattheüs 1. Null past either end of the canon.
 */
export function adjacentChapter(slug: string, chapter: number, step: 1 | -1): ChapterRef | null {
  const book = findBook(slug);
  if (!book) return null;
  const target = chapter + step;
  if (target >= 1 && target <= book.chapters) return { book, chapter: target };

  const index = BIBLE_BOOKS.findIndex((candidate) => candidate.slug === book.slug);
  const neighbour = BIBLE_BOOKS[index + step];
  if (!neighbour) return null;
  return { book: neighbour, chapter: step === 1 ? 1 : neighbour.chapters };
}

/** A chapter as clients receive it. */
export interface ChapterRefPayload {
  /** Book slug, the URL segment. */
  book: string;
  bookName: string;
  /** The reader's key for the book (/lezen?book=). */
  readerBook: string;
  chapter: number;
  chapters: number;
  href: string;
}

export function chapterRefPayload(ref: ChapterRef): ChapterRefPayload {
  return {
    book: ref.book.slug,
    bookName: ref.book.name,
    readerBook: readerBookName(ref.book),
    chapter: ref.chapter,
    chapters: ref.book.chapters,
    href: chapterStudyPath(ref.book.slug, ref.chapter),
  };
}

/** The reader at this chapter, in `version`. */
export function readerChapterHref(book: BibleBook, chapter: number, version: string): string {
  return `/lezen?book=${encodeURIComponent(readerBookName(book))}&chapter=${chapter}&version=${encodeURIComponent(version)}`;
}

/**
 * A `?van=` return path, when it is safe to send someone to: same-site,
 * absolute path, no protocol-relative trick. Anything else is null.
 */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }
  return value.length <= 300 ? value : null;
}
