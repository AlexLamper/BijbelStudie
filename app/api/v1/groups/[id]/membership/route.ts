import { requireUser } from '../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../../lib/apiV1';
import connectMongoDB from '../../../../../../lib/mongodb';
import StudyGroup from '../../../../../../models/StudyGroup.js';
import { serialiseGroup, type GroupDoc, type GroupMember } from '../../../../../../lib/mobileGroups';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

type Member = GroupMember;

/**
 * Joins the group. A public group is open; a private one needs the invite
 * code in the body, which is the only way the app ever obtains membership.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    await connectMongoDB();
    const group = await StudyGroup.findById(id);
    if (!group) return errorV1('NOT_FOUND', 404);

    if (group.members.some((m: Member) => m.userId?.toString() === auth.id)) {
      return errorV1('ALREADY_MEMBER', 409);
    }

    if (!group.isPublic && body?.inviteCode !== group.inviteCode) {
      return errorV1('INVALID_INVITE_CODE', 403);
    }

    group.members.push({ userId: auth.id, role: 'member', joinedAt: new Date() });
    await group.save();

    return jsonV1({ group: serialiseGroup(group.toObject() as GroupDoc, auth.id) });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Leaves the group. The last leader may not walk out - the site has the same
 * rule, otherwise the group becomes unadministrable.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await ctx.params;

    await connectMongoDB();
    const group = await StudyGroup.findById(id);
    if (!group) return errorV1('NOT_FOUND', 404);

    const self = group.members.find((m: Member) => m.userId?.toString() === auth.id);
    if (!self) return errorV1('NOT_A_MEMBER', 400);

    const leaders = group.members.filter((m: Member) => m.role === 'leader');
    if (self.role === 'leader' && leaders.length === 1 && group.members.length > 1) {
      return errorV1(
        'LAST_LEADER',
        409,
        'Wijs eerst een andere leider aan voordat je de groep verlaat.',
      );
    }

    group.members = group.members.filter((m: Member) => m.userId?.toString() !== auth.id);
    if (group.members.length === 0) {
      await StudyGroup.findByIdAndDelete(id);
      return jsonV1({ left: true, deleted: true });
    }

    await group.save();
    return jsonV1({ left: true, deleted: false });
  } catch (error) {
    return handleV1Error(error);
  }
}
