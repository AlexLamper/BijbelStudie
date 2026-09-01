import { requireUser } from '../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../../lib/apiV1';
import connectMongoDB from '../../../../../../lib/mongodb';
import StudyGroup from '../../../../../../models/StudyGroup.js';
import GroupMessage from '../../../../../../models/GroupMessage.js';
import User from '../../../../../../models/User';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

type Member = { userId: { toString(): string }; role: string };

async function assertMember(groupId: string, userId: string) {
  // `models/StudyGroup.js` is untyped, so `.lean()` yields an `any`-shaped doc.
  const group = (await StudyGroup.findById(groupId).select('members').lean()) as unknown as {
    members: Member[];
  } | null;
  if (!group) return { error: errorV1('NOT_FOUND', 404) };
  const isMember = group.members.some((m: Member) => m.userId?.toString() === userId);
  if (!isMember) return { error: errorV1('FORBIDDEN', 403) };
  return { group };
}

/** `?limit=50&before=<iso>` - newest first, so the app can page upwards. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await ctx.params;

    await connectMongoDB();
    const guard = await assertMember(id, auth.id);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 50) || 50, 100);
    const before = searchParams.get('before');

    const query: Record<string, unknown> = { groupId: id, deletedAt: null };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await GroupMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const authors = await User.find({ _id: { $in: messages.map((m) => m.userId) } })
      .select('name image')
      .lean();
    const byId = new Map(authors.map((u) => [u._id.toString(), u]));

    return jsonV1({
      messages: messages.map((m) => {
        const author = byId.get(m.userId.toString());
        return {
          id: m._id.toString(),
          type: m.type,
          content: m.content,
          authorId: m.userId.toString(),
          authorName: author?.name ?? 'Onbekend',
          authorImage: author?.image ?? null,
          isSelf: m.userId.toString() === auth.id,
          verseRef: m.verseRef?.book ? m.verseRef : null,
          reactions: (m.reactions ?? []).map((r: { emoji: string }) => r.emoji),
          createdAt: m.createdAt,
        };
      }),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/** Posts a message, prayer request or announcement to the group. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await ctx.params;
    const body = (await req.json()) ?? {};

    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      return errorV1('MISSING_FIELDS', 400, 'content is required');
    }

    await connectMongoDB();
    const guard = await assertMember(id, auth.id);
    if (guard.error) return guard.error;

    const type = ['bericht', 'gebedsverzoek', 'aankondiging'].includes(body.type)
      ? body.type
      : 'bericht';

    const message = await GroupMessage.create({
      groupId: id,
      userId: auth.id,
      type,
      content: body.content.trim().slice(0, 2000),
      verseRef: body.verseRef?.book
        ? {
            book: body.verseRef.book,
            chapter: Number(body.verseRef.chapter) || undefined,
            verse: Number(body.verseRef.verse) || undefined,
          }
        : undefined,
    });

    return jsonV1(
      {
        message: {
          id: message._id.toString(),
          type: message.type,
          content: message.content,
          authorId: auth.id,
          authorName: auth.name,
          authorImage: auth.image,
          isSelf: true,
          verseRef: message.verseRef?.book ? message.verseRef : null,
          reactions: [],
          createdAt: message.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
