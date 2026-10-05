import { requireUser } from '../../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../../lib/apiV1';
import { blockUser, unblockUser } from '../../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/friends/:userId/block - removes the vriendschap too, and hides
 * both sides from each other's feed from then on. A block has to work in both
 * directions to mean anything.
 */
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireUser(req);
    const { userId } = await params;
    return jsonV1(await blockUser(auth.id, userId), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}

/**
 * DELETE /api/v1/friends/:userId/block - unblock.
 *
 * Blocking was write-once: there was no way back and no list of who was
 * blocked (that list is now on GET /api/v1/friends/settings). This `$pull`s
 * them out and leaves it there - the vriendschap is NOT restored, because
 * blocking deleted the pair document and the other side never re-accepted.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireUser(req);
    const { userId } = await params;
    return jsonV1(await unblockUser(auth.id, userId), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
