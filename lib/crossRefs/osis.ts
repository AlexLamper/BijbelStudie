/**
 * OSIS reference parsing for the OpenBible.info cross-reference dataset.
 *
 * The source file is tab separated:
 *
 * ```
 * From Verse	To Verse	Votes
 * Gen.1.1	Rev.3.14	47
 * Gen.1.1	Rom.1.19-Rom.1.20	59
 * Matt.5.1	Matt.5.1-Matt.7.29	12
 * ```
 *
 * The `From Verse` column is always a single verse; `To Verse` may be a range,
 * and that range may cross a chapter (`Heb.6.20-Heb.7.3`) or - in exactly 18 of
 * the 344,799 data rows - a book (`Lev.27.34-Num.1.1`, `2Chr.36.22-Ezra.1.3`).
 * Cross-book ranges have no place in the shard model, so `crossRefFromOsis`
 * refuses them and the build script counts the drop.
 *
 * Nothing in this module throws: the dataset is third-party text that changes
 * between releases, and a malformed row must cost one skipped reference, not a
 * failed build or a 500 on a reader's chapter.
 */

import type { BookCode, CrossRef, CrossRefTuple } from './types';

/**
 * OpenBible's OSIS book ids, in canonical order.
 *
 * Verified against the real dataset: `cut -f1 cross_references.txt | cut -d. -f1
 * | sort -u` yields exactly these 66 ids (plus the header line), and so does
 * column 2. Upper-casing an id gives the project's book code 1:1
 * (`1Thess` -> `1THESS`, `Phlm` -> `PHLM`), which is what `CODES_IN_ORDER` in
 * `lib/readChaptersCanon.ts` already uses - that identity is asserted in
 * `tests/crossRefsBooks.test.ts`.
 */
export const OSIS_BOOK_IDS = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam',
  '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov',
  'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos',
  'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal',
  'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph',
  'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb',
  'Jas', '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev',
] as const;

export type OsisBookId = (typeof OSIS_BOOK_IDS)[number];

/** Lower-cased OSIS id -> canonical code. Case-insensitive on purpose: other
 * OSIS producers write `PS`, `ps` or `Ps` for the same book. */
const OSIS_TO_CODE = new Map<string, BookCode>(
  OSIS_BOOK_IDS.map((id) => [id.toLowerCase(), id.toUpperCase() as BookCode]),
);

/** Canonical code -> the OSIS id OpenBible spells it with. */
const CODE_TO_OSIS = new Map<BookCode, OsisBookId>(
  OSIS_BOOK_IDS.map((id) => [id.toUpperCase() as BookCode, id]),
);

/** Canonical code -> 1-based book index. */
const CODE_TO_INDEX = new Map<BookCode, number>(
  OSIS_BOOK_IDS.map((id, i) => [id.toUpperCase() as BookCode, i + 1]),
);

/** True when `value` is one of the 66 canonical book codes, exactly spelled. */
export function isBookCode(value: unknown): value is BookCode {
  return typeof value === 'string' && CODE_TO_INDEX.has(value as BookCode);
}

/** The canonical book code for an OSIS book id, or null when unknown. */
export function osisBookToCode(id: string | null | undefined): BookCode | null {
  if (!id || typeof id !== 'string') return null;
  return OSIS_TO_CODE.get(id.trim().toLowerCase()) ?? null;
}

/** The OSIS book id for a canonical book code, or null when unknown. */
export function codeToOsisBook(code: string | null | undefined): OsisBookId | null {
  if (!code || typeof code !== 'string') return null;
  return CODE_TO_OSIS.get(code.trim().toUpperCase() as BookCode) ?? null;
}

/** The 1-based canonical book index (1 = Genesis, 66 = Openbaring), or null. */
export function bookIndexFromCode(code: string | null | undefined): number | null {
  if (!code || typeof code !== 'string') return null;
  return CODE_TO_INDEX.get(code.trim().toUpperCase() as BookCode) ?? null;
}

/** The canonical book code at a 1-based book index, or null when out of range. */
export function bookCodeFromIndex(index: number): BookCode | null {
  if (!Number.isInteger(index) || index < 1 || index > OSIS_BOOK_IDS.length) return null;
  return OSIS_BOOK_IDS[index - 1].toUpperCase() as BookCode;
}

/**
 * A parsed OSIS reference. The end fields are always filled in - a single verse
 * is a range of length one - so callers never branch on `undefined` while
 * comparing bounds. The optional-field form is `CrossRef`, produced by
 * `crossRefFromOsis`.
 */
export type OsisRef = {
  book: BookCode;
  chapter: number;
  verse: number;
  endBook: BookCode;
  endChapter: number;
  endVerse: number;
};

/** True when the range stays inside one book. */
export function isSingleBookRef(ref: OsisRef): boolean {
  return ref.book === ref.endBook;
}

/** True when the reference names exactly one verse. */
export function isSingleVerseRef(ref: OsisRef): boolean {
  return (
    ref.book === ref.endBook && ref.chapter === ref.endChapter && ref.verse === ref.endVerse
  );
}

/** A positive integer written in plain decimal digits - nothing else counts. */
function toPositiveInt(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

type Point = { code: BookCode; chapter: number; verse: number };

/** `Gen.1.1` -> a point. Null for anything else. */
function parsePoint(raw: string): Point | null {
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const code = osisBookToCode(parts[0]);
  if (!code) return null;
  const chapter = toPositiveInt(parts[1]);
  const verse = toPositiveInt(parts[2]);
  if (chapter === null || verse === null) return null;
  return { code, chapter, verse };
}

/**
 * The right-hand side of a range, which may drop repeated context:
 * `Gen.1.1-Gen.1.3` (full), `Gen.1.1-1.3` (same book), `Gen.1.1-3` (same
 * chapter). OpenBible always writes the full form; the short forms are accepted
 * because other OSIS producers use them and misreading `Gen.1.1-3` as "no end"
 * would silently shorten a passage.
 */
function parseEndPoint(raw: string, start: Point): Point | null {
  const parts = raw.split('.');
  if (parts.length === 3) return parsePoint(raw);
  if (parts.length === 2) {
    const chapter = toPositiveInt(parts[0]);
    const verse = toPositiveInt(parts[1]);
    if (chapter === null || verse === null) return null;
    return { code: start.code, chapter, verse };
  }
  if (parts.length === 1) {
    const verse = toPositiveInt(parts[0]);
    if (verse === null) return null;
    return { code: start.code, chapter: start.chapter, verse };
  }
  return null;
}

/**
 * Parses an OSIS reference or range. Returns null - never throws - for
 * anything that is not one: the header line, an empty cell, an unknown book, a
 * non-numeric chapter, a range that runs backwards.
 */
export function parseOsisRef(raw: string | null | undefined): OsisRef | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // No OSIS book id or number contains a hyphen, so the first one separates the
  // two ends of the range.
  const split = trimmed.indexOf('-');
  const startRaw = split === -1 ? trimmed : trimmed.slice(0, split);
  const endRaw = split === -1 ? null : trimmed.slice(split + 1);

  const start = parsePoint(startRaw);
  if (!start) return null;

  const end = endRaw === null ? start : parseEndPoint(endRaw, start);
  if (!end) return null;

  const startIdx = bookIndexFromCode(start.code);
  const endIdx = bookIndexFromCode(end.code);
  if (startIdx === null || endIdx === null) return null;

  // A range that runs backwards is corruption, not a reference.
  if (endIdx < startIdx) return null;
  if (endIdx === startIdx) {
    if (end.chapter < start.chapter) return null;
    if (end.chapter === start.chapter && end.verse < start.verse) return null;
  }

  return {
    book: start.code,
    chapter: start.chapter,
    verse: start.verse,
    endBook: end.code,
    endChapter: end.chapter,
    endVerse: end.verse,
  };
}

/** One parsed row of `cross_references.txt`. */
export type CrossRefRow = {
  from: OsisRef;
  to: OsisRef;
  /**
   * Votes exactly as the dataset states them - which includes zero and
   * negative values (1,242 rows). Pruning is the build script's decision, not
   * the parser's, so nothing is filtered here.
   */
  votes: number;
};

/**
 * Parses one tab-separated data row. Returns null for the header, blank lines,
 * comments and anything malformed.
 */
export function parseCrossRefRow(line: string | null | undefined): CrossRefRow | null {
  if (typeof line !== 'string') return null;
  const trimmed = line.replace(/\r$/, '').trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const cells = trimmed.split('\t');
  if (cells.length < 3) return null;

  const from = parseOsisRef(cells[0]);
  const to = parseOsisRef(cells[1]);
  if (!from || !to) return null;

  // The `From Verse` column is a single verse in every row of the dataset; a
  // range there would mean the file changed shape and the shard key would be
  // ambiguous, so it is rejected rather than guessed at.
  if (!isSingleVerseRef(from)) return null;

  const votesRaw = cells[2].trim();
  if (!/^-?\d+$/.test(votesRaw)) return null;
  const votes = Number(votesRaw);
  if (!Number.isSafeInteger(votes)) return null;

  return { from, to, votes };
}

/**
 * Turns a parsed target reference into the stored record.
 *
 * Returns null when the reference cannot be stored: votes below 1 (pruned per
 * §2.3) or a range spanning two books (no end-book field exists, and clamping
 * it to the first book would quietly point readers at the wrong passage).
 */
export function crossRefFromOsis(ref: OsisRef | null, votes: number): CrossRef | null {
  if (!ref) return null;
  if (!Number.isSafeInteger(votes) || votes < 1) return null;
  if (!isSingleBookRef(ref)) return null;

  const b = bookIndexFromCode(ref.book);
  if (b === null) return null;

  const out: CrossRef = { b, c: ref.chapter, v: ref.verse, w: votes };
  if (ref.endChapter !== ref.chapter) out.ec = ref.endChapter;
  if (ref.endChapter !== ref.chapter || ref.endVerse !== ref.verse) out.ev = ref.endVerse;
  return out;
}

/**
 * The compact tuple for a shard file: `[bookIdx, chapter, verse, endVerse|0,
 * votes, endChapter?]`. The sixth slot is written only for the rare
 * cross-chapter range, which keeps the average tuple at five numbers.
 */
export function encodeCrossRef(ref: CrossRef): CrossRefTuple {
  const hasEndChapter = typeof ref.ec === 'number' && ref.ec !== ref.c;
  const endVerse =
    typeof ref.ev === 'number' && (ref.ev !== ref.v || hasEndChapter) ? ref.ev : 0;
  if (hasEndChapter) {
    return [ref.b, ref.c, ref.v, endVerse, ref.w, ref.ec as number];
  }
  return [ref.b, ref.c, ref.v, endVerse, ref.w];
}

/** Reads a tuple back. Returns null for anything that is not a valid tuple. */
export function decodeCrossRef(tuple: unknown): CrossRef | null {
  if (!Array.isArray(tuple) || tuple.length < 5 || tuple.length > 6) return null;

  const [b, c, v, ev, w, ec] = tuple as number[];
  if (![b, c, v, w].every((n) => Number.isInteger(n) && n >= 1)) return null;
  if (!Number.isInteger(ev) || ev < 0) return null;
  if (ec !== undefined && (!Number.isInteger(ec) || ec < 0)) return null;
  if (bookCodeFromIndex(b) === null) return null;

  const out: CrossRef = { b, c, v, w };
  // A `0` sixth slot, or one equal to the start chapter, means "same chapter".
  if (ec && ec !== c) {
    if (ec < c) return null;
    out.ec = ec;
  }
  if (ev && (ev !== v || out.ec !== undefined)) out.ev = ev;
  // Same-chapter range that runs backwards: corruption, not a reference.
  if (out.ec === undefined && out.ev !== undefined && out.ev < v) return null;
  return out;
}
