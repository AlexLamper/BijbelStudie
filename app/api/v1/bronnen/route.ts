import { corsPreflight, jsonV1 } from '../../../../lib/apiV1';
import { BRON_GROUPS } from '../../../../lib/content/bronnen/catalog';
import { publishedWorks, workSummary } from '../../../../lib/content/bronnen/published';

/**
 * The Bronnen index for the app: groups, and per work its meta, section list
 * and a content `version`. The app caches each work's full payload
 * (/api/v1/bronnen/<slug>) and refetches it only when `version` changes.
 *
 * Built from the raw data files alone - no Scripture text is resolved here -
 * so even an uncached invocation is a few small file reads. No auth, nothing
 * per user, every work is free; the CDN keeps it for a day.
 */
export const dynamic = 'force-static';

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET() {
  return jsonV1(
    { groups: BRON_GROUPS, works: publishedWorks().map(workSummary) },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
