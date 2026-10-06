import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { getDiscover, type DiscoverKind } from '../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** The chips on the Ontdek tab. Anything else is "Alles". */
const KINDS: readonly DiscoverKind[] = ['verse', 'note', 'milestone', 'study'];

function readKind(raw: string | null): DiscoverKind | null {
  return raw && (KINDS as readonly string[]).includes(raw) ? (raw as DiscoverKind) : null;
}

/**
 * GET /api/v1/friends/discover?limit=&before=&kind=
 *
 * The Ontdek tab: public posts of readers outside the kring, plus the week's
 * most shared verses. Only writers who switched "Openbaar delen" on appear
 * here, and the service - not this handler - decides that.
 *
 * Paged exactly like /feed, so a client has one cursor rule to learn:
 * `before` is the ISO `createdAt` of the oldest post on screen.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const url = new URL(req.url);
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
    const beforeRaw = url.searchParams.get('before');
    const before = beforeRaw ? new Date(beforeRaw) : null;
    const discover = await getDiscover(auth.id, {
      limit: Number.isFinite(limit) ? limit : undefined,
      before: before && !Number.isNaN(before.getTime()) ? before : null,
      kind: readKind(url.searchParams.get('kind')),
    });
    return jsonV1(discover, PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
