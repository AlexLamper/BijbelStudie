import { requireUser } from '../../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, jsonV1 } from '../../../../../../../lib/apiV1';
import { addComment, listComments } from '../../../../../../../lib/friends/service';
import { checkRateLimit } from '../../../../../../../lib/mobileRateLimit';
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

/**
 * POST /api/v1/friends/posts/:id/comments
 *
 * Throttled at 60 per hour per account: an in-process courtesy limit
 * (lib/mobileRateLimit), so the real ceiling is instances x limit. A reaction
 * is the one write a reader does repeatedly in one sitting, so this sits well
 * above a conversation and far below a flood.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const limit = checkRateLimit(`friends:comment:${auth.id}`, 60, 60 * 60);
    if (!limit.allowed) return errorV1('RATE_LIMITED', 429, 'Even wachten met reageren.');
    const { id } = await params;
    return jsonV1(await addComment(auth.id, id, await readBody(req)), { status: 201, ...PRIVATE });
  } catch (error) {
    return handleFriendsError(error);
  }
}
