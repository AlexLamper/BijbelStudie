import type { NextRequest } from 'next/server';
import { cachedJsonV1, corsPreflight, handleV1Error } from '../../../../lib/apiV1';
import { contentUpdatedAt, listMobileCommentaries } from '../../../../lib/mobileContent';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/commentaries - allowlisted only.
 *
 * `kingcomments_nl` is registered in manifest.json for the website but is
 * absent here by design (see lib/mobileLicensing.ts).
 */
export async function GET(req: NextRequest) {
  try {
    const commentaries = await listMobileCommentaries();
    return cachedJsonV1(
      req,
      { commentaries, updatedAt: contentUpdatedAt() },
      { maxAge: 60 * 60 * 24, immutable: false },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
