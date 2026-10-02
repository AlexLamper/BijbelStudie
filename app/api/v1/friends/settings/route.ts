import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { getSettings, updateSettings } from '../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError, readBody } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** GET /api/v1/friends/settings - findability and the auto-share switches. */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await getSettings(auth.id), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}

/**
 * PATCH /api/v1/friends/settings - each switch is set on its own named path,
 * so flipping one can never reset the others.
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await updateSettings(auth.id, await readBody(req)), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
