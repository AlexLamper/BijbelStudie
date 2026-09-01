import type { NextRequest } from 'next/server';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { requireUser, toAuthUser } from '../../../../lib/apiAuth';
import { serialiseUser } from '../../../../lib/mobileAuthFlow';
import { syncStorePremiumForAppUser } from '../../../../lib/revenuecatSync';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/sync-premium - client-triggered reconciliation.
 *
 * This is not belt-and-braces, it is load-bearing. RevenueCat only fires a
 * webhook for a NEW transaction: an already-owned purchase, a "Herstel
 * aankopen", or a reinstall produces no event at all. Without this endpoint,
 * a user whose original purchase webhook was lost stays locked out on the
 * server forever while the app insists they are Pro.
 *
 * The app calls it after purchase, after restore, and on launch when
 * CustomerInfo and /api/v1/me disagree.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await requireUser(req);

    if (!process.env.REVENUECAT_REST_API_KEY) {
      // The webhook-event fallback cannot help here: there is no event in
      // flight for an already-owned purchase.
      console.error('sync-premium: REVENUECAT_REST_API_KEY is not set');
      return errorV1('NOT_CONFIGURED', 500, 'Serverconfiguratie ontbreekt.');
    }

    await connectMongoDB();

    try {
      await syncStorePremiumForAppUser(caller.id);
    } catch (e) {
      console.error('sync-premium: reconciliation failed:', e);
      return errorV1('SYNC_FAILED', 502, 'Kon abonnement niet verifiëren.');
    }

    const doc = await User.findById(caller.id);
    if (!doc) return errorV1('NOT_FOUND', 404);

    return jsonV1(serialiseUser(toAuthUser(doc)));
  } catch (error) {
    return handleV1Error(error);
  }
}
