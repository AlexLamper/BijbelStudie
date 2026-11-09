import type { NextRequest } from 'next/server';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { requireUser } from '../../../../lib/apiAuth';
import { PERSONAL_LIMIT_LINES, usageHeadline } from '../../../../lib/entitlements';
import { markAnnounceSeen, markRecapSeen, type TouchPlatform } from '../../../../lib/reverseTrial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/reverse-trial - the reverse trial for the caller (bearer or the
 * website's cookie), with what the recap and the personalised paywall show:
 * the trial's own numbers, the current streak, the personal limit in words and
 * the reader's headline ("Je stelde 9 vragen aan de AI in 3 dagen").
 *
 * `trial` is null on an account without a reverse trial (created before it
 * shipped); the paywall then leads with the generic pitch, as before.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await connectMongoDB();
    const row = await User.findById(user.id).select('streak').lean<{ streak?: number }>();
    const trial = user.trial;
    const feature = trial?.topFeature ?? null;
    return jsonV1({
      isPro: user.isPro,
      proSource: user.proSource,
      trial,
      limits: user.limits,
      streak: row?.streak ?? 0,
      personal: feature
        ? {
            feature,
            headline: trial ? usageHeadline(feature, trial.usage, trial.daysUsed) : null,
            limitLine: PERSONAL_LIMIT_LINES[feature],
          }
        : null,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

function asPlatform(value: unknown): TouchPlatform {
  return value === 'web' || value === 'ios' || value === 'android' ? value : null;
}

/**
 * POST /api/v1/reverse-trial `{ action, platform }`, once per account across
 * both clients - the other client will not show it again:
 *  - `recap_seen`: "Je Pro-dagen zitten erop" was shown;
 *  - `announce_seen`: "Je hebt 3 dagen Pro gekregen" was shown (the one-time
 *    trial of an older account).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const platform = asPlatform(body?.platform);
    if (body?.action === 'recap_seen') return jsonV1({ ok: true, first: await markRecapSeen(user.id, platform) });
    if (body?.action === 'announce_seen') return jsonV1({ ok: true, first: await markAnnounceSeen(user.id, platform) });
    return errorV1('UNKNOWN_ACTION', 400, 'Onbekende actie.');
  } catch (error) {
    return handleV1Error(error);
  }
}
