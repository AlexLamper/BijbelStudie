import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { MobileLicensingError } from './mobileLicensing';
import { UnauthorizedError } from './apiAuth';

/**
 * Shared plumbing for the `/api/v1/*` surface: uniform error bodies, ETag
 * handling, and CORS preflight. Native clients send no Origin, so CORS here is
 * a convenience for the Flutter web/preview build, never a security control.
 */

export const V1_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-None-Match',
  'Access-Control-Max-Age': '86400',
};

export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: V1_CORS_HEADERS });
}

export function jsonV1(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(body as Record<string, unknown>, {
    status: init?.status ?? 200,
    headers: { ...V1_CORS_HEADERS, ...(init?.headers ?? {}) },
  });
}

export function errorV1(code: string, status: number, message?: string) {
  return jsonV1({ error: code, message: message ?? code }, { status });
}

/**
 * Maps thrown domain errors onto responses so every handler can be a plain
 * try/catch. A licensing violation is a 451, not a 404: hiding the reason
 * would make the block look like a bug and invite a "retry with a different
 * spelling" client.
 */
export function handleV1Error(error: unknown) {
  if (error instanceof MobileLicensingError) {
    return jsonV1(
      {
        error: error.code,
        kind: error.kind,
        id: error.id,
        message:
          'Deze bron is niet gelicentieerd voor de mobiele app. ' +
          'This content source is not licensed for distribution in the mobile app.',
      },
      { status: 451 },
    );
  }
  if (error instanceof UnauthorizedError) {
    return errorV1('UNAUTHORIZED', 401);
  }
  // Duck-typed rather than `instanceof PlanError` so this module stays free of
  // model imports - every v1 route loads it, including the ones with no DB.
  if (error instanceof Error && error.name === 'PlanError') {
    const { code, status } = error as Error & { code?: string; status?: number };
    return errorV1(code ?? 'PLAN_ERROR', status ?? 400, error.message);
  }
  if (error instanceof SyntaxError) {
    return errorV1('INVALID_JSON', 400);
  }
  // An unhandled error must never describe itself to the client - the message
  // can carry a query, an index name or a stack frame. But it has to be
  // *findable*, and for a long time it was not: the client saw the bare string
  // "INTERNAL_ERROR" and the server log said little more, so a 500 reported by
  // a user could not be tied to anything. The id below is the only part that
  // crosses the boundary; it is random, means nothing on its own, and is what
  // turns "sometimes login fails" into one grep.
  const errorId = randomUUID();
  const detail =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          // Mongo puts the useful part here: 11000 is a duplicate key, and
          // `keyPattern` names the index that rejected the write.
          code: (error as { code?: unknown }).code,
          keyPattern: (error as { keyPattern?: unknown }).keyPattern,
          stack: error.stack,
        }
      : { value: error };
  console.error(`[api/v1] unhandled error ${errorId}:`, detail);
  return jsonV1({ error: 'INTERNAL_ERROR', message: 'INTERNAL_ERROR', errorId }, { status: 500 });
}

/** Stable content hash used as the ETag for immutable scripture responses. */
export function contentEtag(payload: unknown): string {
  const hash = createHash('sha1').update(JSON.stringify(payload)).digest('hex');
  return `"${hash}"`;
}

/**
 * Returns a 304 when the client's `If-None-Match` already matches, otherwise
 * a 200 carrying the ETag. Scripture text does not change, so a long
 * `Cache-Control` plus revalidation makes a re-read cost one empty round trip.
 *
 * **`private` is load-bearing on any entitlement-dependent response.** The
 * default here is `public`, which lets Vercel's CDN keep one copy and hand it
 * to everyone - correct while every caller got identical bytes, and a hole the
 * moment a response depends on who is asking. The first Pro reader to fetch a
 * chapter would populate the shared cache with the full text and every free
 * reader behind it would be served the same entry. Callers that gate on
 * `isPro` must pass `private: true`; it also sets `Vary: Authorization` so an
 * intermediary that ignores `private` still keys the two variants apart.
 *
 * The long `max-age` is kept either way. `private` restricts *who* may store
 * the response, not for how long, so the reader's own device still revalidates
 * with one empty round trip.
 */
export function cachedJsonV1(
  req: Request,
  payload: unknown,
  options?: { maxAge?: number; immutable?: boolean; private?: boolean },
) {
  const etag = contentEtag(payload);
  const maxAge = options?.maxAge ?? 60 * 60 * 24 * 365;
  const scope = options?.private ? 'private' : 'public';
  // `immutable` promises the body will never change for this URL. That is true
  // of scripture and false of anything gated, which changes the moment the
  // reader subscribes.
  const immutable = options?.immutable ?? !options?.private;
  const cacheControl = `${scope}, max-age=${maxAge}${immutable ? ', immutable' : ', must-revalidate'}`;

  const headers: Record<string, string> = {
    ...V1_CORS_HEADERS,
    ETag: etag,
    'Cache-Control': cacheControl,
  };
  if (options?.private) headers.Vary = 'Authorization';

  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  return jsonV1(payload, { headers });
}

export function requireParam(value: string | null | undefined, name: string): string {
  if (!value) {
    const err = new Error(`Missing required parameter: ${name}`);
    (err as { status?: number }).status = 400;
    throw err;
  }
  return value;
}

export function parsePositiveInt(value: string | null | undefined, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    const err = new Error(`Invalid ${name}`);
    (err as { status?: number }).status = 400;
    throw err;
  }
  return n;
}
