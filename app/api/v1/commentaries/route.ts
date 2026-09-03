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
 * See lib/mobileLicensing.ts for what may appear here at all, and
 * lib/proContent.ts for what a free reader gets of it. `kingcomments_nl` is
 * the one source where those two answers differ: it is licensed rather than
 * public domain, and it is free in full to everyone.
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
