/**
 * The daily-streak rules, in one place.
 *
 * They used to live twice: `app/api/streak` (website, session cookie) and
 * `app/api/v1/streak` (mobile, bearer token) each had their own copy of the
 * same `if (gapDays === 1)` chain, and the copies had already drifted - the web
 * one carries a `?test=true` escape hatch the mobile one deliberately refuses.
 * A streak is the most visible number in the product and the one a reader will
 * notice losing, so the two clients must not be able to disagree about it.
 *
 * This module is the rules only: a pure function from the stored state to the
 * next state. The writing lives in `lib/streakWrite.ts`, which every caller
 * that advances a streak goes through.
 */

/**
 * Every day boundary in here is a Dutch one.
 *
 * This used to be the server's own local midnight, which on Vercel is UTC. A
 * reader opening a chapter at 00:30 Amsterdam time was filed under the previous
 * UTC day, so two consecutive evenings could land on one day (no advance) and
 * two days with a read between them could look like a gap (a broken run). The
 * audience is Dutch; the calendar should be too.
 */
export const STREAK_TIME_ZONE = 'Europe/Amsterdam';

/**
 * A freeze is granted on every 7th day of a run - one a week, for every reader,
 * Pro or not.
 *
 * It was every 5th day and only spendable by Pro accounts, which meant a free
 * reader banked freezes they could never use while the app's own Dutch copy
 * promised "mis je een dag, dan blijft je reeks staan". A promise the product
 * does not keep is worse than no freeze at all.
 */
export const FREEZE_EVERY_DAYS = 7;

/** What the rules need off the User document. */
export interface StreakState {
  streak?: number | null;
  freezeCount?: number | null;
  lastStreakDate?: Date | string | null;
}

export interface StreakTransition {
  streak: number;
  freezeCount: number;
  lastStreakDate: Date;
  /** True when this call moved the streak into a new day. */
  advanced: boolean;
  /**
   * The streak the reader just lost, when this call broke one, else null.
   *
   * Only set when a run of at least two days ended: losing a one-day "streak"
   * is not a loss anyone mourns, and telling them about it would make the
   * product nag about nothing.
   */
  brokenFrom: number | null;
  /** True when a freeze absorbed the missed day(s) instead of the streak breaking. */
  freezeUsed: boolean;
  /** How many freezes this call spent bridging the gap. */
  freezesSpent: number;
}

const DAY_MS = 86_400_000;

/** The calendar date at `date`, as seen in `timeZone`. */
function calendarParts(date: Date, timeZone: string): [number, number, number] {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const [y, m, d] = [get('year'), get('month'), get('day')];
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) return [y, m, d];
  } catch {
    // An unknown zone on an old runtime. UTC is wrong by an hour or two, which
    // is better than throwing out of a route that only wanted to count days.
  }
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
}

/**
 * The start of `date`'s Dutch calendar day, as a UTC-midnight instant.
 *
 * UTC midnight rather than Amsterdam midnight (23:00 or 22:00 the day before)
 * because that is how `lastStreakDate` has been stored on every live account
 * since the server ran in UTC: the value is a date, not a moment, and reading
 * the old rows back must keep giving the same day.
 */
export function startOfDay(date: Date, timeZone: string = STREAK_TIME_ZONE): Date {
  const [y, m, d] = calendarParts(date, timeZone);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Whole days between two day-starts. */
function dayGap(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function normalise(state: StreakState, timeZone: string) {
  const last = state.lastStreakDate ? new Date(state.lastStreakDate) : null;
  return {
    streak: Math.max(0, Math.floor(state.streak ?? 0)),
    freezes: Math.max(0, Math.floor(state.freezeCount ?? 0)),
    last: last && !Number.isNaN(last.getTime()) ? startOfDay(last, timeZone) : null,
  };
}

/**
 * One day's worth of streak movement.
 *
 * - Same Dutch calendar day as the last bump: nothing changes.
 * - Exactly one day later: the streak grows.
 * - A bigger gap: banked freezes bridge the missed days, one freeze per day,
 *   and the run continues; without enough freezes it restarts at 1 and
 *   `brokenFrom` reports what it was.
 * - Every 7th day grants a freeze.
 */
export function advanceStreak(
  state: StreakState,
  {
    now = new Date(),
    timeZone = STREAK_TIME_ZONE,
  }: { now?: Date; timeZone?: string } = {},
): StreakTransition {
  const today = startOfDay(now, timeZone);
  const { streak, freezes, last } = normalise(state, timeZone);

  if (last && today.getTime() === last.getTime()) {
    return {
      streak,
      freezeCount: freezes,
      lastStreakDate: last,
      advanced: false,
      brokenFrom: null,
      freezeUsed: false,
      freezesSpent: 0,
    };
  }

  const gap = last ? dayGap(last, today) : null;
  let next = streak;
  let freezeCount = freezes;
  let brokenFrom: number | null = null;
  let freezesSpent = 0;

  if (gap === 1) {
    next = streak + 1;
  } else if (gap !== null && gap > 1 && streak >= 1 && freezes >= gap - 1) {
    // A freeze covers a day the reader did not read. The day they DID read -
    // today - still counts, so the run grows by one, exactly as it would have
    // without the gap. (It used to stand still instead, which made a freeze
    // feel like a punishment for having one.)
    freezesSpent = gap - 1;
    freezeCount -= freezesSpent;
    next = streak + 1;
  } else {
    // A gap too wide for the bank, a clock that went backwards, or a first ever
    // bump. All three start a run at 1; only the first is a loss.
    if (gap !== null && gap > 1 && streak >= 2) brokenFrom = streak;
    next = 1;
  }

  // Only a day that was actually added can earn a freeze; a reset to 1 cannot.
  if (next > streak && next % FREEZE_EVERY_DAYS === 0) freezeCount += 1;

  return {
    streak: next,
    freezeCount,
    lastStreakDate: today,
    advanced: true,
    brokenFrom,
    freezeUsed: freezesSpent > 0,
    freezesSpent,
  };
}

/**
 * The streak as it should be SHOWN, which is not always the stored number.
 *
 * `user.streak` only changes when something advances it. Between the day a run
 * dies and the next time the reader reads, the stored value is a run that no
 * longer exists - and the Start tab was printing it. This answers 0 for a run
 * that is already over, and the stored number for one still standing (today's
 * read done, yesterday's done and today still open, or a gap the bank covers).
 */
export function currentStreak(
  state: StreakState,
  { now = new Date(), timeZone = STREAK_TIME_ZONE }: { now?: Date; timeZone?: string } = {},
): number {
  const { streak, freezes, last } = normalise(state, timeZone);
  if (streak <= 0 || !last) return 0;

  const gap = dayGap(last, startOfDay(now, timeZone));
  // A clock that went backwards: say nothing rather than something wrong.
  if (gap < 0) return 0;
  // Read today, or read yesterday and today is not over yet.
  if (gap <= 1) return streak;
  return freezes >= gap - 1 ? streak : 0;
}

/**
 * True when the run is standing only because freezes will cover the missed
 * day(s) - the state the app paints as a snowflake instead of a flame.
 */
export function streakHeldByFreeze(
  state: StreakState,
  { now = new Date(), timeZone = STREAK_TIME_ZONE }: { now?: Date; timeZone?: string } = {},
): boolean {
  const { streak, freezes, last } = normalise(state, timeZone);
  if (streak <= 0 || !last) return false;
  const gap = dayGap(last, startOfDay(now, timeZone));
  return gap >= 2 && freezes >= gap - 1;
}

/**
 * What the broken-streak prompt needs, and whether to show it at all.
 *
 * Shown once, soon, and only for a run worth mourning. The window exists
 * because "je reeks van 12 dagen is gestopt" is useful the day after and
 * pointless three weeks later - by then it is not news, it is a reproach.
 */
export const STREAK_LOSS_MIN_DAYS = 3;
export const STREAK_LOSS_WINDOW_DAYS = 10;

export interface StreakLossState {
  lostStreak?: number | null;
  lostStreakAt?: Date | string | null;
  lostStreakSeenAt?: Date | string | null;
}

export interface StreakLoss {
  /** The length of the run that ended. */
  days: number;
  /** When it ended. */
  at: Date;
}

export function pendingStreakLoss(
  state: StreakLossState,
  now: Date = new Date(),
): StreakLoss | null {
  const days = Math.floor(state.lostStreak ?? 0);
  if (days < STREAK_LOSS_MIN_DAYS) return null;

  const at = state.lostStreakAt ? new Date(state.lostStreakAt) : null;
  if (!at || Number.isNaN(at.getTime())) return null;

  if (dayGap(startOfDay(at), startOfDay(now)) > STREAK_LOSS_WINDOW_DAYS) return null;

  const seen = state.lostStreakSeenAt ? new Date(state.lostStreakSeenAt) : null;
  if (seen && !Number.isNaN(seen.getTime()) && seen.getTime() >= at.getTime()) return null;

  return { days, at };
}
