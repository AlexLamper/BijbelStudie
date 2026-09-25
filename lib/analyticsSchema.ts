import { CLICK_TARGETS, ROUTE_KEYS } from "./analyticsRoutes";

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

/**
 * Every prop above is a closed set of strings. The tree events below need a
 * couple of real numbers (a level, a step) and one boolean, so this adds two
 * more prop shapes alongside the plain-array enum. Both stay closed in spirit:
 * a value only ever survives `sanitizeProps` when it is finite/exactly
 * true-or-false and inside the declared range - dropped otherwise, never
 * clamped into range and never stored as attacker-chosen text. That keeps the
 * security story from the top of this file intact for an endpoint that is
 * reachable while logged out.
 */
type NumberProp = { kind: "number"; min: number; max: number; integer?: boolean };
type BooleanProp = { kind: "boolean" };
type PropSpec = readonly string[] | NumberProp | BooleanProp;

/** A whole number in range. Use `integer: false` for a continuous value. */
function num(min: number, max: number, integer = true): NumberProp {
  return { kind: "number", min, max, integer };
}
const BOOL: BooleanProp = { kind: "boolean" };

export const EVENTS = {
  /**
   * A page was opened. `path` is a ROUTE KEY, not a pathname - the client sends
   * `location.pathname` and `/api/analytics` normalises it through
   * `toRouteKey` before it gets here, so no client-chosen text and no unbounded
   * cardinality ever reaches the database.
   */
  page_view: {
    path: ROUTE_KEYS,
    logged_in: ["yes", "no"],
    platform: PLATFORM,
  },
  /** A registered interactive surface was clicked. See CLICK_TARGETS. */
  ui_click: {
    target: CLICK_TARGETS,
    path: ROUTE_KEYS,
    platform: PLATFORM,
  },
  pricing_viewed: {
    source: [
      "sidebar_cta", "paywall_commentary", "paywall_ai", "paywall_plan",
      "nav", "direct", "landing", "unknown",
      // Mobile entry points.
      "app_profile", "app_resources", "app_study", "app_ai",
      // A Pro tile in the Levensboom studio (app) - the cosmetics upsell.
      "app_levensboom",
      // The group limit, the note limit and the app's own paywall screen.
      "app_groups", "app_notes", "app_funnel",
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
      // Giving a reason is optional, so most-common-case first: no answer.
      "unspecified",
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
  /** A single-chapter study ("Losse studie") was finished. */
  chapter_study_completed: {
    logged_in: ["yes", "no"],
    platform: PLATFORM,
  },
  /**
   * The cross-references panel/tab/sheet was opened for a verse. `surface`
   * distinguishes the four entry points (web verse panel, web materials tab,
   * the /studie flow panel, the app's action-sheet and study tab) without ever
   * carrying which verse - book/chapter/verse values are refused by design,
   * the same unbounded-cardinality rule as `page_view`'s route keys.
   */
  crossref_opened: {
    surface: ["verse_panel", "materials_tab", "study_flow", "app_sheet", "app_tab"],
    platform: PLATFORM,
  },
  /** A cross-reference row was acted on, once opened. See `crossref_opened`. */
  crossref_followed: {
    surface: ["verse_panel", "materials_tab", "study_flow", "app_sheet", "app_tab"],
    action: ["preview", "navigate", "back", "open_in_lezen", "ask_ai"],
    /** Which testaments the source and target verse belong to - not the verses themselves. */
    testament: ["ot_ot", "ot_nt", "nt_ot", "nt_nt"],
    platform: PLATFORM,
  },
  /**
   * The tree's own funnel (LEVENSBOOM_GROWTH_PLAN.md §13). There is no
   * redesign shipped yet and no events existed before this - these are the
   * baseline, so retention can be compared before and after the growth-v2
   * launch. `step`, `phase` and `floored` are the v2 growth model's own
   * numbers (§4.1) and nothing sends them yet; the call sites today only fill
   * `level`, which already exists.
   */
  tree_levelup_seen: {
    level: num(1, 1000),
    step: num(1, 200),
    phase: ["kiem", "zaailing", "jonge_boom", "volwassen_boom", "eeuwenoude_boom"],
    floored: BOOL,
  },
  /** The lesson-complete card that shows what the lesson's XP did to the tree. */
  tree_growth_moment: {
    // `position` = level + fraction into the level (§4.1) - not sent yet.
    fromPos: num(0, 1000, false),
    toPos: num(0, 1000, false),
  },
  /** The Groei tab in the studio (the step ladder), opened. */
  tree_groei_opened: {
    step: num(1, 200),
    level: num(1, 1000),
  },
  /** The studio itself (/profiel/boom), opened. */
  tree_studio_opened: {},
  /** The one-time announcement card for existing accounts - not built yet. */
  tree_announcement_seen: {
    action: ["open", "close"],
  },
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
): Record<string, string | number | boolean> {
  const allowed = EVENTS[name] as Record<string, PropSpec>;
  const out: Record<string, string | number | boolean> = {};

  if (typeof props !== "object" || props === null || Array.isArray(props)) {
    return out;
  }

  for (const [key, spec] of Object.entries(allowed)) {
    const raw = (props as Record<string, unknown>)[key];

    if (Array.isArray(spec)) {
      if (typeof raw === "string" && spec.includes(raw)) out[key] = raw;
      continue;
    }

    // Not an array, so by construction of PropSpec this is a number or
    // boolean spec - `Array.isArray` narrows a readonly-array union member
    // less precisely than a plain cast here.
    const scalar = spec as NumberProp | BooleanProp;

    if (scalar.kind === "number") {
      // Accepts a real number (a native client) or its string form (the web
      // beacon, which only ever carries strings) - never anything else.
      const value =
        typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
      if (!Number.isFinite(value)) continue;
      const rounded = scalar.integer === false ? value : Math.round(value);
      if (rounded < scalar.min || rounded > scalar.max) continue;
      out[key] = rounded;
      continue;
    }

    // scalar.kind === "boolean"
    if (raw === true || raw === "true") out[key] = true;
    else if (raw === false || raw === "false") out[key] = false;
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
