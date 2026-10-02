import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { getFeed } from '../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/friends/feed?limit=&before=
 *
 * The app calls this on every Start tab load and treats any failure as an
 * empty kring, so this route must answer or fail cleanly - never hang.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const url = new URL(req.url);
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
    const beforeRaw = url.searchParams.get('before');
    const before = beforeRaw ? new Date(beforeRaw) : null;
    const feed = await getFeed(auth.id, {
      limit: Number.isFinite(limit) ? limit : undefined,
      before: before && !Number.isNaN(before.getTime()) ? before : null,
    });
    return jsonV1(feed, PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
