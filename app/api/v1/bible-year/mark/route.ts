import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, jsonV1 } from '../../../../../lib/apiV1';
import { mark } from '../../../../../lib/bibleYear/service';
import { bibleYearErrorResponse, bibleYearRateLimit } from '../../../../../lib/bibleYear/routeHelpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/bible-year/mark
 *   { refs: [{code: "GEN", chapter: 1}], read: true } or { day: 12, read: false }
 * -> BibleYearMutationResponse. 404 without a running plan, 400 on an unknown
 * book, chapter or day. Ticking also records the chapters as read (no
 * chapter XP); a fully read day pays plan_day_read once.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const limited = bibleYearRateLimit(auth.id, 'mark');
    if (limited) return limited;
    const body = await req.json();
    return jsonV1(await mark(auth.id, body, { isPro: auth.isPro }));
  } catch (error) {
    return bibleYearErrorResponse(error);
  }
}
