/**
 * RevenueCat Charts & Metrics -> the admin dashboard.
 *
 * Why this exists: the MRR on /beheer is built from Mongo, by counting accounts
 * that match the Stripe filter and pricing each one from lib/pricing. App Store
 * and Play subscribers cannot be priced that way - the only thing the database
 * keeps about them is `storePremium`, its platform and its expiry (models/User),
 * never an interval, a product or an amount. So every cent earned through the
 * apps was missing from the one number the dashboard leads with.
 *
 * RevenueCat already has those figures and is the system of record for them, so
 * this reads them instead of modelling them: GET /v2/projects/{id}/metrics/
 * overview, the same snapshot the RevenueCat dashboard shows.
 *
 * Two keys, neither of which is the one lib/revenuecatSync uses:
 *   REVENUECAT_PROJECT_ID    the project, from the RevenueCat URL or settings
 *   REVENUECAT_V2_API_KEY    a V2 SECRET key with charts_metrics:overview:read
 * The v1 key in REVENUECAT_REST_API_KEY cannot read v2 metrics, and the public
 * SDK key (the one the app ships) cannot read anything here at all - it is
 * meant to be embedded in a client, so it carries no dashboard permissions.
 *
 * Deliberate properties:
 *  - Unconfigured is not an error. `isRevenueCatMetricsConfigured()` is a plain
 *    env check with no network call, so the dashboard can tell "no app revenue
 *    is wired up" apart from "the app revenue could not be read", and never
 *    reports a Stripe-only total as if it were everything.
 *  - Money is returned in cents, as integers, like lib/pricing. The API answers
 *    in major units and floats; 9.99 * 100 is 998.9999999999999.
 *  - Metrics are looked up by id out of a list. RevenueCat adds metrics to that
 *    list over time, and an id this file does not know must not throw.
 *  - Cached in module memory. The endpoint is rate limited to 25 requests per
 *    minute per project and the dashboard has a refresh button; the numbers
 *    behind it move hourly at best.
 */

/** Minutes a fetched snapshot is reused before the API is asked again. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Hard stop on the request, so a slow RevenueCat cannot hold /beheer open. */
const TIMEOUT_MS = 8000;

/** Asked for explicitly: the Stripe figures beside these are euros. */
const CURRENCY = "EUR";

type OverviewMetric = {
  id?: string | null;
  name?: string | null;
  unit?: string | null;
  period?: string | null;
  value?: number | string | null;
  last_updated_at?: string | null;
};

type OverviewResponse = {
  object?: string;
  currency?: string | null;
  metrics?: OverviewMetric[] | null;
  last_updated_at?: string | null;
};

export type RevenueCatOverview = {
  /** Currency the amounts below are in, as RevenueCat reported it. */
  currency: string;
  /** Monthly recurring revenue across every store, in cents. */
  mrrCents: number | null;
  /** Revenue over the trailing window RevenueCat reports, in cents. */
  revenueCents: number | null;
  /** ISO 8601 duration of that window, e.g. "P28D". Null when not reported. */
  revenuePeriod: string | null;
  activeSubscriptions: number | null;
  activeTrials: number | null;
  /** When RevenueCat last recomputed the snapshot, ISO 8601. */
  updatedAt: string | null;
};

/**
 * True when both keys are present. No network call: the dashboard needs to know
 * whether app revenue is expected at all before it decides what a missing
 * figure means.
 */
export function isRevenueCatMetricsConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_PROJECT_ID && process.env.REVENUECAT_V2_API_KEY);
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toCents(value: number | string | null | undefined): number | null {
  const amount = toNumber(value);
  return amount === null ? null : Math.round(amount * 100);
}

function toCount(value: number | string | null | undefined): number | null {
  const amount = toNumber(value);
  return amount === null ? null : Math.round(amount);
}

/**
 * Pure parse of an overview response, exported for tests.
 *
 * Ids are matched case-insensitively against the small set this dashboard
 * shows. Everything else in the list is ignored rather than rejected: the
 * endpoint returns installs, active users and new customers too, and gains
 * metrics over time.
 */
export function parseOverviewMetrics(data: OverviewResponse): RevenueCatOverview {
  const metrics = Array.isArray(data?.metrics) ? data.metrics : [];
  const byId = new Map<string, OverviewMetric>();
  for (const metric of metrics) {
    const id = typeof metric?.id === "string" ? metric.id.trim().toLowerCase() : "";
    if (id) byId.set(id, metric);
  }

  const revenue = byId.get("revenue");

  return {
    currency: typeof data?.currency === "string" && data.currency ? data.currency : CURRENCY,
    mrrCents: toCents(byId.get("mrr")?.value),
    revenueCents: toCents(revenue?.value),
    revenuePeriod: typeof revenue?.period === "string" && revenue.period ? revenue.period : null,
    activeSubscriptions: toCount(byId.get("active_subscriptions")?.value),
    activeTrials: toCount(byId.get("active_trials")?.value),
    updatedAt:
      [data?.last_updated_at, ...metrics.map((m) => m?.last_updated_at)].find(
        (value): value is string => typeof value === "string" && value.length > 0,
      ) ?? null,
  };
}

let cache: { at: number; data: RevenueCatOverview } | null = null;

/** Drops the cached snapshot. Tests only. */
export function clearRevenueCatMetricsCache(): void {
  cache = null;
}

/**
 * The live snapshot, or a cached one under five minutes old.
 *
 * Throws when the keys are missing or RevenueCat refuses, so the caller records
 * it as a degraded figure rather than printing a zero. A 401 here almost always
 * means the key is a v1 key or the public SDK key; a 403 means the key exists
 * but lacks charts_metrics:overview:read.
 */
export async function fetchRevenueCatOverview(): Promise<RevenueCatOverview> {
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  const apiKey = process.env.REVENUECAT_V2_API_KEY;
  if (!projectId || !apiKey) {
    throw new Error("REVENUECAT_PROJECT_ID or REVENUECAT_V2_API_KEY is not set");
  }

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const url =
    `https://api.revenuecat.com/v2/projects/${encodeURIComponent(projectId)}/metrics/overview` +
    `?currency=${CURRENCY}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RevenueCat metrics API ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = parseOverviewMetrics((await res.json()) as OverviewResponse);
  cache = { at: Date.now(), data };
  return data;
}
