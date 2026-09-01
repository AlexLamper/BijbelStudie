import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { fetchDayText } from '../../../../lib/mobileDayText';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Verse of the day. Public, exactly like the website's `/api/bible/daytext` -
 * the splash and the widget need it before a session exists.
 */
export async function GET() {
  try {
    const verse = await fetchDayText();
    if (!verse) return errorV1('UPSTREAM_UNAVAILABLE', 502, 'Externe API niet bereikbaar');
    return jsonV1(verse, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
