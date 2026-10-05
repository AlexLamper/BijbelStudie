import mongoose from 'mongoose';
import User from '../models/User';
import Note from '../models/Note';
import Bookmark from '../models/Bookmark';
import ReadingHistory from '../models/ReadingHistory';
import ReadingSession from '../models/ReadingSession';
import StudyProgress from '../models/StudyProgress';
import StudyLessonState from '../models/StudyLessonState';
import StudyEnrollment from '../models/StudyEnrollment';
import PlanEnrollment from '../models/PlanEnrollment';
import BibleYearEnrollment from '../models/BibleYearEnrollment';
import AiUsage from '../models/AiUsage';
import GroupMessage from '../models/GroupMessage';
import Friendship from '../models/Friendship';
import FriendRequest from '../models/FriendRequest';
import FriendProfile from '../models/FriendProfile';
import FriendPost from '../models/FriendPost';
import FriendPostComment from '../models/FriendPostComment';
import Report from '../models/Report';
import DeletedAccount from '../models/DeletedAccount';
import { isAdminEmail } from './adminEmails';

/**
 * The safety net under account deletion.
 *
 * Two code paths can delete a User document: the admin delete
 * (lib/adminUsers.ts, reached from the website and the app's admin sheet) and
 * the self-service delete in the app (app/api/v1/account). Both now do two
 * things before touching the document:
 *
 * 1. `isProtectedAccount()` - an admin account (the `isAdmin` flag or an
 *    address in ADMIN_EMAILS) is never deleted through either path. The owner
 *    tests the app on their own account; one tap on "Account verwijderen" in a
 *    preview build wipes production, because previews share the production
 *    database (docs/test-environment.md).
 * 2. `archiveAccount()` - the full document and every related document are
 *    copied into `deletedaccounts` first. If that copy cannot be written the
 *    deletion does not happen. `scripts/recover-account.mjs` restores from it.
 */

/** Per-collection cap on archived documents. Well under the 16 MB document limit. */
export const ARCHIVE_DOC_CAP = 5000;

export function isProtectedAccount(
  user: { email?: string | null; isAdmin?: boolean | null } | null | undefined,
): boolean {
  if (!user) return false;
  return Boolean(user.isAdmin) || isAdminEmail(user.email);
}

export type ArchiveMeta = {
  /** "admin" | "v1/account" - the route that is about to delete. */
  route: string;
  /** Email of whoever asked, when known. */
  actor?: string | null;
  reason?: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type LeanFindModel = {
  find(filter: Record<string, unknown>): { limit(n: number): { lean(): Promise<any[]> } };
};
/**
 * Vriendenkring stores a vriendschap and a verzoek on a PAIR, not on a single
 * `userId`, so those two do not fit the `{ userId: id }` filter the archive
 * uses. This wraps them so they do: same contract, the filter rewritten to
 * whichever of the two sides the account is on.
 */
function pairKeyed(model: LeanFindModel, fields: readonly [string, string]): LeanFindModel {
  return {
    find: (filter) =>
      model.find({ $or: [{ [fields[0]]: filter.userId }, { [fields[1]]: filter.userId }] }),
  };
}

export type ArchiveDeps = {
  user: { findById(id: unknown): { lean(): Promise<any> } };
  related: Record<string, LeanFindModel>;
  archive: { create(doc: Record<string, unknown>): Promise<{ _id: unknown }> };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const defaultDeps: ArchiveDeps = {
  user: User,
  related: {
    notes: Note,
    bookmarks: Bookmark,
    readinghistories: ReadingHistory,
    readingsessions: ReadingSession,
    studyprogress: StudyProgress,
    studylessonstate: StudyLessonState,
    studyenrollments: StudyEnrollment,
    planenrollments: PlanEnrollment,
    bibleyearenrollments: BibleYearEnrollment,
    aiusages: AiUsage,
    groupmessages: GroupMessage,
    // Vriendenkring. A collection this guard does not know about is a hole in
    // it, so these go in with the schemas (VRIENDENKRING_PLAN.md §2).
    // `friendprofiles` carries the contact hashes and the findability choice;
    // `friendships` and `friendrequests` are keyed on a pair rather than a
    // single `userId`, so they go through `pairKeyed` above.
    friendprofiles: FriendProfile,
    friendposts: FriendPost,
    friendpostcomments: FriendPostComment,
    friendships: pairKeyed(Friendship, ['userAId', 'userBId']),
    friendrequests: pairKeyed(FriendRequest, ['fromUserId', 'toUserId']),
    // Moderation. Both sides: the reports this person made (their own free
    // text) and the reports about them, because the purge deletes both and an
    // archive that keeps only one half cannot restore the account.
    reports: pairKeyed(Report, ['reporterId', 'targetUserId']),
  },
  archive: DeletedAccount,
};

export type ArchiveResult = { archiveId: string; counts: Record<string, number>; truncated: string[] };

/**
 * Copies a user and everything keyed on their id into `deletedaccounts`.
 * Throws when the user does not exist or the copy cannot be written - callers
 * must let that abort the deletion.
 */
export async function archiveAccount(
  userId: string | mongoose.Types.ObjectId,
  meta: ArchiveMeta,
  deps: ArchiveDeps = defaultDeps,
): Promise<ArchiveResult> {
  const id = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const user = await deps.user.findById(id).lean();
  if (!user) throw new Error(`archiveAccount: gebruiker ${String(id)} niet gevonden`);

  const related: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  const truncated: string[] = [];
  for (const [name, model] of Object.entries(deps.related)) {
    const docs = await model.find({ userId: id }).limit(ARCHIVE_DOC_CAP + 1).lean();
    if (docs.length > ARCHIVE_DOC_CAP) {
      truncated.push(name);
      docs.length = ARCHIVE_DOC_CAP;
    }
    related[name] = docs;
    counts[name] = docs.length;
  }

  const created = await deps.archive.create({
    userId: id,
    email: typeof user.email === 'string' ? user.email : null,
    route: meta.route,
    actor: meta.actor ?? null,
    reason: meta.reason ?? null,
    user,
    related,
    counts,
    truncated,
    deletedAt: new Date(),
  });

  // One line per deletion in the Vercel function logs: who, what, and where
  // the copy is. This is the trail that did not exist on 2026-09-08.
  console.warn(
    `[account-archive] ${meta.route}: ${String(user.email ?? id)} (${String(id)}) gearchiveerd als ` +
      `${String(created._id)} door ${meta.actor ?? 'onbekend'}; counts=${JSON.stringify(counts)}` +
      (truncated.length ? `; afgekapt=${truncated.join(',')}` : ''),
  );

  return { archiveId: String(created._id), counts, truncated };
}
