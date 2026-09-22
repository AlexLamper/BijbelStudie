/**
 * Dutch display labels for cross-references.
 *
 * The label is rendered identically on the web panel, in the materials tab and
 * - because the v1 route formats it server-side so the app needs no Dart book
 * table - inside the Flutter sheet. Keep it here, not in a component.
 *
 * Punctuation follows CROSS_LINKS_PLAN.md §7.1 and is deliberate:
 *
 *   single verse          `Jesaja 1:18`
 *   verses in one chapter `Johannes 1:1-3`     hyphen, one number range
 *   across chapters       `Mattheüs 5:1-7:29`  en dash, two whole references
 *
 * The en dash is what Dutch typography uses between two full references; the
 * hyphen keeps `1:1-3` reading as one number span. They are different
 * characters (U+002D and U+2013) and the tests assert both.
 */

import { BIBLE_BOOKS_ORDER, CANONICAL_NL } from '../book-mapping';
import type { CrossRef } from './types';

/** Hyphen-minus: joins verse numbers inside one chapter. */
export const VERSE_RANGE_DASH = '-';
/** En dash: joins two chapter:verse references. */
export const CHAPTER_RANGE_DASH = '–';

/**
 * Resolves a 1-based canonical book index to the name to print. The reader
 * passes a lookup built from the translation's own book list, so the label
 * matches the spelling on screen; `canonicalDutchBookName` is the fallback.
 */
export type BookNameLookup = (bookIndex: number) => string | null | undefined;

/**
 * The canonical Dutch book name for a 1-based book index - the same spelling
 * the Statenvertaling folders use ("1 Corinthiërs", "Filémon", "Mattheüs"),
 * via `CANONICAL_NL`. Null when the index is out of range.
 */
export function canonicalDutchBookName(bookIndex: number): string | null {
  if (!Number.isInteger(bookIndex) || bookIndex < 1 || bookIndex > BIBLE_BOOKS_ORDER.length) {
    return null;
  }
  const english = BIBLE_BOOKS_ORDER[bookIndex - 1];
  return CANONICAL_NL[english] ?? english ?? null;
}

/** The `1:18` / `1:1-3` / `5:1-7:29` part of a label, without the book name. */
export function formatCrossRefRange(ref: CrossRef): string {
  const startChapter = ref.c;
  const startVerse = ref.v;
  const endChapter = typeof ref.ec === 'number' && ref.ec !== startChapter ? ref.ec : null;
  const endVerse = typeof ref.ev === 'number' ? ref.ev : null;

  if (endChapter !== null) {
    // A cross-chapter range without an end verse still needs a right-hand side;
    // naming the chapter alone is honest about what the data says.
    const right = endVerse !== null ? `${endChapter}:${endVerse}` : `${endChapter}`;
    return `${startChapter}:${startVerse}${CHAPTER_RANGE_DASH}${right}`;
  }

  if (endVerse !== null && endVerse > startVerse) {
    return `${startChapter}:${startVerse}${VERSE_RANGE_DASH}${endVerse}`;
  }

  return `${startChapter}:${startVerse}`;
}

/**
 * The full label, e.g. `Mattheüs 5:1–7:29`.
 *
 * `books` is either the name to use directly, or a lookup by book index; it
 * defaults to the canonical Dutch names. Returns null when the reference names
 * a book that cannot be resolved - a caller that would rather show something
 * than nothing passes its own fallback lookup.
 */
export function formatCrossRefLabel(
  ref: CrossRef,
  books: BookNameLookup | string = canonicalDutchBookName,
): string | null {
  if (!ref || !Number.isInteger(ref.b) || !Number.isInteger(ref.c) || !Number.isInteger(ref.v)) {
    return null;
  }
  const name = typeof books === 'string' ? books : books(ref.b);
  const bookName = (name ?? canonicalDutchBookName(ref.b))?.trim();
  if (!bookName) return null;
  return `${bookName} ${formatCrossRefRange(ref)}`;
}

/**
 * Builds a lookup from one translation's own book list (the `books` array
 * `useBibleData` already holds, or `getBooks(version)` on the server).
 *
 * The list is that translation's spelling in canonical order but may be short
 * or differently ordered, so each entry is resolved to a code by the caller's
 * resolver - `toAnyBookCode` from `lib/readChaptersCanon.ts` - rather than
 * indexed positionally. Names that do not resolve are skipped and the
 * canonical Dutch name is used instead.
 */
export function bookNameLookupFrom(
  books: readonly string[] | null | undefined,
  toIndex: (name: string) => number | null,
): BookNameLookup {
  const byIndex = new Map<number, string>();
  for (const name of books ?? []) {
    if (typeof name !== 'string' || !name.trim()) continue;
    const index = toIndex(name);
    if (index === null || byIndex.has(index)) continue;
    byIndex.set(index, name);
  }
  return (bookIndex: number) => byIndex.get(bookIndex) ?? canonicalDutchBookName(bookIndex);
}
