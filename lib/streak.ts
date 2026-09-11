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
 * next state. The routes keep the reading and the writing, because who the
 * caller is and how they are authenticated is all that actually differs.
 */

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
  /** True when a Pro freeze absorbed the missed day instead of the streak breaking. */
  freezeUsed: boolean;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole days between two day-starts. */
function dayGap(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * One day's worth of streak movement.
 *
 * - Same calendar day as the last bump: nothing changes.
 * - Exactly one day later: the streak grows.
 * - A bigger gap: a freeze absorbs it for a Pro reader, otherwise the streak
 *   restarts at 1 and `brokenFrom` reports what it was.
 * - Every fifth day grants a freeze.
 */
export function advanceStreak(
  state: StreakState,
  { now = new Date(), isPro = false }: { now?: Date; isPro?: boolean } = {},
): StreakTransition {
  const today = startOfDay(now);
  const last = state.lastStreakDate ? startOfDay(new Date(state.lastStreakDate)) : null;
  const streak = Math.max(0, Math.floor(state.streak ?? 0));
  const freezes = Math.max(0, Math.floor(state.freezeCount ?? 0));

  if (last && today.getTime() === last.getTime()) {
    return {
      streak,
      freezeCount: freezes,
      lastStreakDate: last,
      advanced: false,
      brokenFrom: null,
      freezeUsed: false,
    };
  }

  const gap = last ? dayGap(last, today) : null;
  let next = streak;
  let freezeCount = freezes;
  let brokenFrom: number | null = null;
  let freezeUsed = false;

  if (gap === 1) {
    next = streak + 1;
  } else if (gap !== null && gap > 1 && freezeCount > 0 && isPro) {
    // A freeze PRESERVES the run, it does not extend it: the reader did not
    // read on the missed day, so the count stays where it was. That is the
    // behaviour both routes already had; it is stated here because it is the
    // one rule that looks like a bug until you read this sentence.
    freezeCount -= 1;
    freezeUsed = true;
  } else {
    // A gap of more than a day, a clock that went backwards, or a first ever
    // bump. All three start a run at 1; only the first is a loss.
    if (gap !== null && gap > 1 && streak >= 2) brokenFrom = streak;
    next = 1;
  }

  if (next % 5 === 0) freezeCount += 1;

  return {
    streak: next,
    freezeCount,
    lastStreakDate: today,
    advanced: true,
    brokenFrom,
    freezeUsed,
  };
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
