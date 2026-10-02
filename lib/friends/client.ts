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
  FriendRequestBody,
  FriendRequestsResponse,
  FriendSettings,
  FriendSummary,
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

export const friendsClient = {
  feed: (limit?: number) => call<FriendsFeed>(limit ? `/feed?limit=${limit}` : '/feed'),
  markSeen: () => call<FriendMutationResponse>('/feed/seen', post()),

  kring: () => call<FriendsKring>(''),
  removeFriend: (userId: string) => call<FriendMutationResponse>(`/${userId}`, { method: 'DELETE' }),
  block: (userId: string) => call<FriendMutationResponse>(`/${userId}/block`, post()),

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

  settings: () => call<FriendSettings>('/settings'),
  updateSettings: (body: Partial<FriendSettings>) =>
    call<FriendSettings>('/settings', { method: 'PATCH', body: JSON.stringify(body) }),

  /** Contacts are app-only (a browser has no address book), but findability is an account setting. */
  forgetContacts: () => call<FriendMutationResponse>('/discovery', { method: 'DELETE' }),
};

/** "Dag 42 van 365", or null when this person runs no plan. */
export function planLabel(friend: FriendSummary): string | null {
  if (!friend.planDay || !friend.planTotalDays) return null;
  return `Dag ${friend.planDay} van ${friend.planTotalDays}`;
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
