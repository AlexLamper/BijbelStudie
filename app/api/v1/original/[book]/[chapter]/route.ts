import type { NextRequest } from 'next/server';
import {
  cachedJsonV1,
  corsPreflight,
  errorV1,
  handleV1Error,
} from '../../../../../../lib/apiV1';
import { getMobileOriginalChapter } from '../../../../../../lib/mobileContent';
import { resolveUser } from '../../../../../../lib/apiAuth';
import { gateOriginal } from '../../../../../../lib/proContent';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/original/:book/:chapter - STEPBible TAHOT/TAGNT.
 *
 * CC BY 4.0: the `attribution` field in the response is not decoration, it is
 * the licence condition. The reader must render it wherever these words appear.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ book: string; chapter: string }> },
) {
  try {
    const { book, chapter } = await params;
    const chapterNumber = Number(chapter);
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      return errorV1('INVALID_CHAPTER', 400, 'chapter moet een positief geheel getal zijn.');
    }

    const payload = await getMobileOriginalChapter(decodeURIComponent(book), chapterNumber);
    if (!payload) return errorV1('NOT_FOUND', 404, 'Grondtekst niet gevonden.');

    // Pro content. `resolveUser` is deliberately the optional variant: an
    // anonymous reader still gets the preview, which is the whole point of
    // truncating rather than refusing.
    const user = await resolveUser(req);
    const gated = gateOriginal(payload.verses, { isPro: user?.isPro ?? false });

    return cachedJsonV1(
      req,
      { ...payload, verses: gated.items, locked: gated.locked, totalVerses: payload.verses.length },
      { private: true },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
