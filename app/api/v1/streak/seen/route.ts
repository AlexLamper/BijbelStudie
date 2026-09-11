import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * "I have been told my streak ended."
 *
 * The dashboard says it once - in the line under the greeting, not in a dialog
 * - and then posts here, which is what stops it saying it again tomorrow. The
 * marker is on the account rather than in localStorage so the website and the
 * app do not both get a turn at the same bad news.
 *
 * A targeted `$set` on one path, never `save()`: models/User.js and CLAUDE.md
 * both explain what a full-document save on this collection costs.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    await User.updateOne({ _id: auth.id }, { $set: { lostStreakSeenAt: new Date() } });
    return jsonV1({ ok: true });
  } catch (error) {
    return handleV1Error(error);
  }
}
