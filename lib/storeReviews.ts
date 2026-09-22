import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import StoreReview from '../models/StoreReview';
import connectMongoDB from './mongodb';
import { APP_STORE_URL, PLAY_STORE_URL } from './appStore';

/**
 * Importing real store reviews so the site can show them.
 *
 * Two halves live here:
 *  - the fetchers, which run once a day from the cron route
 *    (app/api/internal/import-store-reviews) and write into the StoreReview
 *    collection. Vercel's runtime filesystem is read-only, so MongoDB is the
 *    only place an import can put anything.
 *  - the read API at the bottom (`getStoreReviewSummary`,
 *    `getPublicStoreReviews`), which is what a visitor's request actually
 *    touches: two indexed queries with a short in-process cache in front. Per
 *    request CPU is a standing constraint on this project - the cron may be
 *    slow, a page render may not.
 *
 * No new dependency: the App Store Connect JWT is signed with node:crypto.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type StorePlatform = 'ios' | 'android';

/** A review in the shape the StoreReview model stores it. */
export type NormalisedStoreReview = {
  platform: StorePlatform;
  reviewId: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  territory: string | null;
  locale: string | null;
  appVersion: string | null;
  submittedAt: Date;
  /** Store-reported edit time, not our import time. Null when unknown. */
  updatedAt: Date | null;
  developerResponse: { body: string; respondedAt: Date | null } | null;
};

/** What the display layer reads. Intentionally free of moderation fields. */
export type StoreReviewSummary = {
  average: number;
  count: number;
  perStar: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type PublicStoreReview = {
  id: string;
  platform: 'ios' | 'android';
  rating: number;
  title: string;
  body: string;
  author: string;
  submittedAt: string;
  appVersion: string | null;
};

export type PlatformImportResult = {
  platform: StorePlatform;
  source: 'app-store-connect' | 'apple-rss' | 'google-play' | 'none';
  fetched: number;
  created: number;
  updated: number;
  /** Fetched, matched an existing row, and nothing in it had changed. */
  skipped: number;
  /** Set when a platform deliberately did nothing (Android is not shipped). */
  note?: string;
};

export type StoreReviewImportSummary = {
  ok: boolean;
  platforms: PlatformImportResult[];
  /** Non-fatal: one platform failing never stops the other. */
  errors: { platform: string; error: string }[];
  ranAt: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pulled from the one canonical store URL so the id can never drift. */
export const APP_STORE_APP_ID = /\/id(\d+)/.exec(APP_STORE_URL)?.[1] ?? '6800668187';

/**
 * Storefronts the RSS fallback reads. The app is Dutch, so nl/be carry
 * essentially all of it; `us` is where the store URL points and catches the
 * odd expat review. Each one is a separate HTTP round trip, so this list stays
 * short on purpose.
 */
export const RSS_TERRITORIES = ['nl', 'be', 'us'] as const;

/** Apple caps the RSS feed at 10 pages of 50; two is far past what we have. */
const RSS_MAX_PAGES = 2;

const FETCH_TIMEOUT_MS = 10_000;

/** App Store Connect rejects a token older than 20 minutes. */
const ASC_TOKEN_TTL_SECONDS = 15 * 60;

const ASC_PAGE_LIMIT = 200;
/** Hard stop so a runaway `links.next` can never loop forever. */
const ASC_MAX_PAGES = 10;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Apple nests every RSS scalar as `{ label: '…' }`. */
function label(value: unknown): string | null {
  const record = asRecord(value);
  const raw = record?.label;
  return typeof raw === 'string' ? raw : null;
}

function cleanText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`${url.split('?')[0]} responded ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// iOS - Apple's public RSS feed (the credential-free fallback)
// ---------------------------------------------------------------------------

export function appleRssUrl(territory: string, page = 1): string {
  const cc = territory.toLowerCase();
  const pageSegment = page > 1 ? `page=${page}/` : '';
  return `https://itunes.apple.com/${cc}/rss/customerreviews/${pageSegment}id=${APP_STORE_APP_ID}/sortBy=mostRecent/json`;
}

/**
 * Parses one page of Apple's review RSS feed.
 *
 * Three quirks this has to survive, all of them normal responses:
 *  - the FIRST entry is the app itself, not a review: it carries `im:name`
 *    and no `im:rating`. Filtering on a usable rating drops it without
 *    depending on it always being at index 0.
 *  - an app with no reviews in a storefront returns a `feed` with no `entry`
 *    key at all, and a storefront with exactly one review returns `entry` as a
 *    bare object instead of an array.
 *  - every scalar is nested: `im:rating.label`, `im:version.label`,
 *    `author.name.label`.
 */
export function parseAppleRssFeed(payload: unknown, territory: string): NormalisedStoreReview[] {
  const feed = asRecord(asRecord(payload)?.feed);
  if (!feed) return [];

  const raw = feed.entry;
  if (raw === undefined || raw === null) return [];
  const entries = Array.isArray(raw) ? raw : [raw];

  const reviews: NormalisedStoreReview[] = [];
  for (const entry of entries) {
    const review = normaliseAppleRssEntry(entry, territory);
    if (review) reviews.push(review);
  }
  return reviews;
}

export function normaliseAppleRssEntry(
  entry: unknown,
  territory: string,
): NormalisedStoreReview | null {
  const record = asRecord(entry);
  if (!record) return null;

  // No rating => this is the app header entry, not a review.
  const rating = Number(label(record['im:rating']));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;

  const reviewId = cleanText(label(record.id));
  if (!reviewId) return null;

  const authorRecord = asRecord(record.author);
  const submittedAt = parseDate(label(record.updated)) ?? new Date(0);

  return {
    platform: 'ios',
    reviewId,
    rating: Math.round(rating),
    title: cleanText(label(record.title)),
    body: cleanText(label(record.content)),
    author: cleanText(label(authorRecord?.name)),
    territory: territory.toLowerCase(),
    locale: null,
    appVersion: cleanText(label(record['im:version'])) || null,
    submittedAt,
    // The feed only exposes `updated`, which is also the only date it has for a
    // first publish. Treating it as an edit would invent an edit that may never
    // have happened, so the store-side edit time stays unknown here.
    updatedAt: null,
    // The RSS feed never carries developer answers. Null means "not reported",
    // and the upsert keeps whatever the ASC import stored earlier.
    developerResponse: null,
  };
}

async function fetchAppleRssReviews(
  territories: readonly string[] = RSS_TERRITORIES,
): Promise<NormalisedStoreReview[]> {
  // Keyed by reviewId: the same review can appear in more than one storefront
  // feed, and the last write would otherwise fight itself inside one bulkWrite.
  const merged = new Map<string, NormalisedStoreReview>();

  for (const territory of territories) {
    for (let page = 1; page <= RSS_MAX_PAGES; page += 1) {
      let parsed: NormalisedStoreReview[];
      try {
        parsed = parseAppleRssFeed(await fetchJson(appleRssUrl(territory, page)), territory);
      } catch (error) {
        // A single dead storefront must not cost us the others.
        console.warn(
          `[storeReviews] apple rss ${territory} page ${page} failed:`,
          error instanceof Error ? error.message : error,
        );
        break;
      }
      if (parsed.length === 0) break;
      for (const review of parsed) {
        if (!merged.has(review.reviewId)) merged.set(review.reviewId, review);
      }
      if (parsed.length < 45) break; // partial page => last page
    }
  }

  return [...merged.values()];
}

// ---------------------------------------------------------------------------
// iOS - App Store Connect API (the preferred path)
// ---------------------------------------------------------------------------

export type AscCredentials = { keyId: string; issuerId: string; privateKey: string };

/**
 * Reads the ASC credentials from the environment, or null when they are not
 * configured - which is the normal state until someone creates an API key, and
 * the reason the RSS fallback exists.
 */
export function readAscCredentials(
  env: NodeJS.ProcessEnv = process.env,
): AscCredentials | null {
  const keyId = cleanText(env.ASC_KEY_ID);
  const issuerId = cleanText(env.ASC_ISSUER_ID);
  const privateKey = normalisePrivateKey(env.ASC_PRIVATE_KEY);
  if (!keyId || !issuerId || !privateKey) return null;
  return { keyId, issuerId, privateKey };
}

/**
 * A PEM pasted into a Vercel environment variable usually arrives with literal
 * backslash-n instead of real newlines. `createPrivateKey` rejects that, and
 * the error it throws ("error:1E08010C:DECODER routines") says nothing useful,
 * so unescape before anyone has to debug it.
 */
export function normalisePrivateKey(raw: string | undefined | null): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\\r/g, '').replace(/\\n/g, '\n').trim();
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * ECDSA signature conversion, DER (what OpenSSL and therefore `crypto.sign`
 * produce) to the JOSE r||s form JWS requires.
 *
 * DER wraps the two halves as `SEQUENCE { INTEGER r, INTEGER s }`, with each
 * integer minimally encoded: a leading 0x00 is added when the high bit is set
 * (so it is not read as negative), and leading zero bytes are stripped
 * otherwise. JOSE wants the opposite - both halves at exactly the curve size,
 * left-padded with zeros - so a naive `signature.toString('base64url')` yields
 * a token Apple rejects with a 401 and no explanation.
 */
export function derToJose(der: Uint8Array, partSize = 32): Buffer {
  const buf = Buffer.from(der);
  let offset = 0;

  if (buf[offset++] !== 0x30) throw new Error('DER signature: expected a SEQUENCE');

  let seqLength = buf[offset++];
  if (seqLength & 0x80) {
    const lengthBytes = seqLength & 0x7f;
    if (lengthBytes < 1 || lengthBytes > 2) throw new Error('DER signature: bad SEQUENCE length');
    seqLength = 0;
    for (let i = 0; i < lengthBytes; i += 1) seqLength = (seqLength << 8) | buf[offset++];
  }
  if (offset + seqLength !== buf.length) throw new Error('DER signature: length mismatch');

  const readInteger = (): Buffer => {
    if (buf[offset++] !== 0x02) throw new Error('DER signature: expected an INTEGER');
    const length = buf[offset++];
    if (length & 0x80) throw new Error('DER signature: unsupported INTEGER length');
    let value = buf.subarray(offset, offset + length);
    offset += length;
    // Drop the sign padding DER adds; JOSE is unsigned fixed-width.
    let start = 0;
    while (start < value.length - 1 && value[start] === 0x00) start += 1;
    value = value.subarray(start);
    if (value.length > partSize) throw new Error('DER signature: INTEGER larger than the curve');
    return Buffer.concat([Buffer.alloc(partSize - value.length, 0), value]);
  };

  const r = readInteger();
  const s = readInteger();
  return Buffer.concat([r, s]);
}

/**
 * The ES256 bearer token App Store Connect wants, built by hand so this stays
 * dependency-free.
 */
export function buildAppStoreConnectJwt(
  credentials: AscCredentials,
  options: { now?: Date; ttlSeconds?: number } = {},
): string {
  const issuedAt = Math.floor((options.now?.getTime() ?? Date.now()) / 1000);
  const expiresAt = issuedAt + (options.ttlSeconds ?? ASC_TOKEN_TTL_SECONDS);

  const header = base64url(
    JSON.stringify({ alg: 'ES256', kid: credentials.keyId, typ: 'JWT' }),
  );
  const payload = base64url(
    JSON.stringify({
      iss: credentials.issuerId,
      iat: issuedAt,
      exp: expiresAt,
      aud: 'appstoreconnect-v1',
    }),
  );

  const signingInput = `${header}.${payload}`;
  const key = createPrivateKey(credentials.privateKey);
  // Returns DER; JWS needs r||s. See derToJose.
  const der = cryptoSign('sha256', Buffer.from(signingInput), key);
  return `${signingInput}.${base64url(derToJose(der))}`;
}

/**
 * Parses one page of `GET /v1/apps/{id}/customerReviews`.
 *
 * Developer answers arrive as a separate `customerReviewResponses` resource in
 * `included`, linked from `relationships.response`, so they are indexed first
 * and then attached.
 */
export function parseAscCustomerReviews(payload: unknown): NormalisedStoreReview[] {
  const root = asRecord(payload);
  const data = Array.isArray(root?.data) ? root.data : [];

  const responses = new Map<string, { body: string; respondedAt: Date | null }>();
  const included = Array.isArray(root?.included) ? root.included : [];
  for (const item of included) {
    const record = asRecord(item);
    if (!record || record.type !== 'customerReviewResponses') continue;
    const id = typeof record.id === 'string' ? record.id : null;
    const attributes = asRecord(record.attributes);
    if (!id || !attributes) continue;
    responses.set(id, {
      body: cleanText(attributes.responseBody as string),
      respondedAt: parseDate(attributes.lastModifiedDate),
    });
  }

  const reviews: NormalisedStoreReview[] = [];
  for (const item of data) {
    const record = asRecord(item);
    const attributes = asRecord(record?.attributes);
    const reviewId = typeof record?.id === 'string' ? record.id : null;
    if (!record || !attributes || !reviewId) continue;

    const rating = Number(attributes.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;

    const responseId = ((): string | null => {
      const relationship = asRecord(asRecord(record.relationships)?.response);
      const linked = asRecord(relationship?.data);
      return typeof linked?.id === 'string' ? linked.id : null;
    })();

    reviews.push({
      platform: 'ios',
      reviewId,
      rating: Math.round(rating),
      title: cleanText(attributes.title as string),
      body: cleanText(attributes.body as string),
      author: cleanText(attributes.reviewerNickname as string),
      territory:
        typeof attributes.territory === 'string' ? attributes.territory.toLowerCase() : null,
      locale: null,
      appVersion: null,
      submittedAt: parseDate(attributes.createdDate) ?? new Date(0),
      updatedAt: parseDate(attributes.lastModifiedDate),
      developerResponse: responseId ? responses.get(responseId) ?? null : null,
    });
  }

  return reviews;
}

/** Follows `links.next` until Apple stops handing one out. */
async function fetchAscReviews(credentials: AscCredentials): Promise<NormalisedStoreReview[]> {
  const token = buildAppStoreConnectJwt(credentials);
  let url =
    `https://api.appstoreconnect.apple.com/v1/apps/${APP_STORE_APP_ID}/customerReviews` +
    `?limit=${ASC_PAGE_LIMIT}&sort=-createdDate&include=response`;

  const reviews: NormalisedStoreReview[] = [];
  for (let page = 0; page < ASC_MAX_PAGES && url; page += 1) {
    const payload = await fetchJson(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    reviews.push(...parseAscCustomerReviews(payload));
    const next = asRecord(asRecord(payload)?.links)?.next;
    url = typeof next === 'string' ? next : '';
  }
  return reviews;
}

/**
 * App Store Connect when there are credentials, Apple's public RSS feed when
 * there are not. The feed needs nothing configured and works today, which is
 * why it is the fallback rather than an error.
 */
export async function fetchIosReviews(): Promise<{
  source: 'app-store-connect' | 'apple-rss';
  reviews: NormalisedStoreReview[];
}> {
  const credentials = readAscCredentials();
  if (credentials) {
    return { source: 'app-store-connect', reviews: await fetchAscReviews(credentials) };
  }
  return { source: 'apple-rss', reviews: await fetchAppleRssReviews() };
}

// ---------------------------------------------------------------------------
// Android - Google Play Developer API (built, dormant)
// ---------------------------------------------------------------------------

/**
 * The Play package name, derived from the one canonical store URL
 * (`…/store/apps/details?id=<package>`) or from an explicit env override.
 * Null while Android is unshipped.
 */
export function readPlayPackageName(env: NodeJS.ProcessEnv = process.env): string | null {
  const override = cleanText(env.GOOGLE_PLAY_PACKAGE_NAME);
  if (override) return override;
  if (!PLAY_STORE_URL) return null;
  try {
    return new URL(PLAY_STORE_URL).searchParams.get('id');
  } catch {
    return null;
  }
}

type PlayServiceAccount = { client_email: string; private_key: string };

export function parsePlayServiceAccount(raw: string | undefined | null): PlayServiceAccount | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const record = asRecord(parsed);
  const clientEmail = cleanText(record?.client_email as string);
  const privateKey = normalisePrivateKey(record?.private_key as string);
  if (!clientEmail || !privateKey) return null;
  return { client_email: clientEmail, private_key: privateKey };
}

/**
 * Service-account access token, the two-legged OAuth way: a self-signed RS256
 * assertion exchanged for a bearer token. RSA signatures need no DER surgery -
 * that is an ECDSA-only problem - so this one is just base64url.
 */
async function fetchPlayAccessToken(account: PlayServiceAccount): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const claim = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600,
  };
  const signingInput = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(
    JSON.stringify(claim),
  )}`;
  const signature = cryptoSign(
    'sha256',
    Buffer.from(signingInput),
    createPrivateKey(account.private_key),
  );
  const assertion = `${signingInput}.${base64url(signature)}`;

  const payload = asRecord(
    await fetchJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    }),
  );
  const token = typeof payload?.access_token === 'string' ? payload.access_token : '';
  if (!token) throw new Error('Google OAuth returned no access_token');
  return token;
}

/** Parses `GET /androidpublisher/v3/applications/{pkg}/reviews`. */
export function parsePlayReviews(payload: unknown): NormalisedStoreReview[] {
  const root = asRecord(payload);
  const rows = Array.isArray(root?.reviews) ? root.reviews : [];

  const reviews: NormalisedStoreReview[] = [];
  for (const row of rows) {
    const record = asRecord(row);
    const reviewId = typeof record?.reviewId === 'string' ? record.reviewId : null;
    if (!record || !reviewId) continue;

    // `comments` holds the reviewer's comment and, when present, the
    // developer's, each as its own entry.
    const comments = Array.isArray(record.comments) ? record.comments : [];
    const userComment = asRecord(
      comments.map((c) => asRecord(c)?.userComment).find((c) => asRecord(c) !== null),
    );
    if (!userComment) continue;

    const rating = Number(userComment.starRating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;

    const seconds = Number(asRecord(userComment.lastModified)?.seconds);
    const submittedAt = Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date(0);

    const developerComment = asRecord(
      comments.map((c) => asRecord(c)?.developerComment).find((c) => asRecord(c) !== null),
    );
    const developerSeconds = Number(asRecord(developerComment?.lastModified)?.seconds);

    reviews.push({
      platform: 'android',
      reviewId,
      rating: Math.round(rating),
      // Play has no separate title field; the display layer falls back to the body.
      title: '',
      body: cleanText(userComment.text as string),
      author: cleanText(record.authorName as string),
      territory: null,
      locale:
        typeof userComment.reviewerLanguage === 'string' ? userComment.reviewerLanguage : null,
      appVersion:
        typeof userComment.appVersionName === 'string' ? userComment.appVersionName : null,
      submittedAt,
      updatedAt: null,
      developerResponse: developerComment
        ? {
            body: cleanText(developerComment.text as string),
            respondedAt: Number.isFinite(developerSeconds)
              ? new Date(developerSeconds * 1000)
              : null,
          }
        : null,
    });
  }

  return reviews;
}

/**
 * IMPORTANT, and the reason the cron is daily and upserts:
 * `androidpublisher.reviews.list` only returns reviews from the LAST SEVEN
 * DAYS, and only reviews that carry a written comment. It is a rolling window,
 * not an archive. So:
 *  - running less often than weekly loses reviews permanently, because Google
 *    will not hand them back;
 *  - an empty or short response is normal and must never be read as "these
 *    reviews were deleted". The import only ever upserts.
 *
 * Dormant until `PLAY_STORE_URL` is non-null (Android is not shipped). It
 * no-ops quietly rather than throwing or logging an error.
 */
export async function fetchAndroidReviews(): Promise<{
  reviews: NormalisedStoreReview[];
  note?: string;
}> {
  if (!PLAY_STORE_URL) {
    return { reviews: [], note: 'Android is niet uitgebracht; Play-import staat uit.' };
  }
  const packageName = readPlayPackageName();
  if (!packageName) return { reviews: [], note: 'Geen Play-packagenaam geconfigureerd.' };

  const account = parsePlayServiceAccount(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
  if (!account) return { reviews: [], note: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ontbreekt.' };

  const token = await fetchPlayAccessToken(account);
  const payload = await fetchJson(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
      packageName,
    )}/reviews?maxResults=100`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
  );
  return { reviews: parsePlayReviews(payload) };
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

/**
 * Writes reviews by `(platform, reviewId)`, which is the collection's unique
 * index, so a re-import updates instead of duplicating.
 *
 * `hidden` and `featured` are ours, not the store's: they go in `$setOnInsert`
 * so hiding a review by hand survives every later import. Nothing is ever
 * deleted here - see fetchAndroidReviews on why an empty fetch is not a
 * deletion.
 */
export async function upsertStoreReviews(
  reviews: NormalisedStoreReview[],
): Promise<{ created: number; updated: number; skipped: number }> {
  if (reviews.length === 0) return { created: 0, updated: 0, skipped: 0 };

  const now = new Date();
  const operations = reviews.map((review) => {
    const set: Record<string, unknown> = {
      rating: review.rating,
      title: review.title,
      body: review.body,
      author: review.author,
      territory: review.territory,
      locale: review.locale,
      appVersion: review.appVersion,
      submittedAt: review.submittedAt,
      updatedAt: review.updatedAt,
      lastImportedAt: now,
    };
    // A source that does not report developer answers (the RSS feed) must not
    // wipe one a richer source already stored.
    if (review.developerResponse) set.developerResponse = review.developerResponse;

    return {
      updateOne: {
        filter: { platform: review.platform, reviewId: review.reviewId },
        update: {
          $set: set,
          $setOnInsert: {
            platform: review.platform,
            reviewId: review.reviewId,
            hidden: false,
            featured: false,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await StoreReview.bulkWrite(operations, { ordered: false });
  const created = result.upsertedCount ?? 0;
  const matched = result.matchedCount ?? 0;
  const updated = result.modifiedCount ?? 0;
  return { created, updated, skipped: Math.max(0, matched - updated) };
}

/**
 * The whole import, both platforms. One platform throwing is recorded and does
 * not stop the other; the caller decides what to do with `errors`.
 */
export async function importStoreReviews(): Promise<StoreReviewImportSummary> {
  const platforms: PlatformImportResult[] = [];
  const errors: { platform: string; error: string }[] = [];

  try {
    const { source, reviews } = await fetchIosReviews();
    const counts = await upsertStoreReviews(reviews);
    platforms.push({ platform: 'ios', source, fetched: reviews.length, ...counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[storeReviews] ios import failed:', message);
    errors.push({ platform: 'ios', error: message });
    platforms.push({
      platform: 'ios',
      source: 'none',
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    });
  }

  try {
    const { reviews, note } = await fetchAndroidReviews();
    const counts = await upsertStoreReviews(reviews);
    platforms.push({
      platform: 'android',
      source: note ? 'none' : 'google-play',
      fetched: reviews.length,
      ...counts,
      ...(note ? { note } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[storeReviews] android import failed:', message);
    errors.push({ platform: 'android', error: message });
    platforms.push({
      platform: 'android',
      source: 'none',
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    });
  }

  // Fresh numbers on the next page render rather than up to 10 minutes of the
  // pre-import ones.
  clearStoreReviewCache();

  return { ok: errors.length === 0, platforms, errors, ranAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Read API (what the display layer calls)
// ---------------------------------------------------------------------------

/**
 * A small in-process cache. Not correctness, just CPU: Vercel Hobby's Fluid
 * Active CPU is near its cap, and the numbers move at most once a day.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

export function clearStoreReviewCache(): void {
  cache.clear();
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

const EMPTY_PER_STAR: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/**
 * Turns `{rating: count}` rows into the public summary. Exported so the
 * arithmetic is testable without a database.
 *
 * Returns null at zero reviews so the UI can render nothing at all, rather
 * than a 0,0 out of 5 that looks like a bad app.
 */
export function summariseRatingCounts(
  rows: { rating: number; count: number }[],
): StoreReviewSummary | null {
  const perStar: Record<1 | 2 | 3 | 4 | 5, number> = { ...EMPTY_PER_STAR };
  let count = 0;
  let total = 0;

  for (const row of rows) {
    const rating = Math.round(Number(row.rating));
    const rowCount = Number(row.count);
    if (!Number.isFinite(rowCount) || rowCount <= 0) continue;
    if (rating < 1 || rating > 5) continue;
    perStar[rating as 1 | 2 | 3 | 4 | 5] += rowCount;
    count += rowCount;
    total += rating * rowCount;
  }

  if (count === 0) return null;
  // Two decimals: enough for "4,67", short of pretending to a precision the
  // sample does not have. Never rounded up.
  return { average: Math.round((total / count) * 100) / 100, count, perStar };
}

/**
 * The rating shown next to the app, over EVERY imported review.
 *
 * Deliberately unfiltered: no `hidden`, no minimum rating, no platform filter.
 * A displayed average has to be the real one - Apple's marketing guidelines
 * require any rating we show to match the store, and a 4,9 computed by leaving
 * out the 1-star reviews is a false claim about the product, not a design
 * choice. `getPublicStoreReviews` may filter WHICH reviews are quoted; the
 * number underneath them may not. Do not add a $match here.
 */
export async function getStoreReviewSummary(): Promise<StoreReviewSummary | null> {
  return cached('summary', async () => {
    try {
      const connection = await connectMongoDB();
      if (!connection) return null;
      const rows = (await StoreReview.aggregate([
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ])) as { _id: number; count: number }[];
      return summariseRatingCounts(rows.map((row) => ({ rating: row._id, count: row.count })));
    } catch (error) {
      console.error('[storeReviews] summary failed:', error);
      return null;
    }
  });
}

/**
 * The reviews that are actually quoted on the page.
 *
 * This one IS filtered - hidden reviews are moderation, and a `minRating` lets
 * a testimonial block ask for the good ones - which is exactly why the summary
 * above is not.
 */
export async function getPublicStoreReviews(
  opts: { minRating?: number; limit?: number } = {},
): Promise<PublicStoreReview[]> {
  const minRating = Math.min(5, Math.max(1, Math.round(opts.minRating ?? 1)));
  const limit = Math.min(50, Math.max(1, Math.round(opts.limit ?? 12)));

  return cached(`list:${minRating}:${limit}`, async () => {
    try {
      const connection = await connectMongoDB();
      if (!connection) return [];
      const rows = (await StoreReview.find({ hidden: false, rating: { $gte: minRating } })
        .sort({ featured: -1, submittedAt: -1 })
        .limit(limit)
        .lean()) as unknown as Array<{
        _id: unknown;
        platform: StorePlatform;
        rating: number;
        title?: string;
        body?: string;
        author?: string;
        submittedAt?: Date | string;
        appVersion?: string | null;
      }>;

      return rows.map((row) => ({
        id: String(row._id),
        platform: row.platform,
        rating: row.rating,
        title: row.title ?? '',
        body: row.body ?? '',
        author: row.author ?? '',
        submittedAt: new Date(row.submittedAt ?? 0).toISOString(),
        appVersion: row.appVersion ?? null,
      }));
    } catch (error) {
      console.error('[storeReviews] list failed:', error);
      return [];
    }
  });
}
