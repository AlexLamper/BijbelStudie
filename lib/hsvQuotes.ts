/**
 * Server-side reader for the 50 licensed HSV verses. The licence rules, and
 * why there are only fifty, are in lib/hsvQuota.ts.
 *
 * The text lives in `private/data/bibles/hsv-quotes.json`, written by
 * `npm run hsv:quotes` into the private data repo and mirrored into ./private
 * at build time by scripts/sync-data.mjs. It is never a static asset and never
 * read over HTTP: no fallback fetch, unlike lib/local-data.ts, because there is
 * no URL this file should ever be reachable at.
 *
 * Everything that leaves this module is filtered through `isHsvAllowed` a
 * second time. The data file is already the allowlist made concrete, so that
 * filter is pure belt and braces - but it is the one line that guarantees a
 * larger file, dropped in by hand or by a future generator bug, still cannot
 * put a fifty-first verse on the wire.
 */
// Server-only by construction: the module reads node:fs at the top level, so a
// client bundle that imported it would fail to build. (The `server-only`
// package is not a dependency of this project; this comment is the contract.)
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { canonicalBookName, CANONICAL_NL } from './book-mapping';
import {
  HSV_ATTRIBUTION,
  HSV_MAX_VERSES,
  HSV_NAME,
  HSV_NOTICE,
  HSV_REFS,
  HSV_VERSION_ID,
  hsvKey,
  hsvReferenceList,
  isHsvAllowed,
} from './hsvQuota';

type QuoteFile = {
  versionId?: string;
  name?: string;
  attribution?: string;
  verses?: Record<string, string>;
};

const FILE = path.join(process.cwd(), 'private', 'data', 'bibles', 'hsv-quotes.json');

let cache: Record<string, string> | null = null;
let loaded = false;

async function load(): Promise<Record<string, string>> {
  if (loaded && cache) return cache;
  try {
    const raw = await fs.readFile(FILE, 'utf-8');
    const parsed: QuoteFile = JSON.parse(raw);
    const verses: Record<string, string> = {};
    for (const [key, text] of Object.entries(parsed.verses ?? {})) {
      const match = /^(.+)\s+(\d+):(\d+)$/.exec(key);
      if (!match) continue;
      if (!isHsvAllowed(match[1], match[2], match[3])) continue;
      if (typeof text === 'string' && text.trim()) verses[key] = text.trim();
    }
    cache = verses;
  } catch {
    // Missing file = a local checkout without the private data, or a build that
    // ran without GITHUB_TOKEN. The feature disappears; nothing else breaks.
    cache = {};
  }
  loaded = true;
  return cache;
}

export type HsvVerse = { verse: number; text: string };

export type HsvChapterQuotes = {
  versionId: string;
  name: string;
  /** Canonical Dutch book name, as the reader sees it. */
  book: string;
  chapter: number;
  verses: HsvVerse[];
  attribution: string;
  notice: string;
};

/** The verses of this chapter that are on the list. Empty array, never null. */
export async function getHsvChapterQuotes(
  book: string | null | undefined,
  chapter: number,
): Promise<HsvChapterQuotes | null> {
  const canonical = canonicalBookName(book);
  if (!canonical || !Number.isInteger(chapter) || chapter < 1) return null;

  const all = await load();
  const verses: HsvVerse[] = [];
  for (const [key, text] of Object.entries(all)) {
    const match = /^(.+)\s+(\d+):(\d+)$/.exec(key);
    if (!match || match[1] !== canonical || Number(match[2]) !== chapter) continue;
    verses.push({ verse: Number(match[3]), text });
  }
  verses.sort((a, b) => a.verse - b.verse);

  return {
    versionId: HSV_VERSION_ID,
    name: HSV_NAME,
    book: CANONICAL_NL[canonical] ?? canonical,
    chapter,
    verses,
    attribution: HSV_ATTRIBUTION,
    notice: HSV_NOTICE,
  };
}

/** One verse, or null when it is not one of the fifty. */
export async function getHsvVerse(
  book: string | null | undefined,
  chapter: number,
  verse: number,
): Promise<string | null> {
  const canonical = canonicalBookName(book);
  if (!canonical || !isHsvAllowed(canonical, chapter, verse)) return null;
  const all = await load();
  return all[hsvKey(canonical, chapter, verse)] ?? null;
}

/**
 * The index: which verses exist, with no text at all. A reference is a
 * coordinate, not a quotation, so this costs nothing against the allowance and
 * lets a client draw the HSV control without fetching anything.
 */
export function hsvIndex() {
  return {
    versionId: HSV_VERSION_ID,
    name: HSV_NAME,
    attribution: HSV_ATTRIBUTION,
    notice: HSV_NOTICE,
    maxVerses: HSV_MAX_VERSES,
    /** Display references, Dutch: "Johannes 3:16". */
    references: hsvReferenceList(),
    /**
     * The same coordinates, structured and in both spellings, because a client
     * asks with whatever book name the translation it is reading uses - Dutch
     * in the Statenvertaling, English in the King James.
     */
    verses: HSV_REFS.map((ref) => ({
      book: ref.book,
      bookNl: ref.bookNl,
      chapter: ref.chapter,
      verse: ref.verse,
    })),
  };
}
