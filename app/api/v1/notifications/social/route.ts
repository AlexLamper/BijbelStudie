import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { readCursor, socialNotifications, SOCIAL_MAX_PAGE_SIZE } from '../../../../../lib/push/social';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/notifications/social?since=<iso>&limit=<n>
 *
 * Everything that happened in the caller's vriendenkring after `since`: pending
 * incoming requests, requests of theirs that were accepted, and likes and
 * comments on their own posts - each already rendered into a title, a body and
 * a deep link, so the client has nothing to compose.
 *
 * This is the Android delivery path, not a convenience: Android gets no push in
 * this product, so the app polls here on foreground and raises the local
 * notifications itself. iOS calls it too, to reconcile after being offline and
 * to pick up the events the coalescing rule deliberately did not push.
 *
 * `private, no-store`: a kring must never be held by a proxy or a browser cache.
 * Unauthenticated callers get the usual 401, and a malformed `since` is ignored
 * rather than rejected - a client with a corrupted cursor should fall back to
 * the server's own marker, not be stuck on a 400 it cannot clear.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const url = new URL(req.url);

    const rawLimit = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.trunc(rawLimit) : undefined;
    if (limit !== undefined && limit > SOCIAL_MAX_PAGE_SIZE) {
      return errorV1('INVALID_LIMIT', 400, `limit mag hoogstens ${SOCIAL_MAX_PAGE_SIZE} zijn.`);
    }

    const payload = await socialNotifications(auth.id, {
      since: readCursor(url.searchParams.get('since')),
      limit,
    });

    return jsonV1(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleV1Error(error);
  }
}
