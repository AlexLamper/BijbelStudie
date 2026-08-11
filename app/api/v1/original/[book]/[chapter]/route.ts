import type { NextRequest } from 'next/server';
import {
  cachedJsonV1,
  corsPreflight,
  errorV1,
  handleV1Error,
} from '../../../../../../lib/apiV1';
import { getMobileOriginalChapter } from '../../../../../../lib/mobileContent';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/original/:book/:chapter — STEPBible TAHOT/TAGNT.
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

    return cachedJsonV1(req, payload);
  } catch (error) {
    return handleV1Error(error);
  }
}
