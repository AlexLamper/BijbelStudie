import type { NextRequest } from 'next/server';
import { cachedJsonV1, corsPreflight, handleV1Error } from '../../../../lib/apiV1';
import { contentUpdatedAt, listMobileBibles } from '../../../../lib/mobileContent';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/** GET /api/v1/bibles - the manifest, allowlisted. Blocked ids never appear. */
export async function GET(req: NextRequest) {
  try {
    const bibles = await listMobileBibles();
    return cachedJsonV1(
      req,
      { bibles, updatedAt: contentUpdatedAt() },
      // The manifest can gain a version on any deploy, so revalidate daily
      // rather than treating it as immutable.
      { maxAge: 60 * 60 * 24, immutable: false },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
