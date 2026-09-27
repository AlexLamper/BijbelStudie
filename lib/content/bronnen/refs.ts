import { BIBLE_BOOKS, readerBookName } from "../bibleBooks";
import type { BibleBook } from "../bibleBooks/types";

/**
 * Parses the Scripture references printed in the confessions and catechism
 * booklets ("Rom. 14:7, 8", "1 Kor. 6:19, 20; 1 Petr. 1:18", "Ps. 51",
 * "Joh. 3:16-18") into book + chapter + verses. Pure, no I/O: the verse text is
 * attached separately (./load.ts), at build time.
 *
 * The rule for anything unclear is the same as lib/bookCanon.ts: no match is
 * better than a wrong match. A reference that does not parse is shown as the
 * printed text, unlinked.
 */

export interface ParsedRef {
  /** The part as printed, with the book name carried in when it was implied. */
  label: string;
  book: BibleBook;
  chapter: number;
  /** null = the whole chapter. */
  verses: number[] | null;
}

/** Lowercase, no diacritics, no dots, roman numerals to digits, single spaces. */
function normalise(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/^\s*iii\s+/, "3 ")
    .replace(/^\s*ii\s+/, "2 ")
    .replace(/^\s*i\s+/, "1 ")
    .replace(/^(\d)\s*/, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Spellings and abbreviations that prefix matching alone gets wrong or cannot
 * reach: ambiguous prefixes (fil, ez, jo…) and older/other spellings.
 */
const EXPLICIT: Record<string, string> = {
  fil: "filippenzen",
  filip: "filippenzen",
  filipp: "filippenzen",
  phil: "filippenzen",
  philipp: "filippenzen",
  eph: "efeziers",
  efeze: "efeziers",
  hoz: "hosea",
  petri: "petrus",
  ephes: "efeziers",
  math: "mattheus",
  act: "handelingen",
  esa: "jesaja",
  prov: "spreuken",
  eccl: "prediker",
  col: "colossenzen",
  filem: "filemon",
  film: "filemon",
  ez: "ezechiel",
  ezech: "ezechiel",
  ezr: "ezra",
  est: "esther",
  ps: "psalmen",
  psalm: "psalmen",
  psalmen: "psalmen",
  mt: "mattheus",
  mat: "mattheus",
  matt: "mattheus",
  matth: "mattheus",
  matteus: "mattheus",
  mk: "markus",
  mr: "markus",
  marc: "markus",
  marcus: "markus",
  lk: "lukas",
  luc: "lukas",
  lucas: "lukas",
  jh: "johannes",
  joh: "johannes",
  jak: "jakobus",
  jac: "jakobus",
  jacobus: "jakobus",
  op: "openbaring",
  openb: "openbaring",
  apoc: "openbaring",
  kol: "colossenzen",
  kolossenzen: "colossenzen",
  hebr: "hebreeen",
  heb: "hebreeen",
  richt: "richteren",
  ri: "richteren",
  pred: "prediker",
  hgl: "hooglied",
  hoogl: "hooglied",
  klaagl: "klaagliederen",
  zef: "zefanja",
  zeph: "zefanja",
  sef: "zefanja",
  hag: "haggai",
  mi: "micha",
  am: "amos",
  ob: "obadja",
  jon: "jona",
  jes: "jesaja",
  jer: "jeremia",
  // Numbered books: the number is kept, the name part is looked up.
  kor: "corinthiers",
  korinthe: "corinthiers",
  korintiers: "corinthiers",
  korinthiers: "corinthiers",
  cor: "corinthiers",
  thess: "thessalonicenzen",
  tess: "thessalonicenzen",
  th: "thessalonicenzen",
  tessalonicenzen: "thessalonicenzen",
  tim: "timotheus",
  petr: "petrus",
  pet: "petrus",
  pt: "petrus",
  sam: "samuel",
  kon: "koningen",
  kron: "kronieken",
  chron: "kronieken",
};

interface BookKey {
  /** Normalised name without the number, e.g. "corinthiers". */
  stem: string;
  number: number | null;
  book: BibleBook;
}

const KEYS: BookKey[] = BIBLE_BOOKS.map(book => {
  const n = normalise(book.name);
  const m = n.match(/^(\d) (.+)$/);
  return m
    ? { stem: m[2], number: Number(m[1]), book }
    : { stem: n, number: null, book };
});

/** The book a printed name ("1 Kor.", "Rom", "Openb.") refers to, or null. */
export function resolveBookName(printed: string): BibleBook | null {
  const n = normalise(printed);
  const m = n.match(/^(\d) (.+)$/);
  const number = m ? Number(m[1]) : null;
  let stem = m ? m[2] : n;
  if (!stem) return null;
  stem = EXPLICIT[stem] ?? stem;

  const candidates = KEYS.filter(key => key.number === number);
  const exact = candidates.find(key => key.stem === stem);
  if (exact) return exact.book;
  if (stem.length < 2) return null;
  const prefixed = candidates.filter(key => key.stem.startsWith(stem));
  return prefixed.length === 1 ? prefixed[0].book : null;
}

const DASH = /[-–—‑]/;

/** "7, 8", "16-18", "3 en 5", "1-3, 7" → [7, 8] … Null when anything is off. */
function parseVerses(spec: string): number[] | null {
  const items = spec
    .replace(/\s+en\s+/g, ",")
    // "14. 16, 17", "18 19": a stray full stop or bare space between verses.
    .replace(/(\d)\s*\.\s*(?=\d)/g, "$1,")
    .replace(/(\d)\s+(?=\d)/g, "$1,")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (items.length === 0) return null;
  const verses: number[] = [];
  for (const item of items) {
    const range = item.split(DASH).map(s => s.trim());
    if (range.length === 1 && /^\d+$/.test(range[0])) {
      verses.push(Number(range[0]));
    } else if (range.length === 2 && /^\d+$/.test(range[0]) && /^\d+$/.test(range[1])) {
      const from = Number(range[0]);
      const to = Number(range[1]);
      if (to < from || to - from > 60) return null;
      for (let v = from; v <= to; v++) verses.push(v);
    } else {
      return null;
    }
  }
  return [...new Set(verses)].sort((a, b) => a - b);
}

/**
 * One reference part: "Rom. 14:7, 8", "14:7" (book implied), "Ps. 51".
 * Returns the book name as printed (may be empty) and the chapter/verse part.
 */
const PART = /^\s*((?:[1-3]|i{1,3})?\s*\.?\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.\s]*?)?\s*(\d+)\s*(?::\s*([\d\s,.–—‑\-en]+?))?\s*[.;]?\s*$/i;

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };

function romanToInt(roman: string): number | null {
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const value = ROMAN[roman[i]];
    const next = ROMAN[roman[i + 1]] ?? 0;
    if (!value) return null;
    total += value < next ? -value : value;
  }
  return total > 0 ? total : null;
}

/**
 * Older printings number chapters in roman numerals ("Ps. CXLV: 15, 16").
 * Only a numeral AFTER the book name is a chapter; one before it ("II Tim.")
 * is the book's own number and is left for resolveBookName.
 */
function romanChapter(part: string): string {
  const m = part.match(/^(.*?[A-Za-zÀ-ÿ]\.?\s+)([IVXLC]+)\b(.*)$/);
  if (!m) return part;
  const n = romanToInt(m[2]);
  return n ? `${m[1]}${n}${m[3]}` : part;
}

/**
 * Printer's and scan slips in chapter/verse separators, seen in the church
 * editions this library is built from. Only applied to a part WITHOUT a colon,
 * so a well-formed reference is never touched:
 *   "Hebr. 7; 26, 27" (split above into "Hebr. 7" + "26, 27") is repaired by
 *   the caller; here "1 Tim. 2 6" and "Rom. 7. 7" become "2:6" / "7:7", and
 *   "2 Joh. vs. 9" (a one-chapter book) becomes "1:9".
 */
function misprint(part: string): string {
  if (part.includes(":")) return part;
  const vs = part.match(/^(.*?[A-Za-zÀ-ÿ]\.?)\s+vs\.?\s*(\d[\d\s,\-–]*)$/i);
  if (vs) return `${vs[1]} 1:${vs[2]}`;
  const spaced = part.match(/^(.*?[A-Za-zÀ-ÿ]\.?\s+)(\d+)\s*[.\s]\s*(\d+(?:\s*[,\-–]\s*\d+)*)$/);
  if (spaced) return `${spaced[1]}${spaced[2]}:${spaced[3]}`;
  return part;
}

/**
 * Splits a printed reference string into parts and parses each. A part with
 * no book name inherits the previous part's book ("Rom. 8:15; 5:1"). Parts
 * that do not parse are returned as `{ label }` only.
 */
export function parseRefs(printed: string): (ParsedRef | { label: string })[] {
  const out: (ParsedRef | { label: string })[] = [];
  let lastBook: BibleBook | null = null;
  let cleaned = printed
    .replace(/^\s*(vgl|zie|verg)\.?\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  // "Hebr. 7; 26, 27", "2 Tim. 2; 15": with no colon anywhere, a semicolon
  // followed by bare numbers is a misprinted chapter:verse colon.
  if (!cleaned.includes(":")) {
    cleaned = cleaned.replace(/^(.*?[A-Za-zÀ-ÿ]\.?\s*\d+)\s*;\s*(\d+(?:\s*[,\-–]\s*\d+)*)$/, "$1:$2");
  }

  const parts = cleaned
    // "1 Joh. 1:7 en 2:2": "en" before a chapter:verse starts a new part.
    .replace(/\s+en\s+(?=\d+\s*:)/g, ";")
    .split(";")
    // "Gen. 1 en 2", "Job 38 en 39": with no verses anywhere, "en" joins chapters.
    .flatMap(p => (p.includes(":") ? [p] : p.split(/\s+en\s+/)));

  for (const raw of parts) {
    const part = misprint(
      raw
        .trim()
        // "Matth. 22:37, enz.": the "and following" tail adds no verse.
        .replace(/,?\s*enz\.?$/i, "")
        // "Matth. 20:16b": half-verse letters point into the same verse.
        .replace(/(\d)[abc]\b/g, "$1")
        .replace(/\.$/, "")
        .trim(),
    );
    if (!part) continue;
    const m = romanChapter(part).match(PART);
    if (!m) {
      out.push({ label: part });
      continue;
    }
    const printedBook = (m[1] ?? "").trim();
    const book = printedBook ? resolveBookName(printedBook) : lastBook;
    const chapter = Number(m[2]);
    if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
      out.push({ label: part });
      continue;
    }
    lastBook = book;
    let verses: number[] | null = null;
    if (m[3]) {
      verses = parseVerses(m[3]);
      if (!verses) {
        out.push({ label: part });
        continue;
      }
    }
    const label = printedBook ? part : `${shortBookLabel(book)} ${part}`;
    out.push({ label, book, chapter, verses });
  }
  return out;
}

/** The book as the reader expects it, re-exported so callers need one import. */
export function readerBookFor(book: BibleBook): string {
  return readerBookName(book);
}

function shortBookLabel(book: BibleBook): string {
  return book.slug === "psalmen" ? "Ps." : book.name;
}

/** "Romeinen 14:7-8", for headings and aria labels. */
export function fullRefLabel(book: BibleBook, chapter: number, verses: number[] | null): string {
  const name = book.slug === "psalmen" ? "Psalm" : book.name;
  if (!verses || verses.length === 0) return `${name} ${chapter}`;
  const runs: string[] = [];
  let start = verses[0];
  let prev = verses[0];
  for (const v of verses.slice(1).concat(Number.NaN)) {
    if (v === prev + 1) {
      prev = v;
      continue;
    }
    runs.push(start === prev ? String(start) : `${start}-${prev}`);
    start = v;
    prev = v;
  }
  return `${name} ${chapter}:${runs.join(", ")}`;
}
