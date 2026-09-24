import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { claimReferral } from '../../../../../lib/referral';
import { CLAIM_REFUSAL_MESSAGES } from '../../../../../lib/referralRules';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Enter someone's invite code. Body: `{ "code": "ABCD2345" }`.
 *
 * One endpoint for every way an account can be made - web registration, Google
 * on the web, and the app's email, Google and Apple sign-up - so none of those
 * five paths has to thread a code through. The web posts the code it kept from
 * /uitnodiging; the app posts what the reader typed.
 *
 * 200 `{ ok: true, proUntil }` or 400 `{ error, message }`, where `message` is
 * Dutch and ready to show.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as { code?: unknown };
    const result = await claimReferral(auth.id, auth.isPro, body?.code);
    if ('reason' in result) {
      return jsonV1(
        { error: result.reason, message: CLAIM_REFUSAL_MESSAGES[result.reason] },
        { status: 400 },
      );
    }
    return jsonV1({ ok: true, proUntil: result.proUntil });
  } catch (error) {
    return handleV1Error(error);
  }
}
