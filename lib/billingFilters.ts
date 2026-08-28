/**
 * Mongo filters for the three billing states, in a module that imports nothing.
 *
 * They started out in lib/subscriptionSync, next to the predicates they mirror,
 * and that is what took the admin dashboard down: lib/subscriptionSync imports
 * lib/stripe, and lib/stripe throws at module scope when STRIPE_SECRET_KEY is
 * absent. /api/admin/stats needed nothing from it but these two plain objects,
 * yet importing them pulled the Stripe singleton into the route's module graph,
 * so an environment without a Stripe key answered every request to the stats
 * endpoint with a 500 raised before the handler - or the admin check - ever ran.
 * A refresh could not help, because nothing in the request was at fault.
 *
 * Nothing that only needs to *count* billing states should have to be able to
 * talk to Stripe, so these live where a route can read them without inheriting a
 * hard dependency on Stripe being configured. lib/subscriptionSync re-exports
 * them, so existing importers and tests are unaffected.
 *
 * `{ field: null }` matches both an explicit null and a missing field, which is
 * what "Stripe never wrote this" looks like in practice - the review-account
 * script sets `subscribed` and nothing else.
 *
 * These must keep agreeing with the predicates in lib/subscriptionSync;
 * tests/subscriptionSync.test.ts checks both against the same fixtures.
 */

/** Evidence that Stripe, not an admin or the App Store, granted this account. */
export const STRIPE_GRANTED_FILTER = {
  $or: [{ stripeSubscriptionId: { $ne: null } }, { subscriptionStatus: { $ne: null } }],
};

/** Entitled and actually billed by Stripe - the accounts that produce revenue. */
export const PAYING_STRIPE_FILTER = {
  subscribed: true,
  ...STRIPE_GRANTED_FILTER,
};

/** Entitled without anyone paying: the App Store review account, admin grants. */
export const COMPED_ACCESS_FILTER = {
  subscribed: true,
  storePremium: { $ne: true },
  stripeSubscriptionId: null,
  subscriptionStatus: null,
};
