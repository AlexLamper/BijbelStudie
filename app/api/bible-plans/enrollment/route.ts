import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/apiAuth';
import { enrol, unenrol } from '../../../../lib/planService';
import { planErrorResponse, withLegacyId } from '../../../../lib/planLegacy';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    const body = await request.json();
    if (!body?.planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const plan = await enrol(auth.id, body.planId, { isPro: auth.isPro, pace: body.pace });
    return NextResponse.json({ message: 'Enrolled', plan: withLegacyId(plan) });
  } catch (error) {
    return planErrorResponse(error, 'api/bible-plans/enrollment');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    const planId = new URL(request.url).searchParams.get('planId');
    if (!planId) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

    await unenrol(auth.id, planId);
    return NextResponse.json({ message: 'Unenrolled', planId });
  } catch (error) {
    return planErrorResponse(error, 'api/bible-plans/enrollment');
  }
}
