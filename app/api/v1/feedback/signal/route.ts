import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import Feedback from '../../../../../models/Feedback';
import { clientIp, consume } from '../../../../../lib/rateLimit';
import { toRouteKey } from '../../../../../lib/analyticsRoutes';
import { SIGNAL_RATE, buildSignal, signalRateKey } from '../../../../../lib/feedbackSignal';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

const MAX_BODY_BYTES = 4 * 1024;

/**
 * `POST /api/v1/feedback/signal`
 *
 * `{ kind: "ai_answer" | "lesson_quality", value: "up" | "down", reason?,
 *    studyId?, lessonDay?, path?, platform?, appVersion? }`
 *
 * One tap, one row. Cookie or bearer (`requireUser`), so the app can send the
 * same thing later. Limited by its own bucket (`SIGNAL_RATE`), charged before
 * any database work, and never against the form's or the quiz signal's budget.
 * No FeedbackState read: a tap the reader chose to make is not a prompt and
 * spends no prompt budget.
 */
export async function POST(req: Request) {
  try {
    const declaredLength = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return errorV1('PAYLOAD_TOO_LARGE', 413, 'Te groot');
    }

    const auth = await requireUser(req);

    if (consume(SIGNAL_RATE, signalRateKey(auth.id, clientIp(req))).limited) {
      return errorV1('RATE_LIMITED', 429, 'Te veel reacties achter elkaar. Probeer het later opnieuw.');
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return errorV1('PAYLOAD_TOO_LARGE', 413, 'Te groot');
    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch {
      return errorV1('INVALID_JSON', 400, 'Ongeldige JSON');
    }

    const built = buildSignal(
      body,
      { id: auth.id, name: auth.name ?? '', email: auth.email ?? '' },
      { routeKey: typeof body.path === 'string' ? toRouteKey(body.path) : null, isPro: auth.isPro },
    );
    if (built.ok === false) return errorV1(built.code, 400, built.message);

    await connectMongoDB();
    const doc = await Feedback.create(built.doc);
    return jsonV1({ id: String(doc._id) }, { status: 201 });
  } catch (error) {
    return handleV1Error(error);
  }
}
