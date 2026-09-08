import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import StudyGroup from '../../../../../models/StudyGroup.js';
import User from '../../../../../models/User';
import { serialiseGroup, type GroupDoc, type GroupMember } from '../../../../../lib/mobileGroups';
import { PUBLIC_CARD_FIELDS, publicLevensboomCard, type PublicCardSource } from '../../../../../lib/levensboom/publicCard';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

type Member = GroupMember;

/** Group detail with its member roster. Members only. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await ctx.params;

    await connectMongoDB();
    // `models/StudyGroup.js` is untyped, so `.lean()` yields an `any`-shaped doc.
    const group = (await StudyGroup.findById(id).lean()) as unknown as GroupDoc | null;
    if (!group) return errorV1('NOT_FOUND', 404);

    const isMember = group.members.some(
      (m: Member) => m.userId?.toString() === auth.id,
    );
    if (!isMember && !group.isPublic) return errorV1('FORBIDDEN', 403);

    const memberDocs = (await User.find({
      _id: { $in: group.members.map((m: Member) => m.userId) },
    })
      .select(`name image ${PUBLIC_CARD_FIELDS}`)
      .lean()) as unknown as Array<PublicCardSource & { name?: string; image?: string }>;

    const byId = new Map(memberDocs.map((u) => [u._id.toString(), u]));

    return jsonV1({
      group: serialiseGroup(group, auth.id),
      members: group.members.map((m: Member) => {
        const doc = byId.get(m.userId.toString());
        return {
          userId: m.userId.toString(),
          name: doc?.name ?? 'Onbekend',
          image: doc?.image ?? null,
          role: m.role,
          joinedAt: m.joinedAt,
          isSelf: m.userId.toString() === auth.id,
          // Enough to draw the member's tree, nothing else - see publicCard.ts.
          levensboom: doc ? publicLevensboomCard(doc) : null,
        };
      }),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/** Deletes the group. Leader only. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await ctx.params;

    await connectMongoDB();
    const group = await StudyGroup.findById(id);
    if (!group) return errorV1('NOT_FOUND', 404);

    const isLeader = group.members.some(
      (m: Member) => m.userId?.toString() === auth.id && m.role === 'leader',
    );
    if (!isLeader && !auth.isAdmin) return errorV1('FORBIDDEN', 403);

    await StudyGroup.findByIdAndDelete(id);
    return jsonV1({ deleted: id });
  } catch (error) {
    return handleV1Error(error);
  }
}
