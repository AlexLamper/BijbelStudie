import mongoose from 'mongoose';
import connectMongoDB from '../mongodb';
import User from '../../models/User';
import FriendPost from '../../models/FriendPost';
import FriendPostComment from '../../models/FriendPostComment';
import FriendRequest from '../../models/FriendRequest';
import FriendProfile from '../../models/FriendProfile';
import { blockedIdsFor } from '../friends/blocks';
import { firstNameOf, pickVariant, type CopyTokens, type SocialNotificationType } from '../notificationCopy';
import { isApnsConfigured } from './apns';

/**
 * What happened in your vriendenkring since a cursor you hold.
 *
 * WHO THIS IS FOR, and why it is not a convenience endpoint. The owner rejected
 * Firebase, so **Android has no push at all**: the app polls this on every
 * foreground, works out what is new, and raises the local notifications itself.
 * That makes this response the only delivery mechanism half the install base
 * has, and a missed event here is a notification that never existed. iOS uses
 * it too, to reconcile after being offline or after a push was dropped - Apple
 * makes no delivery guarantee - and because the coalescing rule in
 * lib/friends/notify.ts deliberately suppresses the fourth like on a post, this
 * is also where those suppressed events still show up.
 *
 * It is therefore built to be correct first and cheap second, though it has to
 * be cheap enough to call on every foreground: five indexed queries, all
 * bounded, no joins, nothing cached.
 *
 * THE CURSOR. The client holds an ISO timestamp and sends it as `?since=`.
 * Comparison is strictly greater-than, so nothing is replayed, and the returned
 * `cursor` is the timestamp of the last item in the page - never "now" when a
 * page was cut short, which would silently drop the remainder. Items come back
 * oldest first for that reason: a catch-up list is a chronological list, and the
 * cursor can only be the end of what was actually handed over.
 *
 * THE SERVER-SIDE MARKER is `FriendProfile.socialSeenAt`, which is new and is
 * deliberately **not** `feedSeenAt`. `feedSeenAt` means "the reader looked at
 * the feed" and drives `newActivityCount`; this one means "these events have
 * been handed to a client". Overloading one field would tie the two together in
 * both directions: opening the kring would silence notifications the reader
 * never saw, and a background poll would clear the feed badge. The marker is
 * only a fallback for a client with no cursor - a fresh install, a reinstall -
 * and is advanced with `$max` so it can never move backwards.
 */

const { ObjectId } = mongoose.Types;

/** Items in one page. A kring is tens of people, so this is rarely reached. */
export const SOCIAL_PAGE_SIZE = 50;
export const SOCIAL_MAX_PAGE_SIZE = 100;

/** How far back a client with no cursor at all starts. */
const COLD_START_DAYS = 14;

/**
 * The furthest back any cursor is honoured. A phone that was off for three
 * months does not get three months of likes read out to it, and the queries
 * stay bounded no matter what a client sends.
 */
const MAX_LOOKBACK_DAYS = 30;

/** Own posts scanned for likes and comments. More than anyone in the kring has. */
const POSTS_SCANNED = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SocialNotificationItem = {
  /** Stable and unique per event; the same string the push payload's `eventId` carries. */
  id: string;
  type: SocialNotificationType;
  title: string;
  body: string;
  /** An app route, e.g. `/vriendenkring` or `/vriendenkring/<id>`. */
  deepLink: string;
  createdAt: string;
  actorId: string;
  actorName: string;
  actorImage: string | null;
  postId: string | null;
};

export type SocialNotificationsResponse = {
  /** Oldest first. */
  items: SocialNotificationItem[];
  /** Send this back as `?since=` next time. */
  cursor: string;
  /** True when the page was cut short: call again at once with the new cursor. */
  hasMore: boolean;
  /** Every pending incoming request, cursor or no cursor - this is a badge count. */
  pendingRequests: number;
  /**
   * Whether this server can push at all. False means APNs is not configured
   * here, so even an iPhone must fall back to polling this endpoint. Always
   * false for Android, which has no push by design.
   */
  pushEnabled: boolean;
};

type Raw = {
  id: string;
  type: SocialNotificationType;
  at: Date;
  actorId: string;
  postId: string | null;
  /** Only a comment has one. */
  snippet?: string;
};

function oid(value: string): mongoose.Types.ObjectId {
  return new ObjectId(value);
}

function parseSince(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `?since=` from a query string, or null when it is absent or nonsense. */
export function readCursor(value: string | null): Date | null {
  return parseSince(value);
}

export async function socialNotifications(
  userId: string,
  options: { since?: Date | null; limit?: number; now?: Date } = {},
): Promise<SocialNotificationsResponse> {
  // Captured before any query runs. When a page comes back empty this becomes
  // the new cursor, and because it predates the reads, an event written while
  // they were running is on the far side of it and will be picked up next time
  // rather than skipped.
  const now = options.now ?? new Date();
  const pushEnabled = isApnsConfigured();

  await connectMongoDB();
  const me = oid(userId);
  const limit = Math.min(Math.max(options.limit ?? SOCIAL_PAGE_SIZE, 1), SOCIAL_MAX_PAGE_SIZE);

  const profile = await FriendProfile.findOne({ userId: me })
    .select('socialSeenAt')
    .lean<{ socialSeenAt?: Date } | null>();

  const floor = new Date(now.getTime() - MAX_LOOKBACK_DAYS * DAY_MS);
  const requested =
    options.since ?? profile?.socialSeenAt ?? new Date(now.getTime() - COLD_START_DAYS * DAY_MS);
  const since = requested < floor ? floor : requested;

  const [blocked, pendingRequests, incoming, accepted, ownPosts] = await Promise.all([
    blockedIdsFor(userId),
    FriendRequest.countDocuments({ toUserId: me, status: 'pending' }),
    // `updatedAt`, not `createdAt`. `sendRequest` re-opens a declined request by
    // `$set`-ting it back to pending on the same document, and `createdAt` is
    // written with `$setOnInsert` - so a second invitation after a decline keeps
    // the original date and a `createdAt` filter would never surface it. The
    // request id is therefore stable across re-opens and the item's timestamp is
    // not: a client dedupes on `id` *and* `createdAt`, which is why both are in
    // the response.
    FriendRequest.find({ toUserId: me, status: 'pending', updatedAt: { $gt: since } })
      .sort({ updatedAt: 1 })
      .limit(SOCIAL_MAX_PAGE_SIZE)
      .select('_id fromUserId updatedAt')
      .lean<{ _id: mongoose.Types.ObjectId; fromUserId: mongoose.Types.ObjectId; updatedAt?: Date }[]>(),
    FriendRequest.find({ fromUserId: me, status: 'accepted', respondedAt: { $gt: since } })
      .sort({ respondedAt: 1 })
      .limit(SOCIAL_MAX_PAGE_SIZE)
      .select('_id toUserId respondedAt')
      .lean<{ _id: mongoose.Types.ObjectId; toUserId: mongoose.Types.ObjectId; respondedAt?: Date }[]>(),
    // Own posts, newest first, for the likes that sit embedded on them and as
    // the id set the comment query needs. `likes.at` is filtered in memory
    // because the array is tens of entries at most - a dedicated index on an
    // embedded date would cost every like a write for nothing.
    FriendPost.find({ userId: me })
      .sort({ createdAt: -1 })
      .limit(POSTS_SCANNED)
      .select('_id likes')
      .lean<{ _id: mongoose.Types.ObjectId; likes?: { userId?: mongoose.Types.ObjectId; at?: Date }[] }[]>(),
  ]);

  const postIds = ownPosts.map((post) => post._id);
  const comments =
    postIds.length === 0
      ? []
      : await FriendPostComment.find({
          postId: { $in: postIds },
          userId: { $ne: me },
          createdAt: { $gt: since },
        })
          .sort({ createdAt: 1 })
          .limit(SOCIAL_MAX_PAGE_SIZE)
          .select('_id postId userId body createdAt')
          .lean<
            {
              _id: mongoose.Types.ObjectId;
              postId: mongoose.Types.ObjectId;
              userId: mongoose.Types.ObjectId;
              body?: string;
              createdAt?: Date;
            }[]
          >();

  const raw: Raw[] = [];

  for (const row of incoming) {
    const at = row.updatedAt;
    if (!at) continue;
    raw.push({
      id: `request:${String(row._id)}`,
      type: 'friend_request',
      at,
      actorId: String(row.fromUserId),
      postId: null,
    });
  }

  for (const row of accepted) {
    const at = row.respondedAt;
    if (!at) continue;
    raw.push({
      id: `accepted:${String(row._id)}`,
      type: 'friend_accepted',
      at,
      actorId: String(row.toUserId),
      postId: null,
    });
  }

  for (const post of ownPosts) {
    for (const like of post.likes ?? []) {
      if (!like.at || !like.userId) continue;
      if (like.at <= since) continue;
      // Liking your own post is allowed and is not news.
      if (String(like.userId) === String(me)) continue;
      raw.push({
        id: `like:${String(post._id)}:${String(like.userId)}`,
        type: 'post_like',
        at: like.at,
        actorId: String(like.userId),
        postId: String(post._id),
      });
    }
  }

  for (const row of comments) {
    const at = row.createdAt;
    if (!at) continue;
    raw.push({
      id: `comment:${String(row._id)}`,
      type: 'post_comment',
      at,
      actorId: String(row.userId),
      postId: String(row.postId),
      snippet: row.body ?? '',
    });
  }

  // A block hides both directions, here as everywhere.
  const visible = raw.filter((item) => !blocked.has(item.actorId));
  visible.sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));

  // Cut at the page size, then keep going while the next item shares the exact
  // timestamp of the last one kept. Without that, a cursor set to that
  // timestamp and compared with `>` would drop its twin on the next call.
  let end = Math.min(limit, visible.length);
  while (end > 0 && end < visible.length && visible[end].at.getTime() === visible[end - 1].at.getTime()) {
    end += 1;
  }
  const page = visible.slice(0, end);
  const hasMore = end < visible.length;

  const actorIds = [...new Set(page.map((item) => item.actorId))];
  const actors = await User.find({ _id: { $in: actorIds.map((value) => oid(value)) } })
    .select('_id name image')
    .lean<{ _id: mongoose.Types.ObjectId; name?: string; image?: string }[]>();
  const actorById = new Map(actors.map((actor) => [String(actor._id), actor]));

  const items: SocialNotificationItem[] = page.map((item) => {
    const actor = actorById.get(item.actorId);
    const tokens: CopyTokens = {
      vriend: firstNameOf(actor?.name),
      vriendId: item.actorId,
      berichtId: item.postId ?? undefined,
      reactie: item.snippet,
    };
    // The same seed as lib/friends/notify.ts uses, so the text an Android phone
    // raises locally is the same sentence an iPhone received by push.
    const rendered = pickVariant(item.type, tokens, { seed: `${userId}:${item.id}` });
    return {
      id: item.id,
      type: item.type,
      title: rendered.title,
      body: rendered.body,
      deepLink: rendered.deepLink,
      createdAt: item.at.toISOString(),
      actorId: item.actorId,
      actorName: actor?.name ?? '',
      actorImage: actor?.image ?? null,
      postId: item.postId,
    };
  });

  const cursorDate = page.length > 0 ? page[page.length - 1].at : now;

  // `$max`, so a stale or out-of-order poll can never move the marker back and
  // make a client replay what it has already shown.
  await FriendProfile.updateOne(
    { userId: me },
    { $max: { socialSeenAt: cursorDate }, $setOnInsert: { userId: me } },
    { upsert: true },
  );

  return {
    items,
    cursor: cursorDate.toISOString(),
    hasMore,
    pendingRequests,
    pushEnabled,
  };
}
