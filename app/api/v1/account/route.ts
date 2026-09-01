import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Note from '../../../../models/Note';
import Bookmark from '../../../../models/Bookmark';
import ReadingHistory from '../../../../models/ReadingHistory';
import ReadingSession from '../../../../models/ReadingSession';
import SyncTombstone from '../../../../models/SyncTombstone';
import AiUsage from '../../../../models/AiUsage';
import GroupMessage from '../../../../models/GroupMessage';
import StudyGroup from '../../../../models/StudyGroup';
import BiblePlan from '../../../../models/BiblePlan';
import RefreshToken from '../../../../models/RefreshToken';
import { corsPreflight, errorV1, handleV1Error, V1_CORS_HEADERS } from '../../../../lib/apiV1';
import { requireUser } from '../../../../lib/apiAuth';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * DELETE /api/v1/account   - Apple guideline 5.1.1(v).
 *
 * Body: { "confirm": "VERWIJDER" }
 *
 * This must be completable inside the app. No "mail ons" escape hatch, no link
 * to a web form: an app that supports account creation and cannot delete the
 * account in-app is rejected automatically.
 *
 * Everything below runs in one transaction where the deployment supports it
 * (MongoDB Atlas replica set). On a standalone mongod, transactions are
 * unavailable and the same steps run sequentially - the user document is
 * deleted last so a partial failure never leaves an account that can log in
 * but has lost its data.
 */
export async function DELETE(req: NextRequest) {
  try {
    const caller = await requireUser(req);

    const body = await req.json().catch(() => ({}));
    if ((body as { confirm?: unknown }).confirm !== 'VERWIJDER') {
      return errorV1('CONFIRMATION_REQUIRED', 400, 'Stuur { "confirm": "VERWIJDER" } mee.');
    }

    await connectMongoDB();
    const userId = new mongoose.Types.ObjectId(caller.id);

    const purge = async (session?: mongoose.ClientSession) => {
      const opts = session ? { session } : {};

      await Note.deleteMany({ userId }, opts);
      await Bookmark.deleteMany({ userId }, opts);
      await ReadingHistory.deleteMany({ userId }, opts);
      await ReadingSession.deleteMany({ userId }, opts);
      await SyncTombstone.deleteMany({ userId }, opts);
      await AiUsage.deleteMany({ userId }, opts);
      await GroupMessage.deleteMany({ userId }, opts);

      // Leave every group and plan rather than deleting them: they belong to
      // other people too.
      await StudyGroup.updateMany(
        { 'members.userId': userId },
        { $pull: { members: { userId } } },
        opts,
      );
      await BiblePlan.updateMany(
        {},
        { $pull: { enrolledUsers: userId, progress: { userId } } },
        opts,
      );

      // Kill every device session before the account goes.
      await RefreshToken.deleteMany({ userId }, opts);

      // Billing linkage is severed, not kept "for records": an id that can be
      // used to look the person up again is still personal data. Any active
      // Stripe subscription must be cancelled in the Stripe dashboard or it
      // keeps billing a card with no account behind it - surfaced to the user
      // in the app before they confirm.
      await User.deleteOne({ _id: userId }, opts);
    };

    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        await purge(session!);
      });
    } catch (txError) {
      // Standalone mongod (local dev) rejects transactions outright.
      const message = txError instanceof Error ? txError.message : String(txError);
      if (!/Transaction|replica set|not supported/i.test(message)) throw txError;
      console.warn('[api/v1/account] transactions unavailable, deleting sequentially');
      await purge();
    } finally {
      await session?.endSession();
    }

    return new NextResponse(null, { status: 204, headers: V1_CORS_HEADERS });
  } catch (error) {
    return handleV1Error(error);
  }
}
