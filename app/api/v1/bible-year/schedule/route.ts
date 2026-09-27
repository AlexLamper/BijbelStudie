import { corsPreflight, errorV1, jsonV1 } from '../../../../../lib/apiV1';
import { PUBLIC_CONTENT_CACHE_CONTROL } from '../../../../../lib/httpCache';
import { SCHEDULE_VERSION, getSchedule, isKnownScheduleVersion, isPlanKey, isTrackKey } from '../../../../../lib/bibleYear/schedule';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/bible-year/schedule?plan=jaar-1&track=gemengd&version=1
 *
 * The static schedule (BibleYearSchedule). Public and identical for every
 * caller - no session is read - so the CDN answers repeats. `version` (alias
 * `v`) defaults to the current SCHEDULE_VERSION; a running plan asks for the
 * version stored on its enrollment.
 */
export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const plan = params.get('plan');
  const track = params.get('track');
  const rawVersion = params.get('version') ?? params.get('v');
  const version = rawVersion === null || rawVersion === '' ? SCHEDULE_VERSION : Number(rawVersion);

  if (!isPlanKey(plan)) return errorV1('INVALID_FIELDS', 400, 'Onbekend leesplan.');
  if (!isTrackKey(track)) return errorV1('INVALID_FIELDS', 400, 'Onbekende volgorde.');
  if (!isKnownScheduleVersion(version)) return errorV1('NOT_FOUND', 404, 'Onbekende schemaversie.');

  return jsonV1(getSchedule(plan, track, version), {
    headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_CONTROL },
  });
}
