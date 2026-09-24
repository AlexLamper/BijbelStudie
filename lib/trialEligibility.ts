import stripe from './stripe';
import User from '../models/User';
import { hasHadProOrTrial, type TrialUserFields } from './proHistory';

export { hasHadProOrTrial, TRIAL_USER_FIELDS, type TrialUserFields } from './proHistory';

/**
 * Who may start the free Pro trial (lib/promo.ts `PRO_TRIAL_DAYS`).
 *
 * Once per account, ever - whether it was started from the landing banner, the
 * pricing page or the Pro offer dialog, it is the same trial. Anyone who has
 * ever had Pro in any form is out, because a trial is for trying Pro, not for
 * getting it back for free: a cancelled Stripe subscriber would otherwise
 * cancel, wait and "try" again.
 *
 * Two layers, and either one is disqualifying:
 *  1. the account's own billing fields - `subscriptionStartedAt` is write-once
 *     (lib/subscriptionSync keeps the first start date through a resubscribe),
 *     `proTrialUsedAt` is set the moment a trialing subscription is seen and
 *     never cleared, and the store fields record an App Store / Play purchase;
 *  2. a live look at Stripe for ANY subscription this customer has ever had, in
 *     any status. It does not depend on a webhook having arrived, so a missed or
 *     failed sync cannot open the door.
 *
 * Not burned by an abandoned checkout: opening checkout and walking away
 * creates no subscription, so the account stays eligible. The marker follows
 * the subscription, not the intent.
 */

/**
 * Both layers. `customerId` overrides the stored one, for the checkout route,
 * which may have just created or replaced the Stripe customer.
 *
 * Fails closed: if Stripe cannot be reached, no trial. Checkout itself still
 * proceeds at full price.
 */
export async function resolveTrialEligibility(
  user: TrialUserFields,
  customerId: string | null | undefined = user.stripeCustomerId,
): Promise<boolean> {
  if (hasHadProOrTrial(user)) return false;
  if (!customerId) return true;

  try {
    const prior = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
    if (prior.data.length === 0) return true;

    // Backfill the marker so the next check is settled locally without another
    // round trip. `updateOne` on the one field - never `save()` on a hydrated
    // User (see app/api/checkout).
    const priorTrial = prior.data.find((s) => s.trial_start)?.trial_start;
    await User.updateOne(
      { _id: user._id, proTrialUsedAt: null },
      { $set: { proTrialUsedAt: priorTrial ? new Date(priorTrial * 1000) : new Date() } },
    );
    return false;
  } catch (err) {
    console.error('[trial] eligibility lookup failed, withholding trial', err);
    return false;
  }
}
