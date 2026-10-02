import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { forgetDiscovery } from '../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * DELETE /api/v1/friends/discovery - forget my hashes and stop being findable.
 * The counterpart to the consent, and it really deletes.
 */
export async function DELETE(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await forgetDiscovery(auth.id), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
