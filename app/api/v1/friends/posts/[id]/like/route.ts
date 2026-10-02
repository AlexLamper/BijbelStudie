import { requireUser } from '../../../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../../../lib/apiV1';
import { setLike } from '../../../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** POST /api/v1/friends/posts/:id/like - idempotent, so a double tap is safe. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await params;
    return jsonV1(await setLike(auth.id, id, true), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}

/** DELETE /api/v1/friends/posts/:id/like */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await params;
    return jsonV1(await setLike(auth.id, id, false), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
