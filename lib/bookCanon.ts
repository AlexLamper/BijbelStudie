/**
 * Canonical book codes, shared between bijbelstudie and bijbelquiz.
 *
 * The two projects spell several Dutch book names differently - bijbelstudie
 * follows the Statenvertaling, bijbelquiz does not:
 *
 *   Mattheus / Matteus        Markus / Marcus         Lukas / Lucas
 *   1 Korinthe / 1 Korintiers                 1 Thessalonicenzen / 1 Tessalonicenzen
 *
 * Joining quiz questions to a study passage on the raw string therefore returns
 * ZERO questions for those books, silently and with no error anywhere. Both
 * sides normalise through this map instead.
 *
 * The codes are OSIS-style, which is a published standard rather than something
 * invented here, so a third consumer can be added without renegotiating.
 *
 * This file is DELIBERATELY DUPLICATED in bijbelquiz as `src/lib/book-canon.ts`.
 * A shared package for a 66-entry list that has not changed in centuries is not
 * worth the build complexity; keep the two copies identical.
 */

export type BookCode = string;

/** Lowercase, strip diacritics, drop dots, collapse whitespace. */
export function normaliseBookName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalised Dutch spellings to canonical code.
 *
 * Where the two projects disagree both spellings are listed. Anything absent
 * simply never matches, which is the correct way to fail - a wrong match would
 * put questions about Mark in a lesson about Matthew.
 */
const BOOK_CODES: Record<string, BookCode> = {
  // --- Oude Testament ---
  genesis: 'GEN',
  exodus: 'EXOD',
  leviticus: 'LEV',
  numeri: 'NUM',
  deuteronomium: 'DEUT',
  jozua: 'JOSH',
  richteren: 'JUDG',
  rechters: 'JUDG',
  ruth: 'RUTH',
  '1 samuel': '1SAM',
  '2 samuel': '2SAM',
  '1 koningen': '1KGS',
  '2 koningen': '2KGS',
  '1 kronieken': '1CHR',
  '2 kronieken': '2CHR',
  ezra: 'EZRA',
  nehemia: 'NEH',
  esther: 'ESTH',
  job: 'JOB',
  psalmen: 'PS',
  psalm: 'PS',
  spreuken: 'PROV',
  prediker: 'ECCL',
  hooglied: 'SONG',
  jesaja: 'ISA',
  jeremia: 'JER',
  klaagliederen: 'LAM',
  ezechiel: 'EZEK',
  daniel: 'DAN',
  hosea: 'HOS',
  joel: 'JOEL',
  amos: 'AMOS',
  obadja: 'OBAD',
  jona: 'JONAH',
  micha: 'MIC',
  nahum: 'NAH',
  habakuk: 'HAB',
  zefanja: 'ZEPH',
  haggai: 'HAG',
  zacharia: 'ZECH',
  maleachi: 'MAL',

  // --- Nieuwe Testament ---
  // Statenvertaling spelling first, bijbelquiz spelling second.
  mattheus: 'MATT',
  matteus: 'MATT',
  markus: 'MARK',
  marcus: 'MARK',
  lukas: 'LUKE',
  lucas: 'LUKE',
  johannes: 'JOHN',
  handelingen: 'ACTS',
  romeinen: 'ROM',
  '1 korinthe': '1COR',
  '1 korintiers': '1COR',
  '1 korinthiers': '1COR',
  '1 corinthiers': '1COR',
  '2 korinthe': '2COR',
  '2 korintiers': '2COR',
  '2 korinthiers': '2COR',
  '2 corinthiers': '2COR',
  galaten: 'GAL',
  efeziers: 'EPH',
  filippenzen: 'PHIL',
  kolossenzen: 'COL',
  colossenzen: 'COL',
  '1 thessalonicenzen': '1THESS',
  '1 tessalonicenzen': '1THESS',
  '2 thessalonicenzen': '2THESS',
  '2 tessalonicenzen': '2THESS',
  '1 timotheus': '1TIM',
  '2 timotheus': '2TIM',
  titus: 'TITUS',
  filemon: 'PHLM',
  hebreeen: 'HEB',
  jakobus: 'JAS',
  '1 petrus': '1PET',
  '2 petrus': '2PET',
  '1 johannes': '1JOHN',
  '2 johannes': '2JOHN',
  '3 johannes': '3JOHN',
  judas: 'JUDE',
  openbaring: 'REV',
};

/** The canonical code for a Dutch book name, or null when unrecognised. */
export function toBookCode(name: string | null | undefined): BookCode | null {
  if (!name) return null;
  return BOOK_CODES[normaliseBookName(name)] ?? null;
}

/** True when two book names refer to the same book, whichever project spelled them. */
export function isSameBook(a: string | null | undefined, b: string | null | undefined): boolean {
  const codeA = toBookCode(a);
  return codeA !== null && codeA === toBookCode(b);
}
