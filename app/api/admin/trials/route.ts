import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminGuard";
import User from "../../../../models/User";

/**
 * GET /api/admin/trials - who started a free trial in the last 60 days, newest
 * first, for "Proefperiodes" on /beheer (Alex, 31 Oct: "see if someone started
 * their 7 day free trial").
 *
 * App trials come from RevenueCat (`storeTrialStartedAt`, set by the webhook /
 * sync on the first trial period); web trials from Stripe (`proTrialUsedAt`).
 * Status per account: still in the trial, paying since, or stopped.
 */
export const dynamic = "force-dynamic";

const DAY = 864e5;

type Row = {
  _id: unknown;
  name?: string;
  email?: string;
  storeTrialStartedAt?: Date | null;
  storeTrial?: boolean;
  storePremium?: boolean;
  storePremiumPlatform?: "apple" | "google" | null;
  storePremiumExpiresAt?: Date | null;
  firstPaidAt?: Date | null;
  proTrialUsedAt?: Date | null;
  subscribed?: boolean;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: Date | null;
};

export type TrialRow = {
  id: string;
  name: string;
  email: string;
  startedAt: string;
  platform: "apple" | "google" | "web";
  status: "trial" | "paying" | "stopped";
  /** End of the trial while it runs, else null. */
  endsAt: string | null;
};

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const since = new Date(Date.now() - 60 * DAY);
  const users = await User.find({ $or: [{ storeTrialStartedAt: { $gte: since } }, { proTrialUsedAt: { $gte: since } }] })
    .select("name email storeTrialStartedAt storeTrial storePremium storePremiumPlatform storePremiumExpiresAt firstPaidAt proTrialUsedAt subscribed subscriptionStatus currentPeriodEnd")
    .lean<Row[]>();

  const rows: TrialRow[] = [];
  for (const u of users) {
    const base = { id: String(u._id), name: u.name ?? "", email: u.email ?? "" };
    if (u.storeTrialStartedAt && u.storeTrialStartedAt >= since) {
      const inTrial = !!(u.storePremium && u.storeTrial);
      const paying = !inTrial && !!u.storePremium && !!u.firstPaidAt && u.firstPaidAt >= u.storeTrialStartedAt;
      rows.push({
        ...base,
        startedAt: u.storeTrialStartedAt.toISOString(),
        platform: u.storePremiumPlatform === "google" ? "google" : "apple",
        status: inTrial ? "trial" : paying ? "paying" : "stopped",
        endsAt: inTrial && u.storePremiumExpiresAt ? new Date(u.storePremiumExpiresAt).toISOString() : null,
      });
    }
    if (u.proTrialUsedAt && u.proTrialUsedAt >= since) {
      const inTrial = u.subscriptionStatus === "trialing";
      rows.push({
        ...base,
        startedAt: u.proTrialUsedAt.toISOString(),
        platform: "web",
        status: inTrial ? "trial" : u.subscribed ? "paying" : "stopped",
        endsAt: inTrial && u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toISOString() : null,
      });
    }
  }
  rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return NextResponse.json({
    rows,
    counts: {
      last7d: rows.filter((r) => Date.now() - Date.parse(r.startedAt) < 7 * DAY).length,
      running: rows.filter((r) => r.status === "trial").length,
      paying: rows.filter((r) => r.status === "paying").length,
    },
  });
}
