import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import Feedback from '../../../../../models/Feedback';
import {
  MINE_LIMIT,
  MINE_PROJECTION,
  markSeenFilter,
  mineFilter,
  serialiseMine,
} from '../../../../../lib/feedbackMine';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * `GET /api/v1/feedback/mine` - the caller's own feedback, newest first, with
 * status and any answers. Cookie or bearer.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    const docs = await Feedback.find(mineFilter(auth.id))
      .sort({ createdAt: -1 })
      .limit(MINE_LIMIT)
      .select(MINE_PROJECTION)
      .lean();
    const items = (docs as Parameters<typeof serialiseMine>[0][]).map(serialiseMine);
    return jsonV1(
      { items, unseen: items.filter((item) => item.hasUnseenReply).length },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * `POST /api/v1/feedback/mine` - "I have seen the answers". Sets
 * `userSeenReplyAt` on the caller's own replied documents, nothing else.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    await Feedback.updateMany(markSeenFilter(auth.id), { $set: { userSeenReplyAt: new Date() } });
    return jsonV1({ ok: true });
  } catch (error) {
    return handleV1Error(error);
  }
}
