import { requireUser } from '../../../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../../../lib/apiV1';
import { addComment, listComments } from '../../../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError, readBody } from '../../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** GET /api/v1/friends/posts/:id/comments */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await params;
    return jsonV1(await listComments(auth.id, id), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}

/** POST /api/v1/friends/posts/:id/comments */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await params;
    return jsonV1(await addComment(auth.id, id, await readBody(req)), { status: 201, ...PRIVATE });
  } catch (error) {
    return handleFriendsError(error);
  }
}
