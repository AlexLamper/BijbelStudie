import { cache } from "react";
import { getBibleBook, readerBookName } from "./content/bibleBooks";
import { getChapter } from "./local-data";
import { loadShard } from "./crossRefs/loadShard";
import { bookCodeFromIndex } from "./crossRefs/osis";
import { profileForVersion } from "./crossRefs/versionProfiles";
import {
  CHAPTER_PAGE_VERSION,
  parseSvChapter,
  selectChapterCrossRefs,
  type ChapterCrossRef,
  type ParsedChapter,
} from "./chapterPages";

/**
 * Server-side reads for the /bijbel/<slug>/<chapter> pages. These run at BUILD
 * time only: the pages are prerendered (force-static, dynamicParams false), so
 * no request ever reaches the filesystem through here.
 *
 * `cache` dedupes the read between generateMetadata and the page itself within
 * one render; lib/local-data.ts keeps its own per-process cache on top.
 */

/** The chapter's Statenvertaling text, overflow markers resolved. */
export const loadSvChapter = cache(
  async (slug: string, chapter: number): Promise<ParsedChapter> => {
    const book = getBibleBook(slug);
    if (!book) return { verses: [], blank: [], anomalies: [`unknown book ${slug}`] };
    // The version is the module constant, never a parameter: these pages show
    // the public-domain Statenvertaling and nothing else.
    const data = await getChapter(CHAPTER_PAGE_VERSION, readerBookName(book), chapter);
    return parseSvChapter(data?.verses, chapter);
  }
);

/**
 * The chapter's strongest cross-references, from the committed `sv` shards
 * under public/data/crossrefs/v1 (CC BY, attribution required on the page).
 */
export const loadChapterCrossRefs = cache(
  async (slug: string, chapter: number): Promise<ChapterCrossRef[]> => {
    const book = getBibleBook(slug);
    const code = book ? bookCodeFromIndex(book.position) : null;
    if (!book || !code) return [];
    const shard = await loadShard(profileForVersion(CHAPTER_PAGE_VERSION), code, chapter);
    return selectChapterCrossRefs(shard, book, chapter);
  }
);
