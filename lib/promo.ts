/**
 * The free Pro trial, and the landing banner that announces it.
 *
 * The trial is always available to an account that has never had Pro - once
 * per account, ever (lib/trialEligibility.ts). It used to run as a recurring
 * action, one week on and one week off, because the banner counted down to a
 * deadline: under the EU Omnibus rules (UCPD Annex I, point 7) advertising a
 * deadline for an offer that never really stops is a banned practice, so the
 * trial had to genuinely disappear in the off-weeks. Now that the Pro offer
 * dialog (components/pricing/ProOfferDialog.tsx) offers the trial whenever a
 * reader reaches for something Pro, there is no deadline to announce, and
 * nothing may pretend there is one: no countdown, no "actie eindigt", no
 * "alleen vandaag". If a real, time-limited action is ever run again, it needs
 * its own end date that the checkout route also enforces.
 *
 * `NEXT_PUBLIC_PROMO_ENABLED=false` hides the landing banner. It does not
 * switch the trial itself off.
 */
export const PROMO_ENABLED = process.env.NEXT_PUBLIC_PROMO_ENABLED !== 'false';

/** Where "Probeer Pro" and the banner's tap target go. */
export const PROMO_LINK = '/abonnement';

/**
 * Length of the free trial, in days.
 *
 * This is the *only* place the number 7 is decided. `app/api/checkout` passes it
 * to Stripe as `subscription_data.trial_period_days`, so the claim on the
 * banner, the pricing page and the Pro offer, and what Stripe actually does,
 * cannot drift apart. Changing it here changes all of them.
 */
export const PRO_TRIAL_DAYS = 7;
