import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { XP_LABELS, XP_VALUES, readProgressSummary } from '../../../../lib/gamification';
import { buildLevensboomPayload, type LevensboomPrefs } from '../../../../lib/levensboom/summary';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Level, XP and badges in one call, plus the XP table itself so the client can
 * show "wat levert het op?" without hardcoding numbers that then drift.
 *
 * The `levensboom` block is additive: it is derived on every request from xp,
 * level, lastStreakDate, badges, the longest streak, Pro and the stored studio
 * choice, so the tree needs no stored shape and the existing consumers of this
 * route keep the shape they already parse.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const summary = await readProgressSummary(auth.id, auth.isPro);
    if (!summary) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });

    await connectMongoDB();
    const user = await User.findById(auth.id)
      .select('lastStreakDate longestStreak levensboom')
      .lean<{
        lastStreakDate?: Date | null;
        longestStreak?: number | null;
        levensboom?: LevensboomPrefs | null;
      } | null>();

    return jsonV1({
      ...summary,
      levensboom: buildLevensboomPayload({
        userId: auth.id,
        level: summary.level,
        lastStreakDate: user?.lastStreakDate ?? null,
        prefs: user?.levensboom ?? null,
        badges: summary.badges,
        streak: summary.streak,
        longestStreak: user?.longestStreak ?? 0,
        isPro: auth.isPro,
      }),
      xpTable: Object.entries(XP_VALUES).map(([event, value]) => ({
        event,
        value,
        label: XP_LABELS[event as keyof typeof XP_LABELS],
      })),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
