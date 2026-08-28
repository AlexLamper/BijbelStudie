import type Stripe from "stripe";
import stripe from "./stripe";
import connectMongoDB from "./mongodb";
import User from "../models/User";

/**
 * Stripe -> Mongo billing state, in one place.
 *
 * Extracted from the webhook route because three other callers need exactly the
 * same write (the /succes redirect, the self-heal on /api/subscription/status,
 * and admin reconciliation), and because of the failure that made this file
 * necessary:
 *
 * The webhook used to load the user with `User.findOne(...)`, mutate it and call
 * `user.save()`. `save()` validates the *entire* document, so one unrelated
 * corrupt field anywhere on the user made every billing write throw. That is not
 * hypothetical - a `readChapters` map that had picked up a `$*` key whose value
 * was an object instead of a number array produced
 *
 *   ValidationError: readChapters.$*.0: Cast to [Number] failed
 *
 * on save, which became a 500 from the webhook, a 500 from
 * /api/verify-subscription, and a paying customer with no access for as long as
 * the bad key sat there.
 *
 * Everything here therefore writes with `updateOne`/`$set` on explicit paths and
 * reads with `.lean()`. A billing write must never be able to fail because of a
 * field that has nothing to do with billing.
 */

/** Stripe statuses that grant access. */
const ENTITLED = new Set(["active", "trialing"]);

/** Ranked best-first when a customer somehow has more than one subscription. */
const STATUS_RANK = ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"];

/** Never-expiring sentinel for an indefinite `pause_collection`. */
const FOREVER = 8640000000000000;

export interface BillingSnapshot {
  subscribed: boolean;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  subscriptionInterval: "monthly" | "annual" | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  pausedUntil: Date | null;
  subscriptionStartedAt: Date | null;
}

export interface SyncResult {
  matched: boolean;
  userId?: string;
  email?: string;
  customerId: string | null;
  /** Field names whose value actually moved. Empty means already in sync. */
  changed: string[];
  snapshot?: BillingSnapshot;
  reason?: string;
}

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number | null;
  current_period_start?: number | null;
};

export function intervalOf(subscription: Stripe.Subscription): "monthly" | "annual" | null {
  const recurring = subscription.items.data[0]?.price?.recurring;
  if (!recurring) return null;
  if (recurring.interval === "year") return "annual";
  if (recurring.interval === "month") return "monthly";
  return null;
}

/**
 * `current_period_end` sat on the subscription itself up to the acacia API
 * versions and moved onto the subscription *item* afterwards. Reading both means
 * a Stripe API version bump cannot silently start writing null renewal dates.
 */
export function periodEndOf(subscription: Stripe.Subscription): Date | null {
  const sub = subscription as SubscriptionWithPeriod;
  const item = subscription.items.data[0] as { current_period_end?: number } | undefined;
  const seconds = sub.current_period_end ?? item?.current_period_end ?? null;
  return seconds ? new Date(seconds * 1000) : null;
}

export function customerIdOf(source: Stripe.Subscription | Stripe.Invoice): string | null {
  const customer = source.customer;
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/** The billing state a given Stripe subscription implies. */
export function snapshotOf(subscription: Stripe.Subscription): BillingSnapshot {
  return {
    subscribed: ENTITLED.has(subscription.status),
    subscriptionStatus: subscription.status,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0]?.price?.id ?? null,
    subscriptionInterval: intervalOf(subscription),
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    currentPeriodEnd: periodEndOf(subscription),
    pausedUntil: subscription.pause_collection
      ? subscription.pause_collection.resumes_at
        ? new Date(subscription.pause_collection.resumes_at * 1000)
        : new Date(FOREVER)
      : null,
    subscriptionStartedAt: subscription.start_date
      ? new Date(subscription.start_date * 1000)
      : null,
  };
}

/** The state for a customer Stripe has no subscription for at all. */
export function emptySnapshot(): BillingSnapshot {
  return {
    subscribed: false,
    subscriptionStatus: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    subscriptionInterval: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    pausedUntil: null,
    subscriptionStartedAt: null,
  };
}

/** Most relevant subscription first: entitled beats broken, newer beats older. */
export function pickPrimary(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
  if (subscriptions.length === 0) return null;
  return [...subscriptions].sort((a, b) => {
    const rankA = STATUS_RANK.indexOf(a.status);
    const rankB = STATUS_RANK.indexOf(b.status);
    const normA = rankA === -1 ? STATUS_RANK.length : rankA;
    const normB = rankB === -1 ? STATUS_RANK.length : rankB;
    if (normA !== normB) return normA - normB;
    return (b.created ?? 0) - (a.created ?? 0);
  })[0];
}

export interface LocalBilling {
  _id: unknown;
  email?: string;
  subscribed?: boolean;
  subscriptionStatus?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  subscriptionInterval?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date | null;
  pausedUntil?: Date | null;
  subscriptionStartedAt?: Date | null;
  billingIssueSince?: Date | null;
  stripeCustomerId?: string | null;
  /** Store entitlement, so a comped account is not confused with an App Store one. */
  storePremium?: boolean;
}

export const BILLING_SELECT =
  "email subscribed subscriptionStatus stripeSubscriptionId stripePriceId " +
  "subscriptionInterval cancelAtPeriodEnd currentPeriodEnd pausedUntil " +
  "subscriptionStartedAt billingIssueSince stripeCustomerId storePremium";

function sameDate(a: Date | null | undefined, b: Date | null | undefined): boolean {
  const ta = a ? new Date(a).getTime() : null;
  const tb = b ? new Date(b).getTime() : null;
  return ta === tb;
}

/**
 * Did Stripe ever grant this account's access?
 *
 * `subscribed` is not owned by Stripe alone. It is also the flag the admin Pro
 * toggle sets and the one scripts/ensure-review-account.mjs writes for the App
 * Store review account - deliberately, because that grant "survives every sync"
 * and must not be able to lapse in the middle of a review cycle.
 *
 * So Stripe having no subscription for an account is only evidence of
 * cancellation when Stripe is what granted access in the first place. Without
 * this test, reconciliation reads "Stripe has never heard of you" as "you should
 * lose access" and revokes every comped account in the database - which would
 * have failed the next App Store submission outright.
 *
 * A Stripe subscription id or a recorded Stripe status is that evidence: both are
 * written only by lib/subscriptionSync, from Stripe's own data.
 */
export function stripeGrantedAccess(local: LocalBilling): boolean {
  return !!local.stripeSubscriptionId || !!local.subscriptionStatus;
}

/** Entitled and actually billed by Stripe - the accounts that produce revenue. */
export function isPayingViaStripe(local: LocalBilling): boolean {
  return !!local.subscribed && stripeGrantedAccess(local);
}

/**
 * Entitled without anyone paying for it: the App Store review account and any
 * account an admin switched to Pro by hand.
 *
 * These must not reach revenue figures. The review account carries
 * `subscribed: true` with no interval, so the MRR fallback that prices an
 * unknown interval as monthly invented EUR 9,99 a month of income that nobody is
 * being charged - on an account that exists purely so Apple's reviewers can see
 * the paid features.
 */
export function isCompedAccess(local: LocalBilling): boolean {
  return !!local.subscribed && !stripeGrantedAccess(local) && !local.storePremium;
}

/**
 * The Mongo equivalents of the three predicates above, for counting without
 * pulling every user into memory, live in lib/billingFilters.
 *
 * They are re-exported here so this file stays the one place to look for the
 * billing-state rules, but they are *defined* in a module that imports nothing:
 * a caller that only counts states must not have to import this file, because
 * this file imports lib/stripe, which throws at module scope without a Stripe
 * key. That is exactly how counting comped accounts on /admin turned into a 500
 * on the whole dashboard. See the comment in lib/billingFilters.ts.
 */
export {
  STRIPE_GRANTED_FILTER,
  PAYING_STRIPE_FILTER,
  COMPED_ACCESS_FILTER,
} from "./billingFilters";

/**
 * Builds the `$set` a snapshot implies for one account, and the list of fields
 * it moves. Split out from the write so a dry run can report exactly what a
 * repair would do without doing it.
 */
export function diffSnapshot(
  local: LocalBilling,
  snapshot: BillingSnapshot,
  options?: { customerId?: string | null }
): { set: Record<string, unknown>; changed: string[] } {
  const set: Record<string, unknown> = {};
  const changed: string[] = [];

  const assign = (field: string, next: unknown, current: unknown, equal?: boolean) => {
    if (equal ?? next === current) return;
    set[field] = next;
    changed.push(field);
  };

  // Granting is always safe. Revoking is only Stripe's call when Stripe is what
  // granted access - see `stripeGrantedAccess`. A comped or admin-granted account
  // is left exactly as it is.
  const revoking = !snapshot.subscribed && !!local.subscribed;
  if (!revoking || stripeGrantedAccess(local)) {
    assign("subscribed", snapshot.subscribed, !!local.subscribed);
  }

  assign("subscriptionStatus", snapshot.subscriptionStatus, local.subscriptionStatus ?? null);
  assign("stripeSubscriptionId", snapshot.stripeSubscriptionId, local.stripeSubscriptionId ?? null);
  assign("cancelAtPeriodEnd", snapshot.cancelAtPeriodEnd, !!local.cancelAtPeriodEnd);
  assign(
    "currentPeriodEnd",
    snapshot.currentPeriodEnd,
    local.currentPeriodEnd ?? null,
    sameDate(snapshot.currentPeriodEnd, local.currentPeriodEnd)
  );
  assign(
    "pausedUntil",
    snapshot.pausedUntil,
    local.pausedUntil ?? null,
    sameDate(snapshot.pausedUntil, local.pausedUntil)
  );

  // Keep the last known price/interval when Stripe cannot tell us a new one,
  // rather than blanking a field the billing UI reads.
  if (snapshot.stripePriceId) {
    assign("stripePriceId", snapshot.stripePriceId, local.stripePriceId ?? null);
  }
  if (snapshot.subscriptionInterval) {
    assign(
      "subscriptionInterval",
      snapshot.subscriptionInterval,
      local.subscriptionInterval ?? null
    );
  }

  // First start date wins - a resubscribe should not reset subscription tenure.
  if (snapshot.subscriptionStartedAt && !local.subscriptionStartedAt) {
    set.subscriptionStartedAt = snapshot.subscriptionStartedAt;
    changed.push("subscriptionStartedAt");
  }

  // A healthy subscription means any recorded payment problem is over.
  if (snapshot.subscribed && snapshot.subscriptionStatus !== "past_due" && local.billingIssueSince) {
    set.billingIssueSince = null;
    changed.push("billingIssueSince");
  }

  if (options?.customerId && local.stripeCustomerId !== options.customerId) {
    set.stripeCustomerId = options.customerId;
    changed.push("stripeCustomerId");
  }

  return { set, changed };
}

/** Applies a snapshot to one user document. Returns the field names that moved. */
export async function writeSnapshot(
  local: LocalBilling,
  snapshot: BillingSnapshot,
  options?: { customerId?: string | null }
): Promise<string[]> {
  const { set, changed } = diffSnapshot(local, snapshot, options);
  if (changed.length === 0) return [];

  // `updateOne` with explicit paths, never `save()`: see the note at the top of
  // this file. A corrupt unrelated field must not be able to block this.
  await User.updateOne({ _id: local._id }, { $set: set });
  return changed;
}

/**
 * Resolves the local account a Stripe subscription belongs to and writes its
 * billing state.
 *
 * Identity is never taken from a request body. `metadata.userId` is trusted only
 * because callers hand us a subscription that came out of a signature-verified
 * event or straight from the Stripe API.
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<SyncResult> {
  const customerId = customerIdOf(subscription);
  if (!customerId) {
    return { matched: false, customerId: null, changed: [], reason: "no_customer_on_subscription" };
  }

  await connectMongoDB();

  let local = await User.findOne({ stripeCustomerId: customerId })
    .select(BILLING_SELECT)
    .lean<LocalBilling>();

  if (!local) {
    const metadataUserId = subscription.metadata?.userId;
    if (metadataUserId) {
      local = await User.findById(metadataUserId).select(BILLING_SELECT).lean<LocalBilling>();
    }
  }

  if (!local) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      const email = customer.deleted ? null : (customer as Stripe.Customer).email;
      if (email) {
        local = await User.findOne({ email }).select(BILLING_SELECT).lean<LocalBilling>();
      }
    } catch {
      // A customer we cannot read is a customer we cannot match. Fall through.
    }
  }

  if (!local) {
    return { matched: false, customerId, changed: [], reason: "no_local_user" };
  }

  const snapshot = snapshotOf(subscription);
  const changed = await writeSnapshot(local, snapshot, { customerId });

  return {
    matched: true,
    userId: String(local._id),
    email: local.email,
    customerId,
    changed,
    snapshot,
  };
}

/**
 * Pulls the truth for one account straight from Stripe. Used by the self-heal
 * paths and by admin reconciliation, where there is no event to work from.
 */
export async function reconcileUserFromStripe(userId: string): Promise<SyncResult> {
  await connectMongoDB();

  const local = await User.findById(userId).select(BILLING_SELECT).lean<LocalBilling>();
  if (!local) return { matched: false, customerId: null, changed: [], reason: "no_local_user" };

  if (!local.stripeCustomerId) {
    // No Stripe customer at all. Nothing was ever paid through Stripe, so Stripe
    // has nothing to say about this account - including about a `subscribed`
    // flag some other mechanism set. `diffSnapshot` enforces that; this only
    // clears leftover Stripe fields that claim a subscription exists.
    const changed = await writeSnapshot(local, emptySnapshot());
    return { matched: true, userId, email: local.email, customerId: null, changed };
  }

  const list = await stripe.subscriptions.list({
    customer: local.stripeCustomerId,
    status: "all",
    limit: 100,
  });

  const primary = pickPrimary(list.data);
  const snapshot = primary ? snapshotOf(primary) : emptySnapshot();
  const changed = await writeSnapshot(local, snapshot, { customerId: local.stripeCustomerId });

  return {
    matched: true,
    userId,
    email: local.email,
    customerId: local.stripeCustomerId,
    changed,
    snapshot,
  };
}

/** Records that an invoice failed, without revoking access. */
export async function markBillingIssue(invoice: Stripe.Invoice): Promise<void> {
  const customerId = customerIdOf(invoice);
  if (!customerId) return;

  await connectMongoDB();
  const local = await User.findOne({ stripeCustomerId: customerId })
    .select("billingIssueSince")
    .lean<{ _id: unknown; billingIssueSince?: Date | null }>();
  if (!local || local.billingIssueSince) return;

  // Access is deliberately NOT revoked here. Stripe retries for days and most
  // failures are an expired card, not an intent to leave; pulling access
  // immediately converts a recoverable payment into a cancellation. The status
  // change (past_due -> canceled/unpaid) is what revokes it, via syncSubscription.
  await User.updateOne({ _id: local._id }, { $set: { billingIssueSince: new Date() } });
}

/** Clears a recorded payment problem after a successful invoice. */
export async function clearBillingIssue(invoice: Stripe.Invoice): Promise<void> {
  const customerId = customerIdOf(invoice);
  if (!customerId) return;

  await connectMongoDB();
  const local = await User.findOne({ stripeCustomerId: customerId })
    .select("billingIssueSince")
    .lean<{ _id: unknown; billingIssueSince?: Date | null }>();
  if (!local || !local.billingIssueSince) return;

  await User.updateOne({ _id: local._id }, { $set: { billingIssueSince: null } });
}
