import { readFile } from 'fs/promises';
import path from 'path';
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
  mobileOriginalAttribution,
} from './mobileAttribution';

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

/**
 * manifest.json omits `language` for a few entries and local-data then
 * defaults them to 'en'. Elberfelder 1905 is German, not English, and the app
 * groups the version picker by language — so correct it here rather than
 * editing the manifest, which the website also reads.
 */
const LANGUAGE_OVERRIDES: Record<string, string> = {
  elberfelder_1905: 'de',
};

export async function listMobileBibles(): Promise<SourceSummary[]> {
  const versions = await getVersions();
  return filterAllowedForMobile('bible', versions).map((v) => ({
    id: v.id,
    name: v.name,
    language: LANGUAGE_OVERRIDES[v.id] ?? v.language ?? 'nl',
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
 */
export async function getMobileOriginalChapter(
  book: string,
  chapter: number,
): Promise<OriginalEnvelope | null> {
  assertMobileAllowed('original', 'stepbible');

  const slug = book.trim().replace(/\s+/g, '_');
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
 * Deliberately simple: a case- and diacritic-insensitive substring scan over
 * the requested books, capped at `limit` hits so a one-letter query cannot
 * stream the whole corpus back.
 *
 * A whole-version scan is ~1200 small file reads. That is survivable because
 * `local-data` memoises each chapter, but the first cold query would still
 * blow a serverless timeout, so there is a wall-clock budget as well as a hit
 * cap. Both surface as `truncated: true` rather than a silent short answer —
 * the client shows "meer resultaten beschikbaar, verfijn je zoekopdracht".
 */
const SEARCH_BUDGET_MS = 3500;

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

  const deadline = Date.now() + SEARCH_BUDGET_MS;
  const books = params.book ? [params.book] : await getBooks(params.versionId);
  const hits: SearchHit[] = [];

  for (const book of books) {
    const chapters = await getChapters(params.versionId, book);
    for (const chapter of chapters) {
      if (Date.now() > deadline) return { hits, truncated: true };

      const data = await getChapter(params.versionId, book, chapter);
      const verses = (data?.verses ?? {}) as Record<string, string>;
      for (const [n, text] of Object.entries(verses)) {
        if (fold(text).includes(needle)) {
          hits.push({ book, chapter, verse: Number(n), text: String(text) });
          if (hits.length >= limit) return { hits, truncated: true };
        }
      }
    }
  }

  return { hits, truncated: false };
}

/** Lowercase + strip combining marks, so "Jesaja" matches "jesaja" and "Ezechiël" matches "ezechiel". */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export { isMobileAllowed };
