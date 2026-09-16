import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import Feedback from '../../../../../models/Feedback';
import { consume } from '../../../../../lib/rateLimit';
import { buildAiReport } from '../../../../../lib/aiReport';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Same shape of budget as `POST /api/v1/feedback` (20 per account per day),
 * under its own scope so flagging answers never spends the general feedback
 * allowance and vice versa.
 */
const PER_USER = { scope: 'ai_report:user', limit: 20, windowMs: 24 * 60 * 60 * 1000 };
/** Room for a 4000-character answer plus question and comment, JSON-escaped. */
const MAX_BODY_BYTES = 32 * 1024;

/**
 * Report one AI-assistant answer from the app.
 *
 * The assistant (`/api/v1/ai/chat`) requires a signed-in account, so this does
 * too: there is no anonymous path because there is no anonymous answer to
 * report. Stored in the feedback collection as `touchpoint: "ai_report"` and
 * read in `/beheer/feedback`.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);

    const declaredLength = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return errorV1('PAYLOAD_TOO_LARGE', 413, 'Melding is te lang');
    }

    if (consume(PER_USER, auth.id).limited) {
      return errorV1('RATE_LIMITED', 429, 'Je hebt vandaag al veel meldingen gestuurd. Probeer het morgen opnieuw.');
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
    } catch {
      return errorV1('INVALID_JSON', 400, 'Ongeldige melding');
    }

    const built = buildAiReport(
      body,
      { id: auth.id, name: auth.name ?? '', email: auth.email ?? '' },
      req.headers.get('user-agent') ?? 'BijbelStudie app',
    );
    if ('code' in built) return errorV1(built.code, 400, built.message);

    await connectMongoDB();
    const doc = await Feedback.create(built.doc);

    return jsonV1({ id: doc._id.toString() }, { status: 201 });
  } catch (error) {
    return handleV1Error(error);
  }
}
