import StudyEnrollment from '../models/StudyEnrollment.js';
import StudyProgress from '../models/StudyProgress.js';
import {
  buildDashboardResume,
  localDayNumber,
  type ResumeEnrollment,
  type ResumeLastRead,
} from './dashboardResume';
import { DEFAULT_TIMEZONE, localDateParts, zonedWallClockToUtc } from './studyReminders';
import type { DashboardResume } from './resumeTypes';

/**
 * The database half of the resume card: gathers the inputs for the pure
 * `buildDashboardResume` (lib/dashboardResume.ts).
 *
 * CPU/IO budget (Vercel Fluid Active CPU is near its cap):
 *  - the enrolments: one find on the `{ userId, lastActivityAt }` index, or
 *    none when the caller already holds them;
 *  - "was a lesson finished today": one find on the `{ userId, completedAt }`
 *    index, and ONLY when a running study was touched today. Finishing a
 *    lesson always stamps `lastActivityAt`, so no activity today means nothing
 *    was finished today - which is the first dashboard load of most days.
 * The user document (lastReadChapter, readChapters, zone) is the caller's,
 * already read for the rest of its response.
 */

/** Enough running studies for the primary card plus "Ook bezig met" (3), with slack for retired ids. */
const ACTIVE_LIMIT = 8;

export interface LoadResumeArgs {
  userId: string;
  lastRead: ResumeLastRead | null | undefined;
  /** Canonical map (canonicaliseReadChapters). */
  readChapters?: Record<string, number[]> | null;
  /** `user.preferences.reminderTimezone`. */
  timeZone?: string | null;
  /** Pass when already loaded (any status); otherwise the active ones are queried. */
  enrollments?: readonly ResumeEnrollment[];
  now?: Date;
}

export async function loadDashboardResume(args: LoadResumeArgs): Promise<DashboardResume> {
  const now = args.now ?? new Date();
  const zone = safeZone(args.timeZone);

  const enrollments: readonly ResumeEnrollment[] =
    args.enrollments ??
    (await StudyEnrollment.find({ userId: args.userId, status: 'active' })
      .sort({ lastActivityAt: -1 })
      .limit(ACTIVE_LIMIT)
      .select(
        'studyId status rhythm reminderDays reminderTimezone currentLessonDay currentStep lessonsTotal lessonsCompleted startedAt lastActivityAt completedAt',
      )
      .lean<ResumeEnrollment[]>());

  const today = localDayNumber(now, zone);
  const touchedToday = enrollments.filter((enrollment) => {
    if (enrollment.status !== 'active' || !enrollment.lastActivityAt) return false;
    const at = new Date(enrollment.lastActivityAt);
    return !Number.isNaN(at.getTime()) && localDayNumber(at, zone) === today;
  });

  let completedToday: string[] = [];
  if (touchedToday.length > 0) {
    const { year, month, day } = localDateParts(now, zone);
    const startOfToday = zonedWallClockToUtc(year, month, day, 0, zone);
    const rows = await StudyProgress.find({
      userId: args.userId,
      completedAt: { $gte: startOfToday },
      studyId: { $in: touchedToday.map((enrollment) => enrollment.studyId) },
    })
      .select('studyId')
      .lean<{ studyId?: string | null }[]>();
    completedToday = rows.map((row) => row.studyId).filter((id): id is string => !!id);
  }

  return buildDashboardResume({
    enrollments,
    lastRead: args.lastRead,
    readChapters: args.readChapters,
    completedToday,
    timeZone: zone,
    now,
  });
}

function safeZone(zone: string | null | undefined): string {
  if (!zone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
