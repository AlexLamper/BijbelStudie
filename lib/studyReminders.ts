import type { StudyRhythm } from './data/curated-studies';

/**
 * When is this study due again?
 *
 * The whole design rests on one decision: `nextReminderAt` is an absolute UTC
 * instant, computed here once at write time. The cron then does an
 * index-covered range scan
 *
 *   { status: 'active', remindersEnabled: true, nextReminderAt: { $lte: now } }
 *
 * instead of evaluating timezones for every user on every run.
 *
 * No date library. `Intl.DateTimeFormat` is in the runtime already, and the
 * amount of arithmetic involved does not justify a dependency.
 */

/** Fallbacks match models/User.js `preferences`. */
export const DEFAULT_REMINDER_MINUTES = 480; // 08:00
export const DEFAULT_TIMEZONE = 'Europe/Amsterdam';

/** Monday, Wednesday, Friday. */
const THREE_PER_WEEK = [1, 3, 5];

/** Give up rather than loop forever if a rhythm somehow matches no weekday. */
const MAX_LOOKAHEAD_DAYS = 21;

/**
 * The zone's offset from UTC, in milliseconds, at a given instant.
 *
 * Formats the instant *as* the zone sees it, reads the wall-clock fields back,
 * and treats them as if they were UTC. The difference is the offset.
 */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }

  // Some engines render midnight as hour 24 rather than 0.
  const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );

  return asIfUtc - utcMs;
}

/**
 * The UTC instant of a wall-clock time in a zone.
 *
 * Two passes on purpose. The first offset is read at the wrong instant (we do
 * not know the answer yet), so on a DST boundary it can be an hour out; reading
 * it again at the corrected guess and re-applying is what makes those days
 * right.
 */
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  minutesPastMidnight: number,
  timeZone: string,
): Date {
  const hours = Math.floor(minutesPastMidnight / 60);
  const minutes = minutesPastMidnight % 60;
  const naive = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

  const firstOffset = zoneOffsetMs(naive, timeZone);
  let instant = naive - firstOffset;

  const secondOffset = zoneOffsetMs(instant, timeZone);
  if (secondOffset !== firstOffset) instant = naive - secondOffset;

  return new Date(instant);
}

/** The calendar date and weekday a zone is showing at a given instant. */
export function localDateParts(
  instant: Date,
  timeZone: string,
): { year: number; month: number; day: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }

  const weekdays: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdays[parts.weekday] ?? 0,
  };
}

/** Which weekdays a rhythm fires on. `null` means "every day". */
function allowedWeekdays(rhythm: StudyRhythm, reminderDays: number[], fromWeekday: number): number[] | null {
  switch (rhythm) {
    case 'dagelijks':
      return null;
    case 'drie-per-week':
      return THREE_PER_WEEK;
    case 'wekelijks':
      return [fromWeekday];
    case 'eigen': {
      const days = reminderDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
      // An 'eigen' rhythm with nothing ticked would otherwise never fire and
      // look like a bug; treat it as daily.
      return days.length > 0 ? days : null;
    }
    case 'vrij':
    default:
      return [];
  }
}

export interface ReminderInput {
  rhythm: StudyRhythm;
  reminderDays?: number[] | null;
  remindersEnabled?: boolean;
  /** Minutes past local midnight; falls back to the user preference. */
  reminderMinutes?: number | null;
  reminderTimezone?: string | null;
}

export interface ReminderUserPrefs {
  reminderMinutes?: number | null;
  reminderTimezone?: string | null;
}

/**
 * The next moment this study should nudge the user, or null when it never should.
 *
 * Call sites are deliberately few: enrollment creation, lesson completion, a
 * settings change, and the cron after sending. Anywhere else and the stored
 * instant drifts from the settings that produced it.
 */
export function computeNextReminderAt(
  enrollment: ReminderInput,
  userPrefs: ReminderUserPrefs = {},
  from: Date = new Date(),
): Date | null {
  if (enrollment.remindersEnabled === false) return null;
  if (enrollment.rhythm === 'vrij') return null;

  const minutes =
    enrollment.reminderMinutes ?? userPrefs.reminderMinutes ?? DEFAULT_REMINDER_MINUTES;
  const timeZone =
    enrollment.reminderTimezone ?? userPrefs.reminderTimezone ?? DEFAULT_TIMEZONE;

  const local = localDateParts(from, timeZone);
  const weekdays = allowedWeekdays(
    enrollment.rhythm,
    enrollment.reminderDays ?? [],
    local.weekday,
  );
  if (weekdays !== null && weekdays.length === 0) return null;

  for (let offset = 0; offset <= MAX_LOOKAHEAD_DAYS; offset++) {
    // Step through calendar days via UTC arithmetic on the *local* date, so a
    // DST day never gains or loses a day here - only the resulting instant moves.
    const cursor = new Date(Date.UTC(local.year, local.month - 1, local.day + offset));
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const day = cursor.getUTCDate();
    const weekday = cursor.getUTCDay();

    if (weekdays !== null && !weekdays.includes(weekday)) continue;

    const candidate = zonedWallClockToUtc(year, month, day, minutes, timeZone);

    // Strictly after `from`: today's slot has usually already passed, and on a
    // spring-forward day the wall-clock time may not exist at all, which lands
    // the candidate at or before `from`. Either way, roll to the next day.
    if (candidate.getTime() > from.getTime()) return candidate;
  }

  return null;
}
