import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { removeFriend } from '../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
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
