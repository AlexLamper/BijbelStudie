import { requireUser } from '../../../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../../../lib/apiV1';
import { respondRequest } from '../../../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** POST /api/v1/friends/requests/:id/decline */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await params;
    return jsonV1(await respondRequest(auth.id, id, 'decline'), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
