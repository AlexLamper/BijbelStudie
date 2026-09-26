import { corsPreflight, errorV1, jsonV1 } from '../../../../../lib/apiV1';
import { publishedVersion, publishedWorks } from '../../../../../lib/content/bronnen/published';
import { loadWork } from '../../../../../lib/content/bronnen/load';

/**
 * One work in full for the app's reader: every section, every block, and each
 * Scripture reference parsed with its Statenvertaling text attached (the SV is
 * public domain and licensed for the app). Wire contract:
 * lib/content/bronnen/types.ts `Work`.
 *
 * Prerendered per published work; an unknown slug is a static 404.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedWorks().map(work => ({ slug: work.slug }));
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = await loadWork(slug);
  if (!work) return errorV1('NOT_FOUND', 404);
  // Same version as the index row, so the app's cache check agrees.
  return jsonV1({ ...work, version: publishedVersion(slug) });
}
