import { START_BOOK } from './book-mapping';
import type { BibleProgress, BookProgress } from './bibleProgress';
import { toCanonicalDutchBook } from './readChaptersCanon';

/**
 * The pure side of "Je boekenkast" at /profiel/bijbel: spine labels, the six
 * book groups and their colours, where every spine sits on the shelves, the
 * shelf summary, the reading table and the ladder steps. Everything is built
 * from data the server already returns (reading progress, last read chapter,
 * streak).
 *
 * The app draws the same case from the same numbers:
 * `features/profile/domain/bookcase.dart` and
 * `features/profile/present/bookcase_view.dart`. Keep the two in step.
 */

/** The short title printed on a spine. */
export const SPINE_LABELS: Record<string, string> = {
  Genesis: 'Gen', Exodus: 'Ex', Leviticus: 'Lev', Numeri: 'Num',
  Deuteronomium: 'Deut', Jozua: 'Joz', Richteren: 'Richt', Ruth: 'Ruth',
  '1 Samuël': '1 Sam', '2 Samuël': '2 Sam', '1 Koningen': '1 Kon', '2 Koningen': '2 Kon',
  '1 Kronieken': '1 Kron', '2 Kronieken': '2 Kron', Ezra: 'Ezra', Nehemia: 'Neh',
  Esther: 'Est', Job: 'Job', Psalmen: 'Ps', Spreuken: 'Spr',
  Prediker: 'Pred', Hooglied: 'Hoogl', Jesaja: 'Jes', Jeremia: 'Jer',
  Klaagliederen: 'Klaagl', 'Ezechiël': 'Ez', 'Daniël': 'Dan', Hosea: 'Hos',
  'Joël': 'Joël', Amos: 'Am', Obadja: 'Ob', Jona: 'Jona', Micha: 'Mi',
  Nahum: 'Nah', Habakuk: 'Hab', Zefanja: 'Zef', 'Haggaï': 'Hag',
  Zacharia: 'Zach', Maleachi: 'Mal', 'Mattheüs': 'Matt', Markus: 'Mark',
  Lukas: 'Luk', Johannes: 'Joh', Handelingen: 'Hand', Romeinen: 'Rom',
  '1 Korinthe': '1 Kor', '2 Korinthe': '2 Kor', Galaten: 'Gal', 'Efeziërs': 'Ef',
  Filippenzen: 'Fil', Kolossenzen: 'Kol', '1 Thessalonicenzen': '1 Tess',
  '2 Thessalonicenzen': '2 Tess', '1 Timotheüs': '1 Tim', '2 Timotheüs': '2 Tim',
  Titus: 'Tit', 'Filémon': 'Filem', 'Hebreeën': 'Hebr', Jakobus: 'Jak',
  '1 Petrus': '1 Petr', '2 Petrus': '2 Petr', '1 Johannes': '1 Joh', '2 Johannes': '2 Joh',
  '3 Johannes': '3 Joh', Judas: 'Jud', Openbaring: 'Openb',
};

/**
 * The six bands of the canon, as the app's `BibleBookGroup.all` slices them,
 * with the shorter name on each shelf's brass plaque and the group colour:
 * gold, brick, rose, indigo, sky and leaf green.
 */
export const SHELF_GROUPS = [
  { label: 'Wet', plaque: 'De Wet', from: 0, to: 5, color: '#E0A43A' },
  { label: 'Geschiedenis', plaque: 'Geschiedenis', from: 5, to: 17, color: '#C8553D' },
  { label: 'Poëzie', plaque: 'Poëzie', from: 17, to: 22, color: '#D9779B' },
  { label: 'Profeten', plaque: 'Profeten', from: 22, to: 39, color: '#6C7FD8' },
  { label: 'Evangeliën en Handelingen', plaque: 'Evangeliën', from: 39, to: 44, color: '#3FA7D6' },
  { label: 'Brieven en Openbaring', plaque: 'Brieven', from: 44, to: 66, color: '#7FB069' },
] as const;

/** Index into SHELF_GROUPS for the book at canonical position `index`. */
export function groupIndexOf(index: number): number {
  const at = SHELF_GROUPS.findIndex((g) => index >= g.from && index < g.to);
  return at < 0 ? 0 : at;
}

export const RIBBON_RED = '#DC2626';

/**
 * A stable 0-1 value per book and purpose, so every spine keeps its height and
 * shade from one visit to the next. The same integer hash as `shelfJitter` in
 * the app, so both draw the same case.
 */
export function shelfJitter(index: number, salt: number): number {
  let h = (index * 374761393 + salt * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

/** `hex` lightened (positive `amount`) or darkened, per channel, out of 255. */
export function shadeHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, v + amount));
  const r = ch(n >> 16);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Near-black on light fills, white on dark ones. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.18 ? '#1F1A10' : '#FFFFFF';
}

/** Fixed design space of the case, the approved mockup's own. */
export const CASE = {
  width: 370,
  height: 436,
  inset: 22,
  shelfTops: [72, 186, 300],
  shelfHeight: 100,
  boardHeight: 14,
  ladderX: 338,
  ladderTop: 62,
  ladderBottom: 426,
  /** The two groups on each shelf. */
  rows: [[0, 1], [2, 3], [4, 5]],
} as const;

export function ladderY(fraction: number): number {
  const f = Math.max(0, Math.min(1, fraction));
  return CASE.ladderBottom - (CASE.ladderBottom - CASE.ladderTop) * f;
}

export interface SpineGeom {
  book: BookProgress;
  /** Canonical position, 0-65. */
  index: number;
  group: number;
  x: number;
  width: number;
  height: number;
  /** The shelf board the spine stands on. */
  base: number;
  color: string;
  label: string;
}

export interface PlaqueGeom {
  group: number;
  centerX: number;
  base: number;
  read: number;
  total: number;
  label: string;
}

export interface BookcaseLayout {
  spines: SpineGeom[];
  plaques: PlaqueGeom[];
  bookends: { x: number; base: number }[];
}

const rawWidth = (chapters: number) => 5 + Math.sqrt(chapters) * 2.15;

/** Where every spine, plaque and bookend sits, in design units. */
export function bookcaseLayout(progress: BibleProgress): BookcaseLayout {
  const spines: SpineGeom[] = [];
  const plaques: PlaqueGeom[] = [];
  const bookends: { x: number; base: number }[] = [];
  const gapGroup = 14;
  const gap = 1.4;

  CASE.rows.forEach((groups, r) => {
    const base = CASE.shelfTops[r] + CASE.shelfHeight;
    const books = groups.flatMap((g) => progress.books.slice(SHELF_GROUPS[g].from, SHELF_GROUPS[g].to));
    const raw = books.reduce((s, b) => s + rawWidth(b.chapters), 0);
    const avail = CASE.width - CASE.inset - CASE.inset - gapGroup - gap * books.length - 6;
    const k = Math.min(1.25, avail / raw);
    let x = CASE.inset + 2;

    groups.forEach((g, gk) => {
      const group = SHELF_GROUPS[g];
      const startX = x;
      let read = 0;
      let total = 0;
      for (let i = group.from; i < group.to; i++) {
        const book = progress.books[i];
        const w = Math.max(6, rawWidth(book.chapters) * k);
        const h = Math.round(62 + shelfJitter(i, 1) * 16 + Math.min(10, book.chapters / 10));
        spines.push({
          book,
          index: i,
          group: g,
          x,
          width: w,
          height: h,
          base,
          color: shadeHex(group.color, Math.round((shelfJitter(i, 2) - 0.5) * 36)),
          label: SPINE_LABELS[book.name] ?? book.name,
        });
        read += book.readCount;
        total += book.chapters;
        x += w + gap;
      }
      plaques.push({
        group: g,
        centerX: (startX + x) / 2,
        base,
        read,
        total,
        label: `${group.plaque} ${formatShelfCount(read)}/${formatShelfCount(total)}`,
      });
      if (gk === 0) {
        bookends.push({ x, base });
        x += gapGroup;
      }
    });
  });
  return { spines, plaques, bookends };
}

/** A whole number with the Dutch thousands separator: 1189 -> "1.189". */
export function formatShelfCount(n: number): string {
  return String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * The ladder marker's label: whole percents from 10 up, one decimal below that
 * and "<0,1%" for a single chapter. As `formatBiblePercent` in the app.
 */
export function formatBiblePercent(pct: number): string {
  if (pct <= 0) return '0%';
  if (pct < 0.1) return '<0,1%';
  if (pct >= 10) return `${Math.floor(pct)}%`;
  const tenths = Math.floor(pct * 10);
  return tenths % 10 === 0 ? `${tenths / 10}%` : `${Math.floor(tenths / 10)},${tenths % 10}%`;
}

const booksWord = (n: number) => (n === 1 ? 'boek' : 'boeken');

/** "5 boeken uit, 4 aan het lezen" under the page title. */
export function shelfSummary(progress: BibleProgress): string {
  const { booksCompleted: done, booksStarted, booksTotal } = progress.totals;
  const reading = booksStarted - done;
  if (done === 0 && reading === 0) return 'Nog geen hoofdstuk gelezen';
  if (done >= booksTotal) return `Alle ${booksTotal} boeken uit`;
  if (done === 0) return `${reading} ${booksWord(reading)} aan het lezen`;
  if (reading === 0) return `${done} ${booksWord(done)} uit`;
  return `${done} ${booksWord(done)} uit, ${reading} aan het lezen`;
}

/** The first chapter of `book` not yet read, or 1 once it is finished. */
export function firstUnreadChapter(book: BookProgress): number {
  const read = new Set(book.readChapters);
  for (let n = 1; n <= book.chapters; n++) if (!read.has(n)) return n;
  return 1;
}

/**
 * Where the leeslint lies: the first chapter not yet read at or after the last
 * chapter read, walking the canon forward and wrapping round so the anchor
 * book's earlier chapters count too. A reader who never read anything starts
 * at START_BOOK 1. Null once every chapter is read. As `nextUnreadChapter` in
 * the app.
 */
export function nextUnreadChapter(
  progress: BibleProgress,
  anchor: { book?: string | null; chapter?: number | null } | null,
): { book: BookProgress; chapter: number } | null {
  const books = progress.books;
  const name = (anchor?.book && toCanonicalDutchBook(anchor.book)) || toCanonicalDutchBook(START_BOOK) || START_BOOK;
  const start = Math.max(0, books.findIndex((b) => b.name === name));
  const fromChapter = anchor?.book ? Math.max(1, anchor.chapter ?? 1) : 1;
  for (let step = 0; step <= books.length; step++) {
    const book = books[(start + step) % books.length];
    const read = new Set(book.readChapters);
    const from = step === 0 ? Math.min(fromChapter, Math.max(1, book.chapters)) : 1;
    for (let n = from; n <= book.chapters; n++) if (!read.has(n)) return { book, chapter: n };
  }
  return null;
}

/** "Op je leestafel": books started but not finished, the leeslint's first. */
export function readingTable(progress: BibleProgress, current?: string | null): BookProgress[] {
  const open = progress.books.filter((b) => b.started && !b.completed);
  const at = open.findIndex((b) => b.name === current);
  if (at > 0) open.unshift(...open.splice(at, 1));
  return open;
}

/** Books finished now that were not in `before`. Null: first look, no news. */
export function newlyFinishedBooks(before: string[] | null, progress: BibleProgress): string[] {
  if (!before) return [];
  const seen = new Set(before);
  return progress.books.filter((b) => b.completed && !seen.has(b.name)).map((b) => b.name);
}

/** "Exodus", "Exodus en Ruth", "Exodus, Ruth en Jona", "4 boeken". */
export function joinBookNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length > 3) return `${names.length} boeken`;
  return `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`;
}

export type LadderTrack = 'bible' | 'books' | 'streak';

export interface LadderStep {
  track: LadderTrack;
  title: string;
  subtitle: string;
  value: number;
  target: number;
}

/** The four marks on the ladder; a mark is reached at its share rounded up. */
const BIBLE_MILESTONES = [
  { percent: 25, title: 'Een kwart van de Bijbel' },
  { percent: 50, title: 'De helft van de Bijbel' },
  { percent: 75, title: 'Driekwart van de Bijbel' },
  { percent: 100, title: 'De hele Bijbel' },
] as const;

/** The books-opened and streak badges the app's profile counts towards. */
const BOOK_BADGES = [
  { target: 5, title: 'Ontdekker' },
  { target: 20, title: 'Doorlezer' },
  { target: 66, title: 'Hele Bijbel' },
] as const;
const STREAK_BADGES = [
  { target: 3, title: 'Op dreef' },
  { target: 7, title: 'Week vol' },
  { target: 30, title: 'Maand vol' },
] as const;

/**
 * "De ladder op": the next rung on each of three tracks, measured from where
 * the reader stands now. A track with nothing left to reach drops out.
 */
export function ladderSteps(input: {
  chaptersRead: number;
  chaptersTotal: number;
  booksStarted: number;
  streak: number;
}): LadderStep[] {
  const { chaptersRead, chaptersTotal, booksStarted, streak } = input;
  const out: LadderStep[] = [];
  for (const m of BIBLE_MILESTONES) {
    const need = Math.floor((m.percent * chaptersTotal + 99) / 100);
    if (chaptersRead < need) {
      const left = need - chaptersRead;
      out.push({
        track: 'bible',
        title: m.title,
        subtitle: `Nog ${formatShelfCount(left)} ${left === 1 ? 'hoofdstuk' : 'hoofdstukken'}`,
        value: chaptersRead,
        target: need,
      });
      break;
    }
  }
  const books = BOOK_BADGES.find((b) => booksStarted < b.target);
  if (books) {
    out.push({
      track: 'books',
      title: books.title,
      subtitle: `${books.target} boeken geopend, nu ${booksStarted}`,
      value: booksStarted,
      target: books.target,
    });
  }
  const days = STREAK_BADGES.find((b) => streak < b.target);
  if (days) {
    out.push({
      track: 'streak',
      title: days.title,
      subtitle: `${days.target} dagen op rij, nu ${streak}`,
      value: streak,
      target: days.target,
    });
  }
  return out;
}
