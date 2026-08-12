import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { enrol, unenrol } from '../../../../../lib/planService';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** Enrols the caller. Free accounts may hold one active plan, same as the site. */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json()) ?? {};
    if (!body.planId) return errorV1('MISSING_FIELDS', 400, 'planId is required');

    const plan = await enrol(auth.id, body.planId, { isPro: auth.isPro, pace: body.pace });
    return jsonV1({ planId: plan.id, isEnrolled: true, plan });
  } catch (error) {
    return handleV1Error(error);
  }
}

/** `?planId=<id>` — leaves the plan and drops the caller's progress. */
export async function DELETE(req: Request) {
  try {
    const auth = await requireUser(req);
    const planId = new URL(req.url).searchParams.get('planId');
    if (!planId) return errorV1('MISSING_FIELDS', 400, 'planId is required');

    await unenrol(auth.id, planId);
    return jsonV1({ planId, isEnrolled: false });
  } catch (error) {
    return handleV1Error(error);
  }
}
