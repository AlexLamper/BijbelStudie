import { corsPreflight, errorV1, jsonV1 } from '../../../../../lib/apiV1';
import { PUBLIC_CONTENT_CACHE_CONTROL } from '../../../../../lib/httpCache';
import {
  SCHEDULE_VERSION,
  chapterMinutes,
  getSchedule,
  getScheduleDay,
  isKnownScheduleVersion,
  isPlanKey,
  isTrackKey,
} from '../../../../../lib/bibleYear/schedule';
import { studyForDay } from '../../../../../lib/bibleYear/study';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/bible-year/schedule?plan=jaar-1&track=gemengd&version=1[&detail=1][&day=1]
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

  const full = getSchedule(plan, track, version);
  // `day=N`: only that day (the app's "Dag 1" preview), instead of 365-730.
  const rawDay = params.get('day');
  let schedule = full;
  if (rawDay !== null) {
    const day = getScheduleDay(full, Number(rawDay));
    if (!day) return errorV1('INVALID_FIELDS', 400, 'Deze dag hoort niet bij het leesplan.');
    schedule = { ...full, days: [day] };
  }
  // `detail=1`: every day also carries its 'studeren' commentary chapter and
  // question, and every ref its reading minutes (the app's per-chapter rows).
  const body =
    params.get('detail') === '1'
      ? {
          ...schedule,
          days: schedule.days.map((d) => ({
            ...d,
            portions: d.portions.map((p) => ({
              ...p,
              refs: p.refs.map((r) => ({ ...r, minutes: chapterMinutes(r.code, r.chapter) })),
            })),
            study: studyForDay(d) ?? undefined,
          })),
        }
      : schedule;
  return jsonV1(body, {
    headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_CONTROL },
  });
}
