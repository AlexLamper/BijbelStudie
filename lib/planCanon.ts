import { CHAPTER_COUNTS } from './data/bible-chapter-counts';
import { BIBLE_BOOKS_ORDER, CANONICAL_NL, bookNameMap } from './book-mapping';

/**
 * One canon table for the plan feature.
 *
 * The repo carries four disagreeing book lists. `CHAPTER_COUNTS` is the only
 * chapter-count source but spells three books differently from `CANONICAL_NL`,
 * which is the spelling the Statenvertaling data folders and every
 * `/studie?book=` link actually use. Looking a chapter count up by the display
 * name therefore returns `undefined` for those three, which is why the
 * dashboard heatmap shows "?" for 1 Corinthiërs.
 *
 * This module resolves both spellings to one entry so a generated plan always
 * links to a book that exists on disk and always knows how long it is.
 */

export type Testament = 'OT' | 'NT';

export type PlanCategory =
  | 'wet'
  | 'geschiedenis'
  | 'wijsheid'
  | 'psalmen'
  | 'proverbs'
  | 'profeten'
  | 'evangelie'
  | 'brieven'
  | 'apocalyps'
  | 'overig';

export type PlanBook = {
  /** Canonical English name — the key used by BIBLE_BOOKS_ORDER. */
  en: string;
  /** Display + data-folder name, i.e. the CANONICAL_NL spelling. */
  nl: string;
  chapters: number;
  testament: Testament;
  category: PlanCategory;
};

/**
 * Chapter counts for the books whose CANONICAL_NL spelling is missing from
 * CHAPTER_COUNTS. Same numbers, different key.
 */
const CHAPTER_COUNT_ALIASES: Record<string, string> = {
  '1 Corinthiërs': '1 Korinthe',
  '2 Corinthiër': '2 Korinthe',
  'Colossenzen': 'Kolossenzen',
};

const CATEGORY_BY_EN: Record<string, PlanCategory> = {
  Genesis: 'wet', Exodus: 'wet', Leviticus: 'wet', Numbers: 'wet', Deuteronomy: 'wet',
  Joshua: 'geschiedenis', Judges: 'geschiedenis', Ruth: 'geschiedenis',
  '1 Samuel': 'geschiedenis', '2 Samuel': 'geschiedenis',
  '1 Kings': 'geschiedenis', '2 Kings': 'geschiedenis',
  '1 Chronicles': 'geschiedenis', '2 Chronicles': 'geschiedenis',
  Ezra: 'geschiedenis', Nehemiah: 'geschiedenis', Esther: 'geschiedenis',
  Job: 'wijsheid', Psalms: 'psalmen', Proverbs: 'proverbs',
  Ecclesiastes: 'wijsheid', 'Song of Solomon': 'wijsheid',
  Isaiah: 'profeten', Jeremiah: 'profeten', Lamentations: 'profeten',
  Ezekiel: 'profeten', Daniel: 'profeten', Hosea: 'profeten', Joel: 'profeten',
  Amos: 'profeten', Obadiah: 'profeten', Jonah: 'profeten', Micah: 'profeten',
  Nahum: 'profeten', Habakkuk: 'profeten', Zephaniah: 'profeten',
  Haggai: 'profeten', Zechariah: 'profeten', Malachi: 'profeten',
  Matthew: 'evangelie', Mark: 'evangelie', Luke: 'evangelie', John: 'evangelie',
  Acts: 'geschiedenis',
  Romans: 'brieven', '1 Corinthians': 'brieven', '2 Corinthians': 'brieven',
  Galatians: 'brieven', Ephesians: 'brieven', Philippians: 'brieven',
  Colossians: 'brieven', '1 Thessalonians': 'brieven', '2 Thessalonians': 'brieven',
  '1 Timothy': 'brieven', '2 Timothy': 'brieven', Titus: 'brieven',
  Philemon: 'brieven', Hebrews: 'brieven', James: 'brieven',
  '1 Peter': 'brieven', '2 Peter': 'brieven', '1 John': 'brieven',
  '2 John': 'brieven', '3 John': 'brieven', Jude: 'brieven',
  Revelation: 'apocalyps',
};

const NT_START_INDEX = BIBLE_BOOKS_ORDER.indexOf('Matthew');

function chapterCountFor(nl: string): number {
  return CHAPTER_COUNTS[nl] ?? CHAPTER_COUNTS[CHAPTER_COUNT_ALIASES[nl]] ?? 0;
}

/** All 66 books in canonical order, each with a usable name and length. */
export const PLAN_BOOKS: PlanBook[] = BIBLE_BOOKS_ORDER.map((en, index) => {
  const nl = CANONICAL_NL[en] ?? en;
  return {
    en,
    nl,
    chapters: chapterCountFor(nl),
    testament: index >= NT_START_INDEX ? ('NT' as const) : ('OT' as const),
    category: CATEGORY_BY_EN[en] ?? 'overig',
  };
});

const BY_KEY = new Map<string, PlanBook>();
for (const book of PLAN_BOOKS) {
  BY_KEY.set(book.en.toLowerCase(), book);
  BY_KEY.set(book.nl.toLowerCase(), book);
}
// Every Dutch/German spelling the repo has ever accepted, folded onto the same
// entry, so a plan built from a legacy book name still resolves.
for (const [alias, english] of Object.entries(bookNameMap)) {
  const book = BY_KEY.get(String(english).toLowerCase());
  if (book) BY_KEY.set(alias.toLowerCase(), book);
}

/** Accepts any Dutch or English spelling the repo uses. Null when unknown. */
export function resolvePlanBook(name: string | null | undefined): PlanBook | null {
  if (!name) return null;
  return BY_KEY.get(name.trim().toLowerCase()) ?? null;
}

/** Canonical position, for "what comes after Job?". */
export function planBookIndex(book: PlanBook): number {
  return BIBLE_BOOKS_ORDER.indexOf(book.en);
}

export function nextPlanBook(book: PlanBook): PlanBook | null {
  const next = planBookIndex(book) + 1;
  return next < PLAN_BOOKS.length ? PLAN_BOOKS[next] : null;
}

export const CATEGORY_LABELS: Record<PlanCategory, string> = {
  wet: 'Wet',
  geschiedenis: 'Geschiedenis',
  wijsheid: 'Wijsheid',
  psalmen: 'Psalmen',
  proverbs: 'Spreuken',
  profeten: 'Profeten',
  evangelie: 'Evangelie',
  brieven: 'Brieven',
  apocalyps: 'Apocalyps',
  overig: 'Overig',
};
