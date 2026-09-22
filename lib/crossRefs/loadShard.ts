/**
 * Server-side reader for one cross-reference shard.
 *
 * Shards live at `public/data/crossrefs/v1/<profile>/<BOOK>/<chapter>.json` and
 * are read straight off disk, the way `lib/mobileContent.ts` reads the STEPBible
 * originals: `lib/local-data.ts#fetchJson` exists to parse translation shapes
 * (verse maps, flat verse arrays, book arrays) and would only get in the way of
 * a file that is none of those.
 *
 * There is deliberately **no `private/` lookup**. `fetchJson` checks `private/`
 * first because licensed text (NBG51) must never be served as a static asset;
 * this dataset is CC BY and lives in `public/` on purpose, where the web reader
 * fetches it straight from the CDN with no function in the path
 * (CROSS_LINKS_PLAN.md §2.5, §3.1). A private copy would mean the web and the
 * app were reading different files.
 *
 * Only the v1 API route needs this module - it imports `fs`, so nothing in a
 * client component may. `decodeShard` is pure and is what the tests exercise.
 */

import { readFile } from 'fs/promises';
import path from 'path';

import { decodeCrossRef, isBookCode } from './osis';
import {
  CROSSREF_SHARD_VERSION,
  type BookCode,
  type CrossRef,
  type DecodedCrossRefShard,
  type VersificationProfile,
} from './types';

/** Version directory the shards are written under. Bumped with the data. */
export const CROSSREF_DATA_VERSION = 'v1';

/** Root of the shard tree, relative to `public/`. Also the public URL path. */
export const CROSSREF_DATA_ROOT = `/data/crossrefs/${CROSSREF_DATA_VERSION}`;

/**
 * How many parsed shards one instance keeps. A chapter shard is ~5 KB raw and
 * a handful of KB parsed, so 128 of them is well under a megabyte, and a reader
 * moving through a book hits the cache for every chapter they revisit. It is
 * bounded because a warm Vercel instance serves thousands of different
 * chapters over its life and an unbounded map would hold the whole dataset.
 */
const MAX_CACHED_SHARDS = 128;

/** A cached miss, so a chapter with no shard is not re-stat-ed on every hit. */
const MISS = Symbol('crossref-shard-miss');
type CacheEntry = DecodedCrossRefShard | typeof MISS;

const CACHE = new Map<string, CacheEntry>();
const INFLIGHT = new Map<string, Promise<CacheEntry>>();

/** Moves a key to the most-recent end of the insertion-ordered Map. */
function touch(key: string): CacheEntry | undefined {
  const hit = CACHE.get(key);
  if (hit === undefined) return undefined;
  CACHE.delete(key);
  CACHE.set(key, hit);
  return hit;
}

function remember(key: string, entry: CacheEntry): void {
  CACHE.set(key, entry);
  while (CACHE.size > MAX_CACHED_SHARDS) {
    const oldest = CACHE.keys().next();
    if (oldest.done) break;
    CACHE.delete(oldest.value);
  }
}

/** Drops the memoised shards. Tests only; nothing in a request path calls it. */
export function clearShardCache(): void {
  CACHE.clear();
  INFLIGHT.clear();
}

/**
 * A profile directory name. Validated rather than typed because the value can
 * reach here from a version id looked up at runtime, and the result is used to
 * build a filesystem path.
 */
function isSafeProfile(profile: string): boolean {
  return typeof profile === 'string' && /^[a-z0-9_-]{1,16}$/.test(profile);
}

/** A book directory name: a canonical code, nothing else. */
function isSafeBook(book: string): book is BookCode {
  return isBookCode(book);
}

function isSafeChapter(chapter: number): boolean {
  return Number.isInteger(chapter) && chapter >= 1 && chapter <= 150;
}

/**
 * The path of a shard, relative to `public/` - i.e. also its public URL.
 * Null when any part of the address is not a legal path segment. The web
 * reader builds its fetch URL from this so web and app cannot drift.
 */
export function crossRefShardPath(
  profile: string,
  book: string,
  chapter: number,
): string | null {
  if (!isSafeProfile(profile) || !isSafeBook(book) || !isSafeChapter(chapter)) return null;
  return `${CROSSREF_DATA_ROOT}/${profile}/${book}/${chapter}.json`;
}

/**
 * Turns a parsed shard file into the shape the API route and the reader use.
 * Pure: no filesystem, no network, so the tests need neither.
 *
 * Every layer of the file is validated, because a shard is generated data that
 * a build change could reshape without anyone noticing until a reader is sent
 * to the wrong verse. A malformed ref is dropped; a malformed file returns
 * null. Refs keep their stored order (votes descending); verses come back in
 * ascending verse order.
 */
export function decodeShard(raw: unknown): DecodedCrossRefShard | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const shard = raw as Record<string, unknown>;
  const version = typeof shard.v === 'number' ? shard.v : null;
  if (version === null || version > CROSSREF_SHARD_VERSION) return null;

  const profile = typeof shard.p === 'string' ? shard.p : null;
  const book = typeof shard.b === 'string' ? shard.b.toUpperCase() : null;
  const chapter = typeof shard.c === 'number' ? shard.c : null;
  if (!profile || !isSafeProfile(profile)) return null;
  if (!book || !isSafeBook(book) || !isSafeChapter(chapter ?? 0)) return null;

  const rows = shard.r;
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return null;

  const verses: Array<{ n: number; refs: CrossRef[] }> = [];
  for (const [key, value] of Object.entries(rows as Record<string, unknown>)) {
    const n = /^\d+$/.test(key) ? Number(key) : NaN;
    if (!Number.isInteger(n) || n < 1) continue;
    if (!Array.isArray(value)) continue;

    const refs: CrossRef[] = [];
    for (const tuple of value) {
      const ref = decodeCrossRef(tuple);
      if (ref) refs.push(ref);
    }
    if (refs.length > 0) verses.push({ n, refs });
  }

  verses.sort((a, b) => a.n - b.n);

  return {
    version,
    profile: profile as VersificationProfile,
    book: book as BookCode,
    chapter: chapter as number,
    verses,
  };
}

async function readShard(
  profile: string,
  book: BookCode,
  chapter: number,
): Promise<CacheEntry> {
  const file = path.join(
    process.cwd(),
    'public',
    'data',
    'crossrefs',
    CROSSREF_DATA_VERSION,
    profile,
    book,
    `${chapter}.json`,
  );

  let text: string;
  try {
    text = await readFile(file, 'utf-8');
  } catch {
    return MISS;
  }

  try {
    return decodeShard(JSON.parse(text)) ?? MISS;
  } catch {
    // A shard that does not parse is a build problem, not a reader problem:
    // log it once and let the chapter render without references.
    console.warn(`[crossrefs] unparseable shard: ${file}`);
    return MISS;
  }
}

/**
 * Reads one shard, memoised per process.
 *
 * Returns null when the chapter has no shard - most chapters do have one, but
 * a chapter nobody has ever linked to has none, and that is a 200 with an empty
 * verse list, not a 404 (CROSS_LINKS_PLAN.md §3.2).
 */
export async function loadShard(
  profile: string,
  book: string,
  chapter: number,
): Promise<DecodedCrossRefShard | null> {
  const code = typeof book === 'string' ? book.trim().toUpperCase() : '';
  if (!isSafeProfile(profile) || !isSafeBook(code) || !isSafeChapter(chapter)) return null;

  const key = `${profile}/${code}/${chapter}`;
  const cached = touch(key);
  if (cached !== undefined) return cached === MISS ? null : cached;

  const pending = INFLIGHT.get(key);
  if (pending) {
    const entry = await pending;
    return entry === MISS ? null : entry;
  }

  // Shared so two concurrent requests for the same chapter parse the file once.
  const promise = readShard(profile, code, chapter)
    .then((entry) => {
      remember(key, entry);
      return entry;
    })
    .finally(() => {
      INFLIGHT.delete(key);
    });

  INFLIGHT.set(key, promise);
  const entry = await promise;
  return entry === MISS ? null : entry;
}
