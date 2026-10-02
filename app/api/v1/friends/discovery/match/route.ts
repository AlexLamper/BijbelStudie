import { requireUser } from '../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, jsonV1 } from '../../../../../../lib/apiV1';
import { matchContacts } from '../../../../../../lib/friends/service';
import { checkRateLimit } from '../../../../../../lib/mobileRateLimit';
import { PRIVATE, handleFriendsError, readBody } from '../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/friends/discovery/match
 *
 * Hashed contacts in, matching accounts out. Nothing uploaded here is stored -
 * the match runs and the hashes are dropped - and only accounts that chose to
 * be findable come back, with their name and picture alone.
 *
 * Throttled hardest of all the friends routes, because this is the one place a
 * caller could try to walk a hash space: 5 calls an hour per account, at most
 * 2000 hashes a call. The limiter is in-process (lib/mobileRateLimit), so the
 * true ceiling is instances x 5 - already expensive enough to make walking it
 * pointless, and stated rather than pretended away.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const limit = checkRateLimit(`friends:match:${auth.id}`, 5, 60 * 60);
    if (!limit.allowed) {
      return errorV1('RATE_LIMITED', 429, 'Je hebt je contacten net al gecontroleerd.');
    }
    return jsonV1(await matchContacts(auth.id, await readBody(req)), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
