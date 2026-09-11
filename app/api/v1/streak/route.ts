import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { grantXp } from '../../../../lib/gamification';
import { advanceStreak, startOfDay } from '../../../../lib/streak';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    const user = await User.findById(auth.id);
    if (!user) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });
    return jsonV1({ streak: user.streak ?? 0, freezes: user.freezeCount ?? 0 });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Advances the daily streak. Same rules as the website's `/api/streak`:
 * one bump per calendar day, a freeze absorbs a single missed day for Pro
 * users, and every fifth day grants a freeze.
 *
 * The website's `?test=true` escape hatch is deliberately not carried over -
 * a client-triggerable streak increment has no place in a shipped binary.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();

    const user = await User.findById(auth.id);
    if (!user) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });

    const move = advanceStreak(
      {
        streak: user.streak,
        freezeCount: user.freezeCount,
        lastStreakDate: user.lastStreakDate,
      },
      { isPro: auth.isPro },
    );
    const newBadges = [...(user.badges ?? [])];

    const set: Record<string, unknown> = {
      streak: move.streak,
      freezeCount: move.freezeCount,
      lastStreakDate: move.lastStreakDate,
    };
    // What the reader lost, kept for the return-visit prompt. Only the break
    // itself writes it, so a later read cannot overwrite the number with 1.
    if (move.brokenFrom !== null) {
      set.lostStreak = move.brokenFrom;
      set.lostStreakAt = startOfDay(new Date());
    }

    const updated = await User.findByIdAndUpdate(
      user._id,
      {
        $set: set,
        // The record the streak-gated Levensboom items read: it only ever grows.
        $max: { longestStreak: move.streak },
      },
      { new: true },
    );

    // Badge evaluation moved to lib/gamification.ts so both streak routes and
    // every other XP source agree on what has been earned.
    const xp = move.advanced ? await grantXp(auth.id, 'streak_day', { isPro: auth.isPro }) : null;

    return jsonV1({
      streak: updated.streak,
      freezes: updated.freezeCount,
      badges: xp ? [...new Set([...newBadges, ...xp.newBadges])] : (updated.badges ?? []),
      xp,
      brokenFrom: move.brokenFrom,
      freezeUsed: move.freezeUsed,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
