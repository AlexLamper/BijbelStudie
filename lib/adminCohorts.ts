import User from "../models/User";
import { PLANS } from "./pricing";

/**
 * Signup-cohort conversion for the admin dashboard.
 *
 * The old headline figure, `premiumPercent`, divides everyone paying today by
 * every account ever made. It mixes years of signups, counts nobody who
 * converted and then lapsed, and moves by fractions of a point even when new
 * users convert twice as well. This answers the question a paywall change is
 * actually judged on: of the people who signed up in week N, how many paid
 * within 7 and 35 days, and what did that cohort bring in per signup.
 *
 * "Paid" is `firstPaidAt` (write-once, set by the Stripe and RevenueCat syncs
 * on the first non-trial period). Older Stripe subscribers predate that field,
 * so their `subscriptionStartedAt` stands in when it exists and they had no
 * trial. Store subscribers from before the field have no date and are missing
 * from older cohorts - the view is reliable from the week it shipped onwards.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * List prices of the in-app products, used only to *estimate* first-payment
 * revenue per signup. The App Store and Play charge per storefront, so this is
 * a planning figure, never an accounting one - RevenueCat is the source for
 * actual proceeds.
 */
export const STORE_LIST_PRICE_CENTS = { monthly: 999, annual: 6999 } as const;

export type CohortRow = {
  /** Monday 00:00 UTC that starts the cohort week, ISO date. */
  weekStart: string;
  signups: number;
  byPlatform: Record<"ios" | "android" | "web" | "unknown", number>;
  /** Accounts that started a free trial (store or Stripe) within 7 days. */
  trialsD7: number;
  paidD7: number;
  paidD35: number;
  /** False while the cohort is younger than 35 days: paidD35 is still rising. */
  matureD35: boolean;
  /** Estimated first-payment revenue per signup, euros, for payers within 60 days. */
  revenuePerSignupD60Eur: number;
  matureD60: boolean;
};

export type CohortSummary = {
  weeks: CohortRow[];
  /**
   * D35 conversion over the most recent four cohorts that are old enough to be
   * final. This is the number to hold against the 7% target. Null until four
   * such cohorts exist.
   */
  recentD35Percent: number | null;
  recentD7Percent: number | null;
  recentTrialD7Percent: number | null;
  recentRevenuePerSignupD60Eur: number | null;
};

/** Monday 00:00 UTC of the week containing `date`. */
export function weekStartUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(d.getTime() - dow * DAY_MS);
}

type RawUser = {
  createdAt?: Date | null;
  signupPlatform?: string | null;
  firstPaidAt?: Date | null;
  subscriptionStartedAt?: Date | null;
  proTrialUsedAt?: Date | null;
  storeTrialStartedAt?: Date | null;
  subscriptionInterval?: string | null;
  storePremiumInterval?: string | null;
  stripeSubscriptionId?: string | null;
};

/** When this account first paid, or null. Exported for tests. */
export function paidAt(u: RawUser): Date | null {
  if (u.firstPaidAt) return new Date(u.firstPaidAt);
  // Pre-field Stripe subscribers with no trial paid from their start date.
  if (u.subscriptionStartedAt && !u.proTrialUsedAt && u.stripeSubscriptionId) {
    return new Date(u.subscriptionStartedAt);
  }
  return null;
}

/** Estimated first payment in cents. Exported for tests. */
export function firstPaymentCents(u: RawUser): number {
  if (u.stripeSubscriptionId) {
    return u.subscriptionInterval === "annual" ? PLANS.annual.amountCents : PLANS.monthly.amountCents;
  }
  return u.storePremiumInterval === "annual"
    ? STORE_LIST_PRICE_CENTS.annual
    : STORE_LIST_PRICE_CENTS.monthly;
}

/** Pure cohort maths over already-loaded accounts. Exported for tests. */
export function buildCohorts(users: RawUser[], now: Date, weeks: number): CohortSummary {
  const firstWeek = new Date(weekStartUtc(now).getTime() - (weeks - 1) * 7 * DAY_MS);
  const rows = new Map<string, CohortRow & { _revenueCents: number }>();
  for (let i = 0; i < weeks; i++) {
    const start = new Date(firstWeek.getTime() + i * 7 * DAY_MS);
    const key = start.toISOString().slice(0, 10);
    // A cohort is final for a window once its *youngest* member has had it.
    const youngestAge = now.getTime() - (start.getTime() + 7 * DAY_MS);
    rows.set(key, {
      weekStart: key,
      signups: 0,
      byPlatform: { ios: 0, android: 0, web: 0, unknown: 0 },
      trialsD7: 0,
      paidD7: 0,
      paidD35: 0,
      matureD35: youngestAge >= 35 * DAY_MS,
      revenuePerSignupD60Eur: 0,
      matureD60: youngestAge >= 60 * DAY_MS,
      _revenueCents: 0,
    });
  }

  for (const u of users) {
    if (!u.createdAt) continue;
    const created = new Date(u.createdAt);
    const row = rows.get(weekStartUtc(created).toISOString().slice(0, 10));
    if (!row) continue;
    row.signups += 1;
    const platform = (["ios", "android", "web"] as const).find((p) => p === u.signupPlatform) ?? "unknown";
    row.byPlatform[platform] += 1;

    const within = (d: Date | null | undefined, days: number) =>
      !!d && new Date(d).getTime() - created.getTime() <= days * DAY_MS;

    if (within(u.storeTrialStartedAt, 7) || within(u.proTrialUsedAt, 7)) row.trialsD7 += 1;
    const paid = paidAt(u);
    if (within(paid, 7)) row.paidD7 += 1;
    if (within(paid, 35)) row.paidD35 += 1;
    if (within(paid, 60)) row._revenueCents += firstPaymentCents(u);
  }

  const out: CohortRow[] = [];
  for (const row of rows.values()) {
    const { _revenueCents, ...rest } = row;
    out.push({
      ...rest,
      revenuePerSignupD60Eur: row.signups > 0 ? Math.round(_revenueCents / row.signups) / 100 : 0,
    });
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
  const recent35 = out.filter((r) => r.matureD35).slice(-4);
  const recent60 = out.filter((r) => r.matureD60).slice(-4);
  const recent7 = out.filter((r) => now.getTime() - new Date(r.weekStart).getTime() >= 14 * DAY_MS).slice(-4);
  const sum = (rs: CohortRow[], f: (r: CohortRow) => number) => rs.reduce((a, r) => a + f(r), 0);
  const signups60 = sum(recent60, (r) => r.signups);

  return {
    weeks: out,
    recentD35Percent: recent35.length === 4 ? pct(sum(recent35, (r) => r.paidD35), sum(recent35, (r) => r.signups)) : null,
    recentD7Percent: recent7.length > 0 ? pct(sum(recent7, (r) => r.paidD7), sum(recent7, (r) => r.signups)) : null,
    recentTrialD7Percent:
      recent7.length > 0 ? pct(sum(recent7, (r) => r.trialsD7), sum(recent7, (r) => r.signups)) : null,
    recentRevenuePerSignupD60Eur:
      recent60.length > 0 && signups60 > 0
        ? Math.round((sum(recent60, (r) => r.revenuePerSignupD60Eur * r.signups) / signups60) * 100) / 100
        : null,
  };
}

/** Loads the last `weeks` signup weeks and computes their conversion. */
export async function cohortConversion(now: Date = new Date(), weeks = 16): Promise<CohortSummary> {
  const since = new Date(weekStartUtc(now).getTime() - (weeks - 1) * 7 * DAY_MS);
  const users = await User.find({ createdAt: { $gte: since } })
    .select(
      "createdAt signupPlatform firstPaidAt subscriptionStartedAt proTrialUsedAt storeTrialStartedAt " +
        "subscriptionInterval storePremiumInterval stripeSubscriptionId",
    )
    .lean<RawUser[]>();
  return buildCohorts(users, now, weeks);
}
