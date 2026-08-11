import type { NextRequest } from 'next/server';
import { cachedJsonV1, corsPreflight, handleV1Error } from '../../../../../../lib/apiV1';
import { contentUpdatedAt, listMobileCommentaryBooks } from '../../../../../../lib/mobileContent';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/** GET /api/v1/commentaries/:commentaryId/books */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ commentaryId: string }> },
) {
  try {
    const { commentaryId } = await params;
    const books = await listMobileCommentaryBooks(commentaryId);
    return cachedJsonV1(
      req,
      { id: commentaryId, books, updatedAt: contentUpdatedAt() },
      { maxAge: 60 * 60 * 24 * 30, immutable: false },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
