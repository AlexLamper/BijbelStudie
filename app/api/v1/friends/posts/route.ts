import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { createPost } from '../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError, readBody } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/friends/posts - share a verse, a note or a milestone by hand.
 * A post is a copy of what it was made from, never a reference to it.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const result = await createPost(auth.id, await readBody(req));
    return jsonV1(result, { status: 201, ...PRIVATE });
  } catch (error) {
    return handleFriendsError(error);
  }
}
