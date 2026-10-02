import { requireUser } from '../../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../../lib/apiV1';
import { markFeedSeen } from '../../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** POST /api/v1/friends/feed/seen - clears the badge on the Start tab. */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await markFeedSeen(auth.id), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
