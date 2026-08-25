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

export function resolvePriceId(interval: BillingInterval): string | undefined {
  return interval === "annual"
    ? process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID
    : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
}

/**
 * Every entry must name something the code actually withholds from a free
 * account. Two claims were removed for failing that test: "Historische context
 * en kaarten" (HistoricalContext and /api/geo/images are ungated - free for
 * everyone) and the word "onbeperkt" on the AI, which app/api/ai/chat caps at
 * PREMIUM_DAILY_CAP = 200 per day.
 */
export const PRO_FEATURES = [
  "Alle bijbelcommentaren, onbeperkt",
  "200 AI-vragen per dag, i.p.v. 5",
  "Grondtekst: Hebreeuws en Grieks",
  "Prioriteit bij ondersteuning",
];
