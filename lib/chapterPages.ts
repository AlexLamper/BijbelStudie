import type { MetadataRoute } from "next";
import { BIBLE_BOOKS, getBibleBook, type BibleBook, type OutlineSection } from "./content/bibleBooks";
import { formatCrossRefRange } from "./crossRefs/format";
import type { CrossRef, DecodedCrossRefShard } from "./crossRefs/types";

/**
 * The public chapter pages, /bijbel/<slug>/<chapter>: one indexable page per
 * chapter of the Bible, 1,189 in all, with the full chapter text.
 *
 * TRANSLATION: Statenvertaling, and only the Statenvertaling. It is the one
 * Dutch translation on disk that is public domain; NBG51, NET, Schlachter and
 * KingComments are licensed and HSV / BasisBijbel may never ship at all (see
 * CLAUDE.md). The version id is a constant here, not a parameter, so no caller
 * can point these pages at another source.
 *
 * Everything in this module is pure - no fs, no loaders - so app/sitemap.ts and
 * the tests can import it freely. The data side (reading the chapter, reading
 * the cross-reference shard) is lib/chapterPagesData.ts.
 */

/** The only translation these pages may show. */
export const CHAPTER_PAGE_VERSION = "statenvertaling" as const;

/** Content date of the chapter pages, for the sitemap and structured data. */
export const CHAPTER_PAGES_UPDATED = "2026-09-23";

/** How many cross-references a chapter page lists. */
export const CHAPTER_CROSSREF_LIMIT = 12;

/** Google shows ~60 characters of a title and ~155 of a description. */
export const TITLE_BRAND_PREFIX = "BijbelStudie | ";
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 155;

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** `/bijbel/<slug>/<chapter>` - the pattern /bijbelboeken/<slug> links to. */
export function chapterPagePath(slug: string, chapter: number): string {
  return `/bijbel/${slug}/${chapter}`;
}

/** Every page, for generateStaticParams. 1,189 entries in canonical order. */
export function chapterPageParams(): { slug: string; chapter: string }[] {
  return BIBLE_BOOKS.flatMap(book =>
    Array.from({ length: book.chapters }, (_, i) => ({
      slug: book.slug,
      chapter: String(i + 1),
    }))
  );
}

/**
 * The route params back to a book and chapter. Strict on purpose: "01", "1.0"
 * or "+1" would otherwise render a second URL for the same chapter.
 */
export function resolveChapterPage(
  slug: string,
  chapter: string
): { book: BibleBook; chapter: number } | null {
  const book = getBibleBook(slug);
  if (!book || !/^[1-9]\d{0,2}$/.test(chapter)) return null;
  const n = Number(chapter);
  return n <= book.chapters ? { book, chapter: n } : null;
}

/**
 * Sitemap entries for every chapter page. The main sitemap spreads this in;
 * the date is the content date, not the build date (see app/sitemap.ts on why
 * a lastmod that moves on every deploy teaches Google to ignore it).
 */
export function chapterSitemapEntries(baseUrl: string): MetadataRoute.Sitemap {
  const origin = baseUrl.replace(/\/+$/, "");
  const lastModified = new Date(CHAPTER_PAGES_UPDATED);
  return chapterPageParams().map(({ slug, chapter }) => ({
    url: `${origin}${chapterPagePath(slug, Number(chapter))}`,
    lastModified,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/**
 * How a chapter is named in Dutch: "Genesis 1", but "Psalm 23" - nobody writes
 * or searches "Psalmen 23".
 */
export function chapterLabel(book: BibleBook, chapter: number): string {
  return `${book.slug === "psalmen" ? "Psalm" : book.name} ${chapter}`;
}

/** The page title without the brand: "Genesis 1 - Statenvertaling". */
export function chapterPageTitle(book: BibleBook, chapter: number): string {
  const full = `${chapterLabel(book, chapter)} - Statenvertaling`;
  // Every book fits today (the longest, "1 Thessalonicenzen 5", comes to 53
  // with the brand); the short form only exists so a future rename cannot
  // push a title past what Google shows.
  return `${TITLE_BRAND_PREFIX}${full}`.length <= MAX_TITLE
    ? full
    : `${chapterLabel(book, chapter)} (SV)`;
}

/** The name a cross-reference target is printed with ("Psalm 51:3"). */
function referenceBookName(bookIndex: number): string | null {
  const book = BIBLE_BOOKS[bookIndex - 1];
  if (!book) return null;
  return book.slug === "psalmen" ? "Psalm" : book.name;
}

// ---------------------------------------------------------------------------
// Statenvertaling verse data
// ---------------------------------------------------------------------------

export interface ChapterVerse {
  /** Verse number in the Statenvertaling's own numbering. */
  n: number;
  text: string;
}

export interface ParsedChapter {
  /** Verses with text, ascending. Blank verses are left out, not flagged. */
  verses: ChapterVerse[];
  /** Verse numbers present in the data but without text of their own. */
  blank: number[];
  /**
   * Anything the parser had to guess at: a marker naming another chapter, a
   * verse number given twice. Empty for the whole corpus today; the tests
   * assert that, so a data change that breaks the rules fails loudly there
   * instead of quietly on a page.
   */
  anomalies: string[];
}

/**
 * The Statenvertaling export truncates every chapter to the KJV verse count
 * and appends the verses its own numbering has beyond that INSIDE the last
 * verse string, each one tagged with an English reference:
 *
 *   "...niet verachten. [ (Psalms 51:20) Doe wel bij Sion ... ] [ (Psalms 51:21) ... ]"
 *
 * 94 markers in 80 chapters (Psalm titles, Job 38-41, the Hebrew chapter cuts
 * in Hosea and Micah, 3 Johannes 15 ...). The book name is English and may
 * carry a roman numeral ("III John", "Revelation of John"), so the name part
 * is anything up to the chapter:verse pair. Same rule as
 * scripts/audit-versification.mjs, which counts 31,173 verses this way.
 *
 * The opposite case - the Statenvertaling has FEWER verses than the KJV (Job
 * 38, Acts 19, 2 Corinthiërs 13, the Hosea and Micah cuts: 23 verses in all) -
 * shows up as the chapter simply ending earlier. A key that is present but
 * empty is treated the same way: a verse merged into its neighbour, not an
 * error.
 */
const OVERFLOW_MARKER = /\[\s*\(\s*([^()]*?)\s*(\d+)\s*:\s*(\d+)\s*\)/g;

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Splits one stored verse string into its own text and any overflow verses. */
export function splitOverflow(text: string): {
  head: string;
  overflow: { chapter: number; verse: number; text: string }[];
} {
  const matches = [...text.matchAll(OVERFLOW_MARKER)];
  if (matches.length === 0) return { head: clean(text), overflow: [] };

  const overflow = matches.map((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? text.length : text.length;
    // The segment runs to the next marker; its own closing bracket is the
    // last character of it. Only that one is removed, so a bracket inside the
    // verse text (none today) would survive.
    const body = text.slice(start, end).trim().replace(/\]$/, "");
    return { chapter: Number(match[2]), verse: Number(match[3]), text: clean(body) };
  });

  return { head: clean(text.slice(0, matches[0].index ?? 0)), overflow };
}

/**
 * One chapter as the loader returns it (`{ "1": "...", "2": "..." }`) to the
 * verse list the page renders, in Statenvertaling numbering.
 */
export function parseSvChapter(raw: unknown, chapter: number): ParsedChapter {
  const byNumber = new Map<number, string>();
  const anomalies: string[] = [];

  const put = (n: number, text: string) => {
    if (!Number.isInteger(n) || n < 1) {
      anomalies.push(`invalid verse number ${n}`);
      return;
    }
    if (byNumber.has(n)) {
      anomalies.push(`verse ${n} given twice`);
      if (!byNumber.get(n) && text) byNumber.set(n, text);
      return;
    }
    byNumber.set(n, text);
  };

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter(key => /^\d+$/.test(key))
      .map(Number)
      .sort((a, b) => a - b);

    for (const key of keys) {
      const value = record[String(key)];
      const { head, overflow } = splitOverflow(typeof value === "string" ? value : "");
      put(key, head);
      for (const extra of overflow) {
        if (extra.chapter !== chapter) {
          anomalies.push(`marker in chapter ${chapter} names ${extra.chapter}:${extra.verse}`);
        }
        put(extra.verse, extra.text);
      }
    }
  }

  const ordered = [...byNumber.entries()].sort((a, b) => a[0] - b[0]);
  return {
    verses: ordered.filter(([, text]) => text).map(([n, text]) => ({ n, text })),
    blank: ordered.filter(([, text]) => !text).map(([n]) => n),
    anomalies,
  };
}

// ---------------------------------------------------------------------------
// Context around the text
// ---------------------------------------------------------------------------

function rangeContains(range: string, chapter: number): boolean {
  const m = range.match(/^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/);
  if (!m) return false;
  const from = Number(m[1]);
  const to = m[2] ? Number(m[2]) : from;
  return chapter >= from && chapter <= to;
}

/** The outline block(s) of the book this chapter falls in (ranges may touch). */
export function outlineSectionsFor(book: BibleBook, chapter: number): OutlineSection[] {
  return book.outline.filter(section => rangeContains(section.range, chapter));
}

/**
 * The book's key verses that sit in this chapter, as verse ranges in this
 * chapter's numbering. `keyVerses` is written in Statenvertaling numbering
 * ("Psalm 51:12"), so it lines up with the verse anchors on the page.
 */
export function keyVersesIn(
  book: BibleBook,
  chapter: number
): { ref: string; from: number; to: number }[] {
  const found: { ref: string; from: number; to: number }[] = [];
  for (const ref of book.keyVerses) {
    const m = ref.match(/(\d+):(\d+)(?:-(\d+))?\s*$/);
    if (!m || Number(m[1]) !== chapter) continue;
    const from = Number(m[2]);
    const to = m[3] ? Number(m[3]) : from;
    found.push({ ref, from, to: Math.max(from, to) });
  }
  return found;
}

/** "Oude Testament" / "Nieuwe Testament". */
export function testamentLabel(book: BibleBook): string {
  return book.testament === "oude-testament" ? "Oude Testament" : "Nieuwe Testament";
}

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

/** Cuts at a word boundary and marks the cut, within `max` characters. */
export function truncateWords(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  if (max <= 1) return "";
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,;:.!?-]+$/, "");
  return `${base}…`;
}

const TAIL_WITH_REFS = "Lees het hele hoofdstuk online, met context en kruisverwijzingen.";
const TAIL_SHORT = "Lees het hele hoofdstuk online, met context.";

/**
 * Meta description: the chapter's opening words, then what the page offers.
 * The opening words are what earns the click, so they get the room: the
 * longer tail is used only when the whole opening verse still fits beside it.
 * Always <= 155 characters.
 */
export function chapterDescription(
  book: BibleBook,
  chapter: number,
  verses: ChapterVerse[],
  hasCrossRefs: boolean
): string {
  const label = chapterLabel(book, chapter);
  const head = `${label} (Statenvertaling): `;
  const opening = (verses[0]?.text ?? "").replace(/\s+/g, " ").trim();
  // Two quotes and one space around the opening.
  const budgetWith = (tail: string) => MAX_DESCRIPTION - head.length - tail.length - 3;

  if (!opening) return truncateWords(`${label} uit de Statenvertaling. ${TAIL_SHORT}`, MAX_DESCRIPTION);
  if (hasCrossRefs && opening.length <= budgetWith(TAIL_WITH_REFS)) {
    return `${head}"${opening}" ${TAIL_WITH_REFS}`;
  }
  return `${head}"${truncateWords(opening, budgetWith(TAIL_SHORT))}" ${TAIL_SHORT}`;
}

// ---------------------------------------------------------------------------
// Cross-references (OpenBible.info, CC BY)
// ---------------------------------------------------------------------------

export interface ChapterCrossRef {
  /** Verse on this page the reference belongs to. */
  fromVerse: number;
  /** "Jesaja 1:18", "Mattheüs 5:1–7:29". */
  label: string;
  /** The target's chapter page, anchored at the verse. */
  href: string;
  votes: number;
}

/** At most this many of the listed references hang off one verse. */
export const CHAPTER_CROSSREFS_PER_VERSE = 3;

/**
 * The most-cited references of the chapter, deduplicated by target.
 *
 * The shard is the `sv` one: both ends are already in Statenvertaling
 * numbering, so the target anchors line up with the verse ids on the target
 * page. References into this same chapter are skipped - the page is already
 * showing that text - and so is anything the page set cannot link to. One
 * famous verse (Genesis 1:1, Psalm 51:12) would otherwise fill the whole list,
 * so each verse contributes at most CHAPTER_CROSSREFS_PER_VERSE.
 */
export function selectChapterCrossRefs(
  shard: DecodedCrossRefShard | null,
  book: BibleBook,
  chapter: number,
  limit = CHAPTER_CROSSREF_LIMIT,
  perVerse = CHAPTER_CROSSREFS_PER_VERSE
): ChapterCrossRef[] {
  if (!shard) return [];

  const best = new Map<string, { fromVerse: number; ref: CrossRef }>();
  for (const verse of shard.verses) {
    for (const ref of verse.refs) {
      if (ref.b === book.position && ref.c === chapter) continue;
      const target = BIBLE_BOOKS[ref.b - 1];
      if (!target || ref.c < 1 || ref.c > target.chapters || ref.v < 1) continue;
      const key = `${ref.b}.${ref.c}.${ref.v}`;
      const seen = best.get(key);
      if (!seen || ref.w > seen.ref.w) best.set(key, { fromVerse: verse.n, ref });
    }
  }

  const perVerseCount = new Map<number, number>();
  return [...best.values()]
    .sort(
      (a, b) =>
        b.ref.w - a.ref.w ||
        a.fromVerse - b.fromVerse ||
        a.ref.b - b.ref.b ||
        a.ref.c - b.ref.c ||
        a.ref.v - b.ref.v
    )
    .filter(({ fromVerse }) => {
      const used = perVerseCount.get(fromVerse) ?? 0;
      if (used >= perVerse) return false;
      perVerseCount.set(fromVerse, used + 1);
      return true;
    })
    .slice(0, limit)
    .flatMap(({ fromVerse, ref }) => {
      const target = BIBLE_BOOKS[ref.b - 1];
      const name = referenceBookName(ref.b);
      if (!target || !name) return [];
      return [
        {
          fromVerse,
          label: `${name} ${formatCrossRefRange(ref)}`,
          href: `${chapterPagePath(target.slug, ref.c)}#v${ref.v}`,
          votes: ref.w,
        },
      ];
    });
}
