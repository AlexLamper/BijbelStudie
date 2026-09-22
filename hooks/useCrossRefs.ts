'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  bookNameLookupFrom,
  canonicalDutchBookName,
  formatCrossRefLabel,
} from '../lib/crossRefs/format';
import { decodeCrossRef } from '../lib/crossRefs/osis';
import type {
  CrossRef,
  CrossRefShard,
  VersificationProfile,
} from '../lib/crossRefs/types';
import { numberingMayDiffer, profileForVersion } from '../lib/crossRefs/versionProfiles';
import { toAnyBookCode, toBookIndex } from '../lib/readChaptersCanon';

/**
 * The chapter's cross-references, read straight off the CDN.
 *
 * NO FUNCTION IN THE PATH. The shard is a committed static file under
 * `/data/crossrefs/v1/**`, `middleware.ts` already excludes `data`, and the
 * browser fetches it itself - so a reader opening the panel costs this project
 * zero Vercel Active CPU (CROSS_LINKS_PLAN.md §3.1, and the standing Hobby
 * budget constraint in CLAUDE.md). Nothing here may ever become an API route,
 * and nothing here may import `lib/crossRefs/loadShard.ts`: that module reads
 * `fs` and would break the client bundle.
 *
 * ONE FETCH PER CHAPTER, not per verse. A shard holds every source verse in the
 * chapter, so the verse panel, the materials tab and (later) the study flow all
 * read the same parsed object out of the module-level cache below.
 *
 * `enabled` is what keeps it lazy: the reader pane mounts this hook for every
 * chapter, but nothing is fetched until someone actually opens a panel or the
 * Verwijzingen tab.
 */

/**
 * Where the shards live. Mirrors `CROSSREF_DATA_ROOT` in
 * `lib/crossRefs/loadShard.ts`, which cannot be imported here (it pulls in
 * `fs`). The `v1` in the path is the dataset version: a data change ships as
 * `v2` rather than overwriting these files, so the year-long CDN cache is safe.
 */
const CROSSREF_ROOT = '/data/crossrefs/v1';

/** Decoded shard bodies, keyed `<profile>/<BOOK>/<chapter>`. */
const shardCache = new Map<string, Record<string, CrossRef[]> | null>();
const shardInflight = new Map<string, Promise<Record<string, CrossRef[]> | null>>();

function decodeVerses(raw: CrossRefShard | null): Record<string, CrossRef[]> | null {
  if (!raw || typeof raw !== 'object' || !raw.r || typeof raw.r !== 'object') return null;
  const out: Record<string, CrossRef[]> = {};
  for (const [verse, tuples] of Object.entries(raw.r)) {
    if (!Array.isArray(tuples)) continue;
    const refs: CrossRef[] = [];
    for (const tuple of tuples) {
      const ref = decodeCrossRef(tuple);
      if (ref) refs.push(ref);
    }
    if (refs.length > 0) out[verse] = refs;
  }
  return out;
}

async function fetchShard(key: string): Promise<Record<string, CrossRef[]> | null> {
  if (shardCache.has(key)) return shardCache.get(key)!;
  const pending = shardInflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(`${CROSSREF_ROOT}/${key}.json`, { cache: 'force-cache' });
      // A chapter with no references is a missing file, not an error: most of
      // the source data is dense, but Psalm-length shards are not guaranteed.
      if (res.status === 404) {
        shardCache.set(key, {});
        return {};
      }
      if (!res.ok) return null;
      const decoded = decodeVerses((await res.json()) as CrossRefShard);
      if (decoded) shardCache.set(key, decoded);
      return decoded;
    } catch {
      return null;
    } finally {
      shardInflight.delete(key);
    }
  })();

  shardInflight.set(key, promise);
  return promise;
}

/** One reference, resolved into something the reader can read and click. */
export type CrossRefTarget = {
  /** The decoded reference, votes included. */
  ref: CrossRef;
  /** 1..66, canonical order - the index the tuple stores. */
  bookIndex: number;
  /** The target book as THIS translation spells it, or the canonical Dutch name. */
  bookName: string;
  /** `Jesaja 1:18`, `Johannes 1:1-3`, `Mattheüs 5:1–7:29`. */
  label: string;
  /** False when this translation has no such book at all (label falls back). */
  inVersion: boolean;
  /** A real reader URL, so middle-click and open-in-new-tab keep working. */
  href: string;
};

export type CrossRefVerseGroup = { verse: number; refs: CrossRefTarget[] };

export type UseCrossRefsResult = {
  loading: boolean;
  /** True only for a real failure; an empty chapter is not an error. */
  error: boolean;
  profile: VersificationProfile;
  /**
   * This translation's numbering is unproved, or this book is one it deviates
   * in: show `Versnummering kan in deze vertaling afwijken.` before they jump.
   */
  numberingMayDiffer: boolean;
  /** The refs for one source verse, votes descending. Never null. */
  forVerse: (verse: number) => CrossRefTarget[];
  /** The whole chapter, source verses ascending. */
  verses: CrossRefVerseGroup[];
  /** How many references the chapter carries in total. */
  total: number;
};

const NO_REFS: CrossRefTarget[] = [];

export type UseCrossRefsOptions = {
  version: string | null | undefined;
  /** The source book, spelled however this translation spells it. */
  book: string;
  chapter: number;
  /** The translation's own book list, as `useBibleData` already holds it. */
  books?: readonly string[];
  /** Nothing is fetched while this is false. Default true. */
  enabled?: boolean;
};

export function useCrossRefs({
  version,
  book,
  chapter,
  books,
  enabled = true,
}: UseCrossRefsOptions): UseCrossRefsResult {
  const profile = useMemo(() => profileForVersion(version), [version]);
  const sourceCode = useMemo(() => toAnyBookCode(book), [book]);
  /**
   * The warning is per BOOK, not only per version: a profiled translation still
   * deviates in the handful of books `VERSION_BOOK_DEVIATIONS` lists, and an
   * unprofiled one warns everywhere.
   */
  const mayDiffer = useMemo(
    () => numberingMayDiffer(version, sourceCode),
    [version, sourceCode],
  );
  const key =
    sourceCode && chapter > 0 ? `${profile}/${sourceCode}/${chapter}` : null;

  const [raw, setRaw] = useState<Record<string, CrossRef[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || !key) {
      setRaw(null);
      setLoading(false);
      setError(false);
      return;
    }

    const cached = shardCache.get(key);
    if (cached !== undefined) {
      setRaw(cached);
      setLoading(false);
      setError(cached === null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    void fetchShard(key).then((data) => {
      if (cancelled) return;
      setRaw(data);
      setError(data === null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  /**
   * Target book names come from the translation on screen, so a reader in the
   * Statenvertaling gets "1 Corinthiërs" and one in the KJV gets
   * "1 Corinthians". `bookNameLookupFrom` resolves each entry of that list to a
   * canonical index with `toBookIndex`, rather than trusting its position - a
   * list carrying the deuterocanonical books would be off by several.
   */
  const lookup = useMemo(() => bookNameLookupFrom(books, toBookIndex), [books]);

  const presentIndexes = useMemo(() => {
    const set = new Set<number>();
    for (const name of books ?? []) {
      const index = toBookIndex(name);
      if (index !== null) set.add(index);
    }
    return set;
  }, [books]);

  const verses = useMemo<CrossRefVerseGroup[]>(() => {
    if (!raw) return [];
    const groups: CrossRefVerseGroup[] = [];

    for (const verseKey of Object.keys(raw)) {
      const verse = Number(verseKey);
      if (!Number.isInteger(verse) || verse < 1) continue;

      const refs: CrossRefTarget[] = [];
      for (const ref of raw[verseKey]) {
        const bookName = lookup(ref.b) ?? canonicalDutchBookName(ref.b);
        if (!bookName) continue;
        const label = formatCrossRefLabel(ref, bookName);
        if (!label) continue;

        const params = new URLSearchParams({
          book: bookName,
          chapter: String(ref.c),
          vers: String(ref.v),
        });
        // The translation rides along so an open-in-new-tab lands in the same
        // one the reader is using, not in whatever /lezen last remembered.
        if (version) params.set('version', version);

        refs.push({
          ref,
          bookIndex: ref.b,
          bookName,
          label,
          inVersion: presentIndexes.size === 0 || presentIndexes.has(ref.b),
          href: `/lezen?${params.toString()}`,
        });
      }

      if (refs.length > 0) groups.push({ verse, refs });
    }

    groups.sort((a, b) => a.verse - b.verse);
    return groups;
  }, [raw, lookup, presentIndexes, version]);

  const byVerse = useMemo(() => {
    const map = new Map<number, CrossRefTarget[]>();
    for (const group of verses) map.set(group.verse, group.refs);
    return map;
  }, [verses]);

  return useMemo<UseCrossRefsResult>(
    () => ({
      loading,
      error,
      profile,
      numberingMayDiffer: mayDiffer,
      forVerse: (verse: number) => byVerse.get(verse) ?? NO_REFS,
      verses,
      total: verses.reduce((sum, group) => sum + group.refs.length, 0),
    }),
    [loading, error, profile, mayDiffer, byVerse, verses],
  );
}
