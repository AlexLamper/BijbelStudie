/**
 * Content for the app's locally scheduled notifications:
 * `GET /api/v1/notifications/schedule` (contract: lib/notificationScheduleTypes.ts,
 * plan: DAILY_HABIT_PLAN.md §1-2).
 *
 * Two halves. The top of this file is PURE - dates, validation, task choice and
 * copy - and is what tests/notificationSchedule.test.ts covers. The loader at
 * the bottom does the I/O through dynamic imports, so importing this module
 * (from a test, or for the date helpers) never pulls in Mongoose.
 *
 * Copy rules, as in lib/notificationCopy.ts: Dutch, no emoji, no exclamation
 * marks, no "moet", no guilt and no deadline. The morning title is the task,
 * the body the day's verse; the evening is a friendly, specific nudge.
 */

import { CHAPTER_COUNTS } from './data/bible-chapter-counts';
import { toCanonicalDutchBook } from './readChaptersCanon';
import { STEP_LABELS, type StepKey } from './studyFlow';
import type { BibleYearPortion } from './bibleYear/types';
import type {
  NotificationKind,
  NotificationScheduleDay,
  NotificationScheduleResponse,
  ScheduledNotificationContent,
} from './notificationScheduleTypes';

export const DEFAULT_TIME_ZONE = 'Europe/Amsterdam';
export const MAX_SCHEDULE_DAYS = 14;

/** Titles longer than this lose the tail of their variable part, not the task. */
export const SCHEDULE_TITLE_MAX = 48;
/** Android's collapsed notification shows about this much of the body. */
export const SCHEDULE_BODY_MAX = 110;

// ---------------------------------------------------------------------------
// Request parameters
// ---------------------------------------------------------------------------

/** `?days=`, clamped to 1..14. Missing or not a number: 14. */
export function clampScheduleDays(raw: string | null | undefined): number {
  if (raw === null || raw === undefined || raw.trim() === '') return MAX_SCHEDULE_DAYS;
  const n = Number(raw);
  if (!Number.isFinite(n)) return MAX_SCHEDULE_DAYS;
  return Math.min(MAX_SCHEDULE_DAYS, Math.max(1, Math.trunc(n)));
}

/** True for an IANA zone this runtime's Intl knows. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * `?tz=`, or Europe/Amsterdam. An unknown zone falls back rather than failing:
 * a phone with an odd zone string should still get its reminders, and the
 * response echoes the zone actually used.
 */
export function resolveTimeZone(raw: string | null | undefined): string {
  const tz = (raw ?? '').trim();
  return tz && isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** The calendar day `yyyy-mm-dd` of an instant in a zone. */
export function localDateKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Days since 1970-01-01 for a `yyyy-mm-dd` key (calendar arithmetic, no zone). */
export function epochDay(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function dateKeyFromEpochDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

/**
 * `count` consecutive local calendar days, starting with today in `timeZone`.
 * Stepped on the calendar, not by adding 24 h to an instant, so a DST change
 * can never skip or repeat a day.
 */
export function localDates(timeZone: string, count: number, now = new Date()): string[] {
  const start = epochDay(localDateKey(now, timeZone));
  return Array.from({ length: count }, (_, i) => dateKeyFromEpochDay(start + i));
}

/**
 * Deterministic variant choice: consecutive days always get a different
 * variant (for pools of two or more), the same date always the same one.
 */
export function variantIndex(dateKey: string, poolSize: number, salt = 0): number {
  if (poolSize <= 1) return 0;
  const n = (epochDay(dateKey) + salt) % poolSize;
  return n < 0 ? n + poolSize : n;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/**
 * One day of a Bijbel-in-een-jaar plan, as the notification needs it.
 * Built by the bible-year service from its schedule + enrollment.
 */
export type BibleYearNotificationDay = {
  /** 1..totalDays, after shiftDays. */
  dayNumber: number;
  totalDays: number;
  portions: Pick<BibleYearPortion, 'label'>[];
  minutes: number;
  /** Already fully read (reading ahead counts): the day falls through to the next task. */
  done?: boolean;
  /** First requested date only: earlier plan days with unread chapters. */
  behindDays?: number;
};

/**
 * Hook for the Bijbel-in-een-jaar backend: the plan portion per local date, or
 * null when the user has no active plan. Dates outside the plan (before the
 * start, after the end) are simply absent from the map.
 */
export type BibleYearNotificationProvider = (
  userId: string,
  dates: string[],
) => Promise<Map<string, BibleYearNotificationDay> | null>;

/**
 * One indexed findOne on the active BibleYearEnrollment, then pure lookups in
 * the static schedule per date (lib/bibleYear/service.ts
 * `getBibleYearDaysOnDates`). Dynamic import: this module stays Mongoose-free.
 */
export const getBibleYearNotificationInfo: BibleYearNotificationProvider = async (userId, dates) => {
  const { getBibleYearDaysOnDates } = await import('./bibleYear/service');
  return getBibleYearDaysOnDates(userId, dates);
};

export type StudyTask = {
  kind: 'study';
  studyId: string;
  title: string;
  lessonDay: number;
  step: StepKey;
  /** 1-based position of `step` in this lesson's real step list. */
  stepIndex: number;
  stepCount: number;
  /** The whole lesson's estimate (lib/data/curated-studies default 12). */
  lessonMinutes: number;
};

export type ChapterTask = { kind: 'chapter'; book: string; chapter: number };

export type BibleYearTask = {
  kind: 'bibleYear';
  dayNumber: number;
  totalDays: number;
  label: string;
  minutes: number;
};

export type ScheduleTask = BibleYearTask | StudyTask | ChapterTask | { kind: 'verse' };

export type ScheduleContext = {
  bibleYear: Map<string, BibleYearNotificationDay> | null;
  study: StudyTask | null;
  chapter: ChapterTask | null;
};

export type ScheduleVerse = NonNullable<NotificationScheduleDay['verse']>;

/**
 * The chapter after the last one read: next chapter, or chapter 1 of the next
 * book. Null past Openbaring 22 or for a book name the canon does not know.
 */
export function nextChapterAfter(book: string, chapter: number): ChapterTask | null {
  const total = CHAPTER_COUNTS[book];
  if (!total || !Number.isInteger(chapter)) return null;
  if (chapter < total) return { kind: 'chapter', book, chapter: Math.max(1, chapter + 1) };
  const books = Object.keys(CHAPTER_COUNTS);
  const next = books[books.indexOf(book) + 1];
  return next ? { kind: 'chapter', book: next, chapter: 1 } : null;
}

/** Priority: Bijbel in een jaar > study in progress > last chapter read > the verse. */
export function taskForDate(ctx: ScheduleContext, date: string): ScheduleTask {
  const plan = ctx.bibleYear?.get(date);
  if (plan && !plan.done && plan.portions.length > 0) {
    return {
      kind: 'bibleYear',
      dayNumber: plan.dayNumber,
      totalDays: plan.totalDays,
      label: plan.portions.map((p) => p.label).join(', '),
      minutes: Math.max(1, Math.round(plan.minutes)),
    };
  }
  if (ctx.study) return ctx.study;
  if (ctx.chapter) return ctx.chapter;
  return { kind: 'verse' };
}

/** The app route a task opens. Always one of the app's whitelisted shapes. */
export function routeForTask(task: ScheduleTask): string {
  switch (task.kind) {
    case 'bibleYear':
      return '/studies/bijbel-in-een-jaar';
    case 'study':
      return `/studie/${encodeURIComponent(task.studyId)}/${task.lessonDay}?stap=${task.step}`;
    case 'chapter':
      return '/read';
    case 'verse':
      return '/dashboard';
  }
}

const ROUTE_WHITELIST = [
  /^\/studie\/[A-Za-z0-9%._~-]+\/\d+\?stap=(intro|context|word|depth|quiz|reflection)$/,
  /^\/studies\/bijbel-in-een-jaar$/,
  /^\/read$/,
  /^\/dashboard$/,
];

/** Mirrors the app's go_router whitelist; the tests hold every route to it. */
export function isWhitelistedRoute(route: string): boolean {
  return ROUTE_WHITELIST.some((re) => re.test(route));
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** Cuts at a word boundary and adds an ellipsis; never mid-word. */
export function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, Math.max(1, max - 1));
  const space = cut.lastIndexOf(' ');
  const head = space > max / 3 ? cut.slice(0, space) : cut;
  return `${head.replace(/[\s.,;:!?·-]+$/, '')}…`;
}

/**
 * Dutch convention: one psalm is "Psalm 23:1", the book is "Psalmen" - so a
 * reference inside a single psalm reads "Psalm", while a range across psalms
 * ("Psalmen 23-24") keeps the book name. Other books pass through unchanged.
 */
export function notificationReference(reference: string): string {
  return reference.replace(/^Psalmen (\d+)(:\d+(?:[-–]\d+)?)?$/, 'Psalm $1$2');
}

/** `“verse…” Reference`, within the body limit. */
export function verseBody(verse: ScheduleVerse): string {
  const reference = notificationReference(verse.reference);
  const room = SCHEDULE_BODY_MAX - reference.length - 3; // two quotes + a space
  return `“${shorten(verse.text, room)}” ${reference}`;
}

/** Minutes left in the lesson from this step on, in fives, at least five. */
export function remainingStudyMinutes(task: StudyTask): number {
  const remaining = Math.max(1, task.stepCount - task.stepIndex + 1);
  const share = (task.lessonMinutes * remaining) / Math.max(1, task.stepCount);
  return Math.max(5, Math.round(share / 5) * 5);
}

function stepsWord(n: number): string {
  return n === 1 ? '1 stap' : `${n} stappen`;
}

type Line = { title: string; body: string };

/** Fits a title by shortening only its variable part. */
function fitTitle(make: (part: string) => string, part: string): string {
  const full = make(part);
  if (full.length <= SCHEDULE_TITLE_MAX) return full;
  const room = SCHEDULE_TITLE_MAX - (full.length - part.length);
  return make(shorten(part, Math.max(8, room)));
}

function morningTitles(task: ScheduleTask): string[] {
  switch (task.kind) {
    case 'bibleYear':
      return [
        fitTitle((l) => `Dag ${task.dayNumber} · ${l}`, task.label),
        fitTitle((l) => `Vandaag: ${l}`, task.label),
        fitTitle((l) => `Je leesdeel: ${l}`, task.label),
      ];
    case 'study': {
      const label = STEP_LABELS[task.step];
      const n = task.lessonDay;
      return [
        fitTitle((s) => `${s} · les ${n}, stap ${task.stepIndex} (${label})`, task.title),
        fitTitle((s) => `${s}, les ${n}: ${label}`, task.title),
        fitTitle((s) => `Les ${n} van ${s} · stap ${task.stepIndex}`, task.title),
      ];
    }
    case 'chapter':
      return [
        `Verder in ${task.book} ${task.chapter}`,
        `${task.book} ${task.chapter} staat klaar`,
        `Vandaag: ${task.book} ${task.chapter}`,
      ];
    case 'verse':
      return ['Tekst van de dag', 'Een vers voor vandaag', 'Je tekst voor vandaag'];
  }
}

/** The morning body when there is no verse: a line about the task itself. */
function morningTaskLines(task: ScheduleTask): string[] {
  switch (task.kind) {
    case 'bibleYear':
      return [
        `Ongeveer ${task.minutes} minuten lezen.`,
        `Je leesdeel staat klaar. Ongeveer ${task.minutes} minuten.`,
        'Lees zo ver als je komt.',
      ];
    case 'study': {
      const min = remainingStudyMinutes(task);
      return [
        `Stap ${task.stepIndex} van ${task.stepCount}: ${STEP_LABELS[task.step]}. Ongeveer ${min} minuten.`,
        `Je les staat klaar waar je gebleven was. Ongeveer ${min} minuten.`,
        'Je gaat verder waar je gebleven was.',
      ];
    }
    case 'chapter':
      return [
        'Je gaat verder waar je gebleven was.',
        'Eén hoofdstuk, meer hoeft niet.',
        'Lees zo ver als je komt.',
      ];
    case 'verse':
      return [
        'Een vers om de dag mee te beginnen.',
        'Even stil bij het Woord.',
        'Eén hoofdstuk, meer hoeft niet.',
      ];
  }
}

function eveningLines(task: ScheduleTask, verse: ScheduleVerse | null): Line[] {
  switch (task.kind) {
    case 'bibleYear':
      return [
        { title: 'Je leesdeel van vandaag staat nog klaar', body: `${task.label}. Ongeveer ${task.minutes} minuten.` },
        { title: `Dag ${task.dayNumber} ligt nog open`, body: `${task.label}. Lees zo ver als je komt.` },
        { title: 'Nog even lezen?', body: `${task.label} staat klaar. Ongeveer ${task.minutes} minuten.` },
      ];
    case 'study': {
      const min = remainingStudyMinutes(task);
      const left = task.stepCount - task.stepIndex + 1;
      const n = task.lessonDay;
      return [
        { title: 'Je les staat nog klaar', body: `Nog even verder met ${task.title} les ${n}? Ongeveer ${min} minuten.` },
        { title: `Nog ${stepsWord(left)} in les ${n}`, body: `${task.title}: je gaat verder bij ${STEP_LABELS[task.step]}. Ongeveer ${min} minuten.` },
        { title: fitTitle((s) => `Verder met ${s}?`, task.title), body: `Les ${n} ligt klaar waar je stopte. Geen haast.` },
      ];
    }
    case 'chapter':
      return [
        { title: `${task.book} ${task.chapter} ligt nog open`, body: 'Tien minuten is genoeg om verder te komen.' },
        { title: 'Nog een hoofdstuk?', body: `${task.book} ${task.chapter} staat klaar. Geen haast.` },
        { title: `Verder in ${task.book}?`, body: `Hoofdstuk ${task.chapter} wacht gewoon op je.` },
      ];
    case 'verse':
      return [
        {
          title: 'Even stil aan het eind van de dag',
          body: verse ? `Nog eens lezen: ${notificationReference(verse.reference)}.` : 'Eén hoofdstuk, meer hoeft niet.',
        },
        { title: 'Een rustig moment', body: 'Lees een hoofdstuk, of alleen de tekst van vandaag.' },
        { title: 'Je Bijbel ligt klaar', body: 'Geen haast. Lees zo ver als je komt.' },
      ];
  }
}

function content(kind: NotificationKind, line: Line, route: string): ScheduledNotificationContent {
  return {
    kind,
    title: shorten(line.title, SCHEDULE_TITLE_MAX),
    body: shorten(line.body, SCHEDULE_BODY_MAX),
    route,
  };
}

export function buildMorning(
  task: ScheduleTask,
  verse: ScheduleVerse | null,
  date: string,
): ScheduledNotificationContent {
  const titles = morningTitles(task);
  const title = titles[variantIndex(date, titles.length, 0)];
  let body: string;
  if (verse) {
    body = verseBody(verse);
  } else {
    const lines = morningTaskLines(task);
    body = lines[variantIndex(date, lines.length, 1)];
  }
  return content(task.kind, { title, body }, routeForTask(task));
}

export function buildEvening(
  task: ScheduleTask,
  verse: ScheduleVerse | null,
  date: string,
): ScheduledNotificationContent {
  const lines = eveningLines(task, verse);
  return content(task.kind, lines[variantIndex(date, lines.length, 2)], routeForTask(task));
}

export function buildScheduleDay(
  date: string,
  ctx: ScheduleContext,
  rawVerse: ScheduleVerse | null,
): NotificationScheduleDay {
  const verse = rawVerse ? { ...rawVerse, reference: notificationReference(rawVerse.reference) } : null;
  const task = taskForDate(ctx, date);
  return {
    date,
    verse,
    morning: buildMorning(task, verse, date),
    evening: buildEvening(task, verse, date),
  };
}

export function buildScheduleResponse(input: {
  dates: string[];
  timeZone: string;
  ctx: ScheduleContext;
  verses: (ScheduleVerse | null)[];
  now?: Date;
}): NotificationScheduleResponse {
  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    timeZone: input.timeZone,
    days: input.dates.map((date, i) => buildScheduleDay(date, input.ctx, input.verses[i] ?? null)),
  };
}

// ---------------------------------------------------------------------------
// Loader (I/O). Dynamic imports keep the pure half above test- and client-light.
// ---------------------------------------------------------------------------

type LastReadChapter = { book?: string | null; chapter?: number | null; updatedAt?: Date | string | null };
type LeanUserChapter = { lastReadChapter?: LastReadChapter | null } | null;
type LeanEnrollment = {
  studyId: string;
  status: string;
  currentLessonDay?: number | null;
  currentStep?: string | null;
  lastActivityAt?: Date | string | null;
  completedAt?: Date | string | null;
};

/** Same slack as the resume card's loader (lib/dashboardResumeService.ts ACTIVE_LIMIT). */
const RUNNING_LIMIT = 8;

/**
 * The chapter after the last one read. `lastReadChapter.book` keeps the
 * translation's own spelling, so it is folded onto the canonical Dutch name
 * (the CHAPTER_COUNTS keys, and what the Dutch copy should say) first.
 */
export function chapterTaskFrom(last: LastReadChapter | null | undefined): ChapterTask | null {
  if (!last?.book || typeof last.chapter !== 'number') return null;
  const book = toCanonicalDutchBook(last.book) ?? last.book;
  return nextChapterAfter(book, last.chapter) ?? { kind: 'chapter', book, chapter: last.chapter };
}

/**
 * Two indexed reads in parallel (the user by _id, the running enrollments on
 * {userId, lastActivityAt}) plus the bible-year hook. The study is chosen by
 * the resume card's own rule (lib/dashboardResume.ts selectRunningStudies), so
 * a push never names a different study than the dashboard. Everything else is
 * static content in memory.
 */
export async function loadScheduleContext(
  userId: string,
  dates: string[],
  bibleYear: BibleYearNotificationProvider = getBibleYearNotificationInfo,
  now: Date = new Date(),
): Promise<ScheduleContext> {
  const [{ default: connectMongoDB }, { default: User }, { default: StudyEnrollment }, resume] = await Promise.all([
    import('./mongodb'),
    import('../models/User'),
    import('../models/StudyEnrollment.js'),
    import('./dashboardResume'),
  ]);
  await connectMongoDB();

  const [user, enrollments, plan] = await Promise.all([
    User.findById(userId).select('lastReadChapter').lean<LeanUserChapter>(),
    StudyEnrollment.find({ userId, status: 'active' })
      .sort({ lastActivityAt: -1 })
      .limit(RUNNING_LIMIT)
      .select('studyId status currentLessonDay currentStep lastActivityAt completedAt')
      .lean<LeanEnrollment[]>(),
    bibleYear(userId, dates).catch(() => null),
  ]);

  const last = user?.lastReadChapter;
  const chapter = chapterTaskFrom(last);
  const { running, studyIsStale } = resume.selectRunningStudies(
    enrollments ?? [],
    { hasChapter: !!chapter, updatedAt: last?.updatedAt },
    now,
  );
  const study = running[0] && !studyIsStale ? studyTaskFor(running[0], resume.resolveStudyCursor) : null;

  return { bibleYear: plan, study, chapter };
}

function studyTaskFor(
  { enrollment, study }: { enrollment: LeanEnrollment; study: import('./data/curated-studies').CuratedStudy },
  resolveStudyCursor: typeof import('./dashboardResume').resolveStudyCursor,
): StudyTask | null {
  try {
    // The resume card's cursor: a stored step this lesson lacks resolves to
    // the next step it has, never back to the first.
    const cursor = resolveStudyCursor(study, enrollment.currentLessonDay, enrollment.currentStep);
    if (!cursor || cursor.steps.length === 0) return null;
    const { lesson, steps, step } = cursor;
    return {
      kind: 'study',
      studyId: study.id,
      title: study.title,
      lessonDay: lesson.day,
      step,
      stepIndex: steps.indexOf(step) + 1,
      stepCount: steps.length,
      lessonMinutes: lesson.estimatedMinutes ?? 12,
    };
  } catch {
    return null;
  }
}

/** The whole answer for one user. Verses are fetched per date, in parallel, never written. */
/** Kinds the app's content toggles can switch off (`?exclude=bibleYear,study,verse`). */
export type ExcludableKind = 'bibleYear' | 'study' | 'verse';

export function parseExclude(raw: string | null | undefined): Set<ExcludableKind> {
  const out = new Set<ExcludableKind>();
  for (const part of (raw ?? '').split(',')) {
    const key = part.trim();
    if (key === 'bibleYear' || key === 'study' || key === 'verse') out.add(key);
  }
  return out;
}

export async function buildNotificationSchedule(
  userId: string,
  options: {
    days: number;
    timeZone: string;
    now?: Date;
    bibleYear?: BibleYearNotificationProvider;
    exclude?: Set<ExcludableKind>;
  },
): Promise<NotificationScheduleResponse> {
  const now = options.now ?? new Date();
  const exclude = options.exclude ?? new Set<ExcludableKind>();
  const dates = localDates(options.timeZone, options.days, now);
  const { fetchDayTextForDate } = await import('./mobileDayText');

  const [loaded, verses] = await Promise.all([
    loadScheduleContext(userId, dates, options.bibleYear, now),
    exclude.has('verse')
      ? Promise.resolve(dates.map(() => null))
      : Promise.all(
          dates.map(async (date): Promise<ScheduleVerse | null> => {
            const v = await fetchDayTextForDate(date);
            return v ? { text: v.text, reference: v.reference, translation: v.version || 'Statenvertaling' } : null;
          }),
        ),
  ]);
  // A switched-off kind falls through to the next priority (taskForDate).
  const ctx: ScheduleContext = {
    ...loaded,
    bibleYear: exclude.has('bibleYear') ? null : loaded.bibleYear,
    study: exclude.has('study') ? null : loaded.study,
  };

  return buildScheduleResponse({ dates, timeZone: options.timeZone, ctx, verses, now });
}
