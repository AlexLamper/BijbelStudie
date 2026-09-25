/**
 * "Has this account ever had Pro?", in a module that imports nothing.
 *
 * It lived in lib/trialEligibility, which imports lib/stripe - and lib/stripe
 * throws at module scope without STRIPE_SECRET_KEY (see lib/billingFilters for
 * the outage that caused). The referral routes need this answer and nothing
 * from Stripe, so it lives here; lib/trialEligibility re-exports it.
 */

export interface TrialUserFields {
  _id: unknown;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStartedAt?: Date | null;
  proTrialUsedAt?: Date | null;
  storePremium?: boolean | null;
  storePremiumPlatform?: string | null;
  storePremiumExpiresAt?: Date | null;
}

/** The fields `hasHadProOrTrial` and `resolveTrialEligibility` read, for a `.select()`. */
export const TRIAL_USER_FIELDS =
  'stripeCustomerId stripeSubscriptionId subscriptionStartedAt proTrialUsedAt storePremium storePremiumPlatform storePremiumExpiresAt';

/** What the account itself says about past Pro. Pure, so it is tested directly. */
export function hasHadProOrTrial(user: Omit<TrialUserFields, '_id'>): boolean {
  return Boolean(
    user.stripeSubscriptionId ||
      user.subscriptionStartedAt ||
      user.proTrialUsedAt ||
      user.storePremium ||
      user.storePremiumPlatform ||
      user.storePremiumExpiresAt,
  );
}
