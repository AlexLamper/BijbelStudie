import { PLAN_BOOKS, type Testament } from './planCanon';
import { toCanonicalDutchBook } from './readChaptersCanon';

/**
 * "Bijbel gelezen": the whole canon with the reader's progress laid over it.
 *
 * Pure aggregation over a `readChapters` map (book name -> chapter numbers) as
 * `GET /api/user/reading-progress` and `/api/v1/dashboard` return it. Keys are
 * folded through `readChaptersCanon` again here, so a response that still
 * carries a translation's own spelling ("1 Corinthiërs", "John", "Numberi")
 * counts towards the right book. Unknown books and out-of-range chapters are
 * ignored, which keeps every total inside 66 books / 1189 chapters.
 *
 * The app mirrors this in `features/profile/domain/bible_progress.dart`.
 */

export interface BibleCanonBook {
  /** Canonical Dutch display name, as the dashboards spell it. */
  name: string;
  /** Book key the reader at /lezen expects (Statenvertaling data-folder spelling). */
  readerName: string;
  testament: Testament;
  chapters: number;
}

export interface BookProgress extends BibleCanonBook {
  /** Read chapters, sorted, unique, all within 1..chapters. */
  readChapters: number[];
  readCount: number;
  /** 0-100, rounded down so a book never shows 100 before it is finished. */
  percent: number;
  started: boolean;
  completed: boolean;
}

export interface BibleProgressTotals {
  chaptersRead: number;
  chaptersTotal: number;
  booksStarted: number;
  booksCompleted: number;
  booksTotal: number;
  /** Share of all chapters read, 0-100 with one decimal, rounded down. */
  percent: number;
}

export interface BibleProgress {
  books: BookProgress[];
  oldTestament: BookProgress[];
  newTestament: BookProgress[];
  totals: BibleProgressTotals;
}

export type BookFilter = 'alles' | 'begonnen' | 'voltooid' | 'niet-begonnen';

export const BOOK_FILTERS: { id: BookFilter; label: string }[] = [
  { id: 'alles', label: 'Alles' },
  { id: 'begonnen', label: 'Begonnen' },
  { id: 'voltooid', label: 'Voltooid' },
  { id: 'niet-begonnen', label: 'Nog niet begonnen' },
];

/** The 66 books in canonical order. */
export const BIBLE_CANON: BibleCanonBook[] = PLAN_BOOKS.map((book) => ({
  name: toCanonicalDutchBook(book.nl) ?? book.nl,
  readerName: book.nl,
  testament: book.testament,
  chapters: book.chapters,
}));

const TOTAL_CHAPTERS = BIBLE_CANON.reduce((sum, book) => sum + book.chapters, 0);

function floorPercent(part: number, whole: number, decimals = 0): number {
  if (whole <= 0 || part <= 0) return 0;
  if (part >= whole) return 100;
  const factor = 10 ** decimals;
  return Math.floor((part / whole) * 100 * factor) / factor;
}

export function computeBibleProgress(raw: Record<string, unknown> | null | undefined): BibleProgress {
  const readByBook = new Map<string, Set<number>>();

  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      if (!Array.isArray(value)) continue;
      const name = toCanonicalDutchBook(key);
      if (!name) continue;
      const set = readByBook.get(name) ?? new Set<number>();
      for (const n of value) {
        if (typeof n === 'number' && Number.isInteger(n) && n >= 1) set.add(n);
      }
      readByBook.set(name, set);
    }
  }

  const books: BookProgress[] = BIBLE_CANON.map((book) => {
    const read = [...(readByBook.get(book.name) ?? [])]
      .filter((n) => n <= book.chapters)
      .sort((a, b) => a - b);
    return {
      ...book,
      readChapters: read,
      readCount: read.length,
      percent: floorPercent(read.length, book.chapters),
      started: read.length > 0,
      completed: book.chapters > 0 && read.length >= book.chapters,
    };
  });

  const chaptersRead = books.reduce((sum, b) => sum + b.readCount, 0);

  return {
    books,
    oldTestament: books.filter((b) => b.testament === 'OT'),
    newTestament: books.filter((b) => b.testament === 'NT'),
    totals: {
      chaptersRead,
      chaptersTotal: TOTAL_CHAPTERS,
      booksStarted: books.filter((b) => b.started).length,
      booksCompleted: books.filter((b) => b.completed).length,
      booksTotal: books.length,
      percent: floorPercent(chaptersRead, TOTAL_CHAPTERS, 1),
    },
  };
}

/** "Begonnen" means underway: started but not yet finished. */
export function filterBooks(books: BookProgress[], filter: BookFilter): BookProgress[] {
  switch (filter) {
    case 'begonnen':
      return books.filter((b) => b.started && !b.completed);
    case 'voltooid':
      return books.filter((b) => b.completed);
    case 'niet-begonnen':
      return books.filter((b) => !b.started);
    default:
      return books;
  }
}

/**
 * Deep link into the reader. `/lezen` only honours `book` and `chapter` when
 * `version` is present too (hooks/useBibleData, case A), and `book` must be the
 * data-folder spelling, not the display name.
 */
export function chapterReaderHref(book: Pick<BibleCanonBook, 'readerName'>, chapter: number): string {
  return `/lezen?book=${encodeURIComponent(book.readerName)}&chapter=${chapter}&version=statenvertaling`;
}
