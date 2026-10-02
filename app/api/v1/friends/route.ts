import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../lib/apiV1';
import { getKring } from '../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from './_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** GET /api/v1/friends - the caller's kring, newest vriendschap first. */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await getKring(auth.id), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
