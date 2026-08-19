/**
 * The complete set of events the funnel accepts, with the exact properties each
 * one may carry. The API route validates against this and drops anything else.
 *
 * This allowlist is the security boundary for `/api/analytics`: the endpoint is
 * open to logged-out visitors by necessity (the pricing page is public), so it
 * must be impossible to use it to write attacker-chosen data into the database.
 * Event names are fixed, property keys are fixed, and every value is coerced to
 * a member of a fixed set - no free text ever reaches Mongo.
 */

/**
 * `platform` is carried by every event so web and iOS funnels can be compared
 * without being conflated - the two convert very differently, and App Store
 * pricing is not the same as web pricing.
 */
const PLATFORM = ["web", "ios", "android"] as const;

export const EVENTS = {
  pricing_viewed: {
    source: [
      "sidebar_cta", "paywall_commentary", "paywall_ai", "paywall_plan",
      "nav", "direct", "landing", "unknown",
      // Mobile entry points.
      "app_profile", "app_resources", "app_study", "app_ai",
    ],
    logged_in: ["yes", "no"],
    platform: PLATFORM,
  },
  plan_selected: {
    interval: ["monthly", "annual"],
    logged_in: ["yes", "no"],
    platform: PLATFORM,
  },
  checkout_started: {
    interval: ["monthly", "annual"],
    platform: PLATFORM,
  },
  checkout_completed: {
    interval: ["monthly", "annual"],
    platform: PLATFORM,
  },
  checkout_abandoned: {
    interval: ["monthly", "annual"],
    platform: PLATFORM,
  },
  /** Store purchase the user backed out of. iOS only - the web has no equivalent. */
  purchase_cancelled: {
    interval: ["monthly", "annual"],
    platform: PLATFORM,
  },
  purchase_failed: {
    interval: ["monthly", "annual"],
    platform: PLATFORM,
  },
  /** Apple requires a restore button; knowing how often it is used is useful. */
  purchases_restored: {
    platform: PLATFORM,
  },
  /** Fired the moment a gated surface refuses the user. `surface` ranks them. */
  paywall_hit: {
    surface: ["commentary", "ai_limit", "original_text", "plan_limit", "offline", "resources"],
    platform: PLATFORM,
  },
  paywall_cta_clicked: {
    surface: ["commentary", "ai_limit", "original_text", "plan_limit", "offline", "resources"],
    platform: PLATFORM,
  },
  /** Signup that was started in order to buy, so the resume flow can be measured. */
  signup_for_checkout: {
    interval: ["monthly", "annual"],
  },
  subscription_canceled: {
    reason: [
      "too_expensive",
      "not_using",
      "missing_features",
      "technical_problems",
      "temporary_break",
      "other",
    ],
    // Bucketed, not exact - an exact tenure is closer to identifying.
    tenure: ["lt_1m", "1_3m", "3_6m", "6_12m", "gt_12m"],
  },
  subscription_paused: {
    months: ["1", "2", "3"],
  },
  cancel_flow_opened: {},
  /** Shown / accepted / dismissed for the month-3 monthly-to-annual offer. */
  annual_upsell_shown: {},
  annual_upsell_accepted: {},
  annual_upsell_dismissed: {},
  billing_issue_shown: {},
  billing_issue_resolved_click: {},
} as const;

export type EventName = keyof typeof EVENTS;

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(EVENTS, value);
}

/**
 * Strips every property that is not declared for this event, and every value
 * that is not in the declared set. Returns only known-safe data.
 */
export function sanitizeProps(
  name: EventName,
  props: unknown
): Record<string, string> {
  const allowed = EVENTS[name] as Record<string, readonly string[]>;
  const out: Record<string, string> = {};

  if (typeof props !== "object" || props === null || Array.isArray(props)) {
    return out;
  }

  for (const [key, permitted] of Object.entries(allowed)) {
    const raw = (props as Record<string, unknown>)[key];
    if (typeof raw !== "string") continue;
    if (!permitted.includes(raw)) continue;
    out[key] = raw;
  }

  return out;
}

/** Buckets a tenure in days, so exact signup dates never leave the server. */
export function tenureBucket(days: number): string {
  if (days < 30) return "lt_1m";
  if (days < 90) return "1_3m";
  if (days < 180) return "3_6m";
  if (days < 365) return "6_12m";
  return "gt_12m";
}
