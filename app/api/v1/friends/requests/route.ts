import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, jsonV1 } from '../../../../../lib/apiV1';
import { getRequests, sendRequest } from '../../../../../lib/friends/service';
import { checkRateLimit } from '../../../../../lib/mobileRateLimit';
import { PRIVATE, handleFriendsError, readBody } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** GET /api/v1/friends/requests - the inbox and the outbox, pending only. */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await getRequests(auth.id), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}

/**
 * POST /api/v1/friends/requests - invite by user id or by the invite code
 * from /api/v1/referral. Accepts at once when the other side already asked.
 *
 * Throttled per account: an in-process courtesy limit (lib/mobileRateLimit),
 * so the real ceiling is instances x limit. That is enough to stop someone
 * walking a code space from one host; it is not a hard global guarantee.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const limit = checkRateLimit(`friends:request:${auth.id}`, 30, 60 * 60);
    if (!limit.allowed) return errorV1('RATE_LIMITED', 429, 'Even wachten met uitnodigen.');
    return jsonV1(await sendRequest(auth.id, await readBody(req)), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
