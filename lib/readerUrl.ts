/**
 * The reader's place, as the URL carries it: `/lezen?book=&chapter=&vers=`.
 *
 * `/lezen` used to keep that place in React state alone - `useBibleData` read
 * `?book` and `?chapter` once, on mount, and never again - so following a
 * cross-reference moved the reader without moving the address bar, and the
 * browser's Back button undid the navigation *into* /lezen rather than the
 * jump the reader had just made (CROSS_LINKS_PLAN.md §4.2, phase 2b).
 *
 * These helpers are the shared vocabulary of the two effects in
 * `app/lezen/page.tsx` that now keep URL and reader in step. They are pure on
 * purpose: the effects are hard to test, this is not.
 */

/** A passage, plus the verse a cross-reference put the reader on (if any). */
export interface ReaderLocation {
  book: string;
  chapter: number;
  verse: number | null;
}

/** Anything that answers `get(name)`: `URLSearchParams` or Next's readonly one. */
export interface ReaderSearchParams {
  get(name: string): string | null;
}

function positiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return null;
  return Math.floor(value);
}

/**
 * The identity of a location, for "did this actually change?" comparisons.
 * Null for "the URL names no passage" - a bare `/lezen`, which the command
 * palette links to and which is not an instruction to move anyone.
 */
export function readerLocationKey(location: ReaderLocation | null): string | null {
  if (!location) return null;
  return `${location.book}|${location.chapter}|${location.verse ?? ''}`;
}

/**
 * Reads a location out of the query string.
 *
 * `book` is required and kept verbatim - a link may spell it any way, and
 * resolving it belongs to the translation's own book list, not here. A missing
 * or unusable `chapter` is 1, which is what `useBibleData` has always assumed
 * for links that carry only a book.
 */
export function parseReaderLocation(params: ReaderSearchParams): ReaderLocation | null {
  const book = params.get('book')?.trim();
  if (!book) return null;
  return {
    book,
    chapter: positiveInt(params.get('chapter')) ?? 1,
    verse: positiveInt(params.get('vers')),
  };
}

/**
 * The query string for a location, on top of the one already in the address
 * bar: anything else living there (a command-palette intent, for instance) is
 * left alone. `vers` is dropped when no verse is focused rather than written
 * as an empty value.
 */
export function buildReaderSearch(
  currentSearch: string,
  location: ReaderLocation,
  version?: string | null,
): string {
  const params = new URLSearchParams(currentSearch);
  params.set('book', location.book);
  params.set('chapter', String(location.chapter));
  if (location.verse) params.set('vers', String(location.verse));
  else params.delete('vers');
  if (version) params.set('version', version);
  return `?${params.toString()}`;
}
