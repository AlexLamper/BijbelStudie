import type { BibleBook, Testament, BookGenre } from "./types";
import { OT_LAW_HISTORY } from "./ot-wet-geschiedenis";
import { OT_POETRY_PROPHETS } from "./ot-poezie-profeten";
import { NEW_TESTAMENT } from "./nt";

export type { BibleBook, Testament, BookGenre, OutlineSection } from "./types";

/** All 66 books in canonical order. */
export const BIBLE_BOOKS: BibleBook[] = [
  ...OT_LAW_HISTORY,
  ...OT_POETRY_PROPHETS,
  ...NEW_TESTAMENT,
];

const BY_SLUG = new Map(BIBLE_BOOKS.map(b => [b.slug, b]));

export function getBibleBook(slug: string): BibleBook | undefined {
  return BY_SLUG.get(slug);
}

export function getBooksByTestament(testament: Testament): BibleBook[] {
  return BIBLE_BOOKS.filter(b => b.testament === testament);
}

/**
 * The book key the reader at /studie expects. The Bible data files do not use
 * the same spelling as the display name everywhere, so never build a reader
 * link from `name` directly.
 */
export function readerBookName(book: BibleBook): string {
  return book.appBook ?? book.name;
}

/** Deep link into the reader at chapter 1 of this book. */
export function readerHref(book: BibleBook, chapter = 1): string {
  return `/studie?book=${encodeURIComponent(readerBookName(book))}&chapter=${chapter}&version=statenvertaling`;
}

/** Previous/next in canonical order, for prev/next navigation links. */
export function adjacentBooks(slug: string): {
  previous?: BibleBook;
  next?: BibleBook;
} {
  const i = BIBLE_BOOKS.findIndex(b => b.slug === slug);
  if (i === -1) return {};
  return {
    previous: i > 0 ? BIBLE_BOOKS[i - 1] : undefined,
    next: i < BIBLE_BOOKS.length - 1 ? BIBLE_BOOKS[i + 1] : undefined,
  };
}

/** Genres in the order they should be shown on the hub page. */
export const GENRE_ORDER: BookGenre[] = [
  "Wet",
  "Geschiedenis",
  "Poëzie en wijsheid",
  "Grote profeten",
  "Kleine profeten",
  "Evangelie",
  "Brief",
  "Apocalyptiek",
];
