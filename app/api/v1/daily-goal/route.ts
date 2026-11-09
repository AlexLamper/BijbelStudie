import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import {
  clampReportSeconds,
  isDailyGoalMinutes,
  normaliseDay,
  platformOf,
  readDailyGoal,
  reportReading,
  setDailyGoal,
} from '../../../../lib/dailyGoal';
import { recordServerEvent } from '../../../../lib/serverAnalytics';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

const NO_STORE = { 'Cache-Control': 'private, no-store' };

const SOURCES = new Set(['setup', 'settings', 'start', 'web_dashboard', 'web_settings']);

/**
 * GET /api/v1/daily-goal?day=YYYY-MM-DD
 *
 * Today's goal and how far the reader is (lib/dailyGoal.ts DailyGoalView).
 * `day` is the client's local day; without it, the Dutch day.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const day = normaliseDay(new URL(req.url).searchParams.get('day'));
    return jsonV1({ goal: await readDailyGoal(auth.id, day) }, { headers: NO_STORE });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * PATCH /api/v1/daily-goal  { minutes: 5|10|15|20, day?, source?, platform? }
 *
 * Picks the goal. Shared by web and app: the one stored value both read.
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const minutes = body?.minutes;
    if (!isDailyGoalMinutes(minutes)) {
      return errorV1('INVALID_GOAL', 400, 'Kies 5, 10, 15 of 20 minuten.');
    }
    const day = normaliseDay(body?.day);
    const goal = await setDailyGoal(auth.id, minutes, day);
    const source = typeof body?.source === 'string' && SOURCES.has(body.source) ? body.source : undefined;
    await recordServerEvent('daily_goal_set', auth.id, {
      minutes: String(minutes),
      source,
      platform: platformOf(body?.platform),
    });
    return jsonV1({ goal }, { headers: NO_STORE });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * POST /api/v1/daily-goal  { seconds, day, platform? }
 *
 * Adds reading time. `justReached` is true on exactly one report per day, and
 * `xp` is then the `daily_goal` grant in the GrantResult shape every other XP
 * route returns, so the app's tree bus can animate it like any other grant.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const day = normaliseDay(body?.day);
    const seconds = clampReportSeconds(body?.seconds);
    const result = await reportReading(
      auth.id,
      { day, seconds },
      { isPro: auth.isPro, platform: platformOf(body?.platform) },
    );
    return jsonV1(result, { headers: NO_STORE });
  } catch (error) {
    return handleV1Error(error);
  }
}
