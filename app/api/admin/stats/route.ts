import { NextResponse } from "next/server";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import Note from "../../../../models/Note";
import ReadingSession from "../../../../models/ReadingSession";
import StudyGroup from "../../../../models/StudyGroup";
import BiblePlan from "../../../../models/BiblePlan";
import { requireAdmin } from "../../../../lib/adminGuard";
import { PLANS } from "../../../../lib/pricing";
import {
  COMPED_ACCESS_FILTER,
  PAYING_STRIPE_FILTER,
} from "../../../../lib/billingFilters";

/**
 * Numbers for /admin.
 *
 * Two things this route used to get wrong, both of which hid a real paying
 * customer:
 *
 *  - "Premium" counted `subscribed: true` only. That is the Stripe flag alone,
 *    so an App Store subscriber (`storePremium`) was invisible, and any account
 *    whose Stripe webhook had not landed showed as free even though Stripe was
 *    charging them. Effective Pro is the same OR that lib/mobilePremium uses for
 *    entitlement, and the Stripe/store split is reported separately.
 *  - MRR was `premiumCount * 9.99`, which prices an annual subscriber as if they
 *    paid monthly. It is now derived per interval from lib/pricing.
 *
 * Revenue counts only accounts Stripe actually bills. Comped access - the App
 * Store review account, and anything an admin switched to Pro by hand - carries
 * `subscribed: true` with no interval, and the unknown-interval fallback priced
 * that as monthly. So a review account created for Apple was reporting EUR 9,99
 * of monthly income that nobody pays. It is now counted and shown separately, as
 * `users.comped`.
 *
 * `possiblyMissedWebhooks` is new and is the number that would have caught the
 * original incident on the dashboard: accounts that have a Stripe customer id
 * but no subscription state at all. Every one of those is a checkout that
 * started and whose result was never written back.
 *
 * ---
 *
 * Why this route is defensive about its own failure, which it was not before:
 *
 *  - The filters above are imported from lib/billingFilters, not from
 *    lib/subscriptionSync where they used to live. lib/subscriptionSync imports
 *    lib/stripe, and lib/stripe throws at module scope when STRIPE_SECRET_KEY is
 *    missing. Importing two constant objects from it therefore made the entire
 *    admin dashboard unreachable - a 500 raised while the module was being
 *    evaluated, before the handler or the admin check ever ran, which no
 *    try/catch in here and no retry in the browser could recover from.
 *  - `connectMongoDB` returns null instead of throwing when it cannot connect.
 *    Ignoring that meant the queries below went into mongoose's buffer and
 *    surfaced ten seconds later as an unhandled "buffering timed out" - an
 *    opaque 500 for what is a database outage. It is now reported as one.
 *  - A single failing count no longer blanks twenty working numbers. Each query
 *    resolves to null on failure and names itself in `degraded`, so the page can
 *    show what it has and say what is missing. Nothing is swallowed: every
 *    failure is logged with its error before the null is returned.
 */

/** Effective monthly value of one subscription, in cents. */
const MRR_CENTS: Record<"monthly" | "annual", number> = {
  monthly: PLANS.monthly.amountCents,
  annual: Math.round(PLANS.annual.amountCents / 12),
};

const BILLING_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "paused",
  "incomplete",
  "incomplete_expired",
] as const;

/**
 * Runs one query and, if it fails, records a Dutch label for the dashboard and
 * the real error for the server log. The label is what an admin reads, so it
 * names the figure, not the collection.
 */
async function settle<T>(
  label: string,
  degraded: string[],
  run: () => PromiseLike<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (!degraded.includes(label)) degraded.push(label);
    console.error(`[admin/stats] "${label}" failed`, error);
    return null;
  }
}

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    return await buildStats();
  } catch (error) {
    // Anything that gets here is a fault in this route, not in the caller's
    // session or connection, so it must not be reported to the browser as an
    // HTML error page the client cannot parse. See the message the dashboard
    // shows for a 500.
    console.error("[admin/stats] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon statistieken niet berekenen" },
      { status: 500 },
    );
  }
}

async function buildStats() {
  const connection = await connectMongoDB();
  if (!connection) {
    // Without a connection every count below would buffer and then time out one
    // by one. Saying so costs one round trip instead of ten seconds, and tells
    // the admin which of the two possible faults this is.
    return NextResponse.json(
      { error: "Geen verbinding met de database. Probeer het over een minuut opnieuw." },
      { status: 503 },
    );
  }

  const now = new Date();
  const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  /** Entitled through any channel - the same test lib/mobilePremium applies. */
  const effectivePro = {
    $or: [{ subscribed: true }, { storePremium: true }],
  };

  const degraded: string[] = [];
  const q = <T>(label: string, run: () => PromiseLike<T>) => settle(label, degraded, run);

  // Promise.all is safe here only because `settle` never rejects: every entry
  // resolves, to a number or to null. One dead collection can no longer take the
  // other twenty-two figures down with it.
  const [
    totalUsers,
    stripeSubscribers,
    storeSubscribers,
    effectiveProUsers,
    compedUsers,
    adminUsers,
    usersLast24h,
    usersLast7d,
    usersLast30d,
    totalNotes,
    notesLast7d,
    totalReadingSessions,
    sessionsLast7d,
    totalGroups,
    totalPlans,
    activeStreakUsers,
    monthlySubscribers,
    annualSubscribers,
    withBillingIssue,
    cancelAtPeriodEnd,
    pausedSubscribers,
    possiblyMissedWebhooks,
    statusCounts,
  ] = await Promise.all([
    q("Totaal gebruikers", () => User.countDocuments()),
    q("Stripe-abonnees", () => User.countDocuments(PAYING_STRIPE_FILTER)),
    q("Store-abonnees", () => User.countDocuments({ storePremium: true })),
    q("Pro-toegang", () => User.countDocuments(effectivePro)),
    q("Gratis Pro-toegang", () => User.countDocuments(COMPED_ACCESS_FILTER)),
    q("Beheerders", () => User.countDocuments({ isAdmin: true })),
    q("Nieuw (24 uur)", () => User.countDocuments({ createdAt: { $gte: start24h } })),
    q("Nieuw (7 dagen)", () => User.countDocuments({ createdAt: { $gte: start7d } })),
    q("Nieuw (30 dagen)", () => User.countDocuments({ createdAt: { $gte: start30d } })),
    q("Notities", () => Note.countDocuments()),
    q("Notities (7 dagen)", () => Note.countDocuments({ createdAt: { $gte: start7d } })),
    q("Leessessies", () => ReadingSession.countDocuments()),
    q("Leessessies (7 dagen)", () => ReadingSession.countDocuments({ createdAt: { $gte: start7d } })),
    q("Studiegroepen", () => StudyGroup.countDocuments()),
    q("Leesplannen", () => BiblePlan.countDocuments()),
    q("Actieve streaks", () =>
      User.countDocuments({ streak: { $gte: 1 }, lastStreakDate: { $gte: start7d } })),
    q("Maandabonnees", () =>
      User.countDocuments({ ...PAYING_STRIPE_FILTER, subscriptionInterval: "monthly" })),
    q("Jaarabonnees", () =>
      User.countDocuments({ ...PAYING_STRIPE_FILTER, subscriptionInterval: "annual" })),
    q("Betaalproblemen", () => User.countDocuments({ billingIssueSince: { $ne: null } })),
    q("Opzeggingen", () =>
      User.countDocuments({ ...PAYING_STRIPE_FILTER, cancelAtPeriodEnd: true })),
    q("Gepauzeerd", () => User.countDocuments({ pausedUntil: { $gt: now } })),
    // A Stripe customer was created for this account (checkout was started) but
    // nothing ever wrote a subscription state back. Investigate every one.
    q("Betaald zonder Pro", () =>
      User.countDocuments({
        stripeCustomerId: { $exists: true, $ne: null },
        subscribed: { $ne: true },
        subscriptionStatus: null,
      })),
    q("Abonnementsstatussen", () =>
      User.aggregate<{ _id: string | null; count: number }>([
        { $match: { subscriptionStatus: { $ne: null } } },
        { $group: { _id: "$subscriptionStatus", count: { $sum: 1 } } },
      ])),
  ]);

  // A *paying* subscriber whose interval was never recorded is still real
  // revenue, so it is priced at the monthly rate rather than dropped. Comped
  // accounts never reach this line - they are excluded by PAYING_STRIPE_FILTER -
  // so the fallback can no longer invent income from an unpaid grant. A non-zero
  // value here is a data gap worth chasing, not a normal state.
  const unknownInterval =
    stripeSubscribers !== null && monthlySubscribers !== null && annualSubscribers !== null
      ? Math.max(0, stripeSubscribers - monthlySubscribers - annualSubscribers)
      : null;

  // Revenue is reported only when every input to it survived. A partial MRR is
  // not a smaller MRR, it is a wrong one, and a wrong revenue figure is worse on
  // this page than a dash.
  const mrrCents =
    monthlySubscribers !== null && annualSubscribers !== null && unknownInterval !== null
      ? monthlySubscribers * MRR_CENTS.monthly +
        annualSubscribers * MRR_CENTS.annual +
        unknownInterval * MRR_CENTS.monthly
      : null;

  const paying =
    stripeSubscribers !== null && storeSubscribers !== null
      ? stripeSubscribers + storeSubscribers
      : null;

  // Null rather than an all-zero table when the aggregation itself failed: every
  // status reading "0" is indistinguishable from a quiet product, and this card
  // exists to make a billing problem loud.
  let byStatus: Record<string, number> | null = null;
  if (statusCounts) {
    byStatus = {};
    for (const status of BILLING_STATUSES) byStatus[status] = 0;
    for (const row of statusCounts) {
      if (row._id) byStatus[row._id] = row.count;
    }
  }

  return NextResponse.json({
    // Empty on a healthy response. Anything in here is a figure the page must
    // show as unknown rather than as zero.
    degraded,
    users: {
      total: totalUsers,
      // Everyone who has access, however they got it.
      premium: effectiveProUsers,
      // Everyone somebody actually pays for. This is the subscriber number.
      paying,
      stripeSubscribers,
      storeSubscribers,
      // Access granted without payment: the App Store review account, admin
      // grants. Reported so it is visible, never folded into revenue.
      comped: compedUsers,
      admins: adminUsers,
      newLast24h: usersLast24h,
      newLast7d: usersLast7d,
      newLast30d: usersLast30d,
      activeStreak: activeStreakUsers,
      // Conversion means paid conversion, so comped access is excluded. An empty
      // user table is 0% rather than a division by zero; an unknown numerator or
      // denominator is null, because it is not 0%.
      premiumPercent:
        paying === null || totalUsers === null
          ? null
          : totalUsers > 0
            ? Math.round((paying / totalUsers) * 1000) / 10
            : 0,
    },
    billing: {
      byStatus,
      withBillingIssue,
      cancelAtPeriodEnd,
      paused: pausedSubscribers,
      possiblyMissedWebhooks,
      monthlySubscribers,
      annualSubscribers,
      unknownInterval,
    },
    revenue: {
      mrrEur: mrrCents === null ? null : Math.round(mrrCents) / 100,
      arrEur: mrrCents === null ? null : Math.round(mrrCents * 12) / 100,
      // Retained for the existing card; it is the monthly list price, not an
      // average of what subscribers actually pay.
      priceEur: PLANS.monthly.amountCents / 100,
      annualPriceEur: PLANS.annual.amountCents / 100,
    },
    content: {
      notes: totalNotes,
      notesLast7d,
      readingSessions: totalReadingSessions,
      sessionsLast7d,
      groups: totalGroups,
      plans: totalPlans,
    },
  });
}
