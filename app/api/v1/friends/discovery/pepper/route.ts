import { requireUser } from '../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, jsonV1 } from '../../../../../../lib/apiV1';
import { contactPepper } from '../../../../../../lib/friends/discovery';
import { PRIVATE, handleFriendsError } from '../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/friends/discovery/pepper
 *
 * The HMAC pepper the app hashes an address book with. Fetched rather than
 * shipped, so no client binary carries a secret and the pepper can be rotated -
 * which invalidates every stored hash, on purpose. Signed in only, never
 * cached, and 503 when it is not configured: contact matching is then simply
 * off, instead of silently hashing under a guessable constant.
 */
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const pepper = contactPepper();
    if (!pepper) return errorV1('UNAVAILABLE', 503, 'Vrienden vinden via contacten kan nu niet.');
    return jsonV1({ pepper }, PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
