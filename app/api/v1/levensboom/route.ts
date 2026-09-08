import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { levelForXp } from '../../../../lib/gamification';
import {
  catalogItem,
  ITEM_KINDS,
  itemKey,
  unlockedKeys,
  unlockLabel,
  type ItemKind,
} from '../../../../lib/levensboom/catalog';
import { buildLevensboomPayload, type LevensboomPrefs } from '../../../../lib/levensboom/summary';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

type UserRow = {
  xp?: number | null;
  badges?: string[] | null;
  streak?: number | null;
  longestStreak?: number | null;
  lastStreakDate?: Date | null;
  levensboom?: LevensboomPrefs | null;
};

const SELECT = 'xp badges streak longestStreak lastStreakDate levensboom';

async function payloadFor(userId: string, isPro: boolean, row: UserRow) {
  return buildLevensboomPayload({
    userId,
    level: levelForXp(row.xp ?? 0),
    lastStreakDate: row.lastStreakDate ?? null,
    prefs: row.levensboom ?? null,
    badges: badgesFor(row, isPro),
    streak: row.streak ?? 0,
    longestStreak: row.longestStreak ?? 0,
    isPro,
  });
}

/**
 * The stored badges plus the one that follows from Pro. `lib/gamification.ts`
 * writes every activity badge with `$addToSet` as it is earned, so the stored
 * list is the truth for the ids the catalog gates on (`completed1`,
 * `completed5`); only `premium` is derived rather than written.
 */
function badgesFor(row: UserRow, isPro: boolean): string[] {
  const badges = Array.isArray(row.badges) ? row.badges.filter((b) => typeof b === 'string') : [];
  return isPro && !badges.includes('premium') ? [...badges, 'premium'] : badges;
}

/** The `levensboom` block alone - the studio's cheap refresh. */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    const row = await User.findById(auth.id).select(SELECT).lean<UserRow | null>();
    if (!row) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });
    return jsonV1({ levensboom: await payloadFor(auth.id, auth.isPro, row) });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * The studio's write: species, scene, animal, ring, the public-profile
 * switch and the two one-time markers. Cookie or Bearer, like every `/api/v1`
 * route.
 *
 * Every id is checked against the catalog and against what this account has
 * unlocked *right now* - the client's own copy of the rules is for drawing
 * lock states, never for deciding. A locked pick is a 403 carrying the rule,
 * so the client can say "Niveau 8" instead of "kon niet opslaan". Nothing here
 * ever rewrites a choice the account is no longer entitled to: that fallback
 * happens on read (`resolveAvatar`), which is what lets a lapsed Pro item come
 * back on renewal.
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    await connectMongoDB();
    const row = await User.findById(auth.id).select(SELECT).lean<UserRow | null>();
    if (!row) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });

    const level = levelForXp(row.xp ?? 0);
    const unlocked = new Set(
      unlockedKeys({
        level,
        badges: badgesFor(row, auth.isPro),
        longestStreak: Math.max(row.streak ?? 0, row.longestStreak ?? 0),
        isPro: auth.isPro,
      }),
    );

    const set: Record<string, unknown> = {};
    const addToSet: Record<string, unknown> = {};

    for (const kind of ITEM_KINDS) {
      const value = body[kind];
      if (value === undefined) continue;
      const item = typeof value === 'string' ? catalogItem(kind as ItemKind, value) : undefined;
      if (!item) return jsonV1({ error: 'INVALID_ITEM', kind, id: value }, { status: 400 });
      if (!unlocked.has(itemKey(item))) {
        return jsonV1(
          {
            error: 'ITEM_LOCKED',
            item: { kind: item.kind, id: item.id, name: item.name },
            unlock: item.unlock,
            label: unlockLabel(item.unlock),
          },
          { status: 403 },
        );
      }
      set[`levensboom.${kind}`] = item.id;
    }

    if (typeof body.publicProfile === 'boolean') set['levensboom.publicProfile'] = body.publicProfile;
    if (body.introSeen === true) set['levensboom.introSeen'] = true;
    if (body.planted === true && !row.levensboom?.planted) set['levensboom.planted'] = new Date();

    if (Array.isArray(body.seenItems)) {
      const keys = body.seenItems
        .filter((k): k is string => typeof k === 'string' && k.length <= 48)
        .slice(0, 64);
      if (keys.length > 0) addToSet['levensboom.seenItems'] = { $each: keys };
    }

    if (Object.keys(set).length > 0 || Object.keys(addToSet).length > 0) {
      // A targeted update, not `save()`: models/User.js documents at length why
      // a full-document save on this collection is the write to avoid.
      await User.updateOne({ _id: auth.id }, {
        ...(Object.keys(set).length > 0 ? { $set: set } : {}),
        ...(Object.keys(addToSet).length > 0 ? { $addToSet: addToSet } : {}),
      });
    }

    const fresh = await User.findById(auth.id).select(SELECT).lean<UserRow | null>();
    return jsonV1({ levensboom: await payloadFor(auth.id, auth.isPro, fresh ?? row) });
  } catch (error) {
    return handleV1Error(error);
  }
}
