import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { levelForXp } from '../../../../../lib/gamification';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * "I have seen my tree at this level" - and the two Levensboom prefs, which
 * ride along because they are written from the same settings screen.
 *
 * The celebration fires on `level > lastSeenLevel`, so this is what stops it
 * repeating on every cold start. It is also what makes a level-up earned on the
 * website show up once on the phone: the marker is on the account, not on the
 * device.
 *
 * `lastSeenLevel` only ever moves forward, and never past the level the user
 * has actually reached - a client that posts an optimistic level it then loses
 * on reconcile must not be able to skip a celebration.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as {
      level?: unknown;
      reducedMotion?: unknown;
      disabled?: unknown;
    };

    await connectMongoDB();
    const user = await User.findById(auth.id).select('xp levensboom');
    if (!user) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });

    const actualLevel = levelForXp(user.xp ?? 0);
    const current = Math.max(1, Math.floor(user.levensboom?.lastSeenLevel ?? 1));

    const update: Record<string, unknown> = {};

    if (body.level !== undefined) {
      const requested = Number(body.level);
      if (Number.isFinite(requested)) {
        const next = Math.min(actualLevel, Math.max(current, Math.floor(requested)));
        if (next !== current) {
          update['levensboom.lastSeenLevel'] = next;
          update['levensboom.lastSeenAt'] = new Date();
        }
      }
    }

    if (typeof body.reducedMotion === 'boolean') {
      update['levensboom.reducedMotion'] = body.reducedMotion;
    }
    if (typeof body.disabled === 'boolean') {
      update['levensboom.disabled'] = body.disabled;
    }

    if (Object.keys(update).length > 0) {
      // A targeted update, not `save()`: models/User.js documents at length why
      // a full-document save on this collection is the write to avoid.
      await User.updateOne({ _id: auth.id }, { $set: update });
    }

    return jsonV1({
      lastSeenLevel: (update['levensboom.lastSeenLevel'] as number | undefined) ?? current,
      reducedMotion:
        (update['levensboom.reducedMotion'] as boolean | undefined) ??
        Boolean(user.levensboom?.reducedMotion),
      disabled:
        (update['levensboom.disabled'] as boolean | undefined) ??
        Boolean(user.levensboom?.disabled),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
