import { normaliseBookName, toBookCode, type BookCode } from './bookCanon';

/**
 * What Johannes Calvijn actually wrote commentaries on, and how that meets the
 * data we ship.
 *
 * Calvin did not comment on the whole Bible. Picking his commentary for Ruth
 * or Openbaring used to show the placeholder string as if it were an entry, or
 * a bare "geen commentaar", which reads like a bug. This module tells the three
 * cases apart so every surface (web commentary panel, /api/v1 for the app) can
 * say what is really going on:
 *
 *   book-not-covered     Calvin never wrote a commentary on this book.
 *   chapter-not-covered  He wrote on the book but stopped before this chapter
 *                        (Ezechiël: his lectures ended at chapter 20 when he
 *                        died in 1564).
 *   not-yet-available    He wrote on it, but this source does not carry the
 *                        text (yet) - calvijn_nl is translated chapter by
 *                        chapter and ships a placeholder for the rest.
 *
 * Historical coverage is keyed by the OSIS codes of lib/bookCanon.ts, so every
 * spelling the reader, the study flow and the app send resolves to one entry.
 *
 * Pure: no filesystem, no data files, safe in client components and tests.
 */

export type CalvinCoverageStatus = 'covered' | 'book-not-covered' | 'chapter-not-covered';

export type CalvinCoverage = {
  status: CalvinCoverageStatus;
  /** Last chapter Calvin covered, only for `chapter-not-covered` books. */
  coveredUntil?: number;
  bookCode: BookCode;
};

/**
 * Books Calvin commented on. `null` means every chapter; a number is the last
 * chapter he reached.
 *
 * Exodus-Deuteronomium are covered as the Harmony of the Law (all chapters),
 * Matteüs/Marcus/Lucas as the Harmony of the Gospels.
 */
const CALVIN_COVERED: Readonly<Record<BookCode, number | null>> = {
  // Oude Testament
  GEN: null,
  EXOD: null,
  LEV: null,
  NUM: null,
  DEUT: null,
  JOSH: null,
  PS: null,
  ISA: null,
  JER: null,
  LAM: null,
  EZEK: 20,
  DAN: null,
  HOS: null,
  JOEL: null,
  AMOS: null,
  OBAD: null,
  JONAH: null,
  MIC: null,
  NAH: null,
  HAB: null,
  ZEPH: null,
  HAG: null,
  ZECH: null,
  MAL: null,
  // Nieuwe Testament
  MATT: null,
  MARK: null,
  LUKE: null,
  JOHN: null,
  ACTS: null,
  ROM: null,
  '1COR': null,
  '2COR': null,
  GAL: null,
  EPH: null,
  PHIL: null,
  COL: null,
  '1THESS': null,
  '2THESS': null,
  '1TIM': null,
  '2TIM': null,
  TITUS: null,
  PHLM: null,
  HEB: null,
  JAS: null,
  '1PET': null,
  '2PET': null,
  '1JOHN': null,
  JUDE: null,
};

/** Books Calvin wrote no commentary on (Job: sermons only). */
const CALVIN_NOT_COVERED: ReadonlySet<BookCode> = new Set([
  'JUDG',
  'RUTH',
  '1SAM',
  '2SAM',
  '1KGS',
  '2KGS',
  '1CHR',
  '2CHR',
  'EZRA',
  'NEH',
  'ESTH',
  'JOB',
  'PROV',
  'ECCL',
  'SONG',
  '2JOHN',
  '3JOHN',
  'REV',
]);

/**
 * Dutch display name per code. Every value resolves back to its own code via
 * `toBookCode` (asserted in tests/calvinCoverage.test.ts).
 */
export const CALVIN_BOOK_NAMES_NL: Readonly<Record<BookCode, string>> = {
  GEN: 'Genesis', EXOD: 'Exodus', LEV: 'Leviticus', NUM: 'Numeri', DEUT: 'Deuteronomium',
  JOSH: 'Jozua', JUDG: 'Richteren', RUTH: 'Ruth', '1SAM': '1 Samuël', '2SAM': '2 Samuël',
  '1KGS': '1 Koningen', '2KGS': '2 Koningen', '1CHR': '1 Kronieken', '2CHR': '2 Kronieken',
  EZRA: 'Ezra', NEH: 'Nehemia', ESTH: 'Esther', JOB: 'Job', PS: 'Psalmen', PROV: 'Spreuken',
  ECCL: 'Prediker', SONG: 'Hooglied', ISA: 'Jesaja', JER: 'Jeremia', LAM: 'Klaagliederen',
  EZEK: 'Ezechiël', DAN: 'Daniël', HOS: 'Hosea', JOEL: 'Joël', AMOS: 'Amos', OBAD: 'Obadja',
  JONAH: 'Jona', MIC: 'Micha', NAH: 'Nahum', HAB: 'Habakuk', ZEPH: 'Zefanja', HAG: 'Haggai',
  ZECH: 'Zacharia', MAL: 'Maleachi',
  MATT: 'Matteüs', MARK: 'Marcus', LUKE: 'Lucas', JOHN: 'Johannes', ACTS: 'Handelingen',
  ROM: 'Romeinen', '1COR': '1 Korintiërs', '2COR': '2 Korintiërs', GAL: 'Galaten',
  EPH: 'Efeziërs', PHIL: 'Filippenzen', COL: 'Kolossenzen', '1THESS': '1 Tessalonicenzen',
  '2THESS': '2 Tessalonicenzen', '1TIM': '1 Timotheüs', '2TIM': '2 Timotheüs', TITUS: 'Titus',
  PHLM: 'Filemon', HEB: 'Hebreeën', JAS: 'Jakobus', '1PET': '1 Petrus', '2PET': '2 Petrus',
  '1JOHN': '1 Johannes', '2JOHN': '2 Johannes', '3JOHN': '3 Johannes', JUDE: 'Judas',
  REV: 'Openbaring',
};

/**
 * English names, because the web commentary panel sends English book names to
 * /api/commentary and the commentary files are English-keyed. Normalised the
 * same way bookCanon normalises Dutch names.
 */
const ENGLISH_CODES: Readonly<Record<string, BookCode>> = {
  genesis: 'GEN', exodus: 'EXOD', leviticus: 'LEV', numbers: 'NUM', deuteronomy: 'DEUT',
  joshua: 'JOSH', judges: 'JUDG', ruth: 'RUTH', '1 samuel': '1SAM', '2 samuel': '2SAM',
  '1 kings': '1KGS', '2 kings': '2KGS', '1 chronicles': '1CHR', '2 chronicles': '2CHR',
  ezra: 'EZRA', nehemiah: 'NEH', esther: 'ESTH', job: 'JOB', psalms: 'PS', proverbs: 'PROV',
  ecclesiastes: 'ECCL', 'song of solomon': 'SONG', 'song of songs': 'SONG', isaiah: 'ISA',
  jeremiah: 'JER', lamentations: 'LAM', ezekiel: 'EZEK', daniel: 'DAN', hosea: 'HOS',
  joel: 'JOEL', amos: 'AMOS', obadiah: 'OBAD', jonah: 'JONAH', micah: 'MIC', nahum: 'NAH',
  habakkuk: 'HAB', zephaniah: 'ZEPH', haggai: 'HAG', zechariah: 'ZECH', malachi: 'MAL',
  matthew: 'MATT', mark: 'MARK', luke: 'LUKE', john: 'JOHN', acts: 'ACTS', romans: 'ROM',
  '1 corinthians': '1COR', '2 corinthians': '2COR', galatians: 'GAL', ephesians: 'EPH',
  philippians: 'PHIL', colossians: 'COL', '1 thessalonians': '1THESS',
  '2 thessalonians': '2THESS', '1 timothy': '1TIM', '2 timothy': '2TIM', titus: 'TITUS',
  philemon: 'PHLM', hebrews: 'HEB', james: 'JAS', '1 peter': '1PET', '2 peter': '2PET',
  '1 john': '1JOHN', '2 john': '2JOHN', '3 john': '3JOHN', jude: 'JUDE', revelation: 'REV',
};

/** Book code for a Dutch or English book name, or null when unrecognised. */
export function resolveCalvinBookCode(book: string | null | undefined): BookCode | null {
  if (!book) return null;
  return toBookCode(book) ?? ENGLISH_CODES[normaliseBookName(book)] ?? null;
}

/**
 * Historical coverage of one chapter. Null when the book name is not
 * recognised - better to say nothing than to claim Calvin skipped a book.
 */
export function calvinCoverage(book: string, chapter: number): CalvinCoverage | null {
  const bookCode = resolveCalvinBookCode(book);
  if (!bookCode) return null;

  if (CALVIN_NOT_COVERED.has(bookCode)) return { status: 'book-not-covered', bookCode };

  if (bookCode in CALVIN_COVERED) {
    const until = CALVIN_COVERED[bookCode];
    if (until !== null && chapter > until) {
      return { status: 'chapter-not-covered', coveredUntil: until, bookCode };
    }
    return { status: 'covered', bookCode };
  }

  return null;
}

/** True for every Calvin commentary source id (calvijn_nl, and any calvin/calvijn variant). */
export function isCalvinSource(sourceId: string | null | undefined): boolean {
  return !!sourceId && /^calv(ijn|in)(?:[_-]|$)/i.test(sourceId);
}

/**
 * The string calvijn_nl carries for every chapter without real text. Must stay
 * identical to PLACEHOLDER in bijbelapi-data/scripts/calvijn/assemble.py.
 */
export const CALVIJN_PLACEHOLDER_NL = 'Dit hoofdstuk is nog niet in het Nederlands beschikbaar.';

function isPlaceholderText(text: unknown): boolean {
  if (typeof text !== 'string') return true;
  const trimmed = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return trimmed === '' || trimmed === CALVIJN_PLACEHOLDER_NL;
}

/**
 * Whether a chapter's entries hold real commentary. `null` (the API said 404)
 * and a chapter of only placeholder/blank entries both count as no content.
 */
export function hasRealCommentary(texts: Iterable<unknown> | null | undefined): boolean {
  if (!texts) return false;
  for (const text of texts) {
    if (!isPlaceholderText(text)) return true;
  }
  return false;
}

export type CalvinNoticeKind = 'book-not-covered' | 'chapter-not-covered' | 'not-yet-available';

export type CalvinNotice = {
  kind: CalvinNoticeKind;
  title: string;
  message: string;
  bookName: string;
  chapter: number;
  coveredUntil?: number;
};

/** Dutch display name: the caller's own spelling when it is a proper Dutch name, else ours. */
function displayName(book: string, code: BookCode): string {
  const trimmed = book.trim();
  const isDutch = toBookCode(trimmed) === code;
  const isCapitalised = /^[0-9]?\s*[A-ZÀ-Ý]/.test(trimmed);
  return isDutch && isCapitalised ? trimmed : CALVIN_BOOK_NAMES_NL[code] ?? trimmed;
}

const COVERAGE_SUMMARY =
  'Zijn commentaren beslaan onder meer Genesis–Jozua, Psalmen, de profeten en bijna het hele Nieuwe Testament.';

/** Builds the Dutch notice for a notice kind. Exported for reuse and tests. */
export function calvinNoticeMessage(
  kind: CalvinNoticeKind,
  bookName: string,
  options: { coveredUntil?: number; bookCode?: BookCode | null; language?: string | null } = {},
): { title: string; message: string } {
  if (kind === 'book-not-covered') {
    const jobNote =
      options.bookCode === 'JOB' ? ' Hij preekte wel over Job, maar schreef er geen commentaar op.' : '';
    return {
      title: 'Boek niet behandeld door Calvijn',
      message:
        `Calvijn schreef geen commentaar op ${bookName}.${jobNote} ${COVERAGE_SUMMARY} ` +
        'Kies een ander commentaar voor dit boek.',
    };
  }

  if (kind === 'chapter-not-covered') {
    const until = options.coveredUntil;
    const ezekNote =
      options.bookCode === 'EZEK' ? ' Zijn uitleg van dit boek bleef onvoltooid toen hij in 1564 overleed.' : '';
    return {
      title: 'Hoofdstuk niet behandeld door Calvijn',
      message:
        `Calvijn behandelde ${bookName} alleen t/m hoofdstuk ${until}.${ezekNote} ` +
        'Kies een ander commentaar voor dit hoofdstuk.',
    };
  }

  const translation =
    options.language === 'nl' ? 'de Nederlandse vertaling is' : 'de tekst is in deze bron';
  return {
    title: options.language === 'nl' ? 'Nog niet vertaald' : 'Nog niet beschikbaar',
    message: `Calvijn schreef over dit hoofdstuk, maar ${translation} nog niet beschikbaar.`,
  };
}

/** `calvijn_nl` -> 'nl'. Only a trailing two-letter code counts. */
function sourceLanguage(sourceId: string): string | null {
  const match = /[_-]([a-z]{2})$/i.exec(sourceId);
  return match ? match[1].toLowerCase() : null;
}

/**
 * The notice to show instead of commentary, or null when there is nothing to
 * explain (not a Calvin source, real text present, or an unrecognised book).
 *
 * `texts` are the chapter's entries as returned by the data layer or API;
 * pass null when the chapter was not found at all.
 */
export function calvinCoverageNotice(input: {
  sourceId: string | null | undefined;
  book: string | null | undefined;
  chapter: number;
  texts: Iterable<unknown> | null | undefined;
}): CalvinNotice | null {
  const { sourceId, book, chapter } = input;
  if (!sourceId || !book || !isCalvinSource(sourceId)) return null;

  const coverage = calvinCoverage(book, chapter);
  if (!coverage) return null;

  const bookName = displayName(book, coverage.bookCode);
  const language = sourceLanguage(sourceId);

  if (coverage.status === 'book-not-covered' || coverage.status === 'chapter-not-covered') {
    return {
      kind: coverage.status,
      ...calvinNoticeMessage(coverage.status, bookName, {
        coveredUntil: coverage.coveredUntil,
        bookCode: coverage.bookCode,
        language,
      }),
      bookName,
      chapter,
      ...(coverage.coveredUntil !== undefined ? { coveredUntil: coverage.coveredUntil } : {}),
    };
  }

  if (hasRealCommentary(input.texts)) return null;

  return {
    kind: 'not-yet-available',
    ...calvinNoticeMessage('not-yet-available', bookName, { bookCode: coverage.bookCode, language }),
    bookName,
    chapter,
  };
}

/**
 * The additive `coverage` field for API responses (the app reads this).
 * `status: 'covered'` with null title/message means real text is present.
 */
export type CalvinCoverageEnvelope = {
  status: CalvinCoverageStatus | 'not-yet-available';
  coveredUntil: number | null;
  title: string | null;
  message: string | null;
};

export function calvinCoverageEnvelope(input: Parameters<typeof calvinCoverageNotice>[0]): CalvinCoverageEnvelope | null {
  if (!isCalvinSource(input.sourceId)) return null;
  const notice = calvinCoverageNotice(input);
  if (notice) {
    return {
      status: notice.kind,
      coveredUntil: notice.coveredUntil ?? null,
      title: notice.title,
      message: notice.message,
    };
  }
  // Only claim "covered" for a recognised book; otherwise stay silent.
  if (!input.book || !calvinCoverage(input.book, input.chapter)) return null;
  return { status: 'covered', coveredUntil: null, title: null, message: null };
}
