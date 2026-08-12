import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/apiAuth';
import { setDay } from '../../../../lib/planService';
import { planErrorResponse } from '../../../../lib/planLegacy';

/**
 * Marks a plan day done. `mode: 'studied'` records that the passage was worked
 * through rather than skimmed; it earns three times the XP and is the only
 * form that writes a StudyProgress row.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    const { planId, day, mode } = await request.json();
    if (!planId || day === undefined) {
      return NextResponse.json({ error: 'Plan ID and day are required' }, { status: 400 });
    }

    const result = await setDay(auth.id, planId, Number(day), {
      completed: true,
      mode,
      isPro: auth.isPro,
    });

    return NextResponse.json({
      success: true,
      message: 'Day marked as completed',
      completedDays: result.plan.completedDays,
      studiedDays: result.plan.studiedDays,
      progressPercentage: result.plan.progressPercentage,
      currentDay: result.plan.currentDay,
      planCompleted: result.planCompleted,
      xp: result.xp,
    });
  } catch (error) {
    return planErrorResponse(error, 'api/bible-plans/progress');
  }
}

/** `?planId=<id>&day=<n>`. XP already earned is not clawed back. */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const day = Number(searchParams.get('day'));

    if (!planId || !Number.isInteger(day)) {
      return NextResponse.json({ error: 'Plan ID and day are required' }, { status: 400 });
    }

    const result = await setDay(auth.id, planId, day, { completed: false, isPro: auth.isPro });

    return NextResponse.json({
      success: true,
      message: 'Day marked as not completed',
      completedDays: result.plan.completedDays,
      studiedDays: result.plan.studiedDays,
      progressPercentage: result.plan.progressPercentage,
      currentDay: result.plan.currentDay,
    });
  } catch (error) {
    return planErrorResponse(error, 'api/bible-plans/progress');
  }
}
