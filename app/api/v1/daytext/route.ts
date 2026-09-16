import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { dayTextCacheControl } from '../../../../lib/httpCache';
import { dayTextInVersion, fetchDayText } from '../../../../lib/mobileDayText';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Verse of the day. Public, exactly like the website's `/api/bible/daytext` -
 * the splash and the widget need it before a session exists.
 *
 * `?version=<translation id>` is optional and additive: builds that do not
 * send it get the Statenvertaling payload they always did. With it, the same
 * verse comes back in that translation, plus `versionId` and `attribution`
 * (the NBG51 copyright notice, verbatim; null for public domain). A
 * translation outside `MOBILE_ALLOWED_BIBLES`, or one lacking the verse, falls
 * back to the Statenvertaling - never a 451, since the card must render.
 */
export async function GET(req: Request) {
  try {
    const verse = await fetchDayText();
    if (!verse) return errorV1('UPSTREAM_UNAVAILABLE', 502, 'Externe API niet bereikbaar');

    const requested = new URL(req.url).searchParams.get('version');
    const payload = requested ? await dayTextInVersion(verse, requested) : verse;

    return jsonV1(payload, {
      // The query string is part of the cache key, so translations do not bleed.
      // Expires at Amsterdam midnight at the latest, so no cache serves
      // yesterday's verse into the new day.
      headers: { 'Cache-Control': dayTextCacheControl() },
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
