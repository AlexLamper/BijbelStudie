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
  /**
   * Did this person read something today, in Amsterdam time? The green dot on
   * a kring row, and nothing more precise than that on purpose: a kring shows
   * that somebody is reading along, never when they were last online.
   *
   * Additive and optional like `mutualCount`: absent is "the server did not
   * say", which renders as no dot - the quiet answer.
   */
  activeToday?: boolean;
  /** "Dag 42 van 365" is built client-side from these two. */
  planDay: number | null;
  planTotalDays: number | null;
  friendsSince: string | null;
  /**
   * Friends this person and the reader have in common.
   *
   * Additive and optional on purpose: the kring list does not pay for it, the
   * suggestions list and a friend's profile do. A client that does not know
   * the field, or a row that was built without it, must read as "unknown",
   * never as "0 gezamenlijke vrienden" - so renderers check for `undefined`
   * before showing the line.
   */
  mutualCount?: number;
  /**
   * Whether `/gebruiker/<userId>` - this person's public tree - exists.
   *
   * `levensboom.publicProfile` on, "Boom tonen" not off: the exact condition
   * app/gebruiker/[id]/page.tsx applies before it 404s, read from the same
   * two stored fields so the flag and the page can never disagree.
   *
   * Optional and additive like `mutualCount`: a client that does not know the
   * field, or an older build of one, reads it as "no public page" and simply
   * does not link there - which is the safe answer, since a link that 404s is
   * worse than a name that is not a link.
   */
  publicProfile?: boolean;
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
  /**
   * The note id, daytext date or milestone key the post was made from -
   * `models/FriendPost.js` has always stored it, the wire never carried it.
   *
   * Additive and optional, the rule `mutualCount` set: a client that does not
   * know the field simply renders the post by its `kind`, which is what every
   * build before this one did. The web feed reads it for one thing only: a
   * milestone keyed `study:<id>` is a finished study, and gets the row with the
   * artwork plate and a way in to `/studie/<id>` instead of a flat sentence.
   * Nothing is resolved from it - a post is a copy (see the model) - so a
   * `sourceId` whose study no longer exists costs a dead link, never a render.
   */
  sourceId?: string | null;
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

/**
 * `GET /api/v1/friends/:userId` - one person's profile.
 *
 * The owner asked for what YouVersion does, which reverses the plan's §11
 * question 1: a vriendschap IS visible to the kring. What is visible to whom
 * is still graded, and the grading lives in the service, not in a client:
 *
 * - anyone who is not blocked sees the card, `friendCount`, `mutualCount` and
 *   the `mutuals` themselves (those are the reader's OWN friends, so no name
 *   reaches them that they could not already see in their kring);
 * - `streak`, `planDay`, `friendsSince` and the full `friends` list are for an
 *   actual friend only. `friends` is `null` otherwise, not an empty array, so
 *   "they have nobody" and "you may not look" cannot be confused.
 */
export type FriendProfileView = {
  user: FriendSummary;
  isFriend: boolean;
  /** How many people are in their kring. A count is public; the list is not. */
  friendCount: number;
  /** The shared friends, named. Capped; `mutualCount` is the true total. */
  mutuals: FriendSummary[];
  mutualCount: number;
  /** Their kring, for a friend. `null` means "not yours to see". */
  friends: FriendSummary[] | null;
};

/**
 * One post on the Ontdek tab.
 *
 * `canInvite` is the server's answer to "may this reader still ask the writer
 * to be friends", and it is the only thing the "Toevoegen als vriend" link is
 * allowed to depend on: false covers an existing vriendschap, a request in
 * flight either direction, and the reader's own post. A client must not try to
 * work that out from the lists it happens to have loaded.
 */
export type DiscoverPost = FriendPost & { canInvite: boolean };

/**
 * One row of "Veel gedeeld deze week".
 *
 * `preview` is the opening of the most recently shared copy of that verse, and
 * it only ever comes from a post whose writer publishes to Ontdek - the same
 * gate the feed above it uses, so the list can never quote a kring-only post.
 */
export type TrendingShare = {
  reference: string;
  /** The start of the verse, already cut to length by the server. */
  preview: string;
  /** How often it was shared in the window. */
  shareCount: number;
};

/**
 * `GET /api/v1/friends/discover?limit=&before=&kind=`.
 *
 * Only writers who switched "Openbaar delen" on appear here
 * (`FriendProfile.publicPosts`, off until set). `trending` rides along rather
 * than taking its own call: both halves of the Ontdek tab read the same window
 * of the same collection, and a second round trip for four lines buys nothing.
 * It is sent with the first page only - paging the feed must not re-send it.
 */
export type FriendsDiscover = {
  posts: DiscoverPost[];
  trending: TrendingShare[];
};

/** `GET /api/v1/friends/suggestions` - "Mensen die je misschien kent". */
export type FriendSuggestionsResponse = {
  /** Friends of friends, most shared friends first. `mutualCount` is always set. */
  suggestions: FriendSummary[];
};

/** One row in the blocked list, which is all a client needs to unblock. */
export type BlockedUser = {
  userId: string;
  name: string;
  image: string | null;
};

/**
 * Why something was reported. Storage values, not copy: the Dutch labels live
 * in the clients, so a wording change is not a data migration.
 */
export type ReportReason = 'spam' | 'inappropriate' | 'hate' | 'harassment' | 'misinformation' | 'other';

export const REPORT_REASONS: readonly ReportReason[] = [
  'spam',
  'inappropriate',
  'hate',
  'harassment',
  'misinformation',
  'other',
];

/**
 * `POST /api/v1/friends/posts/:id/report`. With `commentId` the report is
 * about that comment rather than the post it hangs under.
 */
export type FriendReportBody = {
  reason: ReportReason;
  note?: string;
  commentId?: string;
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
  /**
   * May what the reader shares also appear on Ontdek, to people who are not in
   * their kring? Off until explicitly set, and deliberately NOT the same thing
   * as `discoverable`, which is only about being found by a contact hash.
   *
   * Optional and additive: a client that predates the switch, or a deployed
   * API that does, reads it as absent, and absent must render as off - the
   * safe answer for a publishing permission.
   */
  publicPosts?: boolean;
  autoShare: { milestones: boolean; verses: boolean; notes: boolean };
  /** Whether contact hashes are on file, so the client can offer "vergeten". */
  hasContactHashes: boolean;
  /**
   * Who the reader blocked, with enough to render a row and undo it. On the
   * settings response rather than its own endpoint: blocking is a setting, the
   * list belongs on the screen that holds the other switches, and an extra
   * round trip for a list that is nearly always empty buys nothing.
   */
  blocked: BlockedUser[];
};
