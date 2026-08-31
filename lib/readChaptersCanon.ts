/**
 * Canonicalises the keys of a user's `readChapters` map.
 *
 * `POST /last-read` writes one key per book, and the key is whatever the
 * *translation being read* calls that book: the Statenvertaling folders say
 * "1 Corinthiërs" and (a real typo in the source data) "Numberi", an
 * English-keyed translation says "John", a German one "1 Mose". Both dashboards
 * — web (`app/dashboard/page.tsx`) and the app (`BibleBooks`) — look those keys
 * up against ONE fixed Dutch spelling set, so every chapter opened under a
 * different spelling is invisible: the "… van 66 boeken geopend" counter and
 * the 66-square heat map both under-report, badly for anyone reading a
 * non-Statenvertaling translation.
 *
 * This module folds every known spelling onto the canonical Dutch name the
 * dashboards use. It leans on `bookCanon` (diacritics, casing, the
 * Statenvertaling/quiz spelling split) and adds English/German names plus the
 * handful of malformed keys already sitting in the database.
 */

import { normaliseBookName, toBookCode, type BookCode } from './bookCanon';
import { BIBLE_BOOKS_ORDER, bookNameMap } from './book-mapping';

/** OSIS-ish codes in canonical order — the same order `bookCanon` assigns. */
const CODES_IN_ORDER: BookCode[] = [
  'GEN', 'EXOD', 'LEV', 'NUM', 'DEUT', 'JOSH', 'JUDG', 'RUTH', '1SAM', '2SAM',
  '1KGS', '2KGS', '1CHR', '2CHR', 'EZRA', 'NEH', 'ESTH', 'JOB', 'PS', 'PROV',
  'ECCL', 'SONG', 'ISA', 'JER', 'LAM', 'EZEK', 'DAN', 'HOS', 'JOEL', 'AMOS',
  'OBAD', 'JONAH', 'MIC', 'NAH', 'HAB', 'ZEPH', 'HAG', 'ZECH', 'MAL',
  'MATT', 'MARK', 'LUKE', 'JOHN', 'ACTS', 'ROM', '1COR', '2COR', 'GAL', 'EPH',
  'PHIL', 'COL', '1THESS', '2THESS', '1TIM', '2TIM', 'TITUS', 'PHLM', 'HEB',
  'JAS', '1PET', '2PET', '1JOHN', '2JOHN', '3JOHN', 'JUDE', 'REV',
];

/**
 * Canonical Dutch display name per code — spelled exactly as the two dashboards
 * spell it (`app/dashboard/page.tsx` OT/NT arrays; `BibleBooks` in the app).
 */
const NL_IN_ORDER: string[] = [
  'Genesis', 'Exodus', 'Leviticus', 'Numeri', 'Deuteronomium', 'Jozua',
  'Richteren', 'Ruth', '1 Samuël', '2 Samuël', '1 Koningen', '2 Koningen',
  '1 Kronieken', '2 Kronieken', 'Ezra', 'Nehemia', 'Esther', 'Job', 'Psalmen',
  'Spreuken', 'Prediker', 'Hooglied', 'Jesaja', 'Jeremia', 'Klaagliederen',
  'Ezechiël', 'Daniël', 'Hosea', 'Joël', 'Amos', 'Obadja', 'Jona', 'Micha',
  'Nahum', 'Habakuk', 'Zefanja', 'Haggaï', 'Zacharia', 'Maleachi', 'Mattheüs',
  'Markus', 'Lukas', 'Johannes', 'Handelingen', 'Romeinen', '1 Korinthe',
  '2 Korinthe', 'Galaten', 'Efeziërs', 'Filippenzen', 'Kolossenzen',
  '1 Thessalonicenzen', '2 Thessalonicenzen', '1 Timotheüs', '2 Timotheüs',
  'Titus', 'Filémon', 'Hebreeën', 'Jakobus', '1 Petrus', '2 Petrus',
  '1 Johannes', '2 Johannes', '3 Johannes', 'Judas', 'Openbaring',
];

const CODE_TO_NL: Record<string, string> = Object.fromEntries(
  CODES_IN_ORDER.map((code, i) => [code, NL_IN_ORDER[i]]),
);

/** English canon (`BIBLE_BOOKS_ORDER`) → code, by canonical position. */
const ENGLISH_TO_CODE: Record<string, BookCode> = Object.fromEntries(
  BIBLE_BOOKS_ORDER.map((en, i) => [normaliseBookName(en), CODES_IN_ORDER[i]]),
);

/**
 * Spellings neither `bookCanon` nor the English canon catches — every one of
 * these is a key that actually exists in the production `readChapters` data.
 */
const EXTRA_TO_CODE: Record<string, BookCode> = {
  numberi: 'NUM', // Statenvertaling source-data typo
  '1 corinthier': '1COR', // singular Statenvertaling variant
  '2 corinthier': '2COR',
  '1 corinthiers': '1COR',
  '2 corinthiers': '2COR',
  'canticum canticorum': 'SONG',
};

/**
 * The canonical Dutch name for a book, whatever translation spelled it, or
 * `null` when the name is not recognised (a made-up or deuterocanonical book).
 */
export function toCanonicalDutchBook(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string') return null;
  const key = normaliseBookName(name);
  // `bookNameMap` covers the German source names (1 Mose, Apostelgeschichte, …)
  // that `bookCanon` — Dutch-only — does not; it yields an English name, which
  // ENGLISH_TO_CODE then resolves.
  const viaEnglish = bookNameMap[name.trim()];
  const code =
    toBookCode(name) ??
    ENGLISH_TO_CODE[key] ??
    EXTRA_TO_CODE[key] ??
    (viaEnglish ? ENGLISH_TO_CODE[normaliseBookName(viaEnglish)] : undefined) ??
    null;
  return code ? CODE_TO_NL[code] : null;
}

/**
 * Rewrites a `readChapters` map so every recognised key is the canonical Dutch
 * name and the chapter arrays behind merged keys are unioned, sorted and
 * de-duplicated. Unrecognised keys are passed through untouched rather than
 * dropped — losing reading history is worse than a stray key the dashboards
 * already ignore.
 */
export function canonicaliseReadChapters(
  raw: Record<string, number[]> | null | undefined,
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  if (!raw) return out;

  const merge = (key: string, chapters: number[]) => {
    const clean = (chapters ?? []).filter(
      (n) => typeof n === 'number' && Number.isInteger(n) && n >= 1,
    );
    const existing = out[key] ?? [];
    out[key] = Array.from(new Set([...existing, ...clean])).sort((a, b) => a - b);
  };

  for (const [book, chapters] of Object.entries(raw)) {
    merge(toCanonicalDutchBook(book) ?? book, Array.isArray(chapters) ? chapters : []);
  }
  return out;
}
