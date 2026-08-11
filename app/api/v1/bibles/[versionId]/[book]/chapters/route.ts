import type { NextRequest } from 'next/server';
import { cachedJsonV1, corsPreflight, handleV1Error } from '../../../../../../../lib/apiV1';
import { contentUpdatedAt, listMobileBibleChapters } from '../../../../../../../lib/mobileContent';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/bibles/:versionId/:book/chapters
 *
 * Separate from /books so the navigator can load 66 book names in one request
 * and the chapter list only for the book actually opened. Fetching chapter
 * counts for every book up front is 66 file reads for one screen.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string; book: string }> },
) {
  try {
    const { versionId, book } = await params;
    const decodedBook = decodeURIComponent(book);
    const chapters = await listMobileBibleChapters(versionId, decodedBook);
    return cachedJsonV1(
      req,
      { id: versionId, book: decodedBook, chapters, updatedAt: contentUpdatedAt() },
      { maxAge: 60 * 60 * 24 * 30, immutable: false },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
