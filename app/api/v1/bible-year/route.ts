import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../lib/apiV1';
import { getState, patch, start } from '../../../../lib/bibleYear/service';
import { bibleYearErrorResponse, bibleYearRateLimit } from '../../../../lib/bibleYear/routeHelpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * "Bijbel in een jaar" (DAILY_HABIT_PLAN.md §4, contract lib/bibleYear/types.ts).
 * Cookie or bearer auth, like every v1 route.
 *
 * GET   -> BibleYearStateResponse (running plan, else the latest completed one, else null)
 * POST  BibleYearStartBody -> BibleYearMutationResponse; 409 ACTIVE_PLAN when one runs
 * PATCH BibleYearPatchBody (shift | stop | restart) -> BibleYearMutationResponse
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await getState(auth.id, new Date(), { isPro: auth.isPro }), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return bibleYearErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const limited = bibleYearRateLimit(auth.id, 'write');
    if (limited) return limited;
    const body = await req.json();
    return jsonV1(await start(auth.id, body));
  } catch (error) {
    return bibleYearErrorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireUser(req);
    const limited = bibleYearRateLimit(auth.id, 'write');
    if (limited) return limited;
    const body = await req.json();
    return jsonV1(await patch(auth.id, body));
  } catch (error) {
    return bibleYearErrorResponse(error);
  }
}
