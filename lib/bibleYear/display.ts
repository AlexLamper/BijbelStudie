/**
 * Pure display helpers for the "Bijbel in een jaar" web UI
 * (components/bibleYear/*). Dates are plain 'YYYY-MM-DD' strings in the
 * reader's own time zone, the same shape lib/bibleYear/types.ts carries, and
 * all arithmetic runs on UTC midnights so a DST change never moves a day.
 *
 * No React, no fetch: tests/bibleYearDisplay.test.ts covers this file.
 */

import type {
  BibleYearCatalogueEntry,
  BibleYearPlanKey,
  BibleYearRef,
  BibleYearSchedule,
  BibleYearScheduleDay,
  BibleYearToday,
  BibleYearTrackEntry,
  BibleYearTrackKey,
} from './types';
import { BIBLE_CANON } from '../bibleProgress';
import { toBookCode } from '../bookCanon';

export const BIBLE_YEAR_PATH = '/studies/bijbel-in-een-jaar' as const;

/** Used when the API sends an empty list, and on the server-rendered guest page. */
export const DEFAULT_CATALOGUE: BibleYearCatalogueEntry[] = [
  { planKey: 'jaar-1', label: '1 jaar', totalDays: 365, minutesPerDay: 15 },
  { planKey: 'jaar-2', label: '2 jaar', totalDays: 730, minutesPerDay: 8 },
];

export const DEFAULT_TRACKS: BibleYearTrackEntry[] = [
  {
    track: 'gemengd',
    label: 'Gemengd',
    description:
      'Oude en Nieuwe Testament door elkaar, afgewisseld met Psalmen en Spreuken. Alle drie zijn ze op de laatste dag klaar.',
  },
  {
    track: 'canoniek',
    label: 'Van Genesis tot Openbaring',
    description: 'De Bijbel in de volgorde van de boeken, van het eerste hoofdstuk tot het laatste.',
  },
];

export const DEFAULT_PLAN: BibleYearPlanKey = 'jaar-1';
export const DEFAULT_TRACK: BibleYearTrackKey = 'gemengd';

/* ── Dates ─────────────────────────────────────────────────────────────── */

const MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];
const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const DAY_MS = 86_400_000;

function utc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A real calendar date in 'YYYY-MM-DD' form (rejects 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = utc(value);
  return !Number.isNaN(date.getTime()) && iso(date) === value;
}

export function addDays(date: string, days: number): string {
  return iso(new Date(utc(date).getTime() + days * DAY_MS));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / DAY_MS);
}

/** The browser's IANA zone, e.g. "Europe/Amsterdam". */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Amsterdam';
  } catch {
    return 'Europe/Amsterdam';
  }
}

/** Today's date in `timeZone` (default: the runtime's own zone). */
export function todayInTimeZone(timeZone?: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    const value = `${get('year')}-${get('month')}-${get('day')}`;
    if (isIsoDate(value)) return value;
  } catch {
    /* unknown zone: fall through to the runtime's local date */
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The first 1 January that is today or later. */
export function nextNewYear(today: string): string {
  if (today.slice(5) === '01-01') return today;
  return `${Number(today.slice(0, 4)) + 1}-01-01`;
}

export type StartDateChoice = 'vandaag' | 'nieuwjaar' | 'kies';

export type StartDateOption = { id: StartDateChoice; label: string; date: string | null };

/**
 * The start-date choices. "1 januari" is dropped on 1 January itself, where it
 * would be the same day as "Vandaag".
 */
export function startDateOptions(today: string): StartDateOption[] {
  const newYear = nextNewYear(today);
  const options: StartDateOption[] = [{ id: 'vandaag', label: 'Vandaag', date: today }];
  if (newYear !== today) options.push({ id: 'nieuwjaar', label: '1 januari', date: newYear });
  options.push({ id: 'kies', label: 'Kies een datum', date: null });
  return options;
}

/** Furthest start date the flow accepts: a year and a day ahead. */
export const MAX_START_DAYS_AHEAD = 366;

/** A Dutch error for an unusable start date, or null when it is fine. */
export function startDateError(date: string | null | undefined, today: string): string | null {
  if (!date || !isIsoDate(date)) return 'Kies een geldige datum.';
  if (date < today) return 'Kies vandaag of een latere datum.';
  if (daysBetween(today, date) > MAX_START_DAYS_AHEAD) return 'Kies een datum binnen een jaar.';
  return null;
}

/** start + totalDays - 1 + shiftDays, as the contract defines expectedEndDate. */
export function planEndDate(startDate: string, totalDays: number, shiftDays = 0): string {
  return addDays(startDate, totalDays - 1 + shiftDays);
}

/** The end date after "Schema verschuiven" moves the schedule by behindDays. */
export function shiftedEndDate(today: Pick<BibleYearToday, 'expectedEndDate' | 'behindDays'>): string {
  return addDays(today.expectedEndDate, Math.max(0, today.behindDays));
}

/** The calendar date a schedule day falls on for this enrollment. */
export function scheduleDayDate(startDate: string, shiftDays: number, day: number): string {
  return addDays(startDate, day - 1 + shiftDays);
}

/** "1 oktober 2026", or with `weekday` "donderdag 1 oktober". */
export function formatDutchDate(
  date: string,
  options: { weekday?: boolean; year?: boolean } = {},
): string {
  if (!isIsoDate(date)) return date;
  const d = utc(date);
  const showYear = options.year ?? !options.weekday;
  const core = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  const withYear = showYear ? `${core} ${d.getUTCFullYear()}` : core;
  return options.weekday ? `${WEEKDAYS[d.getUTCDay()]} ${withYear}` : withYear;
}

/* ── Copy ──────────────────────────────────────────────────────────────── */

export function dayOfPlanLabel(day: number, totalDays: number): string {
  return `Dag ${day} van ${totalDays}`;
}

export function daysWord(n: number): string {
  return n === 1 ? '1 dag' : `${n} dagen`;
}

/** Gentle, never a deadline. */
export function behindLabel(behindDays: number): string | null {
  return behindDays > 0 ? `Je loopt ${daysWord(behindDays)} achter` : null;
}

export function aheadLabel(aheadDays: number): string | null {
  return aheadDays > 0 ? `Je loopt ${daysWord(aheadDays)} voor` : null;
}

/** "12%", "0,4%", "100%": one decimal only below 10, a Dutch comma. */
export function formatPercent(percent: number): string {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  if (p >= 10 || Number.isInteger(p)) return `${Math.floor(p)}%`;
  const one = Math.floor(p * 10) / 10;
  return `${String(one).replace('.', ',')}%`;
}

export function minutesLabel(minutes: number): string {
  return `ongeveer ${Math.max(1, Math.round(minutes))} min`;
}

export function planLabel(planKey: BibleYearPlanKey, catalogue: BibleYearCatalogueEntry[] = DEFAULT_CATALOGUE): string {
  return catalogue.find(entry => entry.planKey === planKey)?.label
    ?? DEFAULT_CATALOGUE.find(entry => entry.planKey === planKey)?.label
    ?? planKey;
}

export function trackLabel(track: BibleYearTrackKey, tracks: BibleYearTrackEntry[] = DEFAULT_TRACKS): string {
  return tracks.find(entry => entry.track === track)?.label
    ?? DEFAULT_TRACKS.find(entry => entry.track === track)?.label
    ?? track;
}

/** Strand headings for a portion. The canonical track has a single strand. */
export const STRAND_LABEL: Record<string, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  poetry: 'Psalmen en Spreuken',
  all: 'Lezen',
};

/** "Genesis 4"; Psalmen reads singular, as a heading would say it. */
export function chapterName(book: string, chapter: number): string {
  return `${book === 'Psalmen' ? 'Psalm' : book} ${chapter}`;
}

/* ── Reader links ──────────────────────────────────────────────────────── */

/**
 * /lezen deep link for one chapter. `ref.book` is the canonical Dutch name;
 * the reader wants its data-folder spelling, so resolve through BIBLE_CANON by
 * name first and by book code second.
 */
export function refReaderHref(ref: Pick<BibleYearRef, 'book' | 'code' | 'chapter'>): string {
  const book =
    BIBLE_CANON.find(entry => entry.name === ref.book)
    ?? BIBLE_CANON.find(entry => toBookCode(entry.readerName) === ref.code || toBookCode(entry.name) === ref.code);
  // No `version`: /lezen then opens this chapter in the reader's own
  // translation (last-read, then preferences) instead of forcing one.
  return `/lezen?book=${encodeURIComponent(book?.readerName ?? ref.book)}&chapter=${ref.chapter}`;
}

/* ── State updates ─────────────────────────────────────────────────────── */

/**
 * The optimistic version of a mark: flips `read` on the matching refs, then
 * recomputes each portion's `done` and `todayDone`. The server response
 * replaces it a moment later.
 */
export function applyRefMark(
  today: BibleYearToday,
  refs: { code: string; chapter: number }[],
  read: boolean,
): BibleYearToday {
  const keys = new Set(refs.map(ref => `${ref.code}:${ref.chapter}`));
  const portions = today.portions.map(portion => {
    const nextRefs = portion.refs.map(ref =>
      keys.has(`${ref.code}:${ref.chapter}`) ? { ...ref, read } : ref,
    );
    return { ...portion, refs: nextRefs, done: nextRefs.length > 0 && nextRefs.every(ref => ref.read) };
  });
  return {
    ...today,
    portions,
    todayDone: portions.length > 0 && portions.every(portion => portion.done),
  };
}

/** The days after today, for the "Komende dagen" overview. */
export function upcomingDays(
  schedule: Pick<BibleYearSchedule, 'days'>,
  fromDay: number,
  count: number,
): BibleYearScheduleDay[] {
  return schedule.days.filter(day => day.day > fromDay).slice(0, Math.max(0, count));
}

/** One line for a schedule day: "Genesis 1-3 · Mattheüs 1 · Psalm 1". */
export function scheduleDaySummary(day: Pick<BibleYearScheduleDay, 'portions'>): string {
  return day.portions.map(portion => portion.label).join(' · ');
}
