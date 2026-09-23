/**
 * Single source of truth for what BijbelStudie Pro costs and how that price is
 * phrased. Every surface that shows a price - the pricing page, the sidebar CTA,
 * the AI-limit prompt, the commentary paywall - reads from here, so a price
 * change is one edit and the weekly/daily framing can never drift out of sync
 * with the amount actually charged.
 *
 * Legal note: the per-week and per-day figures are derived, not billed. The EU
 * Omnibus rules and the Dutch price-indication rules require the amount actually
 * charged and its billing period to be shown alongside any such framing, which
 * is why every plan below carries an explicit `billedLabel`.
 */

import { FREE_AI_DAILY_CAP, PRO_AI_DAILY_CAP } from "./entitlements";

export type BillingInterval = "monthly" | "annual";

export interface Plan {
  interval: BillingInterval;
  /** Amount charged per billing period, in euro cents. */
  amountCents: number;
  /** What Stripe charges, spelled out. Must always be shown next to any derived figure. */
  billedLabel: string;
  priceIdEnv: string;
}

/**
 * Annual moved from EUR 69,99 (42% off) to EUR 89,99 (25% off, "3 maanden
 * gratis"). Existing annual subscribers stay on the old Stripe Price and are
 * never migrated - Stripe keeps charging whatever Price their subscription was
 * created with, so grandfathering needs no code, only that we never call
 * `subscriptions.update` with a new price on them.
 */
export const PLANS: Record<BillingInterval, Plan> = {
  annual: {
    interval: "annual",
    amountCents: 8999,
    billedLabel: "€89,99 per jaar, in één keer gefactureerd",
    priceIdEnv: "NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID",
  },
  monthly: {
    interval: "monthly",
    amountCents: 999,
    billedLabel: "€9,99 per maand, maandelijks gefactureerd",
    priceIdEnv: "NEXT_PUBLIC_STRIPE_PRICE_ID",
  },
};

/** The plan the pricing page leads with. */
export const RECOMMENDED: BillingInterval = "annual";

const MONTHS_PER_YEAR = 12;
const WEEKS_PER_YEAR = 52;
const DAYS_PER_YEAR = 365;

/** Dutch formatting: comma decimal separator, always two decimals. */
export function euro(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function annualisedCents(plan: Plan): number {
  return plan.interval === "annual"
    ? plan.amountCents
    : plan.amountCents * MONTHS_PER_YEAR;
}

/** What a year of this plan costs, e.g. monthly = €119,88. */
export function perYear(plan: Plan): string {
  return euro(Math.round(annualisedCents(plan)));
}

/** Headline framing. Rounded to the cent so the number stays checkable. */
export function perWeek(plan: Plan): string {
  return euro(Math.round(annualisedCents(plan) / WEEKS_PER_YEAR));
}

export function perDay(plan: Plan): string {
  return euro(Math.round(annualisedCents(plan) / DAYS_PER_YEAR));
}

/** Effective monthly cost of the annual plan, e.g. €7,50. */
export function effectivePerMonth(plan: Plan): string {
  return euro(Math.round(annualisedCents(plan) / MONTHS_PER_YEAR));
}

/**
 * The anchor. This is a comparison between two tariffs we genuinely charge -
 * NOT a former price - so it may be shown permanently. It must always be
 * labelled as the monthly-billing equivalent; presenting it as a struck-through
 * "was" price would make it a reduction claim and pull in the 30-day
 * lowest-price rule.
 */
export function monthlyEquivalentPerYear(): string {
  return perYear(PLANS.monthly);
}

/** Absolute euro saving of annual vs paying monthly for a year. */
export function annualSaving(): string {
  return euro(annualisedCents(PLANS.monthly) - annualisedCents(PLANS.annual));
}

/** Discount of annual vs monthly, as a whole percentage. */
export function annualDiscountPercent(): number {
  const monthly = annualisedCents(PLANS.monthly);
  return Math.round(((monthly - annualisedCents(PLANS.annual)) / monthly) * 100);
}

/**
 * How many months of the annual plan are effectively free, floored - the badge
 * says "3 maanden gratis" only while that is actually true of the real prices.
 */
export function freeMonthsOnAnnual(): number {
  const saving = annualisedCents(PLANS.monthly) - annualisedCents(PLANS.annual);
  return Math.floor(saving / PLANS.monthly.amountCents);
}

/**
 * Every entry must name something the code actually withholds from a free
 * account - this list is what the pricing page, the Pro offer dialog and the
 * plan cards promise. Checked against the code, not against what reads well:
 *  - commentaries: lib/proContent.ts (`gateCommentary`, KingComments stays free)
 *  - grondtekst: lib/proContent.ts (`FREE_ORIGINAL_VERSES`) and the per-verse
 *    grondtekst in the lesson, which is Pro only (components/study/flow/PassageReader)
 *  - AI, notes, groups: lib/entitlements.ts, enforced by the web AND app routes
 *  - voorlezen: app/api/tts refuses the cloud voices without Pro
 *  - streak protection: lib/streak.ts spends a freeze only for a Pro reader
 *  - tree items: lib/levensboom/catalog.ts, the `pro` unlocks
 * Two claims were removed earlier for failing that test ("Historische context
 * en kaarten" is free for everyone, and the AI is capped, so never
 * "onbeperkt"), and "Prioriteit bij ondersteuning" was removed because nothing
 * in the code or the support process gives Pro a queue of its own.
 */
export const PRO_FEATURES = [
  "Matthew Henry, Calvijn en Dachsel volledig",
  "Grondtekst: Hebreeuws en Grieks bij elk vers",
  `${PRO_AI_DAILY_CAP} AI-vragen per dag, i.p.v. ${FREE_AI_DAILY_CAP}`,
  "Onbeperkt notities, op de website en in de app",
  "Zoveel studiegroepen leiden als je wilt",
  "Voorlezen met natuurlijke stemmen",
  "Streakbescherming als je een dag mist",
  "Extra bomen, landschappen en de gouden ring",
];
