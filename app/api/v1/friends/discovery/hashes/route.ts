import { requireUser } from '../../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../../lib/apiV1';
import { saveOwnHashes } from '../../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError, readBody } from '../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/friends/discovery/hashes - the caller's own phone number and
 * e-mail, hashed here, so others can find them.
 *
 * This is the second consent: having read an address book does not make the
 * reader findable, and neither implies the other.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await saveOwnHashes(auth.id, await readBody(req)), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
