import mongoose from "mongoose";
import connectMongoDB from "./mongodb";
import User from "../models/User";
import { JOURNEY_FIELDS, billingJourney, type BillingJourney, type JourneyAccount } from "./billingJourney";
import type { AdminPayload } from "./adminStats";

/**
 * The per-account billing answer behind "op welke stap zit deze gebruiker, en
 * is er betaald?" on /beheer/gebruikers.
 *
 * Two halves, deliberately separate:
 *  - the step itself, derived from the account's own fields by
 *    lib/billingJourney - always available, even with no Stripe key;
 *  - what Stripe says *right now* about the subscription and its invoices -
 *    the only place an admin can see whether money actually moved, and which
 *    amount is queued next.
 *
 * The Stripe half is best-effort on purpose. lib/stripe throws at module scope
 * when STRIPE_SECRET_KEY is absent (the failure that once took the whole admin
 * dashboard down - see lib/billingFilters), so it is imported dynamically and
 * every failure comes back as `stripe.error` beside a journey that still
 * renders. An admin screen that goes blank because Stripe is unreachable is
 * worse than one that says Stripe is unreachable.
 */

export interface InvoiceLine {
  id: string;
  /** "paid", "open", "draft", "void", "uncollectible". */
  status: string | null;
  /** What was actually collected, in cents. */
  amountPaidCents: number;
  amountDueCents: number;
  currency: string;
  createdAt: string;
  /** True for the EUR 0,00 invoice Stripe issues when a trial starts. */
  isTrialInvoice: boolean;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

export interface StripeBillingView {
  configured: boolean;
  mode: "live" | "test" | "unknown";
  customerId: string | null;
  subscription: {
    id: string;
    status: string;
    priceId: string | null;
    amountCents: number | null;
    currency: string | null;
    interval: "monthly" | "annual" | null;
    trialStart: string | null;
    trialEnd: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    /** Is a card or mandate stored? Without one, a trial cannot turn into a charge. */
    hasPaymentMethod: boolean;
    collectionPaused: boolean;
  } | null;
  /** Newest first, at most five. */
  invoices: InvoiceLine[];
  /** Sum of everything Stripe actually collected on this customer, in cents. */
  totalPaidCents: number | null;
  /** The next automatic charge Stripe has queued, when it reports one. */
  upcoming: { amountCents: number; currency: string; at: string | null } | null;
  error: string | null;
}

export interface AccountBillingReport {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    createdAt: string | null;
  };
  journey: BillingJourney;
  /** The raw fields the journey was derived from, so nothing is hidden. */
  fields: Record<string, unknown>;
  stripe: StripeBillingView;
}

type Row = JourneyAccount & { _id: unknown; name?: string; email?: string };

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function intervalOf(recurring: { interval?: string } | null | undefined): "monthly" | "annual" | null {
  if (recurring?.interval === "year") return "annual";
  if (recurring?.interval === "month") return "monthly";
  return null;
}

/**
 * Everything Stripe knows about one customer's subscription and payments.
 *
 * Never throws: an unconfigured or unreachable Stripe comes back as
 * `configured: false` or an `error` string.
 */
export async function stripeBillingView(customerId: string | null): Promise<StripeBillingView> {
  const empty: StripeBillingView = {
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
    mode: process.env.STRIPE_SECRET_KEY
      ? process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")
        ? "test"
        : "live"
      : "unknown",
    customerId,
    subscription: null,
    invoices: [],
    totalPaidCents: null,
    upcoming: null,
    error: null,
  };
  if (!empty.configured) return { ...empty, error: "Stripe is niet geconfigureerd op deze omgeving." };
  if (!customerId) return empty;

  try {
    const stripe = (await import("./stripe")).default;

    const [subscriptions, invoices] = await Promise.all([
      stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
        expand: ["data.default_payment_method"],
      }),
      stripe.invoices.list({ customer: customerId, limit: 5 }),
    ]);

    // Same ranking as lib/subscriptionSync.pickPrimary: entitled beats broken,
    // newer beats older, so the one shown is the one that matters.
    const rank = ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"];
    const primary = [...subscriptions.data].sort((a, b) => {
      const ra = rank.indexOf(a.status);
      const rb = rank.indexOf(b.status);
      const na = ra === -1 ? rank.length : ra;
      const nb = rb === -1 ? rank.length : rb;
      if (na !== nb) return na - nb;
      return (b.created ?? 0) - (a.created ?? 0);
    })[0];

    const item = primary?.items.data[0];
    const price = item?.price;
    const itemPeriodEnd = (item as { current_period_end?: number } | undefined)?.current_period_end;
    const subPeriodEnd = (primary as { current_period_end?: number } | undefined)?.current_period_end;

    const customer = primary
      ? await stripe.customers
          .retrieve(customerId, { expand: ["invoice_settings.default_payment_method"] })
          .catch(() => null)
      : null;
    const customerDefault =
      customer && !("deleted" in customer && customer.deleted)
        ? (customer.invoice_settings?.default_payment_method ?? null)
        : null;

    const lines: InvoiceLine[] = invoices.data.map((invoice) => ({
      id: invoice.id ?? "",
      status: invoice.status ?? null,
      amountPaidCents: invoice.amount_paid ?? 0,
      amountDueCents: invoice.amount_due ?? 0,
      currency: (invoice.currency ?? "eur").toUpperCase(),
      createdAt: new Date((invoice.created ?? 0) * 1000).toISOString(),
      // A trial's opening invoice is EUR 0,00 and paid: counting it as a
      // payment is exactly how "heeft betaald" starts lying.
      isTrialInvoice: (invoice.amount_due ?? 0) === 0 && (invoice.amount_paid ?? 0) === 0,
      hostedUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
    }));

    return {
      ...empty,
      subscription: primary
        ? {
            id: primary.id,
            status: primary.status,
            priceId: price?.id ?? null,
            amountCents: price?.unit_amount ?? null,
            currency: (price?.currency ?? "eur").toUpperCase(),
            interval: intervalOf(price?.recurring),
            trialStart: primary.trial_start ? new Date(primary.trial_start * 1000).toISOString() : null,
            trialEnd: primary.trial_end ? new Date(primary.trial_end * 1000).toISOString() : null,
            currentPeriodEnd:
              subPeriodEnd || itemPeriodEnd
                ? new Date(((subPeriodEnd ?? itemPeriodEnd) as number) * 1000).toISOString()
                : null,
            cancelAtPeriodEnd: Boolean(primary.cancel_at_period_end),
            hasPaymentMethod: Boolean(primary.default_payment_method || customerDefault),
            collectionPaused: Boolean(primary.pause_collection),
          }
        : null,
      invoices: lines,
      totalPaidCents: lines.reduce((sum, line) => sum + line.amountPaidCents, 0),
      upcoming: null,
      error: null,
    };
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** The report behind GET /api/admin/users/[id]/billing. */
export async function accountBillingPayload(id: string): Promise<AdminPayload> {
  if (!mongoose.isValidObjectId(id)) {
    return { status: 400, body: { error: "Ongeldig ID" } };
  }
  await connectMongoDB();
  const user = await User.findById(id)
    .select(`name email ${JOURNEY_FIELDS}`)
    .lean<Row>();
  if (!user) return { status: 404, body: { error: "Gebruiker niet gevonden" } };

  const stripe = await stripeBillingView(user.stripeCustomerId ?? null);

  // Stripe's own price beats the local mirror for the amount in the sentence:
  // it is what will actually be charged.
  const journey = billingJourney(user, { amountCents: stripe.subscription?.amountCents ?? null });

  const report: AccountBillingReport = {
    user: {
      id: String(user._id),
      name: user.name ?? null,
      email: user.email ?? null,
      createdAt: iso(user.createdAt),
    },
    journey,
    fields: {
      subscribed: Boolean(user.subscribed),
      isAdmin: Boolean(user.isAdmin),
      stripeCustomerId: user.stripeCustomerId ?? null,
      stripeSubscriptionId: user.stripeSubscriptionId ?? null,
      subscriptionStatus: user.subscriptionStatus ?? null,
      subscriptionInterval: user.subscriptionInterval ?? null,
      stripePriceId: user.stripePriceId ?? null,
      currentPeriodEnd: iso(user.currentPeriodEnd),
      cancelAtPeriodEnd: Boolean(user.cancelAtPeriodEnd),
      pausedUntil: iso(user.pausedUntil),
      subscriptionStartedAt: iso(user.subscriptionStartedAt),
      proTrialUsedAt: iso(user.proTrialUsedAt),
      firstPaidAt: iso(user.firstPaidAt),
      billingIssueSince: iso(user.billingIssueSince),
      compedProUntil: iso(user.compedProUntil),
      proGiftedAt: iso(user.proGiftedAt),
      storePremium: Boolean(user.storePremium),
      storePremiumPlatform: user.storePremiumPlatform ?? null,
      storePremiumExpiresAt: iso(user.storePremiumExpiresAt),
      storeTrial: Boolean(user.storeTrial),
      storeTrialStartedAt: iso(user.storeTrialStartedAt),
      reverseTrial: user.reverseTrial
        ? {
            startedAt: iso(user.reverseTrial.startedAt),
            endsAt: iso(user.reverseTrial.endsAt),
            endedAt: iso(user.reverseTrial.endedAt),
            voidedAt: iso(user.reverseTrial.voidedAt),
            days: user.reverseTrial.days ?? [],
            origin: user.reverseTrial.origin ?? null,
            topFeature: user.reverseTrial.topFeature ?? null,
          }
        : null,
    },
    stripe,
  };

  return { status: 200, body: report as unknown as Record<string, unknown> };
}
