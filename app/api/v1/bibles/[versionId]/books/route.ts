import type { NextRequest } from 'next/server';
import { cachedJsonV1, corsPreflight, handleV1Error } from '../../../../../../lib/apiV1';
import { contentUpdatedAt, listMobileBibleBooks } from '../../../../../../lib/mobileContent';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/** GET /api/v1/bibles/:versionId/books */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    const { versionId } = await params;
    const books = await listMobileBibleBooks(versionId);
    return cachedJsonV1(
      req,
      { id: versionId, books, updatedAt: contentUpdatedAt() },
      { maxAge: 60 * 60 * 24 * 30, immutable: false },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
