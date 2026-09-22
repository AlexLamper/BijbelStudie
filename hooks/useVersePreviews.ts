'use client';

import { useEffect, useMemo, useReducer } from 'react';

/**
 * Preview text for cross-reference targets, in the translation on screen.
 *
 * WHY NO BATCH ENDPOINT. The obvious design - POST a list of references, get
 * their text back - was rejected in CROSS_LINKS_PLAN.md §3.1: every panel asks
 * for a different combination of verses, so a batch route would have roughly a
 * 0% CDN hit rate and would pay Vercel Active CPU for each one. Whole chapters
 * repeat constantly instead, and `GET /api/bible/chapter` already answers them
 * with `PUBLIC_CONTENT_CACHE_CONTROL`. So: group the visible rows by chapter,
 * ask for those chapters, let the CDN do the work.
 *
 * LAZY AND CAPPED. Only the rows that are actually on screen are requested (the
 * list passes the first eight, then the rest when the reader expands), and at
 * most four requests are in flight at once - a verse in Romeinen can point at a
 * dozen different chapters, and firing a dozen parallel fetches from a reader
 * pane is how a chapter of scripture ends up waiting behind its own footnotes.
 *
 * The cache is module-level, like `components/study/OriginalText.tsx`, so
 * paging back to a chapter the reader already opened costs nothing.
 */

const MAX_CONCURRENT = 4;

/** `<version>|<book>|<chapter>` → verse map, or null when it does not exist. */
const chapterCache = new Map<string, Record<string, string> | null>();
const inflight = new Set<string>();

function cacheKey(version: string, book: string, chapter: number): string {
  return `${version}|${book}|${chapter}`;
}

async function fetchChapter(version: string, book: string, chapter: number): Promise<void> {
  const key = cacheKey(version, book, chapter);
  if (chapterCache.has(key) || inflight.has(key)) return;
  inflight.add(key);
  try {
    const params = new URLSearchParams({ version, book, chapter: String(chapter) });
    const res = await fetch(`/api/bible/chapter?${params.toString()}`, { cache: 'force-cache' });
    if (!res.ok) {
      // 404 means this translation genuinely has no such chapter - a real
      // answer the list renders as "Dit vers ontbreekt in deze vertaling."
      chapterCache.set(key, null);
      return;
    }
    const data = await res.json();
    const verses = data?.verses;
    chapterCache.set(key, verses && typeof verses === 'object' ? verses : null);
  } catch {
    chapterCache.set(key, null);
  } finally {
    inflight.delete(key);
  }
}

export type PreviewChapter = { book: string; chapter: number };

export type PassagePreview = {
  /**
   * `loading` while the chapter is on its way, `missing` when the translation
   * has no such verse (a variant verse, or a book it does not carry),
   * `ready` otherwise.
   */
  state: 'idle' | 'loading' | 'missing' | 'ready';
  /** The verses that exist, in order, capped at the caller's limit. */
  verses: Array<{ n: number; text: string }>;
  /** True when the reference runs past what is shown. */
  truncated: boolean;
};

export type UseVersePreviewsResult = {
  /**
   * The text of one reference. `endChapter` is only ever the rare cross-chapter
   * range, and only the first chapter of such a range is fetched - the label
   * already says where it ends, and a second request per row is not worth it.
   */
  getPassage: (
    book: string,
    chapter: number,
    startVerse: number,
    endVerse?: number | null,
    endChapter?: number | null,
    limit?: number,
  ) => PassagePreview;
  /** The first `max` characters of a reference, for the collapsed row. */
  getSnippet: (
    book: string,
    chapter: number,
    startVerse: number,
    endVerse?: number | null,
    endChapter?: number | null,
    max?: number,
  ) => PassagePreview & { text: string | null };
};

const EMPTY: PassagePreview = { state: 'idle', verses: [], truncated: false };

/**
 * @param version   the reader's selected translation id
 * @param chapters  the chapters the visible rows point at; may repeat
 */
export function useVersePreviews(
  version: string | null | undefined,
  chapters: readonly PreviewChapter[],
): UseVersePreviewsResult {
  const [tick, bump] = useReducer((n: number) => n + 1, 0);

  // A stable string, so a caller may rebuild its array on every render without
  // restarting the fetches. Book names never contain the separators.
  const wanted = useMemo(() => {
    const seen = new Set<string>();
    for (const item of chapters) {
      if (!item?.book || !item.chapter) continue;
      seen.add(`${item.book}\u0001${item.chapter}`);
    }
    return [...seen].sort().join('\u0002');
  }, [chapters]);

  useEffect(() => {
    if (!version || !wanted) return;

    const keys = wanted
      .split('\u0002')
      .map((entry) => entry.split('\u0001'))
      .filter((parts) => parts.length === 2)
      .map(([book, chapter]) => ({ book, chapter: Number(chapter) }))
      .filter(({ book, chapter }) => {
        if (!book || !Number.isInteger(chapter) || chapter < 1) return false;
        return !chapterCache.has(cacheKey(version, book, chapter));
      });

    if (keys.length === 0) return;

    let cancelled = false;
    let next = 0;

    const worker = async () => {
      while (!cancelled && next < keys.length) {
        const item = keys[next++];
        await fetchChapter(version, item.book, item.chapter);
        if (!cancelled) bump();
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENT, keys.length) }, worker),
    );

    return () => {
      cancelled = true;
    };
  }, [version, wanted]);

  return useMemo<UseVersePreviewsResult>(() => {
    const getPassage: UseVersePreviewsResult['getPassage'] = (
      book,
      chapter,
      startVerse,
      endVerse,
      endChapter,
      limit = 5,
    ) => {
      if (!version || !book || !chapter) return EMPTY;

      const entry = chapterCache.get(cacheKey(version, book, chapter));
      if (entry === undefined) return { state: 'loading', verses: [], truncated: false };
      if (entry === null) return { state: 'missing', verses: [], truncated: false };

      const crossesChapter = typeof endChapter === 'number' && endChapter > chapter;
      const last = crossesChapter
        ? Number.MAX_SAFE_INTEGER
        : Math.max(startVerse, typeof endVerse === 'number' && endVerse > 0 ? endVerse : startVerse);

      const verses: Array<{ n: number; text: string }> = [];
      let more = false;
      for (let n = startVerse; n <= last; n += 1) {
        const text = entry[String(n)];
        if (typeof text !== 'string' || !text.trim()) {
          // A cross-chapter range has no known end verse, so the first gap is
          // the end of the chapter. Inside a normal range a gap is a variant
          // verse this translation drops, and the walk carries on past it.
          if (crossesChapter) break;
          continue;
        }
        if (verses.length >= limit) {
          more = true;
          break;
        }
        verses.push({ n, text: text.trim() });
      }

      if (verses.length === 0) return { state: 'missing', verses: [], truncated: false };
      return { state: 'ready', verses, truncated: more || crossesChapter };
    };

    const getSnippet: UseVersePreviewsResult['getSnippet'] = (
      book,
      chapter,
      startVerse,
      endVerse,
      endChapter,
      max = 160,
    ) => {
      const passage = getPassage(book, chapter, startVerse, endVerse, endChapter, 2);
      if (passage.state !== 'ready') return { ...passage, text: null };

      const joined = passage.verses.map((verse) => verse.text).join(' ');
      if (joined.length <= max) {
        return { ...passage, text: joined, truncated: passage.truncated };
      }
      // Cut on a word boundary: a preview that ends mid-word reads as a bug.
      const cut = joined.slice(0, max);
      const space = cut.lastIndexOf(' ');
      return {
        ...passage,
        text: `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`,
        truncated: true,
      };
    };

    return { getPassage, getSnippet };
    // `tick` is the dependency that matters: the maps above are mutated in
    // place, so a new reader of them is only needed once a fetch has landed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, tick]);
}
