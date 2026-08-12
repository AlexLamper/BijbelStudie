import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import Feedback from '../../../../models/Feedback';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

const CATEGORIES = ['bug', 'feature', 'praise', 'other'] as const;

/**
 * In-app feedback, landing in the same collection the admin console reads.
 * `page` carries the app route so a report says where it came from.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json()) ?? {};

    if (typeof body.message !== 'string' || body.message.trim().length === 0) {
      return errorV1('MISSING_FIELDS', 400, 'message is required');
    }

    const category = CATEGORIES.includes(body.category) ? body.category : 'other';
    const rating =
      Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5
        ? body.rating
        : undefined;

    await connectMongoDB();
    const doc = await Feedback.create({
      userId: auth.id,
      name: auth.name,
      email: auth.email,
      category,
      rating,
      message: body.message.trim().slice(0, 4000),
      page: typeof body.page === 'string' ? body.page.slice(0, 200) : 'app',
      userAgent: req.headers.get('user-agent') ?? 'BijbelStudie app',
    });

    return jsonV1({ id: doc._id.toString() }, { status: 201 });
  } catch (error) {
    return handleV1Error(error);
  }
}
