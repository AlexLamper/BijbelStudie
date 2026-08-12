import { resolveUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { CATEGORIES, LIBRARY } from '../../../hulpbronnen/library';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * The Hulpbronnen library.
 *
 * Every entry is a public-domain scan hosted by a third party (DBNL, Archive,
 * Gutenberg, Delpher), so the app links out rather than mirroring anything.
 * `locked` is resolved server-side: a Pro-only item still appears in the list
 * — the site shows it too — but the client never has to decide entitlement.
 */
export async function GET(req: Request) {
  try {
    const user = await resolveUser(req);
    const isPro = user?.isPro ?? false;

    return jsonV1({
      categories: CATEGORIES,
      items: LIBRARY.map((item) => ({
        slug: item.slug,
        title: item.title,
        author: item.author ?? null,
        year: item.year ?? null,
        description: item.description,
        category: item.category,
        source: item.source,
        sourceUrl: item.sourceUrl,
        rightsNote: item.rightsNote,
        isPro: Boolean(item.isPro),
        locked: Boolean(item.isPro) && !isPro,
      })),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
