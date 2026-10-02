import { requireUser } from '../../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../../lib/apiV1';
import { blockUser } from '../../../../../../lib/friends/service';
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
