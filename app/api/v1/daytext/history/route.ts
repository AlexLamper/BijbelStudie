import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { readDayTextHistory } from '../../../../../lib/mobileDayText';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * The verse-of-the-day archive, newest day first.
 *
 * Public like `/api/v1/daytext` itself: the verse of the day is the same for
 * everyone, so there is nothing per-user to protect. Clients merge this with
 * whatever they recorded locally, which is what makes "Voorgaande dagen"
 * survive a reinstall - device storage alone starts empty.
 */
export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 60);
    const entries = await readDayTextHistory(Number.isFinite(limit) ? limit : 60);
    return jsonV1(
      { entries },
      { headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400' } },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
