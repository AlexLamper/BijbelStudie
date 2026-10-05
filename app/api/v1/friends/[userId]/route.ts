import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { getFriendProfile, removeFriend } from '../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/friends/:userId - one person's profile.
 *
 * The card, how many people are in their kring, the friends they share with
 * the caller, and - for an actual friend only - their streak, plan day,
 * "vrienden sinds" and their own kring. Anything the caller may not see is a
 * 404, never a 403: whether a person is in the graph is itself private.
 */
export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireUser(req);
    const { userId } = await params;
    return jsonV1(await getFriendProfile(auth.id, userId), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}

/**
 * DELETE /api/v1/friends/:userId - the one pair document goes, and with it the
 * record of who asked, so a later invitation starts clean.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireUser(req);
    const { userId } = await params;
    return jsonV1(await removeFriend(auth.id, userId), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
