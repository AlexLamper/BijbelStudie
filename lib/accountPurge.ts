import mongoose from 'mongoose';
import User from '../models/User';
import Note from '../models/Note';
import Bookmark from '../models/Bookmark';
import ReadingHistory from '../models/ReadingHistory';
import ReadingSession from '../models/ReadingSession';
import SyncTombstone from '../models/SyncTombstone';
import StudyProgress from '../models/StudyProgress';
import StudyLessonState from '../models/StudyLessonState';
import StudyEnrollment from '../models/StudyEnrollment';
import PlanEnrollment from '../models/PlanEnrollment';
import AiUsage from '../models/AiUsage';
import GroupMessage from '../models/GroupMessage';
import StudyGroup from '../models/StudyGroup';
import BiblePlan from '../models/BiblePlan';
import RefreshToken from '../models/RefreshToken';
import FeedbackState from '../models/FeedbackState';
import Feedback from '../models/Feedback';
import AnalyticsEvent from '../models/AnalyticsEvent';
import { AI_REPORT_FREE_TEXT_CLEAR, feedbackIdentityClear } from './dataRetention';

/**
 * Removes one person's data. The single list behind both delete paths - the
 * self-service delete in the app (app/api/v1/account) and the admin delete
 * (lib/adminUsers.ts) - and behind what /account-verwijderen promises. Add a
 * collection here, not in a caller, when a new model stores a userId.
 *
 * Call archiveAccount() first; this function does not copy anything.
 *
 * Runs in one transaction where the deployment supports it (MongoDB Atlas
 * replica set). A standalone mongod rejects transactions, so the same steps
 * then run sequentially with the User document last: a partial failure never
 * leaves an account that can log in but has lost its data.
 */
export async function deleteAccountData(userId: mongoose.Types.ObjectId): Promise<void> {
  const purge = async (session?: mongoose.ClientSession) => {
    const opts = session ? { session } : {};

    await Note.deleteMany({ userId }, opts);
    await Bookmark.deleteMany({ userId }, opts);
    await ReadingHistory.deleteMany({ userId }, opts);
    await ReadingSession.deleteMany({ userId }, opts);
    await SyncTombstone.deleteMany({ userId }, opts);
    await StudyProgress.deleteMany({ userId }, opts);
    await StudyLessonState.deleteMany({ userId }, opts);
    await StudyEnrollment.deleteMany({ userId }, opts);
    await PlanEnrollment.deleteMany({ userId }, opts);
    await AiUsage.deleteMany({ userId }, opts);
    await GroupMessage.deleteMany({ userId }, opts);
    await FeedbackState.deleteMany({ userId }, opts);

    // Feedback answers and analytics events describe the product, not the
    // person. Cut the link and keep the row - the same fields the 2-year
    // feedback retention job clears (lib/dataRetention.ts). AI-answer reports
    // first: their question and comment are the reader's own free text, and the
    // second update nulls the userId this one is filtered on.
    await Feedback.updateMany(
      { userId, touchpoint: 'ai_report' },
      { $set: AI_REPORT_FREE_TEXT_CLEAR },
      opts,
    );
    await Feedback.updateMany({ userId }, { $set: feedbackIdentityClear(new Date()) }, opts);
    await AnalyticsEvent.updateMany({ userId }, { $set: { userId: null } }, opts);

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
    console.warn('[accountPurge] transactions unavailable, deleting sequentially');
    await purge();
  } finally {
    await session?.endSession();
  }
}
