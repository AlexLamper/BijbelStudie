import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import Feedback from '../../../../models/Feedback';
import { consume } from '../../../../lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

const CATEGORIES = ['bug', 'feature', 'praise', 'other'] as const;

/** 20 per account per day - the same budget as the web route (`app/api/feedback/route.ts`). */
const PER_USER = { scope: 'feedback:user', limit: 20, windowMs: 24 * 60 * 60 * 1000 };
const MAX_BODY_BYTES = 16 * 1024;

/**
 * In-app feedback, landing in the same collection the admin console reads.
 * `page` carries the app route so a report says where it came from.
 *
 * Every caller here is already authenticated (`requireUser` requires a bearer
 * token), so there is no honeypot and no anonymous name/email path to worry
 * about - identity is always the account behind the token. The one gap this
 * route had was no rate limit at all; it now shares the same per-account
 * budget as the web form via `lib/rateLimit.ts`.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);

    const declaredLength = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return errorV1('PAYLOAD_TOO_LARGE', 413, 'Bericht is te lang');
    }

    if (consume(PER_USER, auth.id).limited) {
      return errorV1('RATE_LIMITED', 429, 'Je hebt vandaag al veel feedback gestuurd. Bedankt - morgen weer.');
    }

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
