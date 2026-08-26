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
} from "../../../../lib/subscriptionSync";

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

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  await connectMongoDB();

  const now = new Date();
  const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  /** Entitled through any channel - the same test lib/mobilePremium applies. */
  const effectivePro = {
    $or: [{ subscribed: true }, { storePremium: true }],
  };

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
    User.countDocuments(),
    User.countDocuments(PAYING_STRIPE_FILTER),
    User.countDocuments({ storePremium: true }),
    User.countDocuments(effectivePro),
    User.countDocuments(COMPED_ACCESS_FILTER),
    User.countDocuments({ isAdmin: true }),
    User.countDocuments({ createdAt: { $gte: start24h } }),
    User.countDocuments({ createdAt: { $gte: start7d } }),
    User.countDocuments({ createdAt: { $gte: start30d } }),
    Note.countDocuments(),
    Note.countDocuments({ createdAt: { $gte: start7d } }),
    ReadingSession.countDocuments(),
    ReadingSession.countDocuments({ createdAt: { $gte: start7d } }),
    StudyGroup.countDocuments(),
    BiblePlan.countDocuments(),
    User.countDocuments({ streak: { $gte: 1 }, lastStreakDate: { $gte: start7d } }),
    User.countDocuments({ ...PAYING_STRIPE_FILTER, subscriptionInterval: "monthly" }),
    User.countDocuments({ ...PAYING_STRIPE_FILTER, subscriptionInterval: "annual" }),
    User.countDocuments({ billingIssueSince: { $ne: null } }),
    User.countDocuments({ ...PAYING_STRIPE_FILTER, cancelAtPeriodEnd: true }),
    User.countDocuments({ pausedUntil: { $gt: now } }),
    // A Stripe customer was created for this account (checkout was started) but
    // nothing ever wrote a subscription state back. Investigate every one.
    User.countDocuments({
      stripeCustomerId: { $exists: true, $ne: null },
      subscribed: { $ne: true },
      subscriptionStatus: null,
    }),
    User.aggregate<{ _id: string | null; count: number }>([
      { $match: { subscriptionStatus: { $ne: null } } },
      { $group: { _id: "$subscriptionStatus", count: { $sum: 1 } } },
    ]),
  ]);

  // A *paying* subscriber whose interval was never recorded is still real
  // revenue, so it is priced at the monthly rate rather than dropped. Comped
  // accounts never reach this line - they are excluded by PAYING_STRIPE_FILTER -
  // so the fallback can no longer invent income from an unpaid grant. A non-zero
  // value here is a data gap worth chasing, not a normal state.
  const unknownInterval = Math.max(0, stripeSubscribers - monthlySubscribers - annualSubscribers);

  const mrrCents =
    monthlySubscribers * MRR_CENTS.monthly +
    annualSubscribers * MRR_CENTS.annual +
    unknownInterval * MRR_CENTS.monthly;

  const byStatus: Record<string, number> = {};
  for (const status of BILLING_STATUSES) byStatus[status] = 0;
  for (const row of statusCounts) {
    if (row._id) byStatus[row._id] = row.count;
  }

  return NextResponse.json({
    users: {
      total: totalUsers,
      // Everyone who has access, however they got it.
      premium: effectiveProUsers,
      // Everyone somebody actually pays for. This is the subscriber number.
      paying: stripeSubscribers + storeSubscribers,
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
      // Conversion means paid conversion, so comped access is excluded.
      premiumPercent:
        totalUsers > 0
          ? Math.round(((stripeSubscribers + storeSubscribers) / totalUsers) * 1000) / 10
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
      mrrEur: Math.round(mrrCents) / 100,
      arrEur: Math.round(mrrCents * 12) / 100,
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
