import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import {
  buildNotificationSchedule,
  clampScheduleDays,
  parseExclude,
  resolveTimeZone,
} from '../../../../../lib/notificationSchedule';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/notifications/schedule?days=14&tz=Europe/Amsterdam&exclude=bibleYear,study,verse
 *
 * Morning + evening notification content per local date, for the app to
 * schedule on the device (DAILY_HABIT_PLAN.md §2). Shape:
 * lib/notificationScheduleTypes.ts. `days` clamps to 1..14; an unknown `tz`
 * falls back to Europe/Amsterdam and the zone used is echoed back.
 *
 * Cheap on purpose: two indexed reads plus one upstream verse per date (each a
 * shared Data Cache entry, never written to the archive). The app refetches on
 * launch/resume and after progress. `no-cache`: a stale copy would announce a
 * lesson or plan day the reader has already done, so every fetch revalidates.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const url = new URL(req.url);
    const days = clampScheduleDays(url.searchParams.get('days'));
    const timeZone = resolveTimeZone(url.searchParams.get('tz'));

    const exclude = parseExclude(url.searchParams.get('exclude'));

    const payload = await buildNotificationSchedule(auth.id, { days, timeZone, exclude });

    return jsonV1(payload, {
      // Per user: never a shared/CDN copy.
      headers: { 'Cache-Control': 'private, no-cache', Vary: 'Authorization, Cookie' },
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
