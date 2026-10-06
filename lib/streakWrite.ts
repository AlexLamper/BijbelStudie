/**
 * The one place a streak is written.
 *
 * `app/api/streak` and `app/api/v1/streak` each had their own read-modify-write
 * around `advanceStreak`, and `app/api/v1/last-read` had none at all - which is
 * the bug this file exists to end. Reading a chapter in the app recorded a
 * reading session (so the "Deze week" strip ticked the day) but never touched
 * `lastStreakDate`: only finishing a guided lesson did. A reader who read every
 * day and did no lessons watched three checkmarks appear while the pill said
 * "1 dag op rij", and the next lesson they finished broke the run for good.
 *
 * Every path that counts as "the reader showed up today" calls `touchStreak`.
 */
import connectMongoDB from './mongodb';
import User from '../models/User';
import { grantXp } from './gamification';
import { advanceStreak, startOfDay, type StreakTransition } from './streak';

export interface TouchStreakResult {
  streak: number;
  freezes: number;
  badges: string[];
  xp: Awaited<ReturnType<typeof grantXp>> | null;
  brokenFrom: number | null;
  freezeUsed: boolean;
  freezesSpent: number;
}

/**
 * Advances the streak for `userId`, at most once per Dutch calendar day.
 *
 * `move` lets the website's `?test=true` hatch hand in its own transition; every
 * real caller leaves it out and gets the rules from `advanceStreak`.
 *
 * Returns null only when the user does not exist.
 */
export async function touchStreak(
  userId: string,
  {
    isPro = false,
    now = new Date(),
    move: given,
  }: { isPro?: boolean; now?: Date; move?: StreakTransition } = {},
): Promise<TouchStreakResult | null> {
  await connectMongoDB();

  const user = await User.findById(userId).select('streak freezeCount lastStreakDate badges');
  if (!user) return null;

  const move =
    given ??
    advanceStreak(
      {
        streak: user.streak,
        freezeCount: user.freezeCount,
        lastStreakDate: user.lastStreakDate,
      },
      { now },
    );

  const set: Record<string, unknown> = {
    streak: move.streak,
    freezeCount: move.freezeCount,
    lastStreakDate: move.lastStreakDate,
  };
  // What the reader lost, kept for the return-visit prompt. Only the break
  // itself writes it, so a later read cannot overwrite the number with 1.
  if (move.brokenFrom !== null) {
    set.lostStreak = move.brokenFrom;
    set.lostStreakAt = startOfDay(now);
  }

  const updated = await User.findByIdAndUpdate(
    user._id,
    {
      $set: set,
      // The record the streak-gated ProgressTree items read: it only ever grows.
      $max: { longestStreak: move.streak },
    },
    { new: true },
  );

  const before = [...(user.badges ?? [])];
  // Badge evaluation lives in lib/gamification.ts so every XP source agrees on
  // what has been earned.
  const xp = move.advanced ? await grantXp(userId, 'streak_day', { isPro }) : null;

  return {
    streak: updated?.streak ?? move.streak,
    freezes: updated?.freezeCount ?? move.freezeCount,
    badges: xp ? [...new Set([...before, ...xp.newBadges])] : (updated?.badges ?? before),
    xp,
    brokenFrom: move.brokenFrom,
    freezeUsed: move.freezeUsed,
    freezesSpent: move.freezesSpent,
  };
}

/**
 * `touchStreak` for a path whose own job must not fail or wait on it - the
 * chapter read in `/v1/last-read`. Swallows everything and never throws.
 */
export async function touchStreakQuietly(
  userId: string,
  options: { isPro?: boolean; now?: Date } = {},
): Promise<void> {
  try {
    await touchStreak(userId, options);
  } catch (error) {
    console.error('touchStreak failed', error);
  }
}
