import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, jsonV1 } from '../../../../../lib/apiV1';
import { createPost } from '../../../../../lib/friends/service';
import { checkRateLimit } from '../../../../../lib/mobileRateLimit';
import { PRIVATE, handleFriendsError, readBody } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/friends/posts - share a verse, a note or a milestone by hand.
 * A post is a copy of what it was made from, never a reference to it.
 *
 * Throttled at 30 per hour per account: an in-process courtesy limit
 * (lib/mobileRateLimit), so the real ceiling is instances x limit. Thirty is
 * well above a day's worth of deliberate sharing from the verse card and the
 * notes list, and low enough that a stuck retry loop cannot bury a kring's
 * feed.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const limit = checkRateLimit(`friends:post:${auth.id}`, 30, 60 * 60);
    if (!limit.allowed) return errorV1('RATE_LIMITED', 429, 'Even wachten met delen.');
    const result = await createPost(auth.id, await readBody(req));
    return jsonV1(result, { status: 201, ...PRIVATE });
  } catch (error) {
    return handleFriendsError(error);
  }
}
