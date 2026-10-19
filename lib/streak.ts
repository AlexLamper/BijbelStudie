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
  /**
   * How many freezes the CURRENT run has already spent.
   *
   * Without it the balance was a bare counter, incremented on the one day the
   * streak happened to equal a multiple of seven and trusted forever after -
   * see `earnedFreezes`.
   */
  freezesUsedInRun?: number | null;
}

export interface StreakTransition {
  streak: number;
  freezeCount: number;
  /** The new value for `User.freezesUsedInRun`. */
  freezesUsedInRun: number;
  /** The Dutch calendar days (`YYYY-MM-DD`) this call's freezes covered. */
  freezeDays: string[];
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

/** The `YYYY-MM-DD` key of a day-start as produced by `startOfDay`. */
function keyOfDayStart(dayStart: Date): string {
  return dayStart.toISOString().slice(0, 10);
}

/**
 * The Dutch calendar day `date` falls in, as `YYYY-MM-DD`.
 *
 * Everything that buckets activity by day - the week strip above all - has to
 * use this and not `toISOString().slice(0, 10)`. The two disagree for every
 * read between midnight and 02:00 local: the streak counts such a read as
 * today's, while a UTC key files it under yesterday, so the strip drew a gap on
 * a day the reader had read.
 */
export function dayKey(date: Date, timeZone: string = STREAK_TIME_ZONE): string {
  return keyOfDayStart(startOfDay(date, timeZone));
}

/**
 * The freezes a run of `streak` days has EARNED: one per completed week.
 *
 * The balance used to be a bare counter, incremented on the single day the
 * streak happened to equal a multiple of seven and trusted from then on.
 * Nothing kept it honest, and every path that moves `streak` without passing
 * through that one line left the account with a long run and an empty bank -
 * `scripts/recover-account.mjs` restores `streak` with `$max` and never
 * restored `freezeCount`, and the website's `?test=true` hatch increments the
 * number directly. A reader with a 21-day run and an empty bank loses the run
 * to one missed day, which is exactly the promise the product makes
 * ("mis je een dag, dan blijft je reeks staan") and then breaks.
 *
 * So the entitlement is derived from the run instead of remembered: what the
 * run has earned, minus what this run has already spent.
 */
export function earnedFreezes(streak: number | null | undefined): number {
  return Math.floor(Math.max(0, Math.floor(streak ?? 0)) / FREEZE_EVERY_DAYS);
}

function normalise(state: StreakState, timeZone: string) {
  const last = state.lastStreakDate ? new Date(state.lastStreakDate) : null;
  const streak = Math.max(0, Math.floor(state.streak ?? 0));
  const freezes = Math.max(0, Math.floor(state.freezeCount ?? 0));
  const used = Math.max(0, Math.floor(state.freezesUsedInRun ?? 0));
  return {
    streak,
    freezes,
    used,
    // The bank this account may actually spend: never less than the stored
    // counter (an account that banked more under an older rule keeps it), and
    // never less than what the run itself has earned.
    bank: Math.max(freezes, earnedFreezes(streak) - used),
    last: last && !Number.isNaN(last.getTime()) ? startOfDay(last, timeZone) : null,
  };
}

/**
 * The freeze balance to SHOW and to spend - `earnedFreezes` applied to the
 * stored state. Every surface that prints a number of "vriesdagen" reads this
 * rather than `user.freezeCount`, so the number the reader sees is the number
 * the rules will honour.
 */
export function availableFreezes(
  state: StreakState,
  { timeZone = STREAK_TIME_ZONE }: { timeZone?: string } = {},
): number {
  return normalise(state, timeZone).bank;
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
  const { streak, freezes, used, bank, last } = normalise(state, timeZone);

  if (last && today.getTime() === last.getTime()) {
    return {
      streak,
      freezeCount: bank,
      freezesUsedInRun: used,
      freezeDays: [],
      lastStreakDate: last,
      advanced: false,
      brokenFrom: null,
      freezeUsed: false,
      freezesSpent: 0,
    };
  }

  const gap = last ? dayGap(last, today) : null;
  let next = streak;
  let freezeCount = bank;
  let usedInRun = used;
  let brokenFrom: number | null = null;
  let freezesSpent = 0;
  let freezeDays: string[] = [];

  if (gap === 1) {
    next = streak + 1;
  } else if (gap !== null && gap > 1 && streak >= 1 && bank >= gap - 1) {
    // A freeze covers a day the reader did not read. The day they DID read -
    // today - still counts, so the run grows by one, exactly as it would have
    // without the gap. (It used to stand still instead, which made a freeze
    // feel like a punishment for having one.)
    freezesSpent = gap - 1;
    freezeCount = bank - freezesSpent;
    usedInRun = used + freezesSpent;
    next = streak + 1;
    // Which days those were, so the week strip can mark them as covered
    // instead of leaving a hole where the reader's run quietly survived.
    freezeDays = Array.from({ length: freezesSpent }, (_, i) =>
      keyOfDayStart(new Date((last as Date).getTime() + (i + 1) * DAY_MS)),
    );
  } else {
    // A gap too wide for the bank, a clock that went backwards, or a first ever
    // bump. All three start a run at 1; only the first is a loss.
    if (gap !== null && gap > 1 && streak >= 2) brokenFrom = streak;
    next = 1;
    // The run that earned the bank is over, so the new run inherits only what
    // was actually stored - not the entitlement of the run that just died -
    // and starts out having spent nothing.
    freezeCount = freezes;
    usedInRun = 0;
  }

  // The seventh day of a run pays out. Stated as a floor on the new run's
  // entitlement rather than as `next % FREEZE_EVERY_DAYS === 0`, so a streak
  // that arrived at its value by some other route (an account restore, a
  // backfill) still ends up with the freezes that run has earned. A reset to 1
  // earns nothing, which this gets right too: 1 is not greater than the run it
  // replaced.
  if (next > streak) freezeCount = Math.max(freezeCount, earnedFreezes(next) - usedInRun);

  return {
    streak: next,
    freezeCount,
    freezesUsedInRun: usedInRun,
    freezeDays,
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
  const { streak, bank, last } = normalise(state, timeZone);
  if (streak <= 0 || !last) return 0;

  const gap = dayGap(last, startOfDay(now, timeZone));
  // A clock that went backwards: say nothing rather than something wrong.
  if (gap < 0) return 0;
  // Read today, or read yesterday and today is not over yet.
  if (gap <= 1) return streak;
  return bank >= gap - 1 ? streak : 0;
}

/**
 * True when the run is standing only because freezes will cover the missed
 * day(s) - the state the app paints as a snowflake instead of a flame.
 */
export function streakHeldByFreeze(
  state: StreakState,
  { now = new Date(), timeZone = STREAK_TIME_ZONE }: { now?: Date; timeZone?: string } = {},
): boolean {
  const { streak, bank, last } = normalise(state, timeZone);
  if (streak <= 0 || !last) return false;
  const gap = dayGap(last, startOfDay(now, timeZone));
  return gap >= 2 && bank >= gap - 1;
}

/* ── The week strip ───────────────────────────────────────────────────────── */

/** Monday-first, the way both clients label the strip. */
export const WEEK_DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] as const;

export interface StripDay {
  /** The Dutch calendar day, `YYYY-MM-DD`. */
  key: string;
  label: string;
  isToday: boolean;
}

/**
 * The last seven Dutch calendar days, oldest first.
 *
 * Both week-strip endpoints built this list from the server's own clock and
 * keyed it with `toISOString()`, i.e. in UTC, while the streak counts days in
 * Amsterdam - so the two could not agree about which day a late-evening read
 * belonged to.
 */
export function lastSevenDays(
  now: Date = new Date(),
  timeZone: string = STREAK_TIME_ZONE,
): StripDay[] {
  const today = startOfDay(now, timeZone);
  const out: StripDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    // A day-start is a UTC midnight, so the weekday is the UTC one. 0 is
    // Sunday; the strip starts on Monday.
    const js = d.getUTCDay();
    out.push({
      key: keyOfDayStart(d),
      label: WEEK_DAY_LABELS[js === 0 ? 6 : js - 1],
      isToday: i === 0,
    });
  }
  return out;
}

/** The instant to fetch reading sessions from, to fill `lastSevenDays`. */
export function weekWindowStart(
  now: Date = new Date(),
  timeZone: string = STREAK_TIME_ZONE,
): Date {
  // Amsterdam runs ahead of UTC, so its midnight is one or two hours before the
  // UTC day-start this returns; three hours of slack covers either offset, and
  // anything extra is dropped by the day bucketing anyway.
  return new Date(startOfDay(now, timeZone).getTime() - 6 * DAY_MS - 3 * 60 * 60 * 1000);
}

export interface FreezeHistoryState extends StreakState {
  /** Dutch calendar days a freeze has already been spent on. */
  freezeDays?: string[] | null;
}

/**
 * The days in the last week that a freeze is covering.
 *
 * Two sources, because a freeze is only CHARGED on the next read: the days
 * already bridged and written down (`User.freezeDays`), and the days since the
 * last read that the bank is holding up right now. Both read as frozen in the
 * strip; neither is a gap, and neither is a day the reader read.
 */
export function frozenDays(
  state: FreezeHistoryState,
  { now = new Date(), timeZone = STREAK_TIME_ZONE }: { now?: Date; timeZone?: string } = {},
): Set<string> {
  const week = new Set(lastSevenDays(now, timeZone).map((d) => d.key));
  const keys = new Set<string>();
  for (const key of state.freezeDays ?? []) {
    if (week.has(key)) keys.add(key);
  }
  if (streakHeldByFreeze(state, { now, timeZone })) {
    const { last } = normalise(state, timeZone);
    const today = startOfDay(now, timeZone).getTime();
    for (let t = (last as Date).getTime() + DAY_MS; t < today; t += DAY_MS) {
      const key = keyOfDayStart(new Date(t));
      if (week.has(key)) keys.add(key);
    }
  }
  return keys;
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
