import { NextResponse } from "next/server";
import type Stripe from "stripe";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import stripe from "../../../../lib/stripe";
import { requireAdmin } from "../../../../lib/adminGuard";
import {
  BILLING_SELECT,
  type LocalBilling,
  diffSnapshot,
  emptySnapshot,
  pickPrimary,
  snapshotOf,
  writeSnapshot,
} from "../../../../lib/subscriptionSync";

/**
 * Stripe <-> Mongo reconciliation, for admins.
 *
 * This exists because a live subscriber sat at `subscribed: false` for days and
 * nothing in the product could see it. The billing dashboard is Stripe, the
 * entitlement flag is Mongo, and until now nothing compared the two.
 *
 *   GET  - dry run. Reports every disagreement and changes nothing.
 *   POST - applies the repairs the dry run listed.
 *
 * Both walk the problem from both ends, because the two failure modes are
 * different:
 *   - Stripe-first catches a paying customer whose local account was never
 *     updated (a missed or rejected webhook).
 *   - Mongo-first catches a local account still flagged Pro after Stripe stopped
 *     billing it.
 *
 * It also checks for the document-level corruption that caused the original
 * incident: a `readChapters` map key that is not a book name (a `$`-prefixed or
 * dotted key, or a value that is not an array of numbers) makes Mongoose reject
 * `user.save()` for the whole document, so every write to that user throws -
 * including the billing writes. The billing code no longer uses `save()`, but
 * the bad key still breaks profile edits and reading progress, so it is reported
 * and can be cleaned.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hard ceiling on how many Stripe subscriptions we will enumerate. If an account
 * ever exceeds it the Stripe-side picture is incomplete, and the revocation pass
 * below refuses to run rather than downgrade people it simply did not see.
 */
const STRIPE_MAX_SUBSCRIPTIONS = 1000;
/** Cap on the Mongo-side scan, so a large user base cannot time the route out. */
const SCAN_LIMIT = 5000;
const REQUIRED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
] as const;

interface Mismatch {
  userId: string | null;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** What Stripe says. */
  stripeStatus: string | null;
  stripeEntitled: boolean;
  /** What Mongo says. */
  localSubscribed: boolean;
  localStatus: string | null;
  /** Fields a repair would write. */
  wouldChange: string[];
  note?: string;
}

interface DocumentProblem {
  userId: string;
  email: string | null;
  invalidReadChapterKeys: string[];
}

/**
 * A book name, not a Mongo operator and not a dotted path.
 *
 * Deliberately structural rather than a canon lookup: real book names contain
 * spaces and diacritics ("1 Samuel", "Efezier"), and a key that is merely
 * unrecognised is somebody's reading progress, not corruption. Only the keys
 * Mongo itself treats as special are rejected, because those are the ones that
 * actually break the document.
 */
function isValidBookKey(key: string): boolean {
  return key.length > 0 && !key.startsWith("$") && !key.includes(".");
}

/** Chapter lists must be arrays of finite numbers. */
function isValidChapterList(value: unknown): boolean {
  return Array.isArray(value) && value.every((n) => typeof n === "number" && Number.isFinite(n));
}

function invalidReadChapterKeys(readChapters: unknown): string[] {
  if (!readChapters || typeof readChapters !== "object" || Array.isArray(readChapters)) return [];
  return Object.entries(readChapters as Record<string, unknown>)
    .filter(([key, value]) => !isValidBookKey(key) || !isValidChapterList(value))
    .map(([key]) => key);
}

async function localByCustomerId(customerId: string): Promise<LocalBilling | null> {
  return User.findOne({ stripeCustomerId: customerId })
    .select(BILLING_SELECT)
    .lean<LocalBilling>();
}

/**
 * Same resolution order as the webhook: customer id, then the userId our own
 * checkout route stamped on the subscription, then the customer's email.
 */
async function resolveLocal(subscription: Stripe.Subscription): Promise<LocalBilling | null> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return null;

  const byCustomer = await localByCustomerId(customerId);
  if (byCustomer) return byCustomer;

  const metadataUserId = subscription.metadata?.userId;
  if (metadataUserId) {
    const byId = await User.findById(metadataUserId).select(BILLING_SELECT).lean<LocalBilling>();
    if (byId) return byId;
  }

  try {
    const customer = await stripe.customers.retrieve(customerId);
    const email = customer.deleted ? null : (customer as Stripe.Customer).email;
    if (email) {
      return User.findOne({ email }).select(BILLING_SELECT).lean<LocalBilling>();
    }
  } catch {
    // Unreadable customer, unmatchable subscription.
  }
  return null;
}

interface Report {
  checkedAt: string;
  stripeMode: "live" | "test" | "unknown";
  webhookEndpoints: {
    id: string;
    url: string;
    status: string;
    apiVersion: string | null;
    enabledEvents: string[];
    pointsAtThisApp: boolean;
  }[];
  webhookHealth: {
    status: "ok" | "warn" | "fail";
    message: string;
    requiredEvents: string[];
    missingEvents: string[];
    endpointCount: number;
    matchedEndpointIds: string[];
  };
  webhookEndpointError?: string;
  stripeSubscriptions: {
    total: number;
    entitled: number;
    unmatched: number;
  };
  mismatches: Mismatch[];
  documentProblems: DocumentProblem[];
  scanned: { stripeSubscriptions: number; localUsers: number };
  /**
   * False when the Stripe enumeration hit its ceiling. The revocation pass is
   * skipped in that case, because "not found in Stripe" would then only mean
   * "not reached".
   */
  stripeListComplete: boolean;
}

const APP_WEBHOOK_PATH = "/api/webhooks/stripe";

async function buildReport(): Promise<Report> {
  await connectMongoDB();

  const report: Report = {
    checkedAt: new Date().toISOString(),
    stripeMode: "unknown",
    webhookEndpoints: [],
    webhookHealth: {
      status: "warn",
      message: "Webhook-endpoints nog niet gecontroleerd",
      requiredEvents: [...REQUIRED_WEBHOOK_EVENTS],
      missingEvents: [],
      endpointCount: 0,
      matchedEndpointIds: [],
    },
    stripeSubscriptions: { total: 0, entitled: 0, unmatched: 0 },
    mismatches: [],
    documentProblems: [],
    scanned: { stripeSubscriptions: 0, localUsers: 0 },
    stripeListComplete: true,
  };

  // --- Webhook configuration. A missing or misdirected endpoint is the single
  // most likely reason for a subscriber who never became Pro, so it is checked
  // first and reported even when everything else looks fine.
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    report.webhookEndpoints = endpoints.data.map((endpoint) => ({
      id: endpoint.id,
      url: endpoint.url,
      status: endpoint.status,
      apiVersion: endpoint.api_version ?? null,
      enabledEvents: endpoint.enabled_events,
      pointsAtThisApp: endpoint.url.includes(APP_WEBHOOK_PATH),
    }));

    const appEndpoints = report.webhookEndpoints.filter((endpoint) => endpoint.pointsAtThisApp);
    const enabledAppEndpoints = appEndpoints.filter((endpoint) => endpoint.status === "enabled");
    const enabledEvents = new Set(
      enabledAppEndpoints.flatMap((endpoint) => endpoint.enabledEvents)
    );
    const receivesAllEvents = enabledEvents.has("*");
    const missingEvents = receivesAllEvents
      ? []
      : REQUIRED_WEBHOOK_EVENTS.filter((event) => !enabledEvents.has(event));

    report.webhookHealth.endpointCount = appEndpoints.length;
    report.webhookHealth.matchedEndpointIds = enabledAppEndpoints.map((endpoint) => endpoint.id);
    report.webhookHealth.missingEvents = missingEvents;

    if (appEndpoints.length === 0) {
      report.webhookHealth.status = "fail";
      report.webhookHealth.message =
        "Geen Stripe webhook-endpoint gevonden dat naar /api/webhooks/stripe wijst.";
    } else if (enabledAppEndpoints.length === 0) {
      report.webhookHealth.status = "fail";
      report.webhookHealth.message =
        "Webhook-endpoint(s) gevonden voor deze app, maar geen enkele staat op enabled.";
    } else if (missingEvents.length > 0) {
      report.webhookHealth.status = "fail";
      report.webhookHealth.message =
        "Webhook-endpoint staat aan, maar mist vereiste events voor betrouwbare entitlement-sync.";
    } else {
      report.webhookHealth.status = "ok";
      report.webhookHealth.message =
        "Webhook-endpoint is enabled en bevat alle vereiste entitlement-events.";
    }
  } catch (error) {
    // A restricted key without "Webhook Endpoints Read" lands here. That is a
    // gap in the report, not a reason to fail the whole check.
    report.webhookEndpointError = error instanceof Error ? error.message : String(error);
    report.webhookHealth.status = "warn";
    report.webhookHealth.message =
      "Webhook-endpoints konden niet gelezen worden met de huidige Stripe key.";
  }

  // --- Stripe first: every subscription the account has, matched to an account.
  // Paginated, because a single page would silently truncate the picture and the
  // revocation pass below reads "absent from this list" as "no longer paying".
  const allSubscriptions = await stripe.subscriptions
    .list({ status: "all", limit: 100 })
    .autoPagingToArray({ limit: STRIPE_MAX_SUBSCRIPTIONS });

  report.stripeListComplete = allSubscriptions.length < STRIPE_MAX_SUBSCRIPTIONS;
  report.scanned.stripeSubscriptions = allSubscriptions.length;
  report.stripeSubscriptions.total = allSubscriptions.length;
  if (allSubscriptions[0]) {
    report.stripeMode = allSubscriptions[0].livemode ? "live" : "test";
  }

  const seenUserIds = new Set<string>();

  for (const subscription of allSubscriptions) {
    const snapshot = snapshotOf(subscription);
    if (snapshot.subscribed) report.stripeSubscriptions.entitled += 1;

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null;

    const local = await resolveLocal(subscription);

    if (!local) {
      report.stripeSubscriptions.unmatched += 1;
      report.mismatches.push({
        userId: null,
        email: null,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeStatus: subscription.status,
        stripeEntitled: snapshot.subscribed,
        localSubscribed: false,
        localStatus: null,
        wouldChange: [],
        note: "Geen lokaal account gevonden voor deze Stripe-klant",
      });
      continue;
    }

    seenUserIds.add(String(local._id));

    // Only the account's primary subscription decides its state. A customer with
    // an old canceled subscription next to a live one must not be downgraded by
    // whichever row we happened to reach last.
    const customerSubs = allSubscriptions.filter((candidate) => {
      const id =
        typeof candidate.customer === "string" ? candidate.customer : candidate.customer?.id;
      return id === customerId;
    });
    const primary = pickPrimary(customerSubs);
    if (!primary || primary.id !== subscription.id) continue;

    const { changed } = diffSnapshot(local, snapshot, { customerId });
    if (changed.length === 0) continue;

    report.mismatches.push({
      userId: String(local._id),
      email: local.email ?? null,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeStatus: subscription.status,
      stripeEntitled: snapshot.subscribed,
      localSubscribed: !!local.subscribed,
      localStatus: local.subscriptionStatus ?? null,
      wouldChange: changed,
    });
  }

  // --- Mongo second: accounts that claim Pro (or carry a Stripe customer) but
  // were not reached above, which means Stripe has no matching subscription.
  //
  // Skipped entirely on an incomplete Stripe enumeration. Revoking access is the
  // one action here that can take something away from a paying customer, so it
  // only runs when absence from Stripe has actually been established.
  const locals = report.stripeListComplete
    ? await User.find({
        $or: [{ subscribed: true }, { stripeCustomerId: { $exists: true, $ne: null } }],
      })
        .select(BILLING_SELECT)
        .limit(SCAN_LIMIT)
        .lean<LocalBilling[]>()
    : [];

  report.scanned.localUsers = locals.length;

  for (const local of locals) {
    if (seenUserIds.has(String(local._id))) continue;

    const { changed } = diffSnapshot(local, emptySnapshot());
    if (changed.length === 0) continue;

    report.mismatches.push({
      userId: String(local._id),
      email: local.email ?? null,
      stripeCustomerId: local.stripeCustomerId ?? null,
      stripeSubscriptionId: local.stripeSubscriptionId ?? null,
      stripeStatus: null,
      stripeEntitled: false,
      localSubscribed: !!local.subscribed,
      localStatus: local.subscriptionStatus ?? null,
      wouldChange: changed,
      note: "Stripe kent geen abonnement voor deze klant",
    });
  }

  // --- Document health. `.lean()` returns the raw object, so a document that
  // Mongoose would refuse to cast can still be inspected here.
  const docs = await User.find({ readChapters: { $exists: true, $ne: {} } })
    .select("email readChapters")
    .limit(SCAN_LIMIT)
    .lean<{ _id: unknown; email?: string; readChapters?: unknown }[]>();

  for (const doc of docs) {
    const bad = invalidReadChapterKeys(doc.readChapters);
    if (bad.length === 0) continue;
    report.documentProblems.push({
      userId: String(doc._id),
      email: doc.email ?? null,
      invalidReadChapterKeys: bad,
    });
  }

  return report;
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json(await buildReport());
  } catch (error) {
    console.error("[reconcile-subscriptions] Dry run failed:", error);
    return NextResponse.json(
      { error: "Reconciliatie mislukt", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

interface ApplyBody {
  /** Limit the repair to one account. Omit to repair everything the dry run found. */
  userId?: string;
  /** Also strip invalid `readChapters` keys. Off unless asked for. */
  repairDocuments?: boolean;
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as ApplyBody;

  try {
    const report = await buildReport();

    const targets = report.mismatches.filter(
      (m) => m.userId !== null && (!body.userId || m.userId === body.userId)
    );

    const billingRepairs: { userId: string; email: string | null; changed: string[] }[] = [];

    for (const target of targets) {
      const local = await User.findById(target.userId!)
        .select(BILLING_SELECT)
        .lean<LocalBilling>();
      if (!local) continue;

      let snapshot = emptySnapshot();
      if (target.stripeSubscriptionId && target.stripeStatus) {
        const subscription = await stripe.subscriptions.retrieve(target.stripeSubscriptionId);
        snapshot = snapshotOf(subscription);
      }

      const changed = await writeSnapshot(local, snapshot, {
        customerId: target.stripeCustomerId,
      });
      if (changed.length > 0) {
        billingRepairs.push({ userId: target.userId!, email: target.email, changed });
      }
    }

    const documentRepairs: { userId: string; removedKeys: string[] }[] = [];

    if (body.repairDocuments) {
      const problems = report.documentProblems.filter(
        (p) => !body.userId || p.userId === body.userId
      );

      for (const problem of problems) {
        const doc = await User.findById(problem.userId)
          .select("readChapters")
          .lean<{ _id: unknown; readChapters?: Record<string, unknown> }>();
        if (!doc?.readChapters) continue;

        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(doc.readChapters)) {
          if (isValidBookKey(key) && isValidChapterList(value)) cleaned[key] = value;
        }

        // Written through the raw driver, and as a whole replacement object
        // rather than a `$unset` of `readChapters.$*` - a `$`-prefixed path
        // component is not something Mongoose or the server will accept. Only
        // structurally invalid keys are dropped; real reading progress is copied
        // across untouched.
        await User.collection.updateOne(
          { _id: doc._id as never },
          { $set: { readChapters: cleaned } }
        );

        documentRepairs.push({
          userId: problem.userId,
          removedKeys: problem.invalidReadChapterKeys,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      appliedBy: guard.email,
      billingRepairs,
      documentRepairs,
      remaining: (await buildReport()).mismatches,
    });
  } catch (error) {
    console.error("[reconcile-subscriptions] Apply failed:", error);
    return NextResponse.json(
      { error: "Reparatie mislukt", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
