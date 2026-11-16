import type { NextRequest } from 'next/server';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { searchMobileBible } from '../../../../lib/mobileContent';
import {
  COPY_GUARD_REFUSAL,
  mayServeToClient,
  requestCapabilities,
} from '../../../../lib/bibleCopyPolicy';
import { checkRateLimit, clientIp } from '../../../../lib/mobileRateLimit';
import { isCopyRestricted } from '../../../../lib/bibleCopyPolicy';
import { RESTRICTED_SEARCH_MAX_HITS, RESTRICTED_TEXT_HEADERS } from '../../../../lib/restrictedText';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/search?q=&version=&book=&limit=
 *
 * Server-side because the device holds only the chapters it has read. Throttled
 * per IP: an unscoped query is the most expensive request in the whole API.
 */
export async function GET(req: NextRequest) {
  try {
    const limit = checkRateLimit(`search:${clientIp(req)}`, 30, 60);
    if (!limit.allowed) {
      return errorV1('RATE_LIMITED', 429, `Probeer het over ${limit.retryAfterSeconds}s opnieuw.`);
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    const version = searchParams.get('version') ?? 'statenvertaling';
    const book = searchParams.get('book');
    const max = searchParams.get('limit');

    // Search over a restricted translation returns its text a verse at a time;
    // an old client that cannot honour the copy limit does not get to walk it.
    if (!mayServeToClient(version, requestCapabilities(req))) {
      return errorV1(COPY_GUARD_REFUSAL.code, COPY_GUARD_REFUSAL.status, COPY_GUARD_REFUSAL.message);
    }

    if (q.length < 2) {
      return errorV1('QUERY_TOO_SHORT', 400, 'Zoekopdracht moet minstens 2 tekens zijn.');
    }

    // A licensed translation's search hits are its text, a verse at a time:
    // a few at once and a tighter per-IP budget, so "de", "en", "het" cannot be
    // used to page out the whole translation.
    const restricted = isCopyRestricted(version);
    if (restricted) {
      const strict = checkRateLimit(`search-restricted:${clientIp(req)}`, 10, 60);
      if (!strict.allowed) {
        return errorV1('RATE_LIMITED', 429, `Probeer het over ${strict.retryAfterSeconds}s opnieuw.`);
      }
    }
    const requested = max ? Number(max) : undefined;
    const result = await searchMobileBible({
      versionId: version,
      query: q,
      book,
      limit: restricted
        ? Math.min(requested && requested > 0 ? requested : RESTRICTED_SEARCH_MAX_HITS, RESTRICTED_SEARCH_MAX_HITS)
        : requested,
    });

    const response = jsonV1({
      query: q,
      version,
      book: book ?? null,
      hits: result.hits,
      truncated: result.truncated,
    });
    if (restricted) {
      for (const [key, value] of Object.entries(RESTRICTED_TEXT_HEADERS)) response.headers.set(key, value);
    }
    return response;
  } catch (error) {
    return handleV1Error(error);
  }
}
