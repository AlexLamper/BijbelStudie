import { readFile } from 'fs/promises';
import path from 'path';
import { normalizeBookName } from './book-mapping';
import {
  getBooks,
  getChapter,
  getChapters,
  getCommentaries,
  getCommentary,
  getVersions,
} from './local-data';
import {
  assertMobileAllowed,
  filterAllowedForMobile,
  isMobileAllowed,
} from './mobileLicensing';
import {
  mobileBibleAttribution,
  mobileCommentaryAttribution,
  mobileCrossRefAttribution,
  mobileOriginalAttribution,
} from './mobileAttribution';
// Cross-reference foundation, owned by lib/crossRefs and fed by the committed
// shards under public/data/crossrefs/v1.
import {
  bookNameLookupFrom,
  canonicalDutchBookName,
  formatCrossRefLabel,
  type BookNameLookup,
} from './crossRefs/format';
import { loadShard } from './crossRefs/loadShard';
import { bookCodeFromIndex } from './crossRefs/osis';
import type { CrossRef } from './crossRefs/types';
import { numberingMayDiffer, profileForVersion } from './crossRefs/versionProfiles';
import { toAnyBookCode, toBookIndex } from './readChaptersCanon';

/**
 * The mobile view of the content store.
 *
 * Every exported function here calls `assertMobileAllowed` before it touches
 * `local-data`, so there is exactly one way for the app to reach scripture and
 * it always passes the licensing gate first.
 */

export type Verse = { n: number; t: string };

export type ChapterEnvelope = {
  id: string;
  book: string;
  chapter: number;
  verses: Verse[];
  attribution: string;
  updatedAt: string;
};

export type SourceSummary = {
  id: string;
  name: string;
  language: string;
  attribution: string;
};

/**
 * The corpus is static files baked into the deployment, so "when did this
 * change" is "when was this deployed". Vercel exposes the commit sha; locally
 * fall back to process start so a dev restart invalidates client caches.
 */
const DEPLOY_TIME = new Date().toISOString();

export function contentUpdatedAt(): string {
  return DEPLOY_TIME;
}

function versesToList(verses: Record<string, string> | null | undefined): Verse[] {
  if (!verses) return [];
  return Object.entries(verses)
    .map(([n, t]) => ({ n: Number(n), t: String(t) }))
    .filter((v) => Number.isFinite(v.n))
    .sort((a, b) => a.n - b.n);
}

export async function listMobileBibles(): Promise<SourceSummary[]> {
  const versions = await getVersions();
  return filterAllowedForMobile('bible', versions).map((v) => ({
    id: v.id,
    name: v.name,
    // manifest.json omits `language` for a few entries and local-data then
    // defaults them to 'en'. Every entry the mobile allowlist admits does
    // declare one, so no per-id correction is needed here.
    language: v.language ?? 'nl',
    attribution: mobileBibleAttribution(v.id),
  }));
}

export async function listMobileCommentaries(): Promise<SourceSummary[]> {
  const commentaries = await getCommentaries();
  return filterAllowedForMobile('commentary', commentaries).map((c) => ({
    id: c.id,
    name: c.name,
    language: c.language ?? 'nl',
    attribution: mobileCommentaryAttribution(c.id),
  }));
}

export async function listMobileBibleBooks(versionId: string): Promise<string[]> {
  assertMobileAllowed('bible', versionId);
  return getBooks(versionId);
}

export async function listMobileBibleChapters(
  versionId: string,
  book: string,
): Promise<number[]> {
  assertMobileAllowed('bible', versionId);
  return getChapters(versionId, book);
}

export async function getMobileBibleChapter(
  versionId: string,
  book: string,
  chapter: number,
): Promise<ChapterEnvelope | null> {
  assertMobileAllowed('bible', versionId);
  const data = await getChapter(versionId, book, chapter);
  const verses = versesToList(data?.verses as Record<string, string> | undefined);
  if (verses.length === 0) return null;

  return {
    id: versionId,
    book,
    chapter,
    verses,
    attribution: mobileBibleAttribution(versionId),
    updatedAt: contentUpdatedAt(),
  };
}

export async function listMobileCommentaryBooks(commentaryId: string): Promise<string[]> {
  assertMobileAllowed('commentary', commentaryId);
  return getBooks(commentaryId);
}

export async function getMobileCommentaryChapter(
  commentaryId: string,
  book: string,
  chapter: number,
): Promise<ChapterEnvelope | null> {
  assertMobileAllowed('commentary', commentaryId);
  const verses = versesToList(
    (await getCommentary(commentaryId, book, chapter)) as Record<string, string> | null,
  );
  if (verses.length === 0) return null;

  return {
    id: commentaryId,
    book,
    chapter,
    verses,
    attribution: mobileCommentaryAttribution(commentaryId),
    updatedAt: contentUpdatedAt(),
  };
}

export type OriginalWord = { h: string; t: string; e: string; s: string };

export type OriginalEnvelope = {
  id: 'stepbible';
  book: string;
  chapter: number;
  verses: Array<{ n: number; words: OriginalWord[] }>;
  attribution: string;
  updatedAt: string;
};

/**
 * STEPBible originals live at /public/data/original/<Book_Slug>/<chapter>.json
 * with spaces replaced by underscores. Read directly rather than through
 * local-data, whose parsers assume a verse-string shape this data does not have.
 *
 * The slug is ENGLISH - `Judges`, `1_Samuel`, `Song_of_Solomon` - while the app
 * addresses chapters by the book name of the translation it is reading, which
 * for every Dutch version is Dutch. Slugifying that name directly (what this
 * did before) only ever hit the handful of books whose Dutch name happens to be
 * spelled the same, and the diacritic ones ("1 Samuël", "Mattheüs") failed the
 * character check outright, so the Grondtekst tab was empty for most of the
 * canon. `normalizeBookName` is the same Dutch → English map the website's
 * `OriginalText.tsx` uses, so both surfaces now resolve identically.
 */
export async function getMobileOriginalChapter(
  book: string,
  chapter: number,
): Promise<OriginalEnvelope | null> {
  assertMobileAllowed('original', 'stepbible');

  const slug = normalizeBookName(book.trim()).replace(/\s+/g, '_');
  // Reject traversal before it reaches the filesystem: the book name comes
  // straight off the URL.
  if (!/^[A-Za-z0-9_]+$/.test(slug)) return null;

  const file = path.join(process.cwd(), 'public', 'data', 'original', slug, `${chapter}.json`);
  let raw: string;
  try {
    raw = await readFile(file, 'utf-8');
  } catch {
    return null;
  }

  const parsed = JSON.parse(raw) as Record<string, OriginalWord[]>;
  const verses = Object.entries(parsed)
    .map(([n, words]) => ({ n: Number(n), words: Array.isArray(words) ? words : [] }))
    .filter((v) => Number.isFinite(v.n))
    .sort((a, b) => a.n - b.n);

  if (verses.length === 0) return null;

  return {
    id: 'stepbible',
    book,
    chapter,
    verses,
    attribution: mobileOriginalAttribution(),
    updatedAt: contentUpdatedAt(),
  };
}

export type SearchHit = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

/**
 * Server-side full-text search over one allowlisted translation.
 *
 * Deliberately simple: a case- and diacritic-insensitive substring scan,
 * capped at `limit` hits so a one-letter query cannot stream the whole corpus
 * back. `truncated: true` means there were more - the client shows "meer
 * resultaten beschikbaar, verfijn je zoekopdracht".
 *
 * A whole-version search runs over [loadSearchIndex], built once per instance.
 * It used to walk the chapter files one by one against a 3.5 s wall clock, and
 * a cold instance ran out of time around the historical books: "liefde" came
 * back with four hits from 1 Samuël and "apostel" with none at all, because the
 * New Testament was never reached - while a warm instance answered the same
 * query in full. One book is small enough to read directly.
 */
const BOOK_SEARCH_BUDGET_MS = 3500;

export async function searchMobileBible(params: {
  versionId: string;
  query: string;
  book?: string | null;
  limit?: number;
}): Promise<{ hits: SearchHit[]; truncated: boolean }> {
  assertMobileAllowed('bible', params.versionId);

  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const needle = fold(params.query);
  if (needle.length < 2) return { hits: [], truncated: false };

  if (!params.book) {
    const index = await loadSearchIndex(params.versionId);
    const hits: SearchHit[] = [];
    for (const entry of index) {
      if (!entry.folded.includes(needle)) continue;
      if (hits.length >= limit) return { hits, truncated: true };
      hits.push({ book: entry.book, chapter: entry.chapter, verse: entry.verse, text: entry.text });
    }
    return { hits, truncated: false };
  }

  const deadline = Date.now() + BOOK_SEARCH_BUDGET_MS;
  const hits: SearchHit[] = [];
  for (const chapter of await getChapters(params.versionId, params.book)) {
    if (Date.now() > deadline) return { hits, truncated: true };
    for (const entry of await readChapterVerses(params.versionId, params.book, chapter)) {
      if (!entry.folded.includes(needle)) continue;
      if (hits.length >= limit) return { hits, truncated: true };
      hits.push({ book: entry.book, chapter: entry.chapter, verse: entry.verse, text: entry.text });
    }
  }
  return { hits, truncated: false };
}

type IndexedVerse = SearchHit & { folded: string };

/**
 * Every verse of one translation in canonical order, with its folded text
 * beside it, so a query is one pass over memory rather than ~1200 file reads.
 * Kept for the life of the instance - the text does not change between
 * deploys - and shared by concurrent first queries. A failed build is dropped
 * so the next query tries again.
 *
 * One book at a time, its chapters in parallel. Reading all ~1200 chapter
 * files at once would hold ~1200 file descriptors open together (every open
 * is queued ahead of every read), past the 1024 a serverless function gets -
 * EMFILE, and the index would fail to build on every query. Per book the peak
 * is Psalms' 150.
 */
const searchIndexes = new Map<string, Promise<IndexedVerse[]>>();

function loadSearchIndex(versionId: string): Promise<IndexedVerse[]> {
  let pending = searchIndexes.get(versionId);
  if (!pending) {
    pending = (async () => {
      const index: IndexedVerse[] = [];
      for (const book of await getBooks(versionId)) {
        const chapters = await getChapters(versionId, book);
        const perChapter = await Promise.all(
          chapters.map((chapter) => readChapterVerses(versionId, book, chapter)),
        );
        for (const verses of perChapter) index.push(...verses);
      }
      return index;
    })();
    searchIndexes.set(versionId, pending);
    pending.catch(() => searchIndexes.delete(versionId));
  }
  return pending;
}

async function readChapterVerses(
  versionId: string,
  book: string,
  chapter: number,
): Promise<IndexedVerse[]> {
  const data = await getChapter(versionId, book, chapter);
  const verses = (data?.verses ?? {}) as Record<string, string>;
  return Object.entries(verses).map(([n, text]) => ({
    book,
    chapter,
    verse: Number(n),
    text: String(text),
    folded: fold(String(text)),
  }));
}

/** Lowercase + strip combining marks, so "Jesaja" matches "jesaja" and "Ezechiël" matches "ezechiel". */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Cross references (OpenBible.info, CC BY).
 *
 * References are verse *coordinates*, so one dataset serves every translation
 * and nothing here redistributes scripture text. What does differ per
 * translation is the numbering, and that is resolved at build time: the shards
 * are written once per versification profile, already renumbered, so no client
 * - not the website, not Dart - carries a mapping table.
 *
 * Book names are resolved here too, against the translation the reader is
 * actually in (`getBooks`), which is why the app needs no book-code table
 * either. A book that translation does not name falls back to the canonical
 * Dutch spelling rather than showing a bare OSIS code.
 */

/**
 * Mirrors `datasetVersion` in `public/data/crossrefs/v1/index.json`. It is not
 * the shard's own `v`, which is the *file format* version: a re-run with a
 * different vote threshold changes the data without changing the format.
 */
const CROSSREF_DATASET_VERSION = 1;

export type CrossRefTarget = {
  osis: string;
  book: string;
  chapter: number;
  verse: number;
  endChapter: number | null;
  endVerse: number | null;
  label: string;
  votes: number;
};

export type CrossRefVerse = { n: number; refs: CrossRefTarget[] };

export type CrossRefEnvelope = {
  id: 'openbible';
  datasetVersion: number;
  versification: string;
  version: string;
  book: string;
  osis: string;
  chapter: number;
  verses: CrossRefVerse[];
  numberingMayDiffer: boolean;
  attribution: string;
  updatedAt: string;
};

function toTarget(ref: CrossRef, books: BookNameLookup): CrossRefTarget | null {
  const osis = bookCodeFromIndex(ref.b);
  const label = formatCrossRefLabel(ref, books);
  // A ref whose book index does not resolve is corrupt shard data. Dropping it
  // is right: a reference the reader cannot follow is worse than one fewer.
  if (!osis || !label) return null;
  return {
    osis,
    book: books(ref.b) ?? canonicalDutchBookName(ref.b) ?? osis,
    chapter: ref.c,
    verse: ref.v,
    // Absent end fields are `null` rather than omitted, so a client rendering a
    // range has one shape to branch on.
    endChapter: ref.ec ?? null,
    endVerse: ref.ev ?? null,
    label,
    votes: ref.w,
  };
}

/**
 * Returns `null` only for a book or chapter that does not exist in this
 * translation - that is the 404. A real chapter that simply has no references
 * comes back with an empty `verses` array, because "nothing points here" is an
 * answer and caching it is the point.
 */
export async function getMobileCrossRefChapter(
  versionId: string,
  book: string,
  chapter: number,
): Promise<CrossRefEnvelope | null> {
  // Both gates, in this order: the dataset itself, then the translation whose
  // numbering the shard was built for and whose book names are rendered below.
  assertMobileAllowed('crossref', 'openbible');
  assertMobileAllowed('bible', versionId);

  const code = toAnyBookCode(book);
  if (!code) return null;

  const profile = profileForVersion(versionId);
  // Per book, because nbg51 rides on the sv shards and only parts company with
  // them in Haggai - see VERSION_BOOK_DEVIATIONS.
  const mayDiffer = numberingMayDiffer(versionId, code);
  const shard = await loadShard(profile, code, chapter);

  if (!shard) {
    // A missing shard is the normal state for a chapter nobody cross-references
    // and the abnormal state for a chapter that does not exist. Only the second
    // is a 404, so ask the translation which chapters it actually has.
    const chapters = await getChapters(versionId, book);
    if (!chapters.includes(chapter)) return null;
  }

  let verses: CrossRefVerse[] = [];
  if (shard && shard.verses.length > 0) {
    // The translation's own spelling, resolved by code rather than by position:
    // a version with a short or reordered book list must not shift every label.
    // Only built when there is something to label - a chapter with no refs must
    // not cost a book-index read.
    const books = bookNameLookupFrom(await getBooks(versionId), toBookIndex);
    verses = shard.verses
      .map((verse) => ({
        n: verse.n,
        refs: verse.refs
          .map((ref) => toTarget(ref, books))
          .filter((target): target is CrossRefTarget => target !== null),
      }))
      .filter((verse) => verse.refs.length > 0);
  }

  return {
    id: 'openbible',
    datasetVersion: CROSSREF_DATASET_VERSION,
    versification: profile,
    version: versionId,
    book,
    osis: code,
    chapter,
    verses,
    numberingMayDiffer: mayDiffer,
    attribution: mobileCrossRefAttribution(),
    updatedAt: contentUpdatedAt(),
  };
}

export { isMobileAllowed };
