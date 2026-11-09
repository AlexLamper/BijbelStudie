import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { grantOnboardingGuideXp } from '../../../../../lib/onboardingGuide';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * The app's onboarding guide was walked to the end: pay its one-time XP.
 *
 * Idempotent per account (lib/onboardingGuide.ts), so the app may retry until
 * it gets an answer. `xp` is the usual grant object every XP route returns,
 * which the app hands to the tree so it grows on the guide's last card; it is
 * null, with `rewarded: false`, for every call after the first.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const result = await grantOnboardingGuideXp(auth.id, { isPro: auth.isPro });
    return jsonV1({ rewarded: result.rewarded, xp: result.xp });
  } catch (error) {
    return handleV1Error(error);
  }
}
