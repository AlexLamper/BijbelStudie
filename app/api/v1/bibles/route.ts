import type { NextRequest } from 'next/server';
import { cachedJsonV1, corsPreflight, handleV1Error } from '../../../../lib/apiV1';
import { contentUpdatedAt, listMobileBibles } from '../../../../lib/mobileContent';
import { CAPABILITIES_HEADER, requestCapabilities } from '../../../../lib/bibleCopyPolicy';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/** GET /api/v1/bibles - the manifest, allowlisted. Blocked ids never appear. */
export async function GET(req: NextRequest) {
  try {
    // Restricted translations are listed only to a client that declares it can
    // honour their copy limit - see lib/bibleCopyPolicy.ts.
    const bibles = await listMobileBibles(requestCapabilities(req));
    return cachedJsonV1(
      req,
      { bibles, updatedAt: contentUpdatedAt() },
      // The manifest can gain a version on any deploy, so revalidate daily
      // rather than treating it as immutable.
      // Varies per client capability, so the shared cache must key on the
      // header rather than hand one client's list to another.
      { maxAge: 60 * 60 * 24, immutable: false, varyHeaders: [CAPABILITIES_HEADER] },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
