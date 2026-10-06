/**
 * Browser client for Vriendenkring (app/api/v1/friends/**), typed against
 * lib/friends/types.ts. Cookie auth, so every call sends credentials.
 *
 * Nothing throws: each call resolves to a result the UI can branch on, with
 * 401 as its own kind so a signed-out visitor is handled gently rather than as
 * an error. Same shape as lib/bibleYear/client.ts, deliberately - one less
 * thing to learn when reading either.
 */

import type {
  FriendMutationResponse,
  FriendPostBody,
  FriendPostComment,
  FriendProfileView,
  FriendReportBody,
  FriendRequestBody,
  FriendRequestsResponse,
  FriendSettings,
  FriendSuggestionsResponse,
  FriendSummary,
  FriendsDiscover,
  FriendsFeed,
  FriendsKring,
} from './types';

export type FriendsErrorKind = 'unauthorized' | 'not_found' | 'rate_limited' | 'unavailable' | 'server' | 'network';

export type FriendsResult<T> =
  | { ok: true; data: T; kind?: undefined; message?: undefined }
  | { ok: false; data?: undefined; kind: FriendsErrorKind; status: number; message: string };

const BASE = '/api/v1/friends';

const MESSAGES: Record<FriendsErrorKind, string> = {
  unauthorized: 'Log in om je vriendenkring te zien.',
  not_found: 'Dat is niet gevonden.',
  rate_limited: 'Even wachten, en dan opnieuw.',
  unavailable: 'Dit kan nu niet.',
  server: 'Dat lukte niet. Probeer het zo nog eens.',
  network: 'Geen verbinding. Probeer het zo nog eens.',
};

function kindFor(status: number): FriendsErrorKind {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'unavailable';
  return 'server';
}

async function call<T>(path: string, init?: RequestInit): Promise<FriendsResult<T>> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      credentials: 'same-origin',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    });
    if (!response.ok) {
      const kind = kindFor(response.status);
      let message = MESSAGES[kind];
      try {
        const body = await response.json();
        if (body && typeof body.message === 'string' && body.message !== body.error) message = body.message;
      } catch {
        // An error body that is not JSON: the generic message stands.
      }
      return { ok: false, kind, status: response.status, message };
    }
    // A 204 or an empty body is a success with nothing to read.
    const text = await response.text();
    return { ok: true, data: (text ? JSON.parse(text) : {}) as T };
  } catch {
    return { ok: false, kind: 'network', status: 0, message: MESSAGES.network };
  }
}

const post = (body?: unknown) =>
  ({ method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }) satisfies RequestInit;

/**
 * What `GET /feed` takes. `before` is a cursor, not a filter: the ISO
 * `createdAt` of the oldest post already on screen, so the next page starts
 * one post further down. The route reads both (app/api/v1/friends/feed).
 */
export type FeedQuery = { limit?: number; before?: string | null };

/**
 * What `PATCH /settings` takes. One switch at a time, including inside
 * `autoShare`: the service `$set`s each named path on its own, so sending the
 * other two switches back could only overwrite a change made on the phone a
 * moment ago. `Partial<FriendSettings>` cannot say that - it would demand all
 * three members of `autoShare` - hence a patch type of its own.
 */
export type FriendSettingsPatch = {
  discoverable?: boolean;
  publicPosts?: boolean;
  autoShare?: Partial<FriendSettings['autoShare']>;
};

/**
 * What `GET /discover` takes: the feed query plus the chip.
 *
 * `kind` is the storage value, not the Dutch label on the chip - 'verse', not
 * 'Verzen' - so a wording change on the Ontdek tab is not an API change.
 * Absent, or 'alles', is no filter at all.
 */
export type DiscoverQuery = FeedQuery & { kind?: string | null };

/**
 * `?limit=&before=`, with only the parts that were asked for.
 *
 * A bare number is still accepted: `feed()` took a limit before `before`
 * existed, and callers that only want "the first n" should not have to be
 * rewritten to say `{ limit: n }`.
 */
export function feedQuery(query: FeedQuery | number = {}): string {
  const { limit, before } = typeof query === 'number' ? { limit: query, before: null } : query;
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (before) params.set('before', before);
  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * The cursor for the page after these posts: the oldest post's `createdAt`.
 *
 * Null for an empty page, which is also the only honest answer - there is
 * nothing to page past. The feed is sorted newest first, so the last row is
 * the oldest; it is read off the row rather than tracked separately so a
 * refetch can never leave the cursor pointing at a post that is gone.
 */
/**
 * `?limit=&before=&kind=` for the Ontdek tab.
 *
 * Built on `feedQuery` so the two feeds can never page differently, with the
 * chip appended last. 'alles' is dropped rather than sent: the server treats
 * an unknown kind as no filter, but a query string that says "alles" invites a
 * reader of the code to look for a kind by that name.
 */
export function discoverQuery(query: DiscoverQuery = {}): string {
  const base = feedQuery({ limit: query.limit, before: query.before });
  const kind = query.kind && query.kind !== 'alles' ? query.kind : null;
  if (!kind) return base;
  return `${base ? `${base}&` : '?'}kind=${encodeURIComponent(kind)}`;
}

export function feedCursor(posts: readonly { createdAt: string }[]): string | null {
  const last = posts.length > 0 ? posts[posts.length - 1] : null;
  return last?.createdAt ?? null;
}

export const friendsClient = {
  feed: (query?: FeedQuery | number) => call<FriendsFeed>(`/feed${feedQuery(query)}`),
  markSeen: () => call<FriendMutationResponse>('/feed/seen', post()),

  /** The Ontdek tab: public posts from outside the kring, plus the week's top verses. */
  discover: (query?: DiscoverQuery) => call<FriendsDiscover>(`/discover${discoverQuery(query)}`),

  kring: () => call<FriendsKring>(''),
  removeFriend: (userId: string) => call<FriendMutationResponse>(`/${userId}`, { method: 'DELETE' }),
  block: (userId: string) => call<FriendMutationResponse>(`/${userId}/block`, post()),

  /** One person's profile. A 404 means "not yours to see", not "does not exist". */
  profile: (userId: string) => call<FriendProfileView>(`/${userId}`),
  /** "Mensen die je misschien kent" - friends of friends, most shared first. */
  suggestions: () => call<FriendSuggestionsResponse>('/suggestions'),
  /**
   * Undo a block. The blocked list itself rides along on `settings()`
   * (`FriendSettings.blocked`), so there is nothing to fetch for it.
   *
   * The REST inverse of the POST above rather than a second contract - the
   * same pairing `removeFriend` already uses on `/:userId`. It does NOT bring
   * the vriendschap back: blocking deleted the pair document, so the two have
   * to invite each other again.
   */
  unblock: (userId: string) => call<FriendMutationResponse>(`/${userId}/block`, { method: 'DELETE' }),

  requests: () => call<FriendRequestsResponse>('/requests'),
  invite: (body: FriendRequestBody) => call<FriendMutationResponse>('/requests', post(body)),
  accept: (id: string) => call<FriendMutationResponse>(`/requests/${id}/accept`, post()),
  decline: (id: string) => call<FriendMutationResponse>(`/requests/${id}/decline`, post()),
  cancel: (id: string) => call<FriendMutationResponse>(`/requests/${id}/cancel`, post()),

  share: (body: FriendPostBody) => call<{ post: FriendsFeed['posts'][number] }>('/posts', post(body)),
  like: (postId: string, liked: boolean) =>
    call<FriendMutationResponse>(`/posts/${postId}/like`, liked ? post() : { method: 'DELETE' }),
  comments: (postId: string) => call<{ comments: FriendPostComment[] }>(`/posts/${postId}/comments`),
  comment: (postId: string, body: string) =>
    call<FriendMutationResponse>(`/posts/${postId}/comments`, post({ body })),
  report: (postId: string, body: FriendReportBody) =>
    call<FriendMutationResponse>(`/posts/${postId}/report`, post(body)),

  settings: () => call<FriendSettings>('/settings'),
  updateSettings: (body: FriendSettingsPatch) =>
    call<FriendSettings>('/settings', { method: 'PATCH', body: JSON.stringify(body) }),

  /** Contacts are app-only (a browser has no address book), but findability is an account setting. */
  forgetContacts: () => call<FriendMutationResponse>('/discovery', { method: 'DELETE' }),
};

/**
 * Whether `/gebruiker/<id>` exists for this person.
 *
 * That page is opt-in and answers a hard 404 for anyone who did not switch
 * "Openbaar profiel" on - deliberately, so it never confirms an account. A
 * kring row therefore may only become a link when the server has said the
 * page is there.
 *
 * `FriendSummary.publicProfile` is that signal, served by `summariesFor` in
 * lib/friends/service.ts from the same two stored fields the page reads. It is
 * optional there, so it stays optional here: absent means "the server did not
 * say", which answers the same as "opted out".
 *
 * Still declared as its own type rather than taken from `FriendSummary`,
 * because a feed post carries its author under `authorId` and is not a
 * summary - `authorHref` below reads the flag off a post.
 */
export type PublicProfileFlag = { publicProfile?: boolean };

/**
 * `/gebruiker/<id>`, or null when linking there would land on a 404.
 *
 * Null is the answer both for "opted out" and for "the server did not say",
 * because a link that 404s is worse than a name that is not a link.
 */
export function profileHref(person: { userId: string } & PublicProfileFlag): string | null {
  if (person.publicProfile !== true) return null;
  return `/gebruiker/${encodeURIComponent(person.userId)}`;
}

/** The same, for a feed post - its author is identified by `authorId`. */
export function authorHref(post: { authorId: string } & PublicProfileFlag): string | null {
  return profileHref({ userId: post.authorId, publicProfile: post.publicProfile });
}

/**
 * `/vriendenkring/<id>` - the in-app profile, and the link every kring row and
 * every feed byline points at.
 *
 * Unconditional on purpose, which is the difference from `profileHref`: that
 * page is built on `GET /api/v1/friends/:userId`, so it answers for anyone the
 * reader is allowed to look at and 404s for exactly the people they are not -
 * a block either way, a deleted account, their own id. There is no opt-in to
 * wait for, so a name is always a link.
 *
 * `/gebruiker/<id>` is still a page, and still opt-in: the profile links on to
 * it when `publicProfile` says it is there (`profileHref`).
 */
export function kringProfileHref(userId: string): string {
  return `/vriendenkring/${encodeURIComponent(userId)}`;
}

/**
 * What a profile should do with `FriendProfileView.friends`.
 *
 * The one place the `null` / `[]` distinction is decided, so no renderer has
 * to get it right twice:
 *
 * - `null` is "not yours to see" - the caller is not a friend - and the whole
 *   section is `hidden`. An empty-list state there would read as "they have no
 *   friends", which is a claim the server never made and the UI must not;
 * - `[]` is a friend whose only friend is the reader (their kring comes back
 *   with the reader filtered out), which is true, is theirs to know, and gets
 *   the `empty` line;
 * - anything else is the `list`.
 */
export function theirKringState(friends: readonly unknown[] | null | undefined): 'hidden' | 'empty' | 'list' {
  if (friends == null) return 'hidden';
  return friends.length === 0 ? 'empty' : 'list';
}

/** "Dag 42 van 365", or null when this person runs no plan. */
export function planLabel(friend: FriendSummary): string | null {
  if (!friend.planDay || !friend.planTotalDays) return null;
  return `Dag ${friend.planDay} van ${friend.planTotalDays}`;
}

/**
 * "3 gezamenlijke vrienden", or null when there are none to mention.
 *
 * `mutualCount` is optional on `FriendSummary`, and an absent count is
 * unknown, not zero - the kring list does not compute it. Both cases return
 * null, so a renderer cannot accidentally print "0 gezamenlijke vrienden".
 */
export function mutualLabel(friend: Pick<FriendSummary, 'mutualCount'>): string | null {
  const count = friend.mutualCount;
  if (typeof count !== 'number' || count < 1) return null;
  return count === 1 ? '1 gezamenlijke vriend' : `${count} gezamenlijke vrienden`;
}

const MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

/**
 * How long ago a post landed, as a feed writes it: "nu", "12 min", "3 u",
 * "gisteren", then the date. The same rules as the app's `friendPostWhen`, so
 * one post does not read differently on the two clients.
 */
export function postWhen(iso: string, now: Date = new Date()): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  const minutes = Math.floor((now.getTime() - when.getTime()) / 60000);
  if (minutes < 1) return 'nu';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} u`;
  const days = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(when.getFullYear(), when.getMonth(), when.getDate())) /
      86_400_000,
  );
  if (days <= 1) return 'gisteren';
  if (days < 7) return `${days} dagen`;
  return `${when.getDate()} ${MONTHS[when.getMonth()]}`;
}

export const POST_KIND_LABELS: Record<string, string> = {
  verse: 'Tekst van de dag',
  milestone: 'Mijlpaal',
  note: 'Notitie',
};
