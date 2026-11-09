import connectMongoDB from './mongodb';
import User from '../models/User';
import { grantXp, type GrantResult } from './gamification';

/**
 * The app's hands-on onboarding guide: once it has been walked to the end, the
 * account is paid `onboarding_guide` XP so the reader's tree grows on the
 * guide's last card.
 *
 * Once per account, ever. The marker is claimed with a conditional write
 * before any XP moves, so a double tap, a retry after a dropped response, a
 * second device or a replay from Profiel all find it taken and pay nothing -
 * the same shape as `referralCreditedAt` in lib/referral.ts. The marker is a
 * new field with no default, so every existing document reads as "not yet"
 * and nothing has to be migrated.
 */

export type GuideRewardResult = {
  /** True only for the one call that paid the XP. */
  rewarded: boolean;
  /** The grant, in the shape every XP route returns as `xp`; null when nothing was paid. */
  xp: GrantResult | null;
};

export async function grantOnboardingGuideXp(
  userId: string,
  options: { isPro: boolean; now?: Date },
): Promise<GuideRewardResult> {
  await connectMongoDB();

  const claimed = await User.updateOne(
    // `null` matches a missing field as well as an explicit null.
    { _id: userId, onboardingGuideRewardedAt: null },
    { $set: { onboardingGuideRewardedAt: options.now ?? new Date() } },
  );
  if (claimed.modifiedCount !== 1) return { rewarded: false, xp: null };

  const xp = await grantXp(userId, 'onboarding_guide', { isPro: options.isPro });
  return { rewarded: true, xp };
}
