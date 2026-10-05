import { requireUser } from '../../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, jsonV1 } from '../../../../../../../lib/apiV1';
import { setLike } from '../../../../../../../lib/friends/service';
import { checkRateLimit } from '../../../../../../../lib/mobileRateLimit';
import { PRIVATE, handleFriendsError } from '../../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * A heart and an un-heart share one budget: 240 per hour per account, an
 * in-process courtesy limit (lib/mobileRateLimit), so the real ceiling is
 * instances x limit. It is high on purpose - a like is idempotent and a
 * reader scrolling a busy feed can legitimately tap dozens - and it exists
 * only so a tap loop cannot hammer the collection. One key for both verbs,
 * because toggling is how a loop would present itself.
 */
function likeBudget(userId: string) {
  return checkRateLimit(`friends:like:${userId}`, 240, 60 * 60);
}

/** POST /api/v1/friends/posts/:id/like - idempotent, so a double tap is safe. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    if (!likeBudget(auth.id).allowed) return errorV1('RATE_LIMITED', 429, 'Even wachten.');
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
    if (!likeBudget(auth.id).allowed) return errorV1('RATE_LIMITED', 429, 'Even wachten.');
    const { id } = await params;
    return jsonV1(await setLike(auth.id, id, false), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
