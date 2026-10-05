import http2 from 'node:http2';
import { SignJWT, importPKCS8, type KeyLike } from 'jose';

/**
 * Apple Push Notification service, spoken to directly.
 *
 * WHY THERE IS NO SDK AND NO FIREBASE HERE. The owner rejected Firebase, so
 * there is no FCM in this product: iOS talks to APNs from this server and
 * Android gets no push at all (it polls `GET /api/v1/notifications/social` on
 * foreground and raises its own local notification). That leaves one real
 * constraint, and it is the thing that decides the shape of this file:
 *
 * **APNs is HTTP/2 only.** Node's global `fetch` is undici, which speaks HTTP/1.1
 * and will not negotiate h2 to api.push.apple.com - a `fetch()` here does not
 * "work slowly", it fails. So this module uses `node:http2` directly, which in
 * turn means every route that can reach it must declare
 * `export const runtime = 'nodejs'`: the Edge runtime has no `node:http2` at
 * all, and the failure would be a build-time module resolution error on the
 * route, not something you could catch here.
 *
 * ONE SESSION PER SEND, DELIBERATELY. A long-lived h2 session to Apple is the
 * right design on a server you own, and the wrong one on Vercel: a lambda is
 * frozen the moment the response is flushed and may never be thawed, so a
 * pooled session is a socket that Apple keeps open against an instance that
 * will never speak again, and a `GOAWAY` that arrives while the instance is
 * frozen is processed - if ever - against a session the next request is already
 * trying to reuse. Per-send is a TLS handshake we pay for honestly (tens of
 * milliseconds, on a path nobody is waiting for) in exchange for never leaking
 * a socket across an invocation boundary. `sendApnsNotification` therefore
 * opens, sends and closes in one call, and the close is in a `finally`.
 *
 * WHAT IS CACHED IS THE JWT, NOT THE CONNECTION. Apple accepts a provider
 * token for an hour and explicitly asks providers not to mint one per push, so
 * the signed token lives in module scope and is reused for 50 minutes. On a
 * warm instance that is one ES256 signature per 50 minutes instead of one per
 * notification.
 *
 * ABSENT CONFIG IS NOT AN ERROR. Exactly like `contactPepper()` in
 * lib/friends/discovery.ts, a missing key means the feature is off: every entry
 * point answers "not configured" and nothing throws, 500s or logs a stack. A
 * dev shell that never set an APNs key must still be able to like a post.
 */

export type ApnsEnvironment = 'sandbox' | 'production';

export type ApnsConfig = {
  keyId: string;
  teamId: string;
  bundleId: string;
  /** The .p8 contents, PKCS#8 PEM, with real newlines. */
  p8: string;
  environment: ApnsEnvironment;
  /** The host that matches `environment`. A token is valid against one only. */
  host: string;
};

const SANDBOX_HOST = 'https://api.sandbox.push.apple.com';
const PRODUCTION_HOST = 'https://api.push.apple.com';

/** Apple's ceiling is 1 hour; refresh well inside it rather than on the edge. */
const TOKEN_TTL_SECONDS = 60 * 60;
const TOKEN_REUSE_MS = 50 * 60 * 1000;

/** A send that has not answered by now is not going to. */
const SEND_TIMEOUT_MS = 10_000;

/**
 * Vercel environment variables are single-line, so a PEM has to survive being
 * pasted as one. Both spellings are accepted: a genuine multi-line value (the
 * dashboard's textarea allows it) and one where the newlines were written as
 * the two characters `\` and `n`.
 */
export function normalisePem(raw: string): string {
  return raw.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
}

function envValue(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The APNs configuration, or null when this deployment has no push key.
 *
 * Read on every call rather than captured at module load: a test sets the vars
 * and clears them again, and a captured copy would make the first test that
 * ran decide the answer for all the others.
 */
export function apnsConfig(): ApnsConfig | null {
  const keyId = envValue('APNS_KEY_ID');
  const teamId = envValue('APNS_TEAM_ID');
  const bundleId = envValue('APNS_BUNDLE_ID');
  const rawKey = envValue('APNS_P8');
  if (!keyId || !teamId || !bundleId || !rawKey) return null;

  const p8 = normalisePem(rawKey);
  // A value that is not a PKCS#8 PEM cannot be a .p8, and failing here is far
  // kinder than failing inside `importPKCS8` on the first notification of the
  // day. Treated as "not configured", which is the off-state, not a crash.
  if (!p8.includes('BEGIN PRIVATE KEY')) return null;

  const environment: ApnsEnvironment =
    envValue('APNS_ENV') === 'sandbox' ? 'sandbox' : 'production';

  return {
    keyId,
    teamId,
    bundleId,
    p8,
    environment,
    host: environment === 'sandbox' ? SANDBOX_HOST : PRODUCTION_HOST,
  };
}

/** Whether push can be sent at all. The one check callers should branch on. */
export function isApnsConfigured(): boolean {
  return apnsConfig() !== null;
}

type TokenCache = { fingerprint: string; token: string; signedAt: number };

let tokenCache: TokenCache | null = null;
let keyCache: { pem: string; key: KeyLike | Uint8Array } | null = null;

/**
 * Drops the cached provider token and signing key.
 *
 * Exported for two real callers, not as a test seam alone: a 403
 * `ExpiredProviderToken` means the cached token is no longer accepted and the
 * next send must re-sign, and the vitest suite needs each case to start from a
 * cold cache.
 */
export function resetApnsAuthCache(): void {
  tokenCache = null;
  keyCache = null;
}

async function signingKey(p8: string): Promise<KeyLike | Uint8Array> {
  if (keyCache && keyCache.pem === p8) return keyCache.key;
  const key = await importPKCS8(p8, 'ES256');
  keyCache = { pem: p8, key };
  return key;
}

/**
 * The provider token, signed at most once every 50 minutes per key.
 *
 * ES256 over `{iss: teamId, iat}` with the key id in the header - that is the
 * whole of Apple's token-based auth. The cache is keyed on the key id and team
 * so that rotating `APNS_KEY_ID` takes effect on the next send instead of
 * waiting out the previous key's 50 minutes.
 */
export async function apnsAuthToken(config: ApnsConfig, now = Date.now()): Promise<string> {
  const fingerprint = `${config.keyId}:${config.teamId}`;
  if (tokenCache && tokenCache.fingerprint === fingerprint && now - tokenCache.signedAt < TOKEN_REUSE_MS) {
    return tokenCache.token;
  }

  const key = await signingKey(config.p8);
  const issuedAt = Math.floor(now / 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.keyId })
    .setIssuer(config.teamId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + TOKEN_TTL_SECONDS)
    .sign(key);

  tokenCache = { fingerprint, token, signedAt: now };
  return token;
}

export type ApnsSendResult = {
  /** The HTTP status Apple answered, or 0 when the connection itself failed. */
  status: number;
  /** Apple's `reason`, or a local marker for a transport failure. */
  reason: string | null;
  apnsId: string | null;
  /** The token is certainly dead: delete the row. */
  shouldDelete: boolean;
  /** Worth another attempt later. Nothing retries inside one request. */
  retryable: boolean;
  /** Our credentials or topic are wrong. A deploy problem, not a user problem. */
  configError: boolean;
};

/**
 * The reasons that mean "this device is gone", and nothing else.
 *
 * This list is the single most important thing in the file. A push system rots
 * because nobody deletes dead tokens: the fan-out gets slower, the failure rate
 * climbs, and eventually Apple's answers for the live devices are lost in the
 * noise. `Unregistered` (the app was deleted) and `BadDeviceToken` (the token
 * was never valid for this topic and environment) are conclusive. Everything
 * else - a 429, a 503, a timeout - is about the moment, not the device.
 */
const DEAD_TOKEN_REASONS = new Set(['Unregistered', 'BadDeviceToken', 'DeviceTokenNotForTopic']);

/** 403s that mean the key, the team or the topic is wrong. */
const CONFIG_REASONS = new Set([
  'InvalidProviderToken',
  'MissingProviderToken',
  'ExpiredProviderToken',
  'TopicDisallowed',
  'BadTopic',
  'Forbidden',
]);

function classify(status: number, reason: string | null, apnsId: string | null): ApnsSendResult {
  // 410 is unconditional: Apple is telling us the token is no longer active,
  // whatever the body says.
  const shouldDelete = status === 410 || (reason !== null && DEAD_TOKEN_REASONS.has(reason));
  const configError =
    (status === 403 || status === 401) && (reason === null || CONFIG_REASONS.has(reason));
  const retryable =
    status === 0 ||
    status === 429 ||
    status >= 500 ||
    // A token that expired mid-flight is our fault and is fixed by re-signing.
    reason === 'ExpiredProviderToken' ||
    reason === 'TooManyRequests' ||
    reason === 'InternalServerError' ||
    reason === 'ServiceUnavailable' ||
    reason === 'IdleTimeout';

  return { status, reason, apnsId, shouldDelete, retryable: retryable && !shouldDelete, configError };
}

export type ApnsRequest = {
  /** The device token, hex. */
  deviceToken: string;
  /** The JSON body, including its `aps` dictionary. */
  payload: unknown;
  config: ApnsConfig;
  /** A provider token from `apnsAuthToken`, signed once and reused. */
  jwt: string;
  /** `apns-collapse-id`: a later notification replaces an earlier one on screen. */
  collapseId?: string;
  /** Stable id so a retry cannot deliver twice. */
  apnsId?: string;
};

/**
 * One notification to one device.
 *
 * Never throws: every failure, including a TLS error or a dead socket, comes
 * back as an `ApnsSendResult` with `status: 0`. Callers of this module sit next
 * to a social write that must not be able to fail because Apple had a bad
 * minute, so there is nothing for them to catch.
 */
export async function sendApnsNotification(request: ApnsRequest): Promise<ApnsSendResult> {
  const { config } = request;
  let session: http2.ClientHttp2Session;
  try {
    session = http2.connect(config.host);
  } catch (error) {
    return classify(0, `ConnectFailed:${describe(error)}`, null);
  }

  try {
    return await new Promise<ApnsSendResult>((resolve) => {
      let settled = false;
      const finish = (result: ApnsSendResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      // Attached before the request so a handshake failure can never surface as
      // an unhandled 'error' event and take the lambda down with it.
      session.on('error', (error) => finish(classify(0, `SessionError:${describe(error)}`, null)));
      session.on('goaway', () => finish(classify(0, 'GoAway', null)));

      const headers: Record<string, string> = {
        [http2.constants.HTTP2_HEADER_METHOD]: 'POST',
        [http2.constants.HTTP2_HEADER_PATH]: `/3/device/${request.deviceToken}`,
        [http2.constants.HTTP2_HEADER_SCHEME]: 'https',
        authorization: `bearer ${request.jwt}`,
        'apns-topic': config.bundleId,
        'apns-push-type': 'alert',
        // 10 = deliver now. A visible alert is the only kind sent here; a
        // background/silent push would have to be 5 and Apple throttles those.
        'apns-priority': '10',
      };
      if (request.collapseId) headers['apns-collapse-id'] = request.collapseId.slice(0, 64);
      if (request.apnsId) headers['apns-id'] = request.apnsId;

      let stream: http2.ClientHttp2Stream;
      try {
        stream = session.request(headers);
      } catch (error) {
        finish(classify(0, `RequestFailed:${describe(error)}`, null));
        return;
      }

      let status = 0;
      let apnsId: string | null = null;
      let body = '';

      stream.setEncoding('utf8');
      stream.setTimeout(SEND_TIMEOUT_MS, () => {
        stream.close(http2.constants.NGHTTP2_CANCEL);
        finish(classify(0, 'Timeout', apnsId));
      });
      stream.on('response', (responseHeaders) => {
        status = Number(responseHeaders[http2.constants.HTTP2_HEADER_STATUS] ?? 0);
        const id = responseHeaders['apns-id'];
        apnsId = typeof id === 'string' ? id : null;
      });
      stream.on('data', (chunk: string) => {
        // Apple's error bodies are tiny; this bound is only so a hostile or
        // broken intermediary cannot grow the buffer without limit.
        if (body.length < 4096) body += chunk;
      });
      stream.on('error', (error) => finish(classify(0, `StreamError:${describe(error)}`, apnsId)));
      stream.on('end', () => finish(classify(status, reasonFrom(status, body), apnsId)));

      stream.end(JSON.stringify(request.payload));
    });
  } finally {
    // The whole point of per-send sessions: this always runs, so a serverless
    // invocation cannot end with an h2 session still open to Apple.
    try {
      session.close();
    } catch {
      try {
        session.destroy();
      } catch {
        // Nothing left to do; the socket goes with the invocation.
      }
    }
  }
}

function reasonFrom(status: number, body: string): string | null {
  if (status === 200) return null;
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { reason?: unknown };
    return typeof parsed.reason === 'string' ? parsed.reason : null;
  } catch {
    return null;
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 120);
  return String(error).slice(0, 120);
}
