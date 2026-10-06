import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { currentStreak, streakHeldByFreeze } from '../../../../lib/streak';
import { touchStreak } from '../../../../lib/streakWrite';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    const user = await User.findById(auth.id).select('streak freezeCount lastStreakDate');
    if (!user) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });
    const state = {
      streak: user.streak,
      freezeCount: user.freezeCount,
      lastStreakDate: user.lastStreakDate,
    };
    // `currentStreak`, not `user.streak`: the stored number is only rewritten
    // when something advances it, so a run that died days ago still sits there.
    return jsonV1({
      streak: currentStreak(state),
      freezes: user.freezeCount ?? 0,
      freezeHolding: streakHeldByFreeze(state),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Advances the daily streak. Same rules as the website's `/api/streak`, because
 * both go through `lib/streakWrite.ts`: one bump per Dutch calendar day, banked
 * freezes bridge missed days for every reader, and every 7th day grants a
 * freeze.
 *
 * The website's `?test=true` escape hatch is deliberately not carried over -
 * a client-triggerable streak increment has no place in a shipped binary.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const result = await touchStreak(auth.id, { isPro: auth.isPro });
    if (!result) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });

    return jsonV1({
      streak: result.streak,
      freezes: result.freezes,
      badges: result.badges,
      xp: result.xp,
      brokenFrom: result.brokenFrom,
      freezeUsed: result.freezeUsed,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
