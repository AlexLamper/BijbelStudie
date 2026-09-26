import type { CuratedStudy, Lesson, StudyRhythm } from './data/curated-studies';
import { findAnyStudy } from './bookStudies';
import { CHAPTER_COUNTS } from './data/bible-chapter-counts';
import { resolveLessonSteps } from './lessonPayload';
import { toCanonicalDutchBook } from './readChaptersCanon';
import { DEFAULT_TIMEZONE, localDateParts } from './studyReminders';
import { STEP_LABELS, STEP_ORDER, isStepKey, type StepKey } from './studyFlow';
import type {
  DashboardResume,
  ResumeItem,
  ResumeSchedule,
  ResumeStep,
} from './resumeTypes';

/**
 * Builds the "Verder waar je gebleven was" answer (lib/resumeTypes.ts).
 *
 * PURE: no database, no fetch, no clock of its own (`now` is an input). The
 * loaders in lib/dashboardResumeService.ts gather the inputs from data the
 * dashboard routes already read; tests/dashboardResume.test.ts pins the rules.
 * SERVER-ONLY in practice: the step list comes from lib/lessonPayload.ts, which
 * reads the authored lesson content, so the context step is exactly the one the
 * lesson page will render.
 *
 * WHICH ITEM IS PRIMARY.
 *  1. The most recently touched active study. A running study wins over a
 *     chapter read more recently, because the study is the habit someone chose
 *     and its lessons read chapters themselves - a lesson's Lezen step moving
 *     `lastReadChapter` must not demote the study it belongs to.
 *  2. ...unless that study has gone quiet: untouched for STALE_STUDY_DAYS AND
 *     a chapter was read after it. Then the reader has visibly moved on to
 *     free reading, the chapter is primary and the study drops to `others`,
 *     one tap away rather than gone.
 *  3. The last chapter read.
 *  4. A start prompt.
 *
 * `others` is every other running study, newest activity first, at most 3.
 */

/** A study untouched this long, with a chapter read since, yields to the chapter. */
export const STALE_STUDY_DAYS = 14;

/** How many other running studies the card lists under "Ook bezig met". */
export const MAX_OTHERS = 3;

const DAY_MS = 86_400_000;

/** Monday, Wednesday, Friday - the same days lib/studyReminders.ts fires on. */
const THREE_PER_WEEK = [1, 3, 5];

const WEEKDAYS_NL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

/** The enrolment fields this module reads; a `.lean()` StudyEnrollment fits. */
export interface ResumeEnrollment {
  studyId: string;
  status: string;
  rhythm?: StudyRhythm | string | null;
  reminderDays?: number[] | null;
  reminderTimezone?: string | null;
  currentLessonDay?: number | null;
  currentStep?: string | null;
  lessonsTotal?: number | null;
  lessonsCompleted?: number | null;
  startedAt?: Date | string | null;
  lastActivityAt?: Date | string | null;
  completedAt?: Date | string | null;
}

export interface ResumeLastRead {
  book?: string | null;
  chapter?: number | null;
  version?: string | null;
  updatedAt?: Date | string | null;
}

export interface ResumeInput {
  /** Any order, any status: only active, unfinished, known studies are used. */
  enrollments: readonly ResumeEnrollment[];
  lastRead: ResumeLastRead | null | undefined;
  /** Canonical `readChapters` (canonicaliseReadChapters), for "12 van 50 hoofdstukken". */
  readChapters?: Record<string, number[]> | null;
  /** Study ids with a lesson completed today (local day), from StudyProgress. */
  completedToday?: ReadonlySet<string> | readonly string[];
  /** The user's zone; an enrolment's own `reminderTimezone` wins for its schedule. */
  timeZone?: string | null;
  now: Date;
  /** Injected in tests; defaults to the lesson payload's own resolver. */
  stepsFor?: (study: CuratedStudy, lesson: Lesson) => StepKey[];
}

// ── Dates ──────────────────────────────────────────────────────────────────

function validZone(zone: string | null | undefined): string {
  if (!zone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Days since 1970-01-01 of the calendar date the zone shows at `instant`. */
export function localDayNumber(instant: Date, timeZone: string): number {
  const { year, month, day } = localDateParts(instant, timeZone);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** 0 = Sunday, for a day number from `localDayNumber` (1970-01-01 was a Thursday). */
function weekdayOf(dayNumber: number): number {
  return (((dayNumber + 4) % 7) + 7) % 7;
}

/** The weekdays a rhythm schedules a lesson on; null = every day; undefined = no schedule. */
function lessonWeekdays(
  rhythm: string | null | undefined,
  reminderDays: readonly number[] | null | undefined,
  startWeekday: number,
): number[] | null | undefined {
  switch (rhythm) {
    case 'dagelijks':
      return null;
    case 'drie-per-week':
      return THREE_PER_WEEK;
    case 'wekelijks':
      // The weekday the study was started on, not "today's" weekday.
      return [startWeekday];
    case 'eigen': {
      const days = (reminderDays ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
      // Same rule as the reminders: nothing ticked is treated as daily.
      return days.length > 0 ? [...new Set(days)] : null;
    }
    default:
      // 'vrij' (and anything unknown): no schedule to be on or off.
      return undefined;
  }
}

/** Scheduled days in [from, to] inclusive. */
function countWeekdays(from: number, to: number, weekdays: number[] | null): number {
  if (to < from) return 0;
  const span = to - from + 1;
  if (weekdays === null) return span;
  const set = new Set(weekdays);
  let count = Math.floor(span / 7) * set.size;
  for (let d = from + Math.floor(span / 7) * 7; d <= to; d++) {
    if (set.has(weekdayOf(d))) count++;
  }
  return count;
}

export interface ScheduleInput {
  rhythm: string | null | undefined;
  reminderDays?: readonly number[] | null;
  startedAt: Date | string | null | undefined;
  lessonsCompleted: number;
  lessonsTotal: number;
  timeZone: string;
  now: Date;
}

/**
 * Where a reader stands against their own rhythm, or null for 'vrij'.
 *
 * The start day always counts as a lesson day (that is when lesson 1 is
 * normally done, whatever the weekday), then every scheduled weekday after it.
 * Today's lesson is not yet "behind": behind compares the lessons done with
 * what was due up to YESTERDAY, ahead compares with what is due up to and
 * including today. Both are capped at the number of lessons.
 */
export function scheduleStatus(input: ScheduleInput): ResumeSchedule | null {
  const started = toDate(input.startedAt);
  if (!started) return null;
  const zone = validZone(input.timeZone);
  const start = localDayNumber(started, zone);
  const today = Math.max(start, localDayNumber(input.now, zone));
  const weekdays = lessonWeekdays(input.rhythm, input.reminderDays, weekdayOf(start));
  if (weekdays === undefined) return null;

  const total = Math.max(0, input.lessonsTotal);
  const dueThrough = (day: number) =>
    day < start ? 0 : Math.min(total, 1 + countWeekdays(start + 1, day, weekdays));

  const dueBeforeToday = dueThrough(today - 1);
  const dueByToday = dueThrough(today);
  const done = Math.max(0, input.lessonsCompleted);

  if (done < dueBeforeToday) return { status: 'achter', lessons: dueBeforeToday - done };
  if (done > dueByToday) return { status: 'vooruit', lessons: done - dueByToday };
  return { status: 'op-schema', lessons: 0 };
}

/** "Morgen", or the Dutch weekday of the next scheduled lesson day after today. */
function nextLessonWhen(
  rhythm: string | null | undefined,
  reminderDays: readonly number[] | null | undefined,
  startedAt: Date | null,
  now: Date,
  zone: string,
): string {
  const today = localDayNumber(now, zone);
  const start = startedAt ? localDayNumber(startedAt, zone) : today;
  const weekdays = lessonWeekdays(rhythm, reminderDays, weekdayOf(start));
  if (!weekdays) return 'Morgen';
  for (let d = today + 1; d <= today + 7; d++) {
    if (weekdays.includes(weekdayOf(d))) {
      return d === today + 1 ? 'Morgen' : WEEKDAYS_NL[weekdayOf(d)];
    }
  }
  return 'Morgen';
}

// ── Steps and hrefs ────────────────────────────────────────────────────────

/**
 * The step a stored cursor means in THIS lesson's step list.
 *
 * A stored step the lesson does not have (the context step is left out of most
 * lessons of a whole-book study; `intro` only exists when authored) resolves to
 * the next step it does have, so "Verdieping" never becomes "Inleiding".
 * `done`, unknown or missing: the first step.
 */
export function resolveCursorStep(steps: readonly StepKey[], stored: string | null | undefined): StepKey {
  if (steps.length === 0) return 'word';
  if (isStepKey(stored)) {
    if (steps.includes(stored)) return stored;
    const order = STEP_ORDER.indexOf(stored);
    const next = steps.find((step) => STEP_ORDER.indexOf(step) > order);
    if (next) return next;
  }
  return steps[0];
}

function sortedLessons(study: CuratedStudy): Lesson[] {
  return [...study.lessons].sort((a, b) => a.day - b.day);
}

/** The enrolment's lesson, or the first lesson when the stored day is not one. */
export function cursorLesson(study: CuratedStudy, day: number | null | undefined): Lesson | null {
  const lessons = sortedLessons(study);
  return lessons.find((lesson) => lesson.day === day) ?? lessons[0] ?? null;
}

/**
 * `/studie/<id>/<day>?stap=<step>` for an enrolment's cursor, with the step
 * resolved against the lesson's real step list. Shared with
 * app/studie/[studyId]/page.tsx so the redirect and the card never disagree.
 */
export function studyResumeHref(
  study: CuratedStudy,
  day: number | null | undefined,
  storedStep: string | null | undefined,
  stepsFor: (study: CuratedStudy, lesson: Lesson) => StepKey[] = resolveLessonSteps,
): string {
  const cursor = resolveStudyCursor(study, day, storedStep, stepsFor);
  if (!cursor) return `/studies/${study.id}`;
  return `/studie/${study.id}/${cursor.lesson.day}?stap=${cursor.step}`;
}

/**
 * An enrolment's cursor resolved against the lesson's real step list: the
 * lesson (cursorLesson), its steps and the step (resolveCursorStep). Null for
 * a study without lessons. Shared with lib/notificationSchedule.ts.
 */
export function resolveStudyCursor(
  study: CuratedStudy,
  day: number | null | undefined,
  storedStep: string | null | undefined,
  stepsFor: (study: CuratedStudy, lesson: Lesson) => StepKey[] = resolveLessonSteps,
): { lesson: Lesson; steps: StepKey[]; step: StepKey } | null {
  const lesson = cursorLesson(study, day);
  if (!lesson) return null;
  const steps = stepsFor(study, lesson);
  return { lesson, steps, step: resolveCursorStep(steps, storedStep) };
}

/** The reader's web URL for a chapter, as hooks/useDashboardData `readHref` builds it. */
export function chapterHref(book: string, chapter: number, version?: string | null): string {
  const params = new URLSearchParams({
    book,
    chapter: String(chapter),
    version: version || 'statenvertaling',
  });
  return `/lezen?${params.toString()}`;
}

/**
 * A lesson title worth showing after "Les 6 van 50". Generated book lessons are
 * titled "6. Noach" or "Hoofdstuk 6"; the number is already in "Les 6".
 */
function lessonName(lesson: Lesson): string {
  const raw = lesson.title.replace(/^\d+\.\s*/, '').trim();
  return /^Hoofdstuk \d+$/i.test(raw) ? '' : raw;
}

// ── Items ──────────────────────────────────────────────────────────────────

function studyItem(
  enrollment: ResumeEnrollment,
  study: CuratedStudy,
  input: ResumeInput,
  completedToday: ReadonlySet<string>,
): ResumeItem {
  const stepsFor = input.stepsFor ?? resolveLessonSteps;
  const lessons = sortedLessons(study);
  const lesson = cursorLesson(study, enrollment.currentLessonDay)!;
  const position = lessons.indexOf(lesson) + 1;
  const total = enrollment.lessonsTotal || lessons.length;

  const steps = stepsFor(study, lesson);
  const stepId = resolveCursorStep(steps, enrollment.currentStep);
  const index = Math.max(1, steps.indexOf(stepId) + 1);
  const step: ResumeStep = {
    id: stepId,
    index,
    count: Math.max(steps.length, 1),
    label: STEP_LABELS[stepId],
  };

  const zone = validZone(enrollment.reminderTimezone ?? input.timeZone);
  const startedAt = toDate(enrollment.startedAt);
  const done = Math.max(0, enrollment.lessonsCompleted ?? 0);

  // A lesson of this study was finished today and the reader has not started
  // the next one yet (finishing moves the cursor to the next lesson's first
  // step). Once they are into it, the card resumes that step instead.
  const doneToday = completedToday.has(study.id) && index === 1;
  const when = doneToday
    ? nextLessonWhen(enrollment.rhythm, enrollment.reminderDays, startedAt, input.now, zone)
    : null;

  const name = lessonName(lesson);

  return {
    kind: 'study',
    title: study.title,
    subtitle: `Les ${position} van ${total}${name ? ` · ${name}` : ''}`,
    studyId: study.id,
    lessonDay: lesson.day,
    step,
    progress: { done: Math.min(done, total), total },
    schedule: scheduleStatus({
      rhythm: enrollment.rhythm,
      reminderDays: enrollment.reminderDays,
      startedAt,
      lessonsCompleted: done,
      lessonsTotal: total,
      timeZone: zone,
      now: input.now,
    }),
    doneToday,
    nextLabel: when ? `${when} les ${position}` : null,
    cta: doneToday
      ? `Alvast beginnen aan les ${position}`
      : index === 1
        ? `Begin les ${position}`
        : `Verder met stap ${index}`,
    href: `/studie/${study.id}/${lesson.day}?stap=${stepId}`,
    imageUrl: study.image ? study.image : null,
  };
}

function chapterItem(lastRead: ResumeLastRead, input: ResumeInput): ResumeItem | null {
  const book = typeof lastRead.book === 'string' ? lastRead.book.trim() : '';
  const chapter = Number(lastRead.chapter);
  if (!book || !Number.isInteger(chapter) || chapter < 1) return null;

  const canonical = toCanonicalDutchBook(book) ?? book;
  const total = CHAPTER_COUNTS[canonical] ?? null;
  const read = input.readChapters?.[canonical]?.length ?? 0;

  return {
    kind: 'chapter',
    title: `${canonical} ${chapter}`,
    subtitle: total ? `${Math.min(read, total)} van ${total} hoofdstukken` : null,
    studyId: null,
    lessonDay: null,
    step: null,
    progress: total ? { done: Math.min(read, total), total } : null,
    schedule: null,
    doneToday: false,
    nextLabel: null,
    cta: 'Verder lezen',
    // The stored spelling, not the canonical one: it is the translation's own
    // name for the book, which is what the reader resolves the folder by.
    href: chapterHref(book, chapter, lastRead.version),
    imageUrl: null,
  };
}

const START_ITEM: ResumeItem = {
  kind: 'start',
  title: 'Kies een studie of begin met lezen',
  subtitle: 'Je laatste les of hoofdstuk verschijnt hier',
  studyId: null,
  lessonDay: null,
  step: null,
  progress: null,
  schedule: null,
  doneToday: false,
  nextLabel: null,
  cta: 'Kies een studie',
  href: '/studies',
  imageUrl: null,
};

function isRunning(enrollment: ResumeEnrollment): boolean {
  return enrollment.status === 'active' && !enrollment.completedAt;
}

function activityTime(enrollment: ResumeEnrollment): number {
  return toDate(enrollment.lastActivityAt)?.getTime() ?? 0;
}

export interface RunningStudy<E extends ResumeEnrollment = ResumeEnrollment> {
  enrollment: E;
  study: CuratedStudy;
}

/**
 * The selection rule of the header (points 1-2), shared with the
 * notification schedule (lib/notificationSchedule.ts) so a push never names a
 * different study than the card: running (active, no completedAt), known
 * studies only, newest activity first; `studyIsStale` when the newest one is
 * untouched for STALE_STUDY_DAYS and a chapter was read after it.
 */
export function selectRunningStudies<E extends ResumeEnrollment>(
  enrollments: readonly E[],
  lastRead: { hasChapter: boolean; updatedAt?: Date | string | null },
  now: Date,
): { running: RunningStudy<E>[]; studyIsStale: boolean } {
  const running = enrollments
    .filter(isRunning)
    .map((enrollment) => ({ enrollment, study: findAnyStudy(enrollment.studyId) }))
    .filter((entry): entry is RunningStudy<E> => !!entry.study)
    .sort((a, b) => activityTime(b.enrollment) - activityTime(a.enrollment));

  const lastReadAt = toDate(lastRead.updatedAt)?.getTime() ?? 0;
  const newest = running[0];
  const studyIsStale =
    !!newest &&
    lastRead.hasChapter &&
    now.getTime() - activityTime(newest.enrollment) > STALE_STUDY_DAYS * DAY_MS &&
    lastReadAt > activityTime(newest.enrollment);
  return { running, studyIsStale };
}

/** The whole answer. See the header for how the primary item is chosen. */
export function buildDashboardResume(input: ResumeInput): DashboardResume {
  const completedToday = new Set(input.completedToday ?? []);

  const chapter = input.lastRead ? chapterItem(input.lastRead, input) : null;
  const { running, studyIsStale } = selectRunningStudies(
    input.enrollments,
    { hasChapter: !!chapter, updatedAt: input.lastRead?.updatedAt },
    input.now,
  );
  const newest = running[0];

  const items = (entries: typeof running) =>
    entries.map(({ enrollment, study }) => studyItem(enrollment, study, input, completedToday));

  if (newest && !studyIsStale) {
    return {
      primary: items([newest])[0],
      others: items(running.slice(1, 1 + MAX_OTHERS)),
    };
  }

  return {
    primary: chapter ?? START_ITEM,
    others: items(running.slice(0, MAX_OTHERS)),
  };
}
