import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { getPlan, setDay } from '../../../../../lib/planService';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** `?planId=<id>` - the caller's progress on one plan. */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const planId = new URL(req.url).searchParams.get('planId');
    if (!planId) return errorV1('MISSING_FIELDS', 400, 'planId is required');

    const plan = await getPlan(auth.id, planId);
    return jsonV1({
      planId: plan.id,
      isEnrolled: plan.isEnrolled,
      completedDays: plan.completedDays,
      studiedDays: plan.studiedDays,
      progressPercentage: plan.progressPercentage,
      currentDay: plan.currentDay,
      scheduledDay: plan.scheduledDay,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Marks a plan day done. `mode: 'studied'` records that the passage was worked
 * through rather than only read - it is worth three times the XP and is the
 * only form that writes a StudyProgress row.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json()) ?? {};
    const day = Number(body.day);

    if (!body.planId || !Number.isInteger(day)) {
      return errorV1('MISSING_FIELDS', 400, 'planId and day are required');
    }

    const result = await setDay(auth.id, body.planId, day, {
      completed: true,
      mode: body.mode,
      isPro: auth.isPro,
    });

    return jsonV1({
      planId: result.plan.id,
      completedDays: result.plan.completedDays,
      studiedDays: result.plan.studiedDays,
      progressPercentage: result.plan.progressPercentage,
      currentDay: result.plan.currentDay,
      planCompleted: result.planCompleted,
      xp: result.xp,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/** `?planId=<id>&day=<n>` - undoes a completed day. XP already earned stays. */
export async function DELETE(req: Request) {
  try {
    const auth = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');
    const day = Number(searchParams.get('day'));

    if (!planId || !Number.isInteger(day)) {
      return errorV1('MISSING_FIELDS', 400, 'planId and day are required');
    }

    const result = await setDay(auth.id, planId, day, { completed: false, isPro: auth.isPro });

    return jsonV1({
      planId: result.plan.id,
      completedDays: result.plan.completedDays,
      studiedDays: result.plan.studiedDays,
      progressPercentage: result.plan.progressPercentage,
      currentDay: result.plan.currentDay,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
