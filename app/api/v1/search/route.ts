import type { NextRequest } from 'next/server';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { searchMobileBible } from '../../../../lib/mobileContent';
import { checkRateLimit, clientIp } from '../../../../lib/mobileRateLimit';

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

    if (q.length < 2) {
      return errorV1('QUERY_TOO_SHORT', 400, 'Zoekopdracht moet minstens 2 tekens zijn.');
    }

    const result = await searchMobileBible({
      versionId: version,
      query: q,
      book,
      limit: max ? Number(max) : undefined,
    });

    return jsonV1({
      query: q,
      version,
      book: book ?? null,
      hits: result.hits,
      truncated: result.truncated,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
