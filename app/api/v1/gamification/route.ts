import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { XP_LABELS, XP_VALUES, readProgressSummary } from '../../../../lib/gamification';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Level, XP and badges in one call, plus the XP table itself so the client can
 * show "wat levert het op?" without hardcoding numbers that then drift.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const summary = await readProgressSummary(auth.id, auth.isPro);
    if (!summary) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });

    return jsonV1({
      ...summary,
      xpTable: Object.entries(XP_VALUES).map(([event, value]) => ({
        event,
        value,
        label: XP_LABELS[event as keyof typeof XP_LABELS],
      })),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
