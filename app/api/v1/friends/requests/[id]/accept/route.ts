import { requireUser } from '../../../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../../../lib/apiV1';
import { acceptRequest } from '../../../../../../../lib/friends/service';
import { PRIVATE, handleFriendsError } from '../../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** POST /api/v1/friends/requests/:id/accept */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await params;
    return jsonV1(await acceptRequest(auth.id, id), PRIVATE);
  } catch (error) {
    return handleFriendsError(error);
  }
}
