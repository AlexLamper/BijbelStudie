import type { NextRequest } from 'next/server';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../../../lib/apiV1';
import { requireUser } from '../../../../../../../lib/apiAuth';
import { getHsvChapterQuotes } from '../../../../../../../lib/hsvQuotes';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/bibles/hsv/:book/:chapter
 *
 * The quoted HSV verses of one chapter - at most a couple, never a chapter.
 * Everything this can ever answer with is on the 50-verse allowlist in
 * lib/hsvQuota.ts, so walking every book and chapter of this route yields
 * exactly the fifty verses Stichting HSV lets us quote free of charge and not
 * one more.
 *
 * Three things hold that line, and all three are deliberate:
 *
 *   - Signed in only. The HSV text is not ours to publish, so it is not served
 *     to the open web; it is shown to a reader inside the product. 401 for
 *     anyone else, which also keeps it out of anonymous scrapers.
 *   - `no-store` plus `X-Robots-Tag`. Nothing licensed should sit in a shared
 *     CDN cache or a search index. The cost of re-fetching a two-verse payload
 *     is nil.
 *   - The response carries the required source line with the text, every time,
 *     so a client cannot render the words without having been handed the
 *     attribution it must print beside them.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ book: string; chapter: string }> },
) {
  try {
    await requireUser(req);

    const { book, chapter } = await params;
    const chapterNumber = Number(chapter);
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      return errorV1('INVALID_CHAPTER', 400, 'chapter moet een positief geheel getal zijn.');
    }

    const payload = await getHsvChapterQuotes(decodeURIComponent(book), chapterNumber);
    if (!payload) return errorV1('NOT_FOUND', 404, 'Bijbelboek niet gevonden.');

    return jsonV1(payload, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
