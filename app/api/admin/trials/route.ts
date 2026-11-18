import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminGuard";
import User from "../../../../models/User";

/**
 * GET /api/admin/trials - who started a free trial in the last 60 days, newest
 * first, for "Proefperiodes" on /beheer (Alex, 31 Oct: "see if someone started
 * their 7 day free trial").
 *
 * Three kinds of trial exist and this card used to show only two, which is how
 * an account could be Pro off a running trial and appear nowhere on the
 * dashboard (Alex, Nov 2026):
 *  - `reverse`: the free Pro days every new account gets (lib/reverseTrial.ts).
 *    No card is ever asked for, so this one CANNOT turn into a payment - it
 *    ends and the account drops to free. `reverseTrial.startedAt`.
 *  - `stripe`: the 7-day trial taken at checkout, with a card or mandate on
 *    file, so it does become a charge. `proTrialUsedAt`.
 *  - `store`: an App Store / Play Store trial, billed by the store.
 *    `storeTrialStartedAt`, set by the RevenueCat webhook / sync.
 *
 * Status per row: still running, paying since, or stopped without paying.
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
  compedProUntil?: Date | null;
  stripeSubscriptionId?: string | null;
  reverseTrial?: {
    startedAt?: Date | null;
    endsAt?: Date | null;
    endedAt?: Date | null;
    voidedAt?: Date | null;
    days?: string[] | null;
  } | null;
};

export type TrialRow = {
  id: string;
  name: string;
  email: string;
  startedAt: string;
  platform: "apple" | "google" | "web";
  /** Which of the three trials this is - and so whether money can follow. */
  kind: "reverse" | "stripe" | "store";
  status: "trial" | "paying" | "stopped";
  /** End of the trial while it runs, else null. */
  endsAt: string | null;
};

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const since = new Date(Date.now() - 60 * DAY);
  const now = new Date();
  const users = await User.find({
    $or: [
      { storeTrialStartedAt: { $gte: since } },
      { proTrialUsedAt: { $gte: since } },
      { "reverseTrial.startedAt": { $gte: since } },
    ],
  })
    .select(
      "name email storeTrialStartedAt storeTrial storePremium storePremiumPlatform storePremiumExpiresAt " +
        "firstPaidAt proTrialUsedAt subscribed subscriptionStatus currentPeriodEnd compedProUntil " +
        "stripeSubscriptionId reverseTrial",
    )
    .lean<Row[]>();

  const rows: TrialRow[] = [];
  for (const u of users) {
    const base = { id: String(u._id), name: u.name ?? "", email: u.email ?? "" };
    if (u.storeTrialStartedAt && u.storeTrialStartedAt >= since) {
      const inTrial = !!(u.storePremium && u.storeTrial);
      const paying = !inTrial && !!u.storePremium && !!u.firstPaidAt && u.firstPaidAt >= u.storeTrialStartedAt;
      rows.push({
        ...base,
        kind: "store",
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
        kind: "stripe",
        startedAt: u.proTrialUsedAt.toISOString(),
        platform: "web",
        status: inTrial ? "trial" : u.subscribed ? "paying" : "stopped",
        endsAt: inTrial && u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toISOString() : null,
      });
    }
    const reverse = u.reverseTrial;
    const reverseStart = reverse?.startedAt ? new Date(reverse.startedAt) : null;
    // A voided trial is one that should never have started (the account turned
    // out to have Pro of its own), so it is not a trial anyone had.
    if (reverseStart && reverseStart >= since && !reverse?.voidedAt) {
      const ends = reverse?.endsAt ? new Date(reverse.endsAt) : (u.compedProUntil ? new Date(u.compedProUntil) : null);
      const inTrial = !reverse?.endedAt && (!ends || ends.getTime() > now.getTime());
      // Paid after the free days: a Stripe subscription or a store purchase
      // that began once the trial had started.
      const paying = !inTrial && !!u.firstPaidAt && u.firstPaidAt >= reverseStart;
      rows.push({
        ...base,
        kind: "reverse",
        startedAt: reverseStart.toISOString(),
        platform: "web",
        status: inTrial ? "trial" : paying ? "paying" : "stopped",
        endsAt: inTrial && ends ? ends.toISOString() : null,
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
      // Trials that can still become revenue, so the two numbers above are not
      // read as a conversion rate the reverse trial was never part of.
      withCard: rows.filter((r) => r.kind !== "reverse").length,
    },
  });
}
