import mongoose from 'mongoose';
import connectMongoDB from '../mongodb';
import User from '../../models/User';
import Friendship from '../../models/Friendship';
import FriendProfile from '../../models/FriendProfile';
import FriendContactBook from '../../models/FriendContactBook';
import { blockedIdsFor } from './blocks';
import { MAX_KEPT_CONTACT_HASHES, contactBookDigest } from './discovery';
import { firstNameOf, pickVariant, type CopyTokens } from '../notificationCopy';
import { isApnsConfigured, sendPushToUser } from '../push/send';

/**
 * "<Naam> uit je contacten zit nu op BijbelStudie".
 *
 * Contact matching is symmetric only in theory: whoever connects their
 * contacts first sees nobody, because the people they know are not findable
 * yet, and nothing ever tells them when that changes. This closes that gap.
 *
 * 1. When the app matches an address book it may ask (`retain: true`) for the
 *    hashes to be kept. They go into `FriendContactBook`, one document per
 *    uploader, hashes only - see that model for what is and is not in there.
 * 2. When somebody becomes findable (`saveOwnHashes`, or the findability switch
 *    on with hashes already on file), every book holding one of their own
 *    hashes gets them added to `pending`.
 * 3. `pending` is flushed into ONE alert at most once a day per reader, so a
 *    church that installs the app on one Sunday is one notification, not
 *    thirty. The alert is pushed (iPhone) and listed by
 *    `GET /notifications/social` (Android, and any iPhone that missed it).
 *
 * The opt-ins hold throughout: only somebody who chose to be findable is ever
 * announced, and is checked again at flush time in case they changed their
 * mind; only a reader who left contact alerts on keeps a book at all; blocked
 * pairs and existing friends are skipped; nobody is announced twice.
 *
 * Like lib/friends/notify.ts, nothing here throws into a caller: a failure is
 * logged and dropped, because the write that triggered it (someone saving
 * their own number) must never fail over a notification.
 */

const { ObjectId } = mongoose.Types;

const DAY_MS = 24 * 60 * 60 * 1000;

/** At most one contact alert per reader per this window. */
export const CONTACT_ALERT_INTERVAL_MS = DAY_MS;

/** Books one newly findable person can reach. A runaway guard, not a page size. */
const MAX_BOOKS_PER_ANNOUNCEMENT = 1000;

/** Sent alerts kept per reader for the social pull. */
const ALERTS_KEPT = 20;

/** People remembered as announced, per reader. */
const ANNOUNCED_KEPT = 2000;

/** People named in one grouped alert's ids. The count still says how many. */
const PENDING_KEPT = 50;

function oid(value: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  return typeof value === 'string' ? new ObjectId(value) : value;
}

type BookAlert = { id: string; at: Date; userIds: mongoose.Types.ObjectId[] };

type BookRow = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  digest?: string | null;
  pending?: { userId?: mongoose.Types.ObjectId; at?: Date }[];
  alerts?: BookAlert[];
  lastAlertAt?: Date | null;
};

/** Whether this reader allows their book to be kept. Absent reads as yes. */
export async function contactAlertsAllowed(userId: string): Promise<boolean> {
  await connectMongoDB();
  const profile = await FriendProfile.findOne({ userId: oid(userId) })
    .select('contactJoinAlerts')
    .lean<{ contactJoinAlerts?: boolean } | null>();
  return profile?.contactJoinAlerts !== false;
}

/**
 * Keep (or refresh) the uploader's hashed address book. Called from
 * `matchContacts` only when the app sent `retain: true`.
 *
 * An unchanged book costs one small `$set` of `refreshedAt`; a changed one
 * replaces the set wholesale, so a contact the reader deleted stops matching.
 */
export async function keepContactBook(
  userId: string,
  hashes: readonly string[],
  now = new Date(),
): Promise<boolean> {
  try {
    if (!(await contactAlertsAllowed(userId))) return false;
    const kept = [...new Set(hashes)].slice(0, MAX_KEPT_CONTACT_HASHES);
    if (kept.length === 0) return false;
    const digest = contactBookDigest(kept);
    const id = oid(userId);

    const unchanged = await FriendContactBook.updateOne(
      { userId: id, digest },
      { $set: { refreshedAt: now } },
    );
    if (unchanged.matchedCount === 1) return true;

    await FriendContactBook.updateOne(
      { userId: id },
      {
        $set: { hashes: kept, digest, refreshedAt: now },
        $setOnInsert: { userId: id },
      },
      { upsert: true },
    );
    return true;
  } catch (error) {
    console.error(`[contact-alerts] adresboek van ${userId} niet bewaard`, error);
    return false;
  }
}

/** Throw the uploader's stored book away. The off switch and "vergeten". */
export async function deleteContactBook(userId: string): Promise<void> {
  await connectMongoDB();
  await FriendContactBook.deleteOne({ userId: oid(userId) });
}

/** How many hashes are on file for this reader, for settings and an export. */
export async function contactBookSize(userId: string): Promise<number> {
  await connectMongoDB();
  const rows = await FriendContactBook.aggregate<{ size: number }>([
    { $match: { userId: oid(userId) } },
    { $project: { size: { $size: { $ifNull: ['$hashes', []] } } } },
  ]);
  return rows[0]?.size ?? 0;
}

async function friendIdsOf(userId: string): Promise<Set<string>> {
  const id = oid(userId);
  const rows = await Friendship.find({ $or: [{ userAId: id }, { userBId: id }] })
    .select('userAId userBId')
    .lean<{ userAId: mongoose.Types.ObjectId; userBId: mongoose.Types.ObjectId }[]>();
  const me = String(id);
  return new Set(
    rows.map((row) => (String(row.userAId) === me ? String(row.userBId) : String(row.userAId))),
  );
}

/**
 * Somebody just became findable by these hashes of their own. Queue them for
 * every reader who has one of those hashes in their address book, then send
 * whatever is due.
 */
export async function announceFindable(
  memberId: string,
  ownHashes: readonly string[],
  now = new Date(),
): Promise<void> {
  try {
    const hashes = [...new Set(ownHashes)].filter(Boolean);
    if (hashes.length === 0) return;
    await connectMongoDB();
    const member = oid(memberId);

    const books = await FriendContactBook.find({
      hashes: { $in: hashes },
      userId: { $ne: member },
      announced: { $ne: member },
    })
      .select('userId')
      .limit(MAX_BOOKS_PER_ANNOUNCEMENT)
      .lean<{ userId: mongoose.Types.ObjectId }[]>();
    if (books.length === 0) return;

    const [friends, blocked] = await Promise.all([friendIdsOf(memberId), blockedIdsFor(memberId)]);
    const owners = books
      .map((book) => String(book.userId))
      .filter((owner) => !friends.has(owner) && !blocked.has(owner));

    for (const owner of owners) {
      await FriendContactBook.updateOne(
        { userId: oid(owner), 'pending.userId': { $ne: member }, announced: { $ne: member } },
        { $push: { pending: { $each: [{ userId: member, at: now }], $slice: -PENDING_KEPT } } },
      );
      await flushContactAlerts(owner, now);
    }
  } catch (error) {
    console.error(`[contact-alerts] aankondiging van ${memberId} mislukt`, error);
  }
}

/**
 * Turn a reader's pending contacts into one alert, if a day has passed since
 * the last one. Returns the alert it sent, or null.
 *
 * The claim is a conditional update on `lastAlertAt` as it was read, so two
 * announcements landing together send one alert between them, not two.
 */
export async function flushContactAlerts(ownerId: string, now = new Date()): Promise<BookAlert | null> {
  try {
    await connectMongoDB();
    const owner = oid(ownerId);
    const book = await FriendContactBook.findOne({ userId: owner })
      .select('userId pending lastAlertAt')
      .lean<BookRow | null>();
    const pending = (book?.pending ?? []).filter((row) => row.userId);
    if (!book || pending.length === 0) return null;
    const last = book.lastAlertAt ? new Date(book.lastAlertAt) : null;
    if (last && now.getTime() - last.getTime() < CONTACT_ALERT_INTERVAL_MS) return null;

    // Checked again now rather than trusted from the moment they were queued:
    // somebody who switched findability off since, blocked this reader, or
    // became their friend in the meantime is not news any more.
    const candidateIds = [...new Set(pending.map((row) => String(row.userId)))];
    const [stillFindable, friends, blocked] = await Promise.all([
      FriendProfile.find({ userId: { $in: candidateIds.map((id) => oid(id)) }, discoverable: true })
        .select('userId')
        .lean<{ userId: mongoose.Types.ObjectId }[]>(),
      friendIdsOf(ownerId),
      blockedIdsFor(ownerId),
    ]);
    const findable = new Set(stillFindable.map((row) => String(row.userId)));
    const ids = candidateIds.filter((id) => findable.has(id) && !friends.has(id) && !blocked.has(id));

    if (ids.length === 0) {
      await FriendContactBook.updateOne(
        { userId: owner, lastAlertAt: book.lastAlertAt ?? null },
        { $set: { pending: [] } },
      );
      return null;
    }

    const alert: BookAlert = {
      id: `contact:${ownerId}:${now.getTime()}`,
      at: now,
      userIds: ids.map((id) => oid(id)),
    };
    const claimed = await FriendContactBook.updateOne(
      { userId: owner, lastAlertAt: book.lastAlertAt ?? null },
      {
        $set: { pending: [], lastAlertAt: now },
        $push: {
          alerts: { $each: [alert], $slice: -ALERTS_KEPT },
          announced: { $each: alert.userIds, $slice: -ANNOUNCED_KEPT },
        },
      },
    );
    if (claimed.modifiedCount !== 1) return null;

    if (isApnsConfigured()) {
      const rendered = await renderContactAlert(ownerId, alert);
      if (rendered) {
        await sendPushToUser(ownerId, 'contact_joined', rendered, {
          // One stack on the lock screen however many days in a row it fires.
          collapseId: 'contact-joined',
          eventId: alert.id,
        });
      }
    }
    return alert;
  } catch (error) {
    console.error(`[contact-alerts] melding voor ${ownerId} niet verstuurd`, error);
    return null;
  }
}

/**
 * The one sentence for an alert. The same tokens and the same seed in the push
 * and in the social pull, so an Android phone raises the exact words an iPhone
 * was pushed.
 */
export function contactAlertTokens(firstUserId: string, firstName: string | undefined, total: number): CopyTokens {
  return {
    vriend: firstName,
    vriendId: firstUserId,
    anderen: Math.max(0, total - 1),
  };
}

async function renderContactAlert(ownerId: string, alert: BookAlert) {
  const first = alert.userIds[0];
  if (!first) return null;
  const user = await User.findById(first).select('name').lean<{ name?: string } | null>();
  return pickVariant('contact_joined', contactAlertTokens(String(first), firstNameOf(user?.name), alert.userIds.length), {
    seed: `${ownerId}:${alert.id}`,
  });
}

/** The alerts sent to this reader after `since`, oldest first, for the social pull. */
export async function contactAlertsSince(ownerId: string, since: Date): Promise<BookAlert[]> {
  await connectMongoDB();
  const book = await FriendContactBook.findOne({ userId: oid(ownerId) })
    .select('alerts')
    .lean<{ alerts?: BookAlert[] } | null>();
  return (book?.alerts ?? [])
    .filter((alert) => alert.at && new Date(alert.at) > since && (alert.userIds?.length ?? 0) > 0)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/**
 * The daily job's share: every reader whose grouped alert is due. Without it a
 * second contact joining an hour after the first would wait for a third one to
 * be announced at all.
 */
export async function flushDueContactAlerts(now = new Date()): Promise<{ checked: number; sent: number }> {
  await connectMongoDB();
  const due = await FriendContactBook.find({
    'pending.0': { $exists: true },
    $or: [{ lastAlertAt: null }, { lastAlertAt: { $lte: new Date(now.getTime() - CONTACT_ALERT_INTERVAL_MS) } }],
  })
    .select('userId')
    .limit(2000)
    .lean<{ userId: mongoose.Types.ObjectId }[]>();
  let sent = 0;
  for (const row of due) {
    if (await flushContactAlerts(String(row.userId), now)) sent += 1;
  }
  return { checked: due.length, sent };
}

/** Books nobody refreshed in this long are dropped by the retention job. */
export const CONTACT_BOOK_RETENTION_DAYS = 180;

/** The retention job's share: forget books the app stopped refreshing. */
export async function purgeStaleContactBooks(now = new Date()): Promise<{ deleted: number; cutoff: string }> {
  await connectMongoDB();
  const cutoff = new Date(now.getTime() - CONTACT_BOOK_RETENTION_DAYS * DAY_MS);
  const res = await FriendContactBook.deleteMany({
    $or: [{ refreshedAt: null }, { refreshedAt: { $lt: cutoff } }],
  });
  return { deleted: res.deletedCount ?? 0, cutoff: cutoff.toISOString() };
}
