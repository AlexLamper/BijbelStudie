import type { NextRequest } from 'next/server';
import {
  cachedJsonV1,
  corsPreflight,
  errorV1,
  handleV1Error,
} from '../../../../../../../lib/apiV1';
import { getMobileBibleChapter } from '../../../../../../../lib/mobileContent';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/bibles/:versionId/:book/:chapter
 *
 * One chapter is the unit of transfer. There is deliberately no endpoint that
 * returns a whole version: 355 MB of corpus must never leave in one response,
 * and per-chapter delivery is what lets a licence be revoked by flipping one
 * entry in lib/mobileLicensing.ts.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string; book: string; chapter: string }> },
) {
  try {
    const { versionId, book, chapter } = await params;
    const chapterNumber = Number(chapter);
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      return errorV1('INVALID_CHAPTER', 400, 'chapter moet een positief geheel getal zijn.');
    }

    const decodedBook = decodeURIComponent(book);
    const payload = await getMobileBibleChapter(versionId, decodedBook, chapterNumber);
    if (!payload) return errorV1('NOT_FOUND', 404, 'Hoofdstuk niet gevonden.');

    return cachedJsonV1(req, payload);
  } catch (error) {
    return handleV1Error(error);
  }
}
