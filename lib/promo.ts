/**
 * Free trials: switched off.
 *
 * Alex, 20 November 2026: no more proefperiodes anywhere. Pro is bought or it
 * is not had - a hard paywall on the Pro features. What stays free stays free:
 * reading the Bible in every available translation (the HSV and Het Woord
 * licences were granted on exactly that basis - free reading, no paywall), the
 * guided studies, KingComments, the groups, and the normal free daily
 * allowances in lib/entitlements.ts. Nothing about those limits changed here.
 *
 * Three different trials existed, and this is how each one is off:
 *
 *  1. The Stripe trial (this file used to set it to 7 days, and
 *     app/api/checkout passed it as `subscription_data.trial_period_days`).
 *     [TRIALS_ENABLED] is the switch; lib/trialEligibility.ts refuses every
 *     account while it is false, so checkout and /api/trial cannot disagree.
 *  2. The reverse trial, three free Pro days for a new account
 *     (lib/reverseTrialRules.ts). `planTouch` no longer starts one. Trials that
 *     were already running when this shipped are deliberately left alone: they
 *     finish, their recap shows, and their personal limit lands as before.
 *     Nobody lost access on the day of the change.
 *  3. The 7-day store trial on the yearly plan. That one is NOT in this
 *     codebase: it is an introductory offer in App Store Connect and the
 *     `trial-7d` offer in the Play Console, and it has to be withdrawn in both
 *     consoles. Until it is, new iOS and Android readers still get their week
 *     from Apple or Google and the app mirrors it, because a store entitlement
 *     is the store's word and we only reflect it (lib/revenuecatSync.ts).
 *
 * Nothing in the product may promise a trial while this is false. A page that
 * advertises "7 dagen gratis" and a checkout that charges on day one is a
 * misleading commercial practice under the UCPD, the same rule that shaped the
 * banner this file used to carry.
 */
export const TRIALS_ENABLED = false;

/**
 * How long the Stripe trial was, and would be again.
 *
 * Dormant while [TRIALS_ENABLED] is false: app/api/checkout only reaches it on
 * an eligible account, and lib/trialEligibility.ts makes nobody eligible. It
 * stays the one place the number is decided, so the day this is switched back
 * on the screen and the charge cannot drift apart - which is the mistake that
 * made this constant necessary in the first place.
 */
export const PRO_TRIAL_DAYS = 7;

/** Where "Word Pro" and the pricing links go. */
export const PROMO_LINK = '/abonnement';
