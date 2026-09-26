/**
 * Progress maths for "Bijbel in een jaar" (DAILY_HABIT_PLAN.md §4).
 *
 * Pure and DB-free: everything here takes an enrollment-shaped object plus a
 * `now` and returns the wire shapes of ./types. The API reads the enrollment,
 * calls these, and writes back with `$addToSet` / `$pull` / `$inc` only.
 *
 * Dates. "Today" is the calendar date in the enrollment's IANA time zone
 * (Intl, so DST is handled by the platform); day arithmetic is done on those
 * calendar dates at UTC midnight, never on elapsed milliseconds, so a 23- or
 * 25-hour DST day is still exactly one day.
 *
 * Refs. A read chapter is stored as "CODE.chapter" ("GEN.1"), codes from
 * lib/readChaptersCanon.ts CODES_IN_ORDER. Unknown or malformed keys are
 * ignored when counting, never an error.
 */

import { BIBLE_CHAPTER_WEIGHTS } from '../data/bible-chapter-weights';
import { toAnyBookCode } from '../readChaptersCanon';
import {
  PLAN_DAYS,
  TOTAL_CHAPTERS,
  dayLabel,
  getSchedule,
  minutesPerDay,
  portionLabel,
} from './schedule';
import type {
  BibleYearCatalogueEntry,
  BibleYearEnrollmentDTO,
  BibleYearPlanKey,
  BibleYearPortionState,
  BibleYearRef,
  BibleYearSchedule,
  BibleYearScheduleDay,
  BibleYearStateResponse,
  BibleYearStatus,
  BibleYearToday,
  BibleYearTrackEntry,
  BibleYearTrackKey,
} from './types';

export const DEFAULT_TIME_ZONE = 'Europe/Amsterdam';
export const BACKLOG_LIMIT = 7;
export const BIBLE_YEAR_HREF = '/studies/bijbel-in-een-jaar' as const;

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const BIBLE_YEAR_CATALOGUE: readonly BibleYearCatalogueEntry[] = (
  [
    ['jaar-1', '1 jaar'],
    ['jaar-2', '2 jaar'],
  ] as [BibleYearPlanKey, string][]
).map(([planKey, label]) => ({
  planKey,
  label,
  totalDays: PLAN_DAYS[planKey],
  minutesPerDay: minutesPerDay(planKey),
}));

export const BIBLE_YEAR_TRACKS: readonly BibleYearTrackEntry[] = [
  {
    track: 'gemengd',
    label: 'Gemengd',
    description: 'Oude en Nieuwe Testament door elkaar, afgewisseld met Psalmen en Spreuken',
  },
  {
    track: 'canoniek',
    label: 'Van Genesis tot Openbaring',
    description: 'De Bijbel van voor naar achter',
  },
];

// ---------------------------------------------------------------------------
// Refs
// ---------------------------------------------------------------------------

const BOOKS = new Map(BIBLE_CHAPTER_WEIGHTS.map((b) => [b.code, { name: b.name, chapters: b.weights.length }]));

/** "GEN.1". Does not validate; use `toRef` / `parseRefKey` for input. */
export function refKey(code: string, chapter: number): string {
  return `${code}.${chapter}`;
}

/**
 * A validated ref from a code ("GEN", case-insensitive) or any spelling of a
 * book name the reader may use ("Genesis", "1 Corinthiërs", "John"), or null
 * for an unknown book or a chapter outside the book.
 */
export function toRef(bookOrCode: string, chapter: unknown): BibleYearRef | null {
  if (typeof bookOrCode !== 'string') return null;
  const upper = bookOrCode.trim().toUpperCase();
  const code = BOOKS.has(upper) ? upper : toAnyBookCode(bookOrCode);
  const book = code ? BOOKS.get(code) : undefined;
  const ch = typeof chapter === 'string' && /^\d+$/.test(chapter) ? Number(chapter) : chapter;
  if (!book || typeof ch !== 'number' || !Number.isInteger(ch) || ch < 1 || ch > book.chapters) return null;
  return { book: book.name, code: code as string, chapter: ch };
}

/** Parses a stored key ("GEN.1"); null when malformed or out of range. Codes must be exact. */
export function parseRefKey(key: unknown): BibleYearRef | null {
  if (typeof key !== 'string') return null;
  const m = /^([0-9A-Z]+)\.(\d+)$/.exec(key);
  if (!m || !BOOKS.has(m[1])) return null;
  return toRef(m[1], Number(m[2]));
}

export function isValidRefKey(key: unknown): key is string {
  return parseRefKey(key) !== null;
}

/**
 * Validates a mark body's refs. `keys` are de-duplicated canonical keys in
 * input order; `invalid` holds every entry that was rejected.
 */
export function validateRefs(input: unknown): { keys: string[]; refs: BibleYearRef[]; invalid: unknown[] } {
  const keys: string[] = [];
  const refs: BibleYearRef[] = [];
  const invalid: unknown[] = [];
  if (!Array.isArray(input)) return { keys, refs, invalid: [input] };
  const seen = new Set<string>();
  for (const item of input) {
    const ref =
      item && typeof item === 'object'
        ? toRef((item as { code?: unknown }).code as string, (item as { chapter?: unknown }).chapter)
        : null;
    if (!ref) {
      invalid.push(item);
      continue;
    }
    const key = refKey(ref.code, ref.chapter);
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
    refs.push(ref);
  }
  return { keys, refs, invalid };
}

/** The set of valid read keys (bad or unknown keys dropped). */
export function readSetFrom(readRefs: readonly unknown[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const k of readRefs ?? []) if (isValidRefKey(k)) out.add(k);
  return out;
}

/** Keys of every chapter of one schedule day. */
export function dayRefKeys(day: BibleYearScheduleDay): string[] {
  return day.portions.flatMap((p) => p.refs.map((r) => refKey(r.code, r.chapter)));
}

export function isDayRead(day: BibleYearScheduleDay, read: ReadonlySet<string>): boolean {
  return dayRefKeys(day).every((k) => read.has(k));
}

/** Every day whose chapters are all read, ascending (for paying `plan_day_read` XP once per day). */
export function fullyReadDays(schedule: BibleYearSchedule, read: ReadonlySet<string>): number[] {
  return schedule.days.filter((d) => isDayRead(d, read)).map((d) => d.day);
}

/** All 1189 chapters read: every schedule holds each chapter exactly once. */
export function isBibleComplete(read: ReadonlySet<string>): boolean {
  return read.size >= TOTAL_CHAPTERS;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateString(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === s;
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date ('YYYY-MM-DD') at `now` in `timeZone` (invalid zones fall back to Europe/Amsterdam). */
export function localDateIn(timeZone: string, now: Date): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function utcMidnight(date: string): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new RangeError(`invalid date "${date}"`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** `date` plus `days` calendar days. */
export function addDays(date: string, days: number): string {
  return new Date(utcMidnight(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Calendar days from `from` to `to` (to - from). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/** What progress needs from a stored enrollment (models/BibleYearEnrollment.js). */
export type BibleYearProgressInput = {
  id?: string;
  planKey: BibleYearPlanKey;
  track: BibleYearTrackKey;
  scheduleVersion: number;
  /** 'YYYY-MM-DD' in `timeZone`. */
  startDate: string;
  timeZone: string;
  shiftDays: number;
  /** "CODE.chapter" keys. */
  readRefs: readonly string[];
  status: BibleYearStatus;
  completedAt?: Date | string | null;
};

type Computed = {
  schedule: BibleYearSchedule;
  read: Set<string>;
  localDate: string;
  /** Unclamped scheduled day: may be <= 0 before the start or > totalDays after the end. */
  rawDay: number;
  /** 0 before the start date, else rawDay clamped to 1..totalDays. */
  dayNumber: number;
};

function compute(input: BibleYearProgressInput, now: Date): Computed {
  const schedule = getSchedule(input.planKey, input.track, input.scheduleVersion);
  const read = readSetFrom(input.readRefs);
  const localDate = localDateIn(input.timeZone, now);
  const { rawDay, dayNumber } = dayNumbersOn(input, schedule.totalDays, localDate);
  return { schedule, read, localDate, rawDay, dayNumber };
}

function dayNumbersOn(
  input: Pick<BibleYearProgressInput, 'startDate' | 'shiftDays'>,
  totalDays: number,
  localDate: string,
): { rawDay: number; dayNumber: number } {
  const elapsed = daysBetween(input.startDate, localDate);
  const rawDay = elapsed + 1 - (input.shiftDays || 0);
  const dayNumber = elapsed < 0 ? 0 : Math.min(totalDays, Math.max(1, rawDay));
  return { rawDay, dayNumber };
}

/**
 * Today's scheduled plan day in the plan's zone, after the catch-up shift:
 * 0 before the start date, else clamped to 1..totalDays (the same number as
 * `today.dayNumber`). The XP pay rule uses it: a day read ahead is paid only
 * once it is reached (lib/bibleYear/service.ts settleProgress).
 */
export function scheduledDayNumber(
  input: Pick<BibleYearProgressInput, 'planKey' | 'track' | 'scheduleVersion' | 'startDate' | 'timeZone' | 'shiftDays'>,
  now: Date,
): number {
  const schedule = getSchedule(input.planKey, input.track, input.scheduleVersion);
  return dayNumbersOn(input, schedule.totalDays, localDateIn(input.timeZone || DEFAULT_TIME_ZONE, now)).dayNumber;
}

export function expectedEndDate(input: Pick<BibleYearProgressInput, 'planKey' | 'startDate' | 'shiftDays'>): string {
  return addDays(input.startDate, PLAN_DAYS[input.planKey] - 1 + (input.shiftDays || 0));
}

function percentOf(read: ReadonlySet<string>): number {
  return Math.floor((read.size * 100) / TOTAL_CHAPTERS);
}

function portionStates(day: BibleYearScheduleDay, read: ReadonlySet<string>): BibleYearPortionState[] {
  return day.portions.map((p) => {
    const refs = p.refs.map((r) => ({ ...r, read: read.has(refKey(r.code, r.chapter)) }));
    return { strand: p.strand, label: p.label, refs, done: refs.every((r) => r.read) };
  });
}

/** Label of what is still unread on a day, e.g. "Genesis 3, Psalm 2" (the full day label when nothing is read). */
function unreadLabel(day: BibleYearScheduleDay, read: ReadonlySet<string>): string {
  const parts = day.portions
    .map((p) => p.refs.filter((r) => !read.has(refKey(r.code, r.chapter))))
    .filter((refs) => refs.length > 0)
    .map((refs) => portionLabel(refs));
  return parts.length ? parts.join(', ') : dayLabel(day);
}

/**
 * The "Vandaag" object. Before the start date `dayNumber` is 0 and the
 * portions/minutes are those of day 1 (a preview), with `todayDone` false.
 * After the last day the last day stays "today".
 */
export function buildToday(input: BibleYearProgressInput, now: Date): BibleYearToday {
  const { schedule, read, localDate, dayNumber } = compute(input, now);
  const day = schedule.days[Math.max(1, dayNumber) - 1];

  let behindDays = 0;
  const backlogDays: { day: number; label: string }[] = [];
  for (let d = 1; d < dayNumber; d++) {
    const sd = schedule.days[d - 1];
    if (isDayRead(sd, read)) continue;
    behindDays++;
    if (backlogDays.length < BACKLOG_LIMIT) backlogDays.push({ day: d, label: unreadLabel(sd, read) });
  }
  let aheadDays = 0;
  for (let d = dayNumber + 1; d <= schedule.totalDays; d++) {
    if (isDayRead(schedule.days[d - 1], read)) aheadDays++;
  }

  const portions = portionStates(day, read);
  return {
    dayNumber,
    totalDays: schedule.totalDays,
    localDate,
    portions,
    todayDone: dayNumber > 0 && portions.every((p) => p.done),
    behindDays,
    aheadDays,
    backlogDays,
    percentBible: percentOf(read),
    expectedEndDate: expectedEndDate(input),
    minutesEstimate: day.minutes,
    href: BIBLE_YEAR_HREF,
  };
}

export function toEnrollmentDTO(input: BibleYearProgressInput): BibleYearEnrollmentDTO {
  const read = readSetFrom(input.readRefs);
  const completedAt =
    input.completedAt instanceof Date
      ? input.completedAt.toISOString()
      : typeof input.completedAt === 'string'
        ? input.completedAt
        : null;
  return {
    id: input.id ?? '',
    planKey: input.planKey,
    track: input.track,
    scheduleVersion: input.scheduleVersion,
    startDate: input.startDate,
    timeZone: input.timeZone,
    shiftDays: input.shiftDays || 0,
    status: input.status,
    totalDays: PLAN_DAYS[input.planKey],
    chaptersRead: read.size,
    percentBible: percentOf(read),
    expectedEndDate: expectedEndDate(input),
    completedAt,
  };
}

/** GET /api/v1/bible-year. `today` only for an active plan. */
export function buildBibleYearState(input: BibleYearProgressInput | null, now: Date): BibleYearStateResponse {
  return {
    catalogue: [...BIBLE_YEAR_CATALOGUE],
    tracks: [...BIBLE_YEAR_TRACKS],
    enrollment: input ? toEnrollmentDTO(input) : null,
    today: input && input.status === 'active' ? buildToday(input, now) : null,
  };
}

/**
 * "Schema verschuiven": how many days to `$inc` shiftDays by so that today
 * becomes the oldest unread day (then nothing before today is unread). Equals
 * behindDays when the unread days are contiguous. 0 when not behind or before
 * the start. Also returns the resulting end date for the confirm dialog.
 */
export function shiftForCatchUp(
  input: BibleYearProgressInput,
  now: Date,
): { shiftBy: number; shiftDays: number; expectedEndDate: string } {
  const { schedule, read, rawDay, dayNumber } = compute(input, now);
  let shiftBy = 0;
  if (dayNumber > 0) {
    const last = Math.min(rawDay - 1, schedule.totalDays);
    for (let d = 1; d <= last; d++) {
      if (!isDayRead(schedule.days[d - 1], read)) {
        shiftBy = rawDay - d;
        break;
      }
    }
  }
  const shiftDays = (input.shiftDays || 0) + shiftBy;
  return { shiftBy, shiftDays, expectedEndDate: expectedEndDate({ ...input, shiftDays }) };
}

/** Keys of a schedule day for `POST /mark {day}`, or null when the day is out of range. */
export function refKeysForDay(input: Pick<BibleYearProgressInput, 'planKey' | 'track' | 'scheduleVersion'>, day: number): string[] | null {
  const schedule = getSchedule(input.planKey, input.track, input.scheduleVersion);
  if (!Number.isInteger(day) || day < 1 || day > schedule.totalDays) return null;
  return dayRefKeys(schedule.days[day - 1]);
}

// ---------------------------------------------------------------------------
// Lookups for the service (auto-tick) and the notification schedule
// ---------------------------------------------------------------------------

const dayIndexMemo = new WeakMap<BibleYearSchedule, Map<string, number>>();

/**
 * The schedule day that holds chapter `key` ("GEN.1"), or null. Every schedule
 * holds each chapter exactly once, so this is one day. The index is built once
 * per schedule (schedules are memoised), so the reader's auto-tick costs one
 * Map lookup instead of a scan of 365-730 days.
 */
export function dayOfRef(schedule: BibleYearSchedule, key: string): number | null {
  let index = dayIndexMemo.get(schedule);
  if (!index) {
    index = new Map();
    for (const d of schedule.days) for (const k of dayRefKeys(d)) index.set(k, d.day);
    dayIndexMemo.set(schedule, index);
  }
  return index.get(key) ?? null;
}

/** One plan day on a calendar date, as the notification schedule needs it. */
export type BibleYearDayOnDate = {
  dayNumber: number;
  totalDays: number;
  portions: { label: string }[];
  minutes: number;
  /** Already fully read (reading ahead counts). */
  done: boolean;
  /** Only on the first date: days before it with unread chapters. */
  behindDays?: number;
};

/**
 * The scheduled day per local date ('YYYY-MM-DD'), after shiftDays. Dates
 * before the start or after the last day are absent. Pure calendar arithmetic
 * plus schedule lookups; `behindDays` is filled in on the first date only.
 */
export function scheduleDaysOnDates(
  input: BibleYearProgressInput,
  dates: readonly string[],
): Map<string, BibleYearDayOnDate> {
  const schedule = getSchedule(input.planKey, input.track, input.scheduleVersion);
  const read = readSetFrom(input.readRefs);
  const out = new Map<string, BibleYearDayOnDate>();
  dates.forEach((date, i) => {
    if (!isValidDateString(date)) return;
    const dayNumber = daysBetween(input.startDate, date) + 1 - (input.shiftDays || 0);
    if (dayNumber < 1 || dayNumber > schedule.totalDays) return;
    const day = schedule.days[dayNumber - 1];
    const entry: BibleYearDayOnDate = {
      dayNumber,
      totalDays: schedule.totalDays,
      portions: day.portions.map((p) => ({ label: p.label })),
      minutes: day.minutes,
      done: isDayRead(day, read),
    };
    if (i === 0) {
      let behind = 0;
      for (let d = 1; d < dayNumber; d++) if (!isDayRead(schedule.days[d - 1], read)) behind++;
      entry.behindDays = behind;
    }
    out.set(date, entry);
  });
  return out;
}
