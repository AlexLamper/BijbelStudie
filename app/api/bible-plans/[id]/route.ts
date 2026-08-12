import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/apiAuth';
import { getPlan } from '../../../../lib/planService';
import { planErrorResponse, withLegacyId } from '../../../../lib/planLegacy';

/** Plan detail for the website, including the caller's day-by-day progress. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(request);
    const { id } = await params;
    const plan = await getPlan(auth.id, id);
    return NextResponse.json({ plan: withLegacyId(plan) });
  } catch (error) {
    return planErrorResponse(error, 'api/bible-plans/[id]');
  }
}
