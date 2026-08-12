import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { grantXp } from '../../../../lib/gamification';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
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
 * The website's `?test=true` escape hatch is deliberately not carried over —
 * a client-triggerable streak increment has no place in a shipped binary.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();

    const user = await User.findById(auth.id);
    if (!user) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });

    const today = startOfDay(new Date());
    const last = user.lastStreakDate ? startOfDay(user.lastStreakDate) : null;

    let newStreak = user.streak ?? 0;
    let newFreezes = user.freezeCount ?? 0;
    let newDate = user.lastStreakDate;
    const newBadges = [...(user.badges ?? [])];

    if (!last || today.getTime() !== last.getTime()) {
      const gapDays = last ? (today.getTime() - last.getTime()) / 86400000 : null;

      if (gapDays === 1) {
        newStreak += 1;
      } else if (gapDays !== null && gapDays > 1) {
        if (newFreezes > 0 && auth.isPro) {
          newFreezes -= 1;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      if (newStreak % 5 === 0) newFreezes += 1;
      newDate = today;
    }

    const advanced = String(newDate) !== String(user.lastStreakDate);

    const updated = await User.findByIdAndUpdate(
      user._id,
      {
        streak: newStreak,
        freezeCount: newFreezes,
        lastStreakDate: newDate,
      },
      { new: true },
    );

    // Badge evaluation moved to lib/gamification.ts so both streak routes and
    // every other XP source agree on what has been earned.
    const xp = advanced ? await grantXp(auth.id, 'streak_day', { isPro: auth.isPro }) : null;

    return jsonV1({
      streak: updated.streak,
      freezes: updated.freezeCount,
      badges: xp ? [...new Set([...newBadges, ...xp.newBadges])] : (updated.badges ?? []),
      xp,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
