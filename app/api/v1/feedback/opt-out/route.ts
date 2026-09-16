import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import FeedbackState from '../../../../../models/FeedbackState';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * "Stel me geen korte vragen meer" - the switch in /instellingen.
 *
 * `GET` answers `{ optedOut }`; `POST { optedOut: boolean }` sets it. One
 * targeted `$set` on the reader's own FeedbackState, upserted, so a reader who
 * was never asked anything can still say no in advance. Opting out stops every
 * prompt (`nextPrompt` and `submitResponse` both check it); it does not hide
 * the thumbs a reader taps on their own, nor the /feedback page.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    const state = await FeedbackState.findOne({ userId: auth.id })
      .select('optedOut')
      .lean<{ optedOut?: boolean }>();
    return jsonV1({ optedOut: Boolean(state?.optedOut) });
  } catch (error) {
    return handleV1Error(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.optedOut !== 'boolean') {
      return errorV1('MISSING_FIELDS', 400, 'optedOut (true of false) is verplicht');
    }
    await connectMongoDB();
    await FeedbackState.updateOne(
      { userId: auth.id },
      { $set: { optedOut: body.optedOut }, $setOnInsert: { userId: auth.id } },
      { upsert: true },
    );
    return jsonV1({ optedOut: body.optedOut });
  } catch (error) {
    return handleV1Error(error);
  }
}
