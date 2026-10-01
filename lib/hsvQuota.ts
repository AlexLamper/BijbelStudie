/**
 * The Herziene Statenvertaling, inside the free-of-charge allowance its rights
 * holder grants - and not one verse past it.
 *
 * ── What Stichting HSV actually allows ───────────────────────────────────────
 *
 * The HSV text is copyrighted: (c) Stichting HSV, published by Royal Jongbloed.
 * The rules are published as a decision tree on herzienestatenvertaling.nl
 * ("Gebruik HSV Teksten", /over-hsv). Walked for this product:
 *
 *   1. "Gaat het om gebruik van de complete bijbelvertaling?"  -> Nee.
 *      (Yes would mean a contract via Royal Jongbloed / the Digital Bible
 *      Library. We do not have one, so we must stay firmly off that branch.)
 *   2. "Gaat het om gebruik > 50 bijbelverzen?"                -> Nee.
 *   3. Outcome (green): "Gebruik zonder kosten mits niet meer dan 50% van
 *      Bijbelboek of het werk waarin de tekst komt."
 *
 * And, above the whole tree: "NB: In alle gevallen is een bronvermelding
 * vereist: Copyright (c)2010/2016 Stichting HSV".
 *
 * Note which questions the tree does NOT ask on that branch: commercial use and
 * print-vs-digital are only asked once you are past 50 verses. At 50 or fewer,
 * free of charge, no contract - provided the 50% rule holds and the source is
 * named. That is the lane this product sits in, deliberately and permanently.
 *
 * ── How that is enforced here ────────────────────────────────────────────────
 *
 * The allowance is 50 verses for the *product*, not per request, per user or
 * per session. So the product contains a fixed, hand-picked list of 50 verses
 * (lib/data/hsv-allowlist.json) and nothing else: a scraper that walks every
 * endpoint we expose still ends up with those same 50 verses.
 *
 * Four rules, all machine-checked (tests/hsvQuota.test.ts and
 * scripts/build-hsv-quotes.mjs, which refuses to generate a file that breaks
 * any of them):
 *
 *   1. At most HSV_MAX_VERSES (50) verses in total, product-wide.
 *   2. At most 50% of any Bible book.
 *   3. At most 50% of any chapter. Self-imposed, stricter than the licence:
 *      the licence counts whole books, but 4 of the 6 verses of Psalm 23 is
 *      not what "a quotation" means to anyone.
 *   4. A visible source line wherever the text is rendered - HSV_ATTRIBUTION,
 *      reproduced exactly.
 *
 * The 50%-of-"het werk waarin de tekst komt" half of the rule is a UI
 * obligation, not a data one: HSV only ever appears as one verse inside a page
 * or sheet that is mostly our own material or another translation. There is
 * deliberately no HSV-only page, no HSV chapter view, and no HSV entry in the
 * translation picker - a page made of nothing but HSV text would be 100% HSV.
 *
 * Which is also why `hsv` is NOT in MOBILE_ALLOWED_BIBLES (lib/mobileLicensing.ts)
 * and never will be: the ordinary chapter routes must keep refusing it. HSV is
 * served by its own endpoints, which can only ever answer with verses on this
 * list - see lib/hsvQuotes.ts.
 *
 * Changing the list means changing what we distribute. If it ever needs to grow
 * past 50, that is a licence conversation with bijbels@jongbloedmedia.nl first,
 * code second.
 */
import { canonicalBookName, CANONICAL_NL } from './book-mapping';
import allowlist from './data/hsv-allowlist.json';

/** The id used in URLs and payloads. Never a manifest id - see the note above. */
export const HSV_VERSION_ID = 'hsv';

/** Display name, Dutch. */
export const HSV_NAME = 'Herziene Statenvertaling';

/** Badge code, matching the app's VersionCatalog._shortCodes. */
export const HSV_SHORT_CODE = 'HSV';

/**
 * The required source line, reproduced EXACTLY as Stichting HSV publishes it
 * ("In alle gevallen is een bronvermelding vereist: Copyright ©2010/2016
 * Stichting HSV"). Do not reword, retype the year range, or swap the ©.
 */
export const HSV_ATTRIBUTION = 'Copyright ©2010/2016 Stichting HSV';

/** The one-line explanation shown next to the attribution. */
export const HSV_NOTICE =
  'De HSV is auteursrechtelijk beschermd. Binnen de kosteloze regeling van '
  + 'Stichting HSV tonen we maximaal 50 verzen.';

/** The licence ceiling. 50 is allowed; 51 is a different branch of the tree. */
export const HSV_MAX_VERSES = 50;

/** No more than half of a book, and no more than half of a chapter. */
export const HSV_MAX_FRACTION = 0.5;

export type HsvRef = {
  /** Canonical English book name, as BIBLE_BOOKS_ORDER spells it. */
  book: string;
  /** Canonical Dutch book name, as the reader sees it. */
  bookNl: string;
  chapter: number;
  verse: number;
};

function parseRef(raw: string): HsvRef {
  const match = /^(.+)\s+(\d+):(\d+)$/.exec(raw.trim());
  if (!match) throw new Error(`[hsvQuota] not a reference: ${raw}`);
  const book = canonicalBookName(match[1]);
  if (!book) throw new Error(`[hsvQuota] unknown book: ${raw}`);
  return {
    book,
    bookNl: CANONICAL_NL[book] ?? match[1].trim(),
    chapter: Number(match[2]),
    verse: Number(match[3]),
  };
}

/** `"John 3:16"` - the key every lookup in this module and the data file uses. */
export function hsvKey(book: string, chapter: number | string, verse: number | string): string {
  return `${book} ${chapter}:${verse}`;
}

/** The 50 verses, in canonical order as authored. */
export const HSV_REFS: readonly HsvRef[] = Object.freeze(
  (allowlist.refs as string[]).map(parseRef),
);

/** Verse totals of the source text, for the books/chapters on the list only. */
export const HSV_BOOK_TOTALS: Readonly<Record<string, number>> =
  allowlist.bookVerseTotals as Record<string, number>;
export const HSV_CHAPTER_TOTALS: Readonly<Record<string, number>> =
  allowlist.chapterVerseTotals as Record<string, number>;

const KEYS: ReadonlySet<string> = new Set(
  HSV_REFS.map((ref) => hsvKey(ref.book, ref.chapter, ref.verse)),
);

/** True when this exact verse is one of the 50. Any book spelling is accepted. */
export function isHsvAllowed(
  book: string | null | undefined,
  chapter: number | string,
  verse: number | string,
): boolean {
  const canonical = canonicalBookName(book);
  if (!canonical) return false;
  const chapterNumber = Number(chapter);
  const verseNumber = Number(verse);
  if (!Number.isInteger(chapterNumber) || !Number.isInteger(verseNumber)) return false;
  return KEYS.has(hsvKey(canonical, chapterNumber, verseNumber));
}

/**
 * The verse numbers of this chapter that are on the list, ascending. Empty for
 * every chapter of the Bible but the handful the list touches - which is what
 * lets a client decide whether to draw the "HSV" control without asking for any
 * text.
 */
export function hsvVersesInChapter(
  book: string | null | undefined,
  chapter: number | string,
): number[] {
  const canonical = canonicalBookName(book);
  if (!canonical) return [];
  const chapterNumber = Number(chapter);
  if (!Number.isInteger(chapterNumber)) return [];
  return HSV_REFS
    .filter((ref) => ref.book === canonical && ref.chapter === chapterNumber)
    .map((ref) => ref.verse)
    .sort((a, b) => a - b);
}

/** The whole list as display references ("Johannes 3:16"), for an index payload. */
export function hsvReferenceList(): string[] {
  return HSV_REFS.map((ref) => `${ref.bookNl} ${ref.chapter}:${ref.verse}`);
}

export type HsvQuotaViolation = string;

/**
 * Every way the list could break the licence, as plain sentences. Empty means
 * compliant. Used by the test suite and by the build script, so the two can
 * never disagree about what the rules are.
 *
 * `totals` is optional only so a caller without the source data (the client
 * bundle) can still check the count; the book/chapter rules are skipped when
 * the totals for a book are missing, and the build script treats a missing
 * total as a failure of its own.
 */
export function hsvQuotaViolations(
  refs: readonly HsvRef[] = HSV_REFS,
  bookTotals: Readonly<Record<string, number>> = HSV_BOOK_TOTALS,
  chapterTotals: Readonly<Record<string, number>> = HSV_CHAPTER_TOTALS,
): HsvQuotaViolation[] {
  const problems: HsvQuotaViolation[] = [];

  if (refs.length > HSV_MAX_VERSES) {
    problems.push(`${refs.length} verzen staan op de lijst; het maximum is ${HSV_MAX_VERSES}.`);
  }

  const seen = new Set<string>();
  for (const ref of refs) {
    const key = hsvKey(ref.book, ref.chapter, ref.verse);
    if (seen.has(key)) problems.push(`${key} staat dubbel op de lijst.`);
    seen.add(key);
  }

  const perBook = new Map<string, number>();
  const perChapter = new Map<string, number>();
  for (const ref of refs) {
    perBook.set(ref.book, (perBook.get(ref.book) ?? 0) + 1);
    const chapterKey = `${ref.book} ${ref.chapter}`;
    perChapter.set(chapterKey, (perChapter.get(chapterKey) ?? 0) + 1);
  }

  for (const [book, used] of perBook) {
    const total = bookTotals[book];
    if (typeof total !== 'number' || total <= 0) continue;
    if (used > total * HSV_MAX_FRACTION) {
      problems.push(`${book}: ${used} van ${total} verzen is meer dan 50% van het bijbelboek.`);
    }
  }

  for (const [chapterKey, used] of perChapter) {
    const total = chapterTotals[chapterKey];
    if (typeof total !== 'number' || total <= 0) continue;
    if (used > total * HSV_MAX_FRACTION) {
      problems.push(`${chapterKey}: ${used} van ${total} verzen is meer dan 50% van het hoofdstuk.`);
    }
  }

  return problems;
}
