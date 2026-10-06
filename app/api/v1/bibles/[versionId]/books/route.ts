import type { NextRequest } from 'next/server';
import { cachedJsonV1, corsPreflight, errorV1, handleV1Error } from '../../../../../../lib/apiV1';
import { contentUpdatedAt, listMobileBibleBooks } from '../../../../../../lib/mobileContent';
import {
  COPY_GUARD_REFUSAL,
  mayServeToClient,
  requestCapabilities,
} from '../../../../../../lib/bibleCopyPolicy';

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
    // A restricted translation is only served to a client that says it can
    // honour the copy limit (lib/bibleCopyPolicy.ts). Unrestricted ones never
    // reach this branch, so no existing client is affected.
    if (!mayServeToClient(versionId, requestCapabilities(req))) {
      return errorV1(COPY_GUARD_REFUSAL.code, COPY_GUARD_REFUSAL.status, COPY_GUARD_REFUSAL.message);
    }

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
