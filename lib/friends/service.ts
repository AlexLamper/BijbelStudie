import mongoose from 'mongoose';
import connectMongoDB from '../mongodb';
import User from '../../models/User';
import Friendship from '../../models/Friendship';
import FriendRequest from '../../models/FriendRequest';
import FriendProfile from '../../models/FriendProfile';
import FriendPost from '../../models/FriendPost';
import FriendPostComment from '../../models/FriendPostComment';
import BibleYearEnrollment from '../../models/BibleYearEnrollment';
import { scheduledDayNumber } from '../bibleYear/progress';
import { PLAN_DAYS } from '../bibleYear/schedule';
import { normaliseReferralCode } from '../referralRules';
import { ensureReferralCode } from '../referral';
import { contactPepper, hashIdentifier, normaliseEmail, normalisePhone, sanitiseHashes } from './discovery';
import type {
  FriendMutationResponse,
  FriendPost as FriendPostView,
  FriendPostBody,
  FriendPostComment as FriendPostCommentView,
  FriendRequestView,
  FriendRequestsResponse,
  FriendSettings,
  FriendSource,
  FriendSummary,
  FriendsFeed,
  FriendsKring,
} from './types';

/**
 * The only writer of the Vriendenkring collections, the way
 * lib/bibleYear/service.ts is the only writer of its enrollment.
 *
 * Every write here is a targeted operator - `$addToSet`, `$pull`, `$inc`, or a
 * `$set` on a named path - and nothing in this file touches a `User` document
 * beyond reading it and `$addToSet`-ing nothing: the kring's own state lives in
 * `FriendProfile`. See VRIENDENKRING_PLAN.md §2.
 *
 * Route handlers stay thin: auth, parse, call one function here, `jsonV1`.
 */

const { ObjectId } = mongoose.Types;

export const FEED_PAGE_SIZE = 20;
export const FEED_MAX_PAGE_SIZE = 50;
export const MAX_POST_BODY = 2000;
export const MAX_COMMENT_BODY = 1000;
export const MAX_MATCH_HASHES = 2000;

/** Everything a list row needs off a `User`, and nothing more. No e-mail. */
const USER_CARD_FIELDS = '_id name image streak';

type UserCard = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  image?: string;
  streak?: number;
};

type PlanRow = {
  userId: mongoose.Types.ObjectId;
  planKey: 'jaar-1' | 'jaar-2';
  track: 'gemengd' | 'canoniek';
  scheduleVersion: number;
  startDate: string;
  timeZone?: string;
  shiftDays?: number;
};

type PairRow = {
  userAId: mongoose.Types.ObjectId;
  userBId: mongoose.Types.ObjectId;
  createdAt?: Date;
};

export class FriendsError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'FriendsError';
    this.code = code;
    this.status = status;
  }
}

function oid(value: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  return typeof value === 'string' ? new ObjectId(value) : value;
}

/**
 * The pair, ordered. One document per vriendschap only works if both sides
 * agree which id goes first, so the hex comparison is the single rule.
 */
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function isoOrNull(value: Date | undefined | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

// ---------------------------------------------------------------- the graph

/** The ids of everyone in the caller's kring. One indexed query per side. */
export async function friendIdsFor(userId: string): Promise<string[]> {
  await connectMongoDB();
  const id = oid(userId);
  const rows = await Friendship.find({ $or: [{ userAId: id }, { userBId: id }] })
    .select('userAId userBId')
    .lean<PairRow[]>();
  const me = String(id);
  return rows.map((row) => (String(row.userAId) === me ? String(row.userBId) : String(row.userAId)));
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  await connectMongoDB();
  const [userAId, userBId] = orderPair(a, b);
  const found = await Friendship.exists({ userAId: oid(userAId), userBId: oid(userBId) });
  return Boolean(found);
}

/** The caller's profile document, created on first touch with its defaults. */
async function profileFor(userId: string) {
  await connectMongoDB();
  const id = oid(userId);
  const existing = await FriendProfile.findOne({ userId: id });
  if (existing) return existing;
  // `upsert` rather than `create`: two tabs opening Vriendenkring at once must
  // not race into a duplicate-key error on the unique index.
  await FriendProfile.updateOne({ userId: id }, { $setOnInsert: { userId: id } }, { upsert: true });
  return FriendProfile.findOne({ userId: id });
}

/** Blocked in either direction - a block has to work both ways to mean anything. */
async function blockedBetween(userId: string): Promise<Set<string>> {
  await connectMongoDB();
  const id = oid(userId);
  const mine = await FriendProfile.findOne({ userId: id }).select('blocked').lean<{ blocked?: mongoose.Types.ObjectId[] }>();
  const theirs = await FriendProfile.find({ blocked: id }).select('userId').lean<{ userId: mongoose.Types.ObjectId }[]>();
  const out = new Set<string>();
  for (const value of mine?.blocked ?? []) out.add(String(value));
  for (const row of theirs) out.add(String(row.userId));
  return out;
}

// ------------------------------------------------------------------- people

/**
 * `FriendSummary` for a set of ids: two queries for any number of people, so a
 * kring list never becomes a loop of lookups.
 */
async function summariesFor(ids: string[], since: Map<string, Date | null> = new Map()): Promise<FriendSummary[]> {
  if (ids.length === 0) return [];
  await connectMongoDB();
  const objectIds = ids.map((value) => oid(value));

  const users = await User.find({ _id: { $in: objectIds } })
    .select(USER_CARD_FIELDS)
    .lean<UserCard[]>();

  // "Dag 42 van 365" is not stored - it is a function of the start date, the
  // zone and the catch-up shift - so it is derived here with the plan's own
  // pure helper rather than re-counted by hand.
  const plans = await BibleYearEnrollment.find({ userId: { $in: objectIds }, status: 'active' })
    .select('userId planKey track scheduleVersion startDate timeZone shiftDays')
    .lean<PlanRow[]>();
  const now = new Date();
  const planByUser = new Map<string, { day: number; total: number }>();
  for (const plan of plans) {
    try {
      planByUser.set(String(plan.userId), {
        // The schema defaults both, but a lean read types them as optional.
        day: scheduledDayNumber(
          { ...plan, timeZone: plan.timeZone || 'Europe/Amsterdam', shiftDays: plan.shiftDays ?? 0 },
          now,
        ),
        total: PLAN_DAYS[plan.planKey] ?? 365,
      });
    } catch {
      // A malformed or retired enrollment must not take out the whole list.
    }
  }

  const order = new Map(ids.map((value, index) => [value, index]));
  return users
    .map((user) => {
      const key = String(user._id);
      const plan = planByUser.get(key);
      return {
        userId: key,
        name: user.name ?? '',
        image: user.image ?? null,
        streak: user.streak ?? 0,
        planDay: plan ? plan.day : null,
        planTotalDays: plan ? plan.total : null,
        friendsSince: isoOrNull(since.get(key) ?? null),
      };
    })
    .sort((a, b) => (order.get(a.userId) ?? 0) - (order.get(b.userId) ?? 0));
}

/** `GET /api/v1/friends`. */
export async function getKring(userId: string): Promise<FriendsKring> {
  await connectMongoDB();
  const id = oid(userId);
  const rows = await Friendship.find({ $or: [{ userAId: id }, { userBId: id }] })
    .select('userAId userBId createdAt')
    .sort({ createdAt: -1 })
    .lean<PairRow[]>();

  const me = String(id);
  const since = new Map<string, Date | null>();
  const ids: string[] = [];
  for (const row of rows) {
    const other = String(row.userAId) === me ? String(row.userBId) : String(row.userAId);
    ids.push(other);
    since.set(other, row.createdAt ?? null);
  }

  const [friends, pendingIncoming] = await Promise.all([
    summariesFor(ids, since),
    FriendRequest.countDocuments({ toUserId: id, status: 'pending' }),
  ]);
  return { friends, pendingIncoming };
}

// --------------------------------------------------------------------- feed

type PostRow = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  kind?: string;
  reference?: string;
  body?: string;
  likes?: { userId?: mongoose.Types.ObjectId }[];
  commentCount?: number;
  createdAt?: Date;
};

function toPostView(row: PostRow, author: UserCard | undefined, me: string): FriendPostView {
  const likes = row.likes ?? [];
  return {
    id: String(row._id),
    authorId: String(row.userId),
    authorName: author?.name ?? '',
    authorImage: author?.image ?? null,
    kind: (row.kind === 'verse' || row.kind === 'milestone' ? row.kind : 'note'),
    createdAt: (row.createdAt ?? new Date()).toISOString(),
    reference: row.reference ?? null,
    body: row.body ?? '',
    likeCount: likes.length,
    likedByMe: likes.some((like) => String(like.userId) === me),
    commentCount: row.commentCount ?? 0,
  };
}

/**
 * `GET /api/v1/friends/feed`.
 *
 * The posts of everyone in the kring, newest first, minus anyone blocked in
 * either direction. One indexed query on `{ userId, createdAt }` - for a kring
 * of tens of people a fan-out collection would be machinery without a payoff.
 *
 * `newActivityCount` counts what landed after `feedSeenAt`, which is what the
 * badge on the Start tab shows; it is cleared by `markFeedSeen`.
 */
export async function getFeed(
  userId: string,
  options: { limit?: number; before?: Date | null } = {},
): Promise<FriendsFeed> {
  await connectMongoDB();
  const limit = Math.min(Math.max(options.limit ?? FEED_PAGE_SIZE, 1), FEED_MAX_PAGE_SIZE);

  const [friendIds, blocked, profile] = await Promise.all([
    friendIdsFor(userId),
    blockedBetween(userId),
    profileFor(userId),
  ]);
  const visible = friendIds.filter((id) => !blocked.has(id));
  if (visible.length === 0) {
    return { posts: [], newActivityCount: 0, hasFriends: friendIds.length > 0 };
  }

  const authorIds = visible.map((id) => oid(id));
  const filter: Record<string, unknown> = { userId: { $in: authorIds } };
  if (options.before) filter.createdAt = { $lt: options.before };

  const rows = await FriendPost.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<PostRow[]>();

  const authors = await User.find({ _id: { $in: authorIds } })
    .select(USER_CARD_FIELDS)
    .lean<UserCard[]>();
  const authorById = new Map(authors.map((user) => [String(user._id), user]));

  const seenAt = profile?.feedSeenAt ?? null;
  const newActivityCount = seenAt
    ? await FriendPost.countDocuments({ userId: { $in: authorIds }, createdAt: { $gt: seenAt } })
    : rows.length;

  const me = String(userId);
  return {
    posts: rows.map((row) => toPostView(row, authorById.get(String(row.userId)), me)),
    newActivityCount,
    hasFriends: true,
  };
}

/** `POST /api/v1/friends/feed/seen` - the badge goes out. */
export async function markFeedSeen(userId: string, now = new Date()): Promise<FriendMutationResponse> {
  await connectMongoDB();
  await FriendProfile.updateOne(
    { userId: oid(userId) },
    { $set: { feedSeenAt: now }, $setOnInsert: { userId: oid(userId) } },
    { upsert: true },
  );
  return { ok: true };
}

// -------------------------------------------------------------------- posts

function cleanBody(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+\n/g, '\n').trim().slice(0, max);
}

/** `POST /api/v1/friends/posts` - sharing by hand, from the verse card or a note. */
export async function createPost(userId: string, body: unknown): Promise<{ post: FriendPostView }> {
  await connectMongoDB();
  const input = (body ?? {}) as FriendPostBody;
  const kind = input.kind === 'verse' || input.kind === 'milestone' ? input.kind : 'note';
  const text = cleanBody(input.body, MAX_POST_BODY);
  const reference = typeof input.reference === 'string' ? input.reference.trim().slice(0, 120) : '';
  if (!text && !reference) throw new FriendsError('EMPTY_POST', 400, 'Een bericht heeft tekst of een verwijzing nodig.');

  const created = await FriendPost.create({
    userId: oid(userId),
    kind,
    body: text,
    reference: reference || undefined,
    sourceId: typeof input.sourceId === 'string' ? input.sourceId.slice(0, 200) : undefined,
    likes: [],
    commentCount: 0,
  });

  const author = await User.findById(userId).select(USER_CARD_FIELDS).lean<UserCard>();
  return { post: toPostView(created.toObject() as PostRow, author ?? undefined, String(userId)) };
}

/**
 * A milestone, written server-side on an event that already exists (a plan day
 * finished, a badge earned). Guarded on `sourceId` so a retry or a second
 * device cannot post it twice, and silent when the reader switched milestones
 * off - the caller does not have to know either rule.
 */
export async function postMilestone(
  userId: string,
  milestone: { sourceId: string; body: string; reference?: string },
): Promise<FriendMutationResponse> {
  await connectMongoDB();
  const profile = await profileFor(userId);
  if (profile?.autoShare?.milestones === false) return { ok: false, message: 'Mijlpalen staan uit.' };

  const id = oid(userId);
  const existing = await FriendPost.exists({ userId: id, kind: 'milestone', sourceId: milestone.sourceId });
  if (existing) return { ok: true };

  await FriendPost.create({
    userId: id,
    kind: 'milestone',
    sourceId: milestone.sourceId,
    body: cleanBody(milestone.body, MAX_POST_BODY),
    reference: milestone.reference,
  });
  return { ok: true };
}

/** A post the caller may see: their own, or a friend's. */
async function readablePost(userId: string, postId: string) {
  await connectMongoDB();
  if (!mongoose.isValidObjectId(postId)) throw new FriendsError('NOT_FOUND', 404, 'Bericht niet gevonden.');
  const post = await FriendPost.findById(postId).select('_id userId commentCount').lean<PostRow>();
  if (!post) throw new FriendsError('NOT_FOUND', 404, 'Bericht niet gevonden.');
  const author = String(post.userId);
  if (author !== String(userId) && !(await areFriends(userId, author))) {
    // 404 rather than 403: whether a post exists is itself private.
    throw new FriendsError('NOT_FOUND', 404, 'Bericht niet gevonden.');
  }
  return post;
}

/** `POST`/`DELETE /api/v1/friends/posts/:id/like`. */
export async function setLike(userId: string, postId: string, liked: boolean): Promise<FriendMutationResponse> {
  const post = await readablePost(userId, postId);
  const id = oid(userId);
  if (liked) {
    // `$addToSet` on the embedded like is what makes a double tap idempotent.
    await FriendPost.updateOne(
      { _id: post._id, 'likes.userId': { $ne: id } },
      { $push: { likes: { userId: id, at: new Date() } } },
    );
  } else {
    await FriendPost.updateOne({ _id: post._id }, { $pull: { likes: { userId: id } } });
  }
  return { ok: true };
}

/** `GET /api/v1/friends/posts/:id/comments`. */
export async function listComments(userId: string, postId: string): Promise<{ comments: FriendPostCommentView[] }> {
  const post = await readablePost(userId, postId);
  const rows = await FriendPostComment.find({ postId: post._id })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean<{ _id: mongoose.Types.ObjectId; postId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; body?: string; createdAt?: Date }[]>();

  const authors = await User.find({ _id: { $in: rows.map((row) => row.userId) } })
    .select(USER_CARD_FIELDS)
    .lean<UserCard[]>();
  const authorById = new Map(authors.map((user) => [String(user._id), user]));

  return {
    comments: rows.map((row) => ({
      id: String(row._id),
      postId: String(row.postId),
      authorId: String(row.userId),
      authorName: authorById.get(String(row.userId))?.name ?? '',
      authorImage: authorById.get(String(row.userId))?.image ?? null,
      body: row.body ?? '',
      createdAt: (row.createdAt ?? new Date()).toISOString(),
    })),
  };
}

/** `POST /api/v1/friends/posts/:id/comments`. */
export async function addComment(userId: string, postId: string, body: unknown): Promise<FriendMutationResponse> {
  const post = await readablePost(userId, postId);
  const text = cleanBody((body as { body?: unknown })?.body, MAX_COMMENT_BODY);
  if (!text) throw new FriendsError('EMPTY_COMMENT', 400, 'Een reactie kan niet leeg zijn.');

  await FriendPostComment.create({ postId: post._id, userId: oid(userId), body: text });
  // Kept beside the comment with `$inc` so the feed query needs no join.
  await FriendPost.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });
  return { ok: true };
}

// ----------------------------------------------------------------- requests

async function requestViews(
  rows: { _id: mongoose.Types.ObjectId; fromUserId: mongoose.Types.ObjectId; toUserId: mongoose.Types.ObjectId; status?: string; source?: string; createdAt?: Date }[],
  otherSide: 'fromUserId' | 'toUserId',
): Promise<FriendRequestView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => String(row[otherSide]));
  const summaries = await summariesFor(ids);
  const byId = new Map(summaries.map((summary) => [summary.userId, summary]));
  return rows
    .map((row) => {
      const user = byId.get(String(row[otherSide]));
      if (!user) return null;
      return {
        id: String(row._id),
        status: (row.status ?? 'pending') as FriendRequestView['status'],
        source: (row.source ?? 'code') as FriendSource,
        createdAt: (row.createdAt ?? new Date()).toISOString(),
        user,
      };
    })
    .filter((view): view is FriendRequestView => view !== null);
}

/** `GET /api/v1/friends/requests`. */
export async function getRequests(userId: string): Promise<FriendRequestsResponse> {
  await connectMongoDB();
  const id = oid(userId);
  const [incomingRows, outgoingRows] = await Promise.all([
    FriendRequest.find({ toUserId: id, status: 'pending' }).sort({ createdAt: -1 }).limit(100).lean(),
    FriendRequest.find({ fromUserId: id, status: 'pending' }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  const [incoming, outgoing] = await Promise.all([
    requestViews(incomingRows as never, 'fromUserId'),
    requestViews(outgoingRows as never, 'toUserId'),
  ]);
  return { incoming, outgoing };
}

/**
 * Resolve who a request is for: a user id, or the invite code from
 * `/api/v1/referral` - so one link and one code serve both "word Pro-vriend"
 * and "word vrienden", and a reader never has to know which is which.
 */
async function resolveTarget(input: { userId?: string; code?: string }): Promise<string> {
  await connectMongoDB();
  if (input.userId && mongoose.isValidObjectId(input.userId)) {
    const found = await User.exists({ _id: oid(input.userId) });
    if (found) return String(input.userId);
  }
  const code = normaliseReferralCode(input.code);
  if (code) {
    const owner = await User.findOne({ referralCode: code }).select('_id').lean<{ _id: mongoose.Types.ObjectId }>();
    if (owner) return String(owner._id);
  }
  throw new FriendsError('NOT_FOUND', 404, 'We konden deze persoon niet vinden.');
}

/**
 * `POST /api/v1/friends/requests`.
 *
 * Accepts at once when the other side already asked - two people inviting each
 * other should become friends, not sit in each other's inbox. A declined or
 * cancelled request is reopened rather than duplicated, which is what the
 * unique index on the ordered pair forces anyway.
 */
export async function sendRequest(
  userId: string,
  body: unknown,
  now = new Date(),
): Promise<FriendMutationResponse & { status?: 'pending' | 'accepted' }> {
  await connectMongoDB();
  const input = (body ?? {}) as { userId?: string; code?: string; source?: FriendSource };
  const targetId = await resolveTarget(input);
  if (targetId === String(userId)) {
    throw new FriendsError('OWN_CODE', 400, 'Dat is je eigen uitnodiging.');
  }

  const blocked = await blockedBetween(userId);
  if (blocked.has(targetId)) throw new FriendsError('BLOCKED', 403, 'Dat kan niet.');

  if (await areFriends(userId, targetId)) return { ok: true, status: 'accepted', message: 'Jullie zijn al vrienden.' };

  const source: FriendSource = input.source === 'contacts' || input.source === 'link' || input.source === 'qr' ? input.source : 'code';

  // They asked first: accept instead of queueing a mirror request.
  const mirrored = await FriendRequest.findOne({ fromUserId: oid(targetId), toUserId: oid(userId), status: 'pending' }).select('_id');
  if (mirrored) {
    await acceptRequest(userId, String(mirrored._id), now);
    return { ok: true, status: 'accepted', message: 'Jullie zijn nu vrienden.' };
  }

  await FriendRequest.updateOne(
    { fromUserId: oid(userId), toUserId: oid(targetId) },
    { $set: { status: 'pending', source, respondedAt: null }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  return { ok: true, status: 'pending', message: 'Verzoek verstuurd.' };
}

/**
 * `POST /api/v1/friends/requests/:id/accept`.
 *
 * The pair document is written with `$setOnInsert` on the ordered pair, so
 * accepting twice - two taps, two devices - produces one vriendschap and no
 * duplicate-key error.
 */
export async function acceptRequest(userId: string, requestId: string, now = new Date()): Promise<FriendMutationResponse> {
  await connectMongoDB();
  if (!mongoose.isValidObjectId(requestId)) throw new FriendsError('NOT_FOUND', 404, 'Verzoek niet gevonden.');

  const request = await FriendRequest.findOne({ _id: oid(requestId), toUserId: oid(userId) }).select('_id fromUserId status source');
  if (!request) throw new FriendsError('NOT_FOUND', 404, 'Verzoek niet gevonden.');
  if (request.status !== 'pending') return { ok: true, message: 'Dit verzoek is al beantwoord.' };

  const [userAId, userBId] = orderPair(String(userId), String(request.fromUserId));
  await Friendship.updateOne(
    { userAId: oid(userAId), userBId: oid(userBId) },
    { $setOnInsert: { userAId: oid(userAId), userBId: oid(userBId), source: request.source ?? 'code', createdAt: now } },
    { upsert: true },
  );
  await FriendRequest.updateOne({ _id: request._id }, { $set: { status: 'accepted', respondedAt: now } });
  return { ok: true, message: 'Jullie zijn nu vrienden.' };
}

/** `POST /api/v1/friends/requests/:id/decline` - or cancel, when it is the caller's own. */
export async function respondRequest(
  userId: string,
  requestId: string,
  action: 'decline' | 'cancel',
  now = new Date(),
): Promise<FriendMutationResponse> {
  await connectMongoDB();
  if (!mongoose.isValidObjectId(requestId)) throw new FriendsError('NOT_FOUND', 404, 'Verzoek niet gevonden.');
  const filter =
    action === 'decline'
      ? { _id: oid(requestId), toUserId: oid(userId) }
      : { _id: oid(requestId), fromUserId: oid(userId) };
  const result = await FriendRequest.updateOne(filter, {
    $set: { status: action === 'decline' ? 'declined' : 'cancelled', respondedAt: now },
  });
  if (result.matchedCount === 0) throw new FriendsError('NOT_FOUND', 404, 'Verzoek niet gevonden.');
  return { ok: true };
}

/** `DELETE /api/v1/friends/:userId` - the one pair document goes. */
export async function removeFriend(userId: string, otherId: string): Promise<FriendMutationResponse> {
  await connectMongoDB();
  if (!mongoose.isValidObjectId(otherId)) throw new FriendsError('NOT_FOUND', 404, 'Niet gevonden.');
  const [userAId, userBId] = orderPair(String(userId), String(otherId));
  await Friendship.deleteOne({ userAId: oid(userAId), userBId: oid(userBId) });
  // The record of who asked goes too, so a later invitation starts clean.
  await FriendRequest.deleteMany({
    $or: [
      { fromUserId: oid(userId), toUserId: oid(otherId) },
      { fromUserId: oid(otherId), toUserId: oid(userId) },
    ],
  });
  return { ok: true };
}

/** `POST /api/v1/friends/:userId/block` - removes the vriendschap as well. */
export async function blockUser(userId: string, otherId: string): Promise<FriendMutationResponse> {
  await connectMongoDB();
  if (!mongoose.isValidObjectId(otherId)) throw new FriendsError('NOT_FOUND', 404, 'Niet gevonden.');
  await removeFriend(userId, otherId);
  await FriendProfile.updateOne(
    { userId: oid(userId) },
    { $addToSet: { blocked: oid(otherId) }, $setOnInsert: { userId: oid(userId) } },
    { upsert: true },
  );
  return { ok: true };
}

// ----------------------------------------------------------------- settings

export async function getSettings(userId: string): Promise<FriendSettings> {
  const profile = await profileFor(userId);
  return {
    discoverable: Boolean(profile?.discoverable),
    autoShare: {
      milestones: profile?.autoShare?.milestones !== false,
      verses: Boolean(profile?.autoShare?.verses),
      notes: Boolean(profile?.autoShare?.notes),
    },
    hasContactHashes: Boolean((profile?.phoneHashes?.length ?? 0) + (profile?.emailHashes?.length ?? 0)),
  };
}

export async function updateSettings(userId: string, body: unknown): Promise<FriendSettings> {
  await connectMongoDB();
  const input = (body ?? {}) as { discoverable?: unknown; autoShare?: Record<string, unknown> };
  const set: Record<string, unknown> = {};
  if (typeof input.discoverable === 'boolean') set.discoverable = input.discoverable;
  for (const key of ['milestones', 'verses', 'notes'] as const) {
    const value = input.autoShare?.[key];
    // `$set` on the named path only - never the whole `autoShare` object, so
    // one switch cannot silently reset the other two.
    if (typeof value === 'boolean') set[`autoShare.${key}`] = value;
  }
  if (Object.keys(set).length > 0) {
    await FriendProfile.updateOne(
      { userId: oid(userId) },
      { $set: set, $setOnInsert: { userId: oid(userId) } },
      { upsert: true },
    );
  }
  return getSettings(userId);
}

// ---------------------------------------------------------------- discovery

/**
 * `POST /api/v1/friends/discovery/hashes` - the caller's OWN identifiers, so
 * others can find them. Hashing happens here, from the raw values the client
 * holds anyway (its own number and e-mail), and sets `discoverable`.
 */
export async function saveOwnHashes(
  userId: string,
  body: unknown,
): Promise<FriendMutationResponse> {
  const pepper = contactPepper();
  if (!pepper) throw new FriendsError('UNAVAILABLE', 503, 'Vrienden vinden via contacten kan nu niet.');
  await connectMongoDB();

  const input = (body ?? {}) as { phone?: unknown; email?: unknown; country?: unknown; discoverable?: unknown };
  const country = typeof input.country === 'string' ? input.country.toUpperCase().slice(0, 2) : 'NL';

  const phoneHashes: string[] = [];
  const emailHashes: string[] = [];
  if (typeof input.phone === 'string') {
    const normalised = normalisePhone(input.phone, country);
    if (normalised) phoneHashes.push(hashIdentifier(normalised, pepper));
  }
  if (typeof input.email === 'string') {
    const normalised = normaliseEmail(input.email);
    if (normalised) emailHashes.push(hashIdentifier(normalised, pepper));
  }

  // The account's own address is hashed too, so "mijn e-mail" needs no extra
  // step from the reader.
  const me = await User.findById(userId).select('email').lean<{ email?: string }>();
  const own = normaliseEmail(me?.email ?? '');
  if (own) {
    const hash = hashIdentifier(own, pepper);
    if (!emailHashes.includes(hash)) emailHashes.push(hash);
  }

  await FriendProfile.updateOne(
    { userId: oid(userId) },
    {
      $set: { discoverable: input.discoverable === false ? false : true },
      $addToSet: { phoneHashes: { $each: phoneHashes }, emailHashes: { $each: emailHashes } },
      $setOnInsert: { userId: oid(userId) },
    },
    { upsert: true },
  );
  return { ok: true };
}

/**
 * `POST /api/v1/friends/discovery/match`.
 *
 * The uploaded hashes are matched and dropped - nothing from someone else's
 * address book is ever written. Only accounts that chose to be findable come
 * back, and only their name and picture.
 */
export async function matchContacts(
  userId: string,
  body: unknown,
): Promise<{ found: FriendSummary[] }> {
  if (!contactPepper()) throw new FriendsError('UNAVAILABLE', 503, 'Vrienden vinden via contacten kan nu niet.');
  await connectMongoDB();

  const input = (body ?? {}) as { phoneHashes?: unknown; emailHashes?: unknown };
  const phoneHashes = sanitiseHashes(input.phoneHashes, MAX_MATCH_HASHES);
  const emailHashes = sanitiseHashes(input.emailHashes, MAX_MATCH_HASHES);
  if (phoneHashes.length === 0 && emailHashes.length === 0) return { found: [] };

  const rows = await FriendProfile.find({
    discoverable: true,
    userId: { $ne: oid(userId) },
    $or: [
      ...(phoneHashes.length > 0 ? [{ phoneHashes: { $in: phoneHashes } }] : []),
      ...(emailHashes.length > 0 ? [{ emailHashes: { $in: emailHashes } }] : []),
    ],
  })
    .select('userId')
    .limit(200)
    .lean<{ userId: mongoose.Types.ObjectId }[]>();

  const [existing, blocked] = await Promise.all([friendIdsFor(userId), blockedBetween(userId)]);
  const already = new Set(existing);
  const ids = rows
    .map((row) => String(row.userId))
    .filter((id) => !already.has(id) && !blocked.has(id));

  return { found: await summariesFor(ids) };
}

/** `DELETE /api/v1/friends/discovery` - forget my hashes, stop being findable. */
export async function forgetDiscovery(userId: string): Promise<FriendMutationResponse> {
  await connectMongoDB();
  await FriendProfile.updateOne(
    { userId: oid(userId) },
    { $set: { discoverable: false, phoneHashes: [], emailHashes: [] } },
  );
  return { ok: true };
}

/**
 * The invite code to put on a link or a QR. The same code `/api/v1/referral`
 * hands out, created on first ask.
 */
export async function inviteCodeFor(userId: string): Promise<string> {
  return ensureReferralCode(userId);
}
