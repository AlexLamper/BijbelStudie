import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import StudyGroup from '../../../../models/StudyGroup.js';
import { serialiseGroup, type GroupDoc } from '../../../../lib/mobileGroups';
import { canCreateGroup, GROUP_LIMIT_MESSAGE } from '../../../../lib/entitlements';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** `?type=mine|public` - defaults to the caller's groups plus public ones. */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();

    const type = new URL(req.url).searchParams.get('type');
    const query =
      type === 'mine'
        ? { 'members.userId': auth.id }
        : type === 'public'
          ? { isPublic: true }
          : { $or: [{ isPublic: true }, { 'members.userId': auth.id }] };

    // `models/StudyGroup.js` is untyped, so `.lean()` yields `any`-shaped docs.
    const groups = (await StudyGroup.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()) as unknown as GroupDoc[];

    return jsonV1({ groups: groups.map((g) => serialiseGroup(g, auth.id)) });
  } catch (error) {
    return handleV1Error(error);
  }
}

/** Creates a group with the caller as its leader. */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const { name, description, isPublic } = (await req.json()) ?? {};

    if (typeof name !== 'string' || name.trim().length === 0) {
      return errorV1('MISSING_FIELDS', 400, 'name is required');
    }

    await connectMongoDB();

    // The same rule as the website's /api/groepen: one group led for free,
    // more with Pro. Joining is never limited.
    if (!auth.isPro) {
      const led = await StudyGroup.countDocuments({ createdBy: auth.id });
      if (!canCreateGroup(led, auth.isPro)) {
        return errorV1('GROUP_LIMIT_REACHED', 403, GROUP_LIMIT_MESSAGE);
      }
    }

    const group = await StudyGroup.create({
      name: name.trim(),
      description: typeof description === 'string' ? description : '',
      isPublic: isPublic !== false,
      inviteCode: randomBytes(4).toString('hex').toUpperCase(),
      createdBy: auth.id,
      members: [{ userId: auth.id, role: 'leader', joinedAt: new Date() }],
    });

    return jsonV1(
      { group: serialiseGroup(group.toObject() as GroupDoc, auth.id) },
      { status: 201 },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
