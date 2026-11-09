/**
 * The daily goal: a few minutes of reading a day, Duolingo-style.
 *
 * The reader picks 5, 10, 15 or 20 minutes (app setup, app Settings, the web
 * dashboard or web Instellingen); every client then reports the seconds it
 * actually saw them reading, and the server keeps one counter per local day on
 * the User document (`dailyGoal`, models/User.js). The first report that takes
 * the counter over the goal pays `daily_goal` XP through the one XP path
 * (lib/gamification.ts `grantXp`) and writes `daily_goal_reached` - once per
 * day, whichever client got there, because `reachedDay` is claimed with a
 * conditional write.
 *
 * The top half is pure (validation, day keys, the view) and is what the tests
 * cover; the service half at the bottom does the I/O.
 *
 * What a "reading second" is, is the clients' business: the app counts
 * foreground time on a reading screen with a touch in the last two minutes
 * (lib/features/daily_goal/data/reading_clock.dart), the website the same on
 * /lezen and /studie (components/dailyGoal/ReadingClock.tsx). The server only
 * bounds what one report and one day may add, so a stuck client cannot fill a
 * year in an afternoon.
 */

import { dayKey } from './streak';

export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20] as const;
export type DailyGoalMinutes = (typeof DAILY_GOAL_OPTIONS)[number];

/** What a reader who never picked one is measured against. */
export const DEFAULT_DAILY_GOAL: DailyGoalMinutes = 10;

/** One report covers at most this much. Clients report every minute and on leaving. */
export const MAX_REPORT_SECONDS = 600;

/** No day holds more than this. */
export const MAX_DAY_SECONDS = 4 * 60 * 60;

export type StoredDailyGoal = {
  minutes?: number | null;
  day?: string | null;
  seconds?: number | null;
  reachedDay?: string | null;
} | null | undefined;

export type DailyGoalView = {
  /** The goal in minutes; DEFAULT_DAILY_GOAL while none was chosen. */
  minutes: number;
  /** False until the reader picked a goal themselves. */
  chosen: boolean;
  /** The local day this view is about, 'YYYY-MM-DD'. */
  day: string;
  /** Reading seconds on `day`. */
  seconds: number;
  /** Whole minutes read on `day`, rounded down. */
  minutesRead: number;
  /** 0..1 towards the goal. */
  progress: number;
  reached: boolean;
};

export function isDailyGoalMinutes(value: unknown): value is DailyGoalMinutes {
  return typeof value === 'number' && (DAILY_GOAL_OPTIONS as readonly number[]).includes(value);
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function utcDayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * The reader's local day as the client sent it, or the Dutch day.
 *
 * Any real zone is within a day of UTC, so a client day more than one
 * calendar day away from the UTC date is a wrong clock or a forged value and
 * falls back to the server's own day.
 */
export function normaliseDay(raw: unknown, now: Date = new Date()): string {
  if (typeof raw === 'string' && DAY_PATTERN.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    const valid =
      parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
    const today = Math.floor(now.getTime() / 86_400_000);
    if (valid && Math.abs(utcDayNumber(raw) - today) <= 1) return raw;
  }
  return dayKey(now);
}

/** A report's seconds as a whole number in 0..MAX_REPORT_SECONDS; junk is 0. */
export function clampReportSeconds(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_REPORT_SECONDS, Math.floor(n));
}

/** The view a client draws for [day]. A counter that belongs to another day reads as 0. */
export function dailyGoalView(stored: StoredDailyGoal, day: string): DailyGoalView {
  const chosen = isDailyGoalMinutes(stored?.minutes);
  const minutes = chosen ? (stored!.minutes as number) : DEFAULT_DAILY_GOAL;
  const raw = stored?.day === day ? Number(stored?.seconds ?? 0) : 0;
  const seconds = Math.max(0, Math.min(MAX_DAY_SECONDS, Number.isFinite(raw) ? Math.floor(raw) : 0));
  const goalSeconds = minutes * 60;
  return {
    minutes,
    chosen,
    day,
    seconds,
    minutesRead: Math.floor(seconds / 60),
    progress: Math.min(1, seconds / goalSeconds),
    reached: seconds >= goalSeconds,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export type ReportResult = {
  goal: DailyGoalView;
  /** True on exactly one report per day: the one that crossed the goal. */
  justReached: boolean;
  /** The `daily_goal` grant (lib/gamification.ts GrantResult) when justReached. */
  xp: { xp: number; level: number; levelledUp: boolean; awarded: number; newBadges: string[] } | null;
};

type Platform = 'web' | 'ios' | 'android';

export function platformOf(raw: unknown): Platform | undefined {
  return raw === 'web' || raw === 'ios' || raw === 'android' ? raw : undefined;
}

async function models() {
  const [{ default: connectMongoDB }, { default: User }] = await Promise.all([
    import('./mongodb'),
    import('../models/User'),
  ]);
  await connectMongoDB();
  return { User };
}

async function storedGoal(userId: string): Promise<StoredDailyGoal> {
  const { User } = await models();
  const row = await User.findById(userId).select('dailyGoal').lean<{ dailyGoal?: StoredDailyGoal } | null>();
  return row?.dailyGoal ?? null;
}

export async function readDailyGoal(userId: string, day: string): Promise<DailyGoalView> {
  return dailyGoalView(await storedGoal(userId), day);
}

export async function setDailyGoal(userId: string, minutes: DailyGoalMinutes, day: string): Promise<DailyGoalView> {
  const { User } = await models();
  await User.updateOne(
    { _id: userId },
    { $set: { 'dailyGoal.minutes': minutes, 'dailyGoal.updatedAt': new Date() } },
  );
  return readDailyGoal(userId, day);
}

/**
 * Adds [seconds] of reading to [day]. Three writes at most, each conditional,
 * so two clients reporting at the same moment can never lose a report or
 * double the goal's XP:
 *
 * 1. `$inc` when the counter already belongs to [day];
 * 2. otherwise restart it at [day] - but only from an older or missing day, so
 *    a late report for yesterday can never wipe today;
 * 3. claim `reachedDay` once the goal is in.
 */
export async function reportReading(
  userId: string,
  input: { day: string; seconds: number },
  options: { isPro?: boolean; platform?: Platform } = {},
): Promise<ReportResult> {
  const { User } = await models();
  const { day, seconds } = input;
  const now = new Date();

  if (seconds > 0) {
    const inc = await User.updateOne(
      { _id: userId, 'dailyGoal.day': day },
      { $inc: { 'dailyGoal.seconds': seconds }, $set: { 'dailyGoal.updatedAt': now } },
    );
    if (inc.matchedCount === 0) {
      const restart = await User.updateOne(
        {
          _id: userId,
          $or: [
            { 'dailyGoal.day': { $exists: false } },
            { 'dailyGoal.day': null },
            { 'dailyGoal.day': { $lt: day } },
          ],
        },
        { $set: { 'dailyGoal.day': day, 'dailyGoal.seconds': seconds, 'dailyGoal.updatedAt': now } },
      );
      if (restart.matchedCount === 0) {
        // Either another report restarted the day a moment ago (then this one
        // still belongs to it) or this is a stale report for an older day.
        await User.updateOne(
          { _id: userId, 'dailyGoal.day': day },
          { $inc: { 'dailyGoal.seconds': seconds }, $set: { 'dailyGoal.updatedAt': now } },
        );
      }
    }
  }

  const stored = await storedGoal(userId);
  const goal = dailyGoalView(stored, day);
  if (!goal.reached || stored?.reachedDay === day) {
    return { goal, justReached: false, xp: null };
  }

  const claim = await User.updateOne(
    { _id: userId, 'dailyGoal.reachedDay': { $ne: day } },
    { $set: { 'dailyGoal.reachedDay': day } },
  );
  if (claim.modifiedCount !== 1) return { goal, justReached: false, xp: null };

  const [{ grantXp }, { recordServerEvent }] = await Promise.all([
    import('./gamification'),
    import('./serverAnalytics'),
  ]);
  let xp: ReportResult['xp'] = null;
  try {
    xp = await grantXp(userId, 'daily_goal', { isPro: options.isPro });
  } catch (error) {
    // The goal still counts as reached; the XP is the part that may be lost.
    console.error('[dailyGoal] daily_goal XP failed', error);
  }
  await recordServerEvent('daily_goal_reached', userId, {
    minutes: String(goal.minutes),
    platform: options.platform,
  });
  return { goal, justReached: true, xp };
}
