/**
 * Where one account stands in the road from "net aangemeld" to "betaalt", in
 * one pure function.
 *
 * The billing fields answer a dozen small questions each - `subscribed`,
 * `subscriptionStatus`, `compedProUntil`, `storeTrial`, `reverseTrial.endedAt`,
 * `proTrialUsedAt`, `firstPaidAt` - and /beheer/gebruikers showed them
 * side by side as chips, which is why "deze gebruiker is PRO" could not be read
 * off the screen as either "we schrijven binnenkort af" or "dit is gratis en
 * er komt nooit geld". Those two look identical in `subscribed`, and they are
 * the two states an admin most needs to tell apart.
 *
 * So the derivation lives here, once, and both the account list and the
 * per-account detail endpoint report the same `stage`. Nothing in this file
 * reads the database or Stripe: it takes the fields a lean row already has, so
 * the list can label 500 accounts without a single extra query, and
 * app/api/admin/users/[id]/billing holds the live Stripe lookup beside it.
 *
 * The four channels an account can be Pro through, and what each means for
 * money:
 *  - the reverse trial (lib/reverseTrial.ts): free Pro on the first days, no
 *    card was ever asked for, so NOTHING is ever charged - it simply ends;
 *  - a comp (admin grant, referral week): same, it ends on its date;
 *  - Stripe: a card or mandate was collected at checkout, so a trial here does
 *    turn into a charge on `currentPeriodEnd`;
 *  - the App Store / Play Store: Apple or Google bills, we only mirror it.
 */

export type BillingStage =
  /** Never had Pro of any kind. */
  | "free"
  /** The free Pro days are running. No card, no charge - it just ends. */
  | "reverse_trial"
  /** Those days are over; back on the free limits with one personal limit. */
  | "free_after_reverse_trial"
  /** A gift with an end date (admin month, referral week). Never charged. */
  | "comped_until"
  /** Pro switched on by hand, open-ended. Never charged. */
  | "comped_open"
  /** Admin: Pro because of the account's role, not a purchase. */
  | "admin"
  /** Stripe free trial, card on file: the first charge is automatic. */
  | "stripe_trial"
  /** Paying through Stripe. */
  | "stripe_active"
  /** Paying, but has cancelled: runs to the end of the period. */
  | "stripe_canceling"
  /** Collection paused through `pause_collection`. */
  | "stripe_paused"
  /** A payment failed; Stripe is retrying. Access is already gone. */
  | "stripe_past_due"
  /** Stripe gave up or never got a first payment. */
  | "stripe_payment_failed"
  /** Had a Stripe subscription, it ended. */
  | "stripe_canceled"
  /** Store free trial (Apple/Google). The store charges when it ends. */
  | "store_trial"
  /** Paying through the App Store or Play Store. */
  | "store_active"
  /** A store subscription that has lapsed. */
  | "store_lapsed";

export type BillingChannel = "stripe" | "apple" | "google" | "comp" | "reverse_trial" | "admin" | null;

/** Something an admin should look at. `level` decides the colour, not the words. */
export interface BillingIssue {
  code:
    | "comp_expired_still_pro"
    | "reverse_trial_over_still_pro"
    | "store_expired_still_pro"
    | "stripe_customer_without_subscription"
    | "pro_without_known_source"
    | "trial_used_never_paid"
    | "payment_failed"
    | "entitled_status_without_access"
    | "paying_without_interval";
  level: "warn" | "error";
  /** One sentence, in Dutch, saying what is wrong and what to do. */
  message: string;
}

export interface BillingPlan {
  interval: "monthly" | "annual" | null;
  /** Stripe price id, when Stripe is the channel. */
  priceId: string | null;
  /** Who bills it. */
  biller: "stripe" | "apple" | "google" | null;
}

export interface BillingJourney {
  stage: BillingStage;
  /** Short label for a chip: "PROEF (GRATIS)", "BETAALT", "PROEF LOOPT AF". */
  label: string;
  /** One sentence an admin can read as the answer to "en nu?". */
  explanation: string;
  channel: BillingChannel;
  /** Pro right now, by any route. Mirrors lib/mobilePremium `resolveIsPro`. */
  isPro: boolean;
  /** Has money ever actually been collected for this account? */
  hasPaid: boolean;
  firstPaidAt: Date | null;
  /** Is an automatic charge coming at all? False for every free route. */
  willCharge: boolean;
  /** When that charge lands, when one is coming. */
  nextChargeAt: Date | null;
  /** When access ends if nothing is paid; null when it renews or is open-ended. */
  accessUntil: Date | null;
  plan: BillingPlan;
  trial: {
    kind: "reverse" | "stripe" | "store" | null;
    startedAt: Date | null;
    /** End of the trial, while it is known. */
    endsAt: Date | null;
    /** Over and done with. */
    over: boolean;
    /** Days the reverse trial counted, out of REVERSE_TRIAL_DAYS. */
    daysUsed: number | null;
  };
  issues: BillingIssue[];
}

/* -------------------------------------------------------------------------- */

export interface JourneyAccount {
  subscribed?: boolean | null;
  isAdmin?: boolean | null;
  createdAt?: Date | string | null;

  // Stripe
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionInterval?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: Date | string | null;
  cancelAtPeriodEnd?: boolean | null;
  pausedUntil?: Date | string | null;
  subscriptionStartedAt?: Date | string | null;
  proTrialUsedAt?: Date | string | null;
  billingIssueSince?: Date | string | null;

  // Stores
  storePremium?: boolean | null;
  storePremiumPlatform?: "apple" | "google" | null;
  storePremiumExpiresAt?: Date | string | null;
  storePremiumInterval?: string | null;
  storeTrial?: boolean | null;
  storeTrialStartedAt?: Date | string | null;

  // Comps and the reverse trial
  compedProUntil?: Date | string | null;
  proGiftedAt?: Date | string | null;
  reverseTrial?: {
    startedAt?: Date | string | null;
    endsAt?: Date | string | null;
    endedAt?: Date | string | null;
    voidedAt?: Date | string | null;
    days?: string[] | null;
    origin?: string | null;
    topFeature?: string | null;
  } | null;

  /** Any channel that pays: used only to date the first payment. */
  firstPaidAt?: Date | string | null;
}

/** The `.select()` every caller of [billingJourney] needs. */
export const JOURNEY_FIELDS =
  "subscribed isAdmin createdAt stripeCustomerId stripeSubscriptionId subscriptionStatus " +
  "subscriptionInterval stripePriceId currentPeriodEnd cancelAtPeriodEnd pausedUntil " +
  "subscriptionStartedAt proTrialUsedAt billingIssueSince storePremium storePremiumPlatform " +
  "storePremiumExpiresAt storePremiumInterval storeTrial storeTrialStartedAt compedProUntil " +
  "proGiftedAt reverseTrial firstPaidAt";

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function interval(value: string | null | undefined): "monthly" | "annual" | null {
  return value === "monthly" || value === "annual" ? value : null;
}

/** Stripe statuses that grant access. Same set as lib/subscriptionSync. */
const ENTITLED_STATUS = new Set(["active", "trialing"]);

/**
 * Pro that no one pays for and that Stripe did not grant. Mirrors
 * COMPED_ACCESS_FILTER in lib/billingFilters, on a loaded row.
 */
function isCompOnly(account: JourneyAccount): boolean {
  return Boolean(
    account.subscribed && !account.storePremium && !account.stripeSubscriptionId && !account.subscriptionStatus,
  );
}

/** Is this comp the reverse trial's own grant rather than an admin gift? */
function isReverseTrialComp(account: JourneyAccount, now: Date): boolean {
  const trial = account.reverseTrial;
  if (!trial || !toDate(trial.startedAt) || toDate(trial.voidedAt)) return false;
  if (!isCompOnly(account)) return false;
  // While the trial runs, lib/reverseTrial grants Pro until tonight and tops it
  // up each active day, so a comp that ends within a day is its grant. An admin
  // month or a referral week reaches further out and reads as a gift.
  const until = toDate(account.compedProUntil);
  if (!until) return false;
  if (toDate(trial.endedAt)) return false;
  return until.getTime() - now.getTime() <= 36 * 3600 * 1000;
}

function stageOf(account: JourneyAccount, now: Date): BillingStage {
  const status = account.subscriptionStatus ?? null;
  const paused = toDate(account.pausedUntil);

  if (account.storePremium) return account.storeTrial ? "store_trial" : "store_active";
  if (status === "trialing") return "stripe_trial";
  if (paused && paused.getTime() > now.getTime()) return "stripe_paused";
  if (status === "active") return account.cancelAtPeriodEnd ? "stripe_canceling" : "stripe_active";
  if (status === "past_due") return "stripe_past_due";
  if (status === "unpaid" || status === "incomplete" || status === "incomplete_expired") {
    return "stripe_payment_failed";
  }
  if (status === "paused") return "stripe_paused";

  if (isReverseTrialComp(account, now)) return "reverse_trial";
  // Before the comp branch: an admin is Pro by role, and reading that as a
  // manual grant would put "handmatig Pro" on every beheerder.
  if (account.isAdmin) return "admin";
  if (account.subscribed && isCompOnly(account)) {
    return toDate(account.compedProUntil) ? "comped_until" : "comped_open";
  }

  // No access now. What did this account have before?
  if (status === "canceled" || account.stripeSubscriptionId) return "stripe_canceled";
  if (toDate(account.storePremiumExpiresAt) || account.storeTrialStartedAt) return "store_lapsed";
  if (toDate(account.reverseTrial?.endedAt)) return "free_after_reverse_trial";
  return "free";
}

const LABELS: Record<BillingStage, string> = {
  free: "GRATIS",
  reverse_trial: "PROEF (GRATIS)",
  free_after_reverse_trial: "PROEF VOORBIJ",
  comped_until: "CADEAU",
  comped_open: "HANDMATIG PRO",
  admin: "ADMIN",
  stripe_trial: "PROEF (KAART)",
  stripe_active: "BETAALT",
  stripe_canceling: "ZEGT OP",
  stripe_paused: "GEPAUZEERD",
  stripe_past_due: "BETALING MISLUKT",
  stripe_payment_failed: "NIET BETAALD",
  stripe_canceled: "OPGEZEGD",
  store_trial: "PROEF (STORE)",
  store_active: "BETAALT (STORE)",
  store_lapsed: "STORE VERLOPEN",
};

function dutchDate(date: Date | null): string {
  if (!date) return "onbekende datum";
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function euro(cents: number | null): string {
  if (cents === null) return "het abonnementsbedrag";
  return `EUR ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function explain(stage: BillingStage, account: JourneyAccount, now: Date, amountCents: number | null): string {
  const periodEnd = toDate(account.currentPeriodEnd);
  const comp = toDate(account.compedProUntil);
  const storeEnd = toDate(account.storePremiumExpiresAt);
  switch (stage) {
    case "free":
      return "Nog nooit Pro gehad en er staat geen betaling klaar.";
    case "reverse_trial":
      return (
        "Gratis Pro-dagen voor een nieuw account. Er is geen kaart gevraagd, dus er wordt " +
        "nooit iets afgeschreven: na de laatste dag valt dit account terug naar gratis."
      );
    case "free_after_reverse_trial":
      return "De gratis Pro-dagen zijn voorbij. Dit account is gratis en heeft nooit betaald.";
    case "comped_until":
      return `Pro cadeau tot ${dutchDate(comp)}. Hier wordt niets afgeschreven; daarna gratis, tenzij hij zelf een abonnement neemt.`;
    case "comped_open":
      return "Pro handmatig aangezet, zonder einddatum. Er wordt niets afgeschreven.";
    case "admin":
      return "Pro omdat dit een beheerdersaccount is. Geen abonnement, geen betaling.";
    case "stripe_trial":
      return (
        `Proefperiode via Stripe met een kaart of mandaat op het account. Op ${dutchDate(periodEnd)} ` +
        `schrijft Stripe automatisch ${euro(amountCents)} af, tenzij hij voor die datum opzegt.`
      );
    case "stripe_active":
      return `Betaalt via Stripe. Volgende afschrijving ${dutchDate(periodEnd)}.`;
    case "stripe_canceling":
      return `Heeft opgezegd. Pro loopt nog tot ${dutchDate(periodEnd)} en daarna wordt er niets meer afgeschreven.`;
    case "stripe_paused":
      return "Inning is gepauzeerd in Stripe. Er wordt nu niets afgeschreven.";
    case "stripe_past_due":
      return "Een afschrijving is mislukt. Stripe probeert het opnieuw; tot die tijd heeft dit account geen Pro.";
    case "stripe_payment_failed":
      return "Stripe heeft geen betaling binnengekregen. Dit account heeft geen Pro.";
    case "stripe_canceled":
      return "Het abonnement is gestopt. Er wordt niets meer afgeschreven.";
    case "store_trial":
      return (
        `Proefperiode in de App Store of Play Store. De store schrijft zelf af als de proef eindigt` +
        `${storeEnd ? ` (${dutchDate(storeEnd)})` : ""}; wij spiegelen dat alleen.`
      );
    case "store_active":
      return `Betaalt via ${account.storePremiumPlatform === "google" ? "Google" : "Apple"}. Verlenging loopt via de store${storeEnd ? `, nu tot ${dutchDate(storeEnd)}` : ""}.`;
    case "store_lapsed":
      return "Het store-abonnement is verlopen. Dit account is gratis.";
  }
}

function channelOf(stage: BillingStage, account: JourneyAccount): BillingChannel {
  if (stage.startsWith("stripe")) return "stripe";
  if (stage.startsWith("store")) return account.storePremiumPlatform === "google" ? "google" : "apple";
  if (stage === "reverse_trial") return "reverse_trial";
  if (stage === "comped_until" || stage === "comped_open") return "comp";
  if (stage === "admin") return "admin";
  return null;
}

function issuesOf(account: JourneyAccount, stage: BillingStage, now: Date): BillingIssue[] {
  const issues: BillingIssue[] = [];
  const comp = toDate(account.compedProUntil);
  const storeEnd = toDate(account.storePremiumExpiresAt);

  // The daily sweep in lib/compedPro ends a grant a few hours after its date at
  // the latest. Longer than that and the sweep (the cron on
  // /api/internal/reconcile-subscriptions) is not running.
  if (account.subscribed && isCompOnly(account) && comp && comp.getTime() < now.getTime() - 26 * 3600 * 1000) {
    issues.push({
      code: stage === "reverse_trial" ? "reverse_trial_over_still_pro" : "comp_expired_still_pro",
      level: "error",
      message: `Gratis Pro liep af op ${dutchDate(comp)} maar dit account is nog Pro. Controleer of de dagelijkse cron op /api/internal/reconcile-subscriptions draait.`,
    });
  }

  if (account.storePremium && storeEnd && storeEnd.getTime() < now.getTime() - 48 * 3600 * 1000) {
    issues.push({
      code: "store_expired_still_pro",
      level: "warn",
      message: `De store-periode eindigde op ${dutchDate(storeEnd)} maar het account staat nog op Pro. Controleer de RevenueCat-webhook.`,
    });
  }

  // Money may have changed hands without anything granting access: the signal
  // the missed-webhook incident was about.
  if (account.stripeCustomerId && !account.subscriptionStatus && !account.subscribed) {
    issues.push({
      code: "stripe_customer_without_subscription",
      level: "warn",
      message:
        "Er is een Stripe-klant aangemaakt (checkout gestart) maar nooit een abonnementsstatus teruggeschreven. Synchroniseer met Stripe om te zien of er betaald is.",
    });
  }

  if (account.subscribed && !account.isAdmin && isCompOnly(account) && !comp && stage === "comped_open") {
    issues.push({
      code: "pro_without_known_source",
      level: "warn",
      message:
        "Pro staat aan zonder abonnement en zonder einddatum. Dit blijft gratis Pro tot je het zelf uitzet.",
    });
  }

  if (account.billingIssueSince) {
    issues.push({
      code: "payment_failed",
      level: "error",
      message: `Sinds ${dutchDate(toDate(account.billingIssueSince))} is er een mislukte betaling die nog niet is opgelost.`,
    });
  }

  // A trial that ran out and never became revenue is normal once; it is a bug
  // when the subscription says it is live and the first payment never landed.
  if (
    (stage === "stripe_active" || stage === "stripe_canceling") &&
    !account.firstPaidAt &&
    toDate(account.proTrialUsedAt)
  ) {
    issues.push({
      code: "trial_used_never_paid",
      level: "warn",
      message:
        "Het abonnement staat op actief na een proefperiode, maar er is nooit een eerste betaling vastgelegd. Controleer de facturen in Stripe.",
    });
  }

  if (account.subscriptionStatus && ENTITLED_STATUS.has(account.subscriptionStatus) && !account.subscribed) {
    issues.push({
      code: "entitled_status_without_access",
      level: "error",
      message: `Stripe zegt "${account.subscriptionStatus}" maar dit account heeft geen Pro. Synchroniseer met Stripe.`,
    });
  }

  if ((stage === "stripe_active" || stage === "stripe_canceling") && !interval(account.subscriptionInterval)) {
    issues.push({
      code: "paying_without_interval",
      level: "warn",
      message: "Dit account betaalt, maar het abonnementstype (maand of jaar) is nooit vastgelegd - de MRR rekent het als maand.",
    });
  }

  return issues;
}

/**
 * The step one account is on, what it chose, and whether money is coming.
 *
 * [amountCents] is optional and only used to write the amount into the
 * explanation: the account row does not carry a price, so the detail endpoint
 * passes what Stripe reports and the list leaves it out.
 */
export function billingJourney(
  account: JourneyAccount,
  options: { now?: Date; amountCents?: number | null } = {},
): BillingJourney {
  const now = options.now ?? new Date();
  const amountCents = options.amountCents ?? null;
  const stage = stageOf(account, now);
  const periodEnd = toDate(account.currentPeriodEnd);
  const comp = toDate(account.compedProUntil);
  const storeEnd = toDate(account.storePremiumExpiresAt);
  const trial = account.reverseTrial ?? null;

  const willCharge =
    stage === "stripe_trial" ||
    stage === "stripe_active" ||
    stage === "store_trial" ||
    stage === "store_active";

  const nextChargeAt = willCharge
    ? stage === "store_trial" || stage === "store_active"
      ? storeEnd
      : periodEnd
    : null;

  const accessUntil =
    stage === "reverse_trial" || stage === "comped_until"
      ? comp
      : stage === "stripe_canceling" || stage === "stripe_trial"
        ? periodEnd
        : stage === "store_trial" || stage === "store_active"
          ? storeEnd
          : null;

  const trialKind: "reverse" | "stripe" | "store" | null =
    stage === "reverse_trial" || stage === "free_after_reverse_trial"
      ? "reverse"
      : stage === "stripe_trial"
        ? "stripe"
        : stage === "store_trial"
          ? "store"
          : toDate(account.proTrialUsedAt)
            ? "stripe"
            : account.storeTrialStartedAt
              ? "store"
              : toDate(trial?.startedAt)
                ? "reverse"
                : null;

  const trialStartedAt =
    trialKind === "reverse"
      ? toDate(trial?.startedAt)
      : trialKind === "stripe"
        ? toDate(account.proTrialUsedAt)
        : trialKind === "store"
          ? toDate(account.storeTrialStartedAt)
          : null;

  const trialEndsAt =
    trialKind === "reverse"
      ? (toDate(trial?.endsAt) ?? comp)
      : trialKind === "stripe"
        ? (stage === "stripe_trial" ? periodEnd : null)
        : trialKind === "store"
          ? (stage === "store_trial" ? storeEnd : null)
          : null;

  const trialOver =
    trialKind === "reverse"
      ? Boolean(toDate(trial?.endedAt))
      : trialKind === "stripe"
        ? stage !== "stripe_trial" && Boolean(trialStartedAt)
        : trialKind === "store"
          ? stage !== "store_trial" && Boolean(trialStartedAt)
          : false;

  return {
    stage,
    label: LABELS[stage],
    explanation: explain(stage, account, now, amountCents),
    channel: channelOf(stage, account),
    isPro: Boolean(account.subscribed || account.storePremium || account.isAdmin),
    hasPaid: Boolean(account.firstPaidAt),
    firstPaidAt: toDate(account.firstPaidAt),
    willCharge,
    nextChargeAt,
    accessUntil,
    plan: {
      interval:
        channelOf(stage, account) === "apple" || channelOf(stage, account) === "google"
          ? interval(account.storePremiumInterval)
          : interval(account.subscriptionInterval),
      priceId: account.stripePriceId ?? null,
      biller:
        stage.startsWith("stripe") && account.stripeSubscriptionId
          ? "stripe"
          : stage.startsWith("store")
            ? account.storePremiumPlatform === "google"
              ? "google"
              : "apple"
            : null,
    },
    trial: {
      kind: trialKind,
      startedAt: trialStartedAt,
      endsAt: trialEndsAt,
      over: trialOver,
      daysUsed: trial?.days?.length ?? null,
    },
    issues: issuesOf(account, stage, now),
  };
}
