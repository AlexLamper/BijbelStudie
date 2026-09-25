import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { referralOverview } from '../../../../lib/referral';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * The caller's invite code, link and share text, and how many friends joined
 * through it. Same response for the web card and the app. The first call
 * creates the code.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const overview = await referralOverview(auth.id, auth.isPro);
    if (!overview) return errorV1('NOT_FOUND', 404);
    return jsonV1(overview, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleV1Error(error);
  }
}
