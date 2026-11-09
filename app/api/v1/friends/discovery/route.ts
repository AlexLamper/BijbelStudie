import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { forgetDiscovery, forgetScopeFrom } from '../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * DELETE /api/v1/friends/discovery[?scope=own|contacts] - the counterpart to
 * the consents, and it really deletes.
 *
 * No scope (what every older client sends) forgets everything: my own hashes,
 * so nobody finds me any more, and my hashed address book kept for contact
 * alerts. `own` is the findability switch going off and leaves the address
 * book alone; `contacts` is the contact-alerts switch going off and leaves
 * findability alone.
 */
export async function DELETE(req: Request) {
  try {
    const auth = await requireUser(req);
    const scope = forgetScopeFrom(new URL(req.url).searchParams.get('scope'));
    return jsonV1(await forgetDiscovery(auth.id, scope), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
