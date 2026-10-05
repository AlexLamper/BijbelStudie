import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { getSuggestions } from '../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/friends/suggestions - "Mensen die je misschien kent".
 *
 * Friends of friends, most shared friends first, capped at 20. Existing
 * friends, pending requests either direction and anyone blocked either
 * direction are already gone by the time the service answers.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await getSuggestions(auth.id), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
