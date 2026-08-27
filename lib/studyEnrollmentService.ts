import connectMongoDB from './mongodb';
import User from '../models/User';
import StudyEnrollment from '../models/StudyEnrollment.js';
import StudyLessonState from '../models/StudyLessonState.js';
import StudyProgress from '../models/StudyProgress.js';
import { curatedStudies, type StudyDepth, type StudyRhythm } from './data/curated-studies';
import { computeNextReminderAt } from './studyReminders';
import { STEP_ORDER, type CursorStep } from './studyFlow';

/**
 * Everything that reads or writes a study enrollment.
 *
 * Kept in one module because `nextReminderAt` must be recomputed on exactly
 * four occasions - creation, a settings change, lesson completion, and the cron
 * after sending - and scattering that across route handlers is how the stored
 * instant drifts away from the settings that produced it.
 */

const RHYTHMS: StudyRhythm[] = ['dagelijks', 'drie-per-week', 'wekelijks', 'eigen', 'vrij'];
const DEPTHS: StudyDepth[] = ['kort', 'diep'];
const CURSOR_STEPS: CursorStep[] = [...STEP_ORDER, 'done'];

export function isRhythm(value: unknown): value is StudyRhythm {
  return typeof value === 'string' && (RHYTHMS as string[]).includes(value);
}

export function isDepth(value: unknown): value is StudyDepth {
  return typeof value === 'string' && (DEPTHS as string[]).includes(value);
}

export function isCursorStep(value: unknown): value is CursorStep {
  return typeof value === 'string' && (CURSOR_STEPS as string[]).includes(value);
}

/** Weekdays 0-6, de-duplicated and sorted. Anything else is dropped. */
export function sanitiseReminderDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const days = value
    .map((entry) => Number(entry))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

/**
 * An IANA zone name, or null.
 *
 * Validated by asking Intl to use it: an invalid zone throws a RangeError, and
 * storing one would make every later reminder computation throw instead.
 */
export function sanitiseTimezone(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

export function sanitiseReminderMinutes(value: unknown): number | null {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) return null;
  return minutes;
}

export interface EnrollmentSettings {
  rhythm?: StudyRhythm;
  reminderDays?: number[];
  translation?: string | null;
  depth?: StudyDepth;
  commentary?: string | null;
  remindersEnabled?: boolean;
  reminderMinutes?: number | null;
  reminderTimezone?: string | null;
}

interface UserReminderPrefs {
  reminderMinutes?: number | null;
  reminderTimezone?: string | null;
}

async function loadUserPrefs(userId: string): Promise<UserReminderPrefs> {
  const user = await User.findById(userId)
    .select('preferences.reminderMinutes preferences.reminderTimezone')
    .lean<{ preferences?: UserReminderPrefs }>();
  return {
    reminderMinutes: user?.preferences?.reminderMinutes ?? null,
    reminderTimezone: user?.preferences?.reminderTimezone ?? null,
  };
}

export function findStudy(studyId: string) {
  return curatedStudies.find((study) => study.id === studyId) ?? null;
}

/** The lowest lesson day, which is where a fresh enrollment starts. */
function firstLessonDay(studyId: string): number {
  const study = findStudy(studyId);
  if (!study || study.lessons.length === 0) return 1;
  return Math.min(...study.lessons.map((lesson) => lesson.day));
}

export interface EnrollmentDoc {
  _id: unknown;
  userId: unknown;
  studyId: string;
  status: string;
  rhythm: StudyRhythm;
  reminderDays: number[];
  translation: string | null;
  depth: StudyDepth;
  commentary: string | null;
  currentLessonDay: number;
  currentStep: CursorStep;
  lessonsTotal: number;
  lessonsCompleted: number;
  startedAt: Date;
  lastActivityAt: Date;
  completedAt: Date | null;
  remindersEnabled: boolean;
  reminderMinutes: number | null;
  reminderTimezone: string | null;
  reminderChannel: string;
  nextReminderAt: Date | null;
  lastReminderSentAt: Date | null;
  reminderSentCount: number;
  reminderSkipCount: number;
}

/** The shape handed to clients. No internal ids beyond the study id. */
export function serialiseEnrollment(doc: EnrollmentDoc) {
  return {
    studyId: doc.studyId,
    status: doc.status,
    rhythm: doc.rhythm,
    reminderDays: doc.reminderDays ?? [],
    translation: doc.translation ?? null,
    depth: doc.depth,
    commentary: doc.commentary ?? null,
    currentLessonDay: doc.currentLessonDay,
    currentStep: doc.currentStep,
    lessonsTotal: doc.lessonsTotal,
    lessonsCompleted: doc.lessonsCompleted,
    startedAt: doc.startedAt,
    lastActivityAt: doc.lastActivityAt,
    completedAt: doc.completedAt ?? null,
    remindersEnabled: doc.remindersEnabled,
    reminderMinutes: doc.reminderMinutes ?? null,
    reminderTimezone: doc.reminderTimezone ?? null,
    nextReminderAt: doc.nextReminderAt ?? null,
  };
}

/**
 * Starts a study, or returns the existing enrollment when there already is one.
 *
 * Re-enrolling is deliberately not an error and deliberately not a reset:
 * someone pressing "start" again on a study they are halfway through means
 * "take me back in", not "throw my progress away".
 */
export async function createEnrollment(
  userId: string,
  studyId: string,
  settings: EnrollmentSettings,
): Promise<{ enrollment: EnrollmentDoc; created: boolean } | null> {
  const study = findStudy(studyId);
  if (!study) return null;

  await connectMongoDB();

  const existing = await StudyEnrollment.findOne({ userId, studyId }).lean<EnrollmentDoc>();
  if (existing) {
    if (Object.keys(settings).length === 0) return { enrollment: existing, created: false };
    const updated = await updateEnrollmentSettings(userId, studyId, settings);
    return updated ? { enrollment: updated, created: false } : { enrollment: existing, created: false };
  }

  const prefs = await loadUserPrefs(userId);
  const rhythm = settings.rhythm ?? study.suggestedRhythm ?? 'dagelijks';
  const remindersEnabled = settings.remindersEnabled ?? true;

  const nextReminderAt = computeNextReminderAt(
    {
      rhythm,
      reminderDays: settings.reminderDays ?? [],
      remindersEnabled,
      reminderMinutes: settings.reminderMinutes ?? null,
      reminderTimezone: settings.reminderTimezone ?? null,
    },
    prefs,
  );

  const created = await StudyEnrollment.create({
    userId,
    studyId,
    rhythm,
    reminderDays: settings.reminderDays ?? [],
    translation: settings.translation ?? null,
    depth: settings.depth ?? study.suggestedDepth ?? 'kort',
    commentary: settings.commentary ?? null,
    currentLessonDay: firstLessonDay(studyId),
    currentStep: 'intro',
    lessonsTotal: study.lessons.length,
    remindersEnabled,
    reminderMinutes: settings.reminderMinutes ?? null,
    reminderTimezone: settings.reminderTimezone ?? null,
    nextReminderAt,
  });

  return { enrollment: created.toObject() as EnrollmentDoc, created: true };
}

/** Applies a settings change and recomputes the reminder instant from it. */
export async function updateEnrollmentSettings(
  userId: string,
  studyId: string,
  settings: EnrollmentSettings,
): Promise<EnrollmentDoc | null> {
  await connectMongoDB();

  const current = await StudyEnrollment.findOne({ userId, studyId }).lean<EnrollmentDoc>();
  if (!current) return null;

  const set: Record<string, unknown> = {};
  if (settings.rhythm !== undefined) set.rhythm = settings.rhythm;
  if (settings.reminderDays !== undefined) set.reminderDays = settings.reminderDays;
  if (settings.translation !== undefined) set.translation = settings.translation;
  if (settings.depth !== undefined) set.depth = settings.depth;
  if (settings.commentary !== undefined) set.commentary = settings.commentary;
  if (settings.remindersEnabled !== undefined) set.remindersEnabled = settings.remindersEnabled;
  if (settings.reminderMinutes !== undefined) set.reminderMinutes = settings.reminderMinutes;
  if (settings.reminderTimezone !== undefined) set.reminderTimezone = settings.reminderTimezone;

  const merged = { ...current, ...set } as EnrollmentDoc;
  const prefs = await loadUserPrefs(userId);

  set.nextReminderAt = computeNextReminderAt(
    {
      rhythm: merged.rhythm,
      reminderDays: merged.reminderDays,
      remindersEnabled: merged.remindersEnabled,
      reminderMinutes: merged.reminderMinutes,
      reminderTimezone: merged.reminderTimezone,
    },
    prefs,
  );
  set.lastActivityAt = new Date();

  await StudyEnrollment.updateOne({ _id: current._id }, { $set: set });
  return StudyEnrollment.findById(current._id).lean<EnrollmentDoc>();
}

/** Moves the resume cursor. Called on every step transition. */
export async function moveCursor(
  userId: string,
  studyId: string,
  lessonDay: number,
  step: CursorStep,
): Promise<void> {
  await connectMongoDB();
  await StudyEnrollment.updateOne(
    { userId, studyId },
    { $set: { currentLessonDay: lessonDay, currentStep: step, lastActivityAt: new Date() } },
  );
}

/**
 * Recounts completed lessons from the ledger and rolls the cursor forward.
 *
 * Counts StudyProgress rather than incrementing a counter: the ledger is the
 * truth, and an increment that runs twice on a retry would quietly claim a
 * lesson that was never done.
 */
export async function syncEnrollmentAfterLesson(
  userId: string,
  studyId: string,
  nextDay: number | null,
): Promise<EnrollmentDoc | null> {
  await connectMongoDB();

  const study = findStudy(studyId);
  if (!study) return null;

  const completedDays = (await StudyProgress.distinct('lessonDay', {
    userId,
    studyId,
  })) as (number | null)[];
  const lessonsCompleted = completedDays.filter((day) => day != null).length;
  const finished = study.lessons.every((lesson) => completedDays.includes(lesson.day));

  const prefs = await loadUserPrefs(userId);
  const current = await StudyEnrollment.findOne({ userId, studyId }).lean<EnrollmentDoc>();
  if (!current) return null;

  const set: Record<string, unknown> = {
    lessonsCompleted,
    lastActivityAt: new Date(),
  };

  if (finished) {
    set.status = 'completed';
    set.completedAt = current.completedAt ?? new Date();
    set.currentStep = 'done';
    // A finished study must stop nudging, and must leave the partial index.
    set.nextReminderAt = null;
  } else {
    if (nextDay != null) {
      set.currentLessonDay = nextDay;
      set.currentStep = 'intro';
    }
    set.nextReminderAt = computeNextReminderAt(
      {
        rhythm: current.rhythm,
        reminderDays: current.reminderDays,
        remindersEnabled: current.remindersEnabled,
        reminderMinutes: current.reminderMinutes,
        reminderTimezone: current.reminderTimezone,
      },
      prefs,
    );
  }

  await StudyEnrollment.updateOne({ _id: current._id }, { $set: set });
  return StudyEnrollment.findById(current._id).lean<EnrollmentDoc>();
}

/**
 * Leaves a study without destroying what was learned.
 *
 * Marks the enrollment abandoned and stops reminders; the StudyProgress ledger
 * and any written reflections stay. Someone who quits a study has not asked for
 * their notes to be deleted.
 */
export async function abandonEnrollment(userId: string, studyId: string): Promise<boolean> {
  await connectMongoDB();
  const result = await StudyEnrollment.updateOne(
    { userId, studyId },
    { $set: { status: 'abandoned', remindersEnabled: false, nextReminderAt: null } },
  );
  return result.matchedCount > 0;
}

export async function listEnrollments(userId: string): Promise<EnrollmentDoc[]> {
  await connectMongoDB();
  return StudyEnrollment.find({ userId }).sort({ lastActivityAt: -1 }).lean<EnrollmentDoc[]>();
}

export async function getEnrollment(userId: string, studyId: string): Promise<EnrollmentDoc | null> {
  await connectMongoDB();
  return StudyEnrollment.findOne({ userId, studyId }).lean<EnrollmentDoc>();
}

/** The study to resume when someone opens /studie with nothing else to go on. */
export async function newestActiveEnrollment(userId: string): Promise<EnrollmentDoc | null> {
  await connectMongoDB();
  return StudyEnrollment.findOne({ userId, status: 'active' })
    .sort({ lastActivityAt: -1 })
    .lean<EnrollmentDoc>();
}

export { StudyEnrollment, StudyLessonState };
