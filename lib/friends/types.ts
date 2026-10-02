/**
 * Wire shapes for Vriendenkring.
 *
 * No database imports, so client components can `import type` these. This file
 * is the contract shared by the service (lib/friends/service.ts), the API
 * (app/api/v1/friends/**), the web UI (components/friends/*) and the Flutter
 * app (features/friends/). Change it only in the same pass as all of them -
 * the same rule lib/bibleYear/types.ts carries. See VRIENDENKRING_PLAN.md.
 */

/** What one post in the feed is about. An unknown kind renders as a note. */
export type FriendPostKind = 'verse' | 'milestone' | 'note';

/** How a vriendschap or a request came about. */
export type FriendSource = 'contacts' | 'code' | 'link' | 'qr';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

/** A person, as any list shows them. Never an e-mail: a kring is not a directory. */
export type FriendSummary = {
  userId: string;
  name: string;
  image: string | null;
  /** Days in a row, for the row's flame. 0 when they have none. */
  streak: number;
  /** "Dag 42 van 365" is built client-side from these two. */
  planDay: number | null;
  planTotalDays: number | null;
  friendsSince: string | null;
};

export type FriendPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  kind: FriendPostKind;
  /** ISO 8601, UTC. */
  createdAt: string;
  reference: string | null;
  body: string;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export type FriendPostComment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  body: string;
  createdAt: string;
};

/**
 * `GET /api/v1/friends/feed`.
 *
 * `hasFriends` is its own field rather than `posts.length > 0`: a reader whose
 * friends have posted nothing gets the quiet empty feed, not the invitation.
 */
export type FriendsFeed = {
  posts: FriendPost[];
  /** Posts since `feedSeenAt`. Drives the badge on the Start tab. */
  newActivityCount: number;
  hasFriends: boolean;
};

/** `GET /api/v1/friends`. */
export type FriendsKring = {
  friends: FriendSummary[];
  /** So a client can show one number without a second call. */
  pendingIncoming: number;
};

export type FriendRequestView = {
  id: string;
  status: FriendRequestStatus;
  source: FriendSource;
  createdAt: string;
  /** The other person - the sender for an incoming request, the recipient for an outgoing one. */
  user: FriendSummary;
};

/** `GET /api/v1/friends/requests`. */
export type FriendRequestsResponse = {
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
};

/** `POST /api/v1/friends/requests` - by id, or by the invite code from /referral. */
export type FriendRequestBody = {
  userId?: string;
  code?: string;
  source?: FriendSource;
};

/** `POST /api/v1/friends/posts`. */
export type FriendPostBody = {
  kind: FriendPostKind;
  body: string;
  reference?: string;
  sourceId?: string;
};

/** What every mutation answers, so a client can branch without a refetch. */
export type FriendMutationResponse = {
  ok: boolean;
  /** Dutch, user-facing, when there is something to say. */
  message?: string;
};

/** The reader's own Vriendenkring settings. */
export type FriendSettings = {
  discoverable: boolean;
  autoShare: { milestones: boolean; verses: boolean; notes: boolean };
  /** Whether contact hashes are on file, so the client can offer "vergeten". */
  hasContactHashes: boolean;
};
