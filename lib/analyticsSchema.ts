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

/** The app's local reminder types that count as a reminder (push_opened / push_ignored). */
const REMINDER_TYPES = [
  "morning", "evening", "streakAtRisk", "streakLost", "lessonHalfway",
  "weeklyGoal", "dormant", "treeWilting",
] as const;

/** The four daily goals, as strings (lib/dailyGoal.ts DAILY_GOAL_OPTIONS). */
const DAILY_GOAL_MINUTES = ["5", "10", "15", "20"] as const;

/** Win-back mail stages, in days away (lib/winback.ts WINBACK_STAGES). */
const WINBACK_STAGES = ["3", "7", "14"] as const;

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

/** The app's onboarding guide steps, in the order the reader meets them. */
const GUIDE_STEPS = ["mark", "swipe", "ask", "study"] as const;

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
      // A Pro tile in the ProgressTree studio (app) - the cosmetics upsell.
      "app_levensboom",
      // The group limit, the note limit and the app's own paywall screen.
      "app_groups", "app_notes", "app_funnel",
      // One source per app gate, so commentary, grondtekst, offline and music
      // no longer all report as "app_study". "app_crossrefs" was already sent
      // by the app and silently dropped here until now.
      "app_commentary", "app_grondtekst", "app_offline", "app_music", "app_crossrefs",
      // The paywall at the end of onboarding, the Start promo, and the
      // moments a free Pro week (trial or referral) is about to run out.
      "app_onboarding", "app_promo", "app_streak", "app_referral_end",
      // The reverse trial (lib/reverseTrial.ts): the paywall behind a personal
      // limit, and the upgrade button on "Je Pro-dagen zitten erop".
      "personal_limit", "trial_recap", "app_personal_limit", "app_trial_recap",
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
    // Whether the store offered this purchase with a free trial.
    trial: ["yes", "no"],
    platform: PLATFORM,
  },
  checkout_completed: {
    interval: ["monthly", "annual"],
    trial: ["yes", "no"],
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
  // "music": the app's background-music picker (play without Pro). App-only.
  paywall_hit: {
    surface: ["commentary", "ai_limit", "original_text", "plan_limit", "offline", "resources", "crossrefs", "music"],
    platform: PLATFORM,
  },
  paywall_cta_clicked: {
    surface: ["commentary", "ai_limit", "original_text", "plan_limit", "offline", "resources", "crossrefs", "music"],
    platform: PLATFORM,
  },
  /**
   * The app's paywall was closed without buying. With `pricing_viewed` this
   * gives the dismiss rate per entry point; `trial` says whether a free trial
   * was on offer at the time.
   */
  paywall_dismissed: {
    source: [
      "app_profile", "app_resources", "app_study", "app_ai", "app_levensboom",
      "app_groups", "app_notes", "app_funnel",
      "app_commentary", "app_grondtekst", "app_offline", "app_music", "app_crossrefs",
      "app_onboarding", "app_promo", "app_streak", "app_referral_end", "direct",
      "app_personal_limit", "app_trial_recap",
    ],
    trial: ["yes", "no"],
    platform: PLATFORM,
  },
  /** The app's Pro promo was put on screen, and what earned it the slot. */
  promo_shown: {
    trigger: [
      "session", "value_moment", "streak", "tree_level", "note_limit_near", "ai_last_question", "referral_end",
      // After the reverse trial: the recap, and a personal limit reached.
      "trial_recap", "personal_limit",
    ],
    platform: PLATFORM,
  },
  /** One screen of the app's three-screen Pro pitch (/pro-intro). */
  presell_step_viewed: {
    step: ["goal", "demo", "benefits"],
    source: ["app_funnel", "app_profile", "app_promo", "app_onboarding", "app_streak", "app_referral_end"],
    platform: PLATFORM,
  },
  /** The study goal picked in onboarding or the pitch - drives the paywall's headline. */
  onboarding_goal_selected: {
    goal: ["understand_bible", "difficult_passages", "daily_habit", "learn_about_jesus", "theology", "skip"],
    platform: PLATFORM,
  },
  /** A store purchase that started a free trial rather than a paid period. */
  trial_started: {
    interval: ["monthly", "annual"],
    platform: PLATFORM,
  },
  /**
   * The reverse trial: Pro for a new account's first three active days, then a
   * personal limit on the feature it used most (lib/reverseTrial.ts). Not the
   * store or Stripe trial above, hence the separate names. Started and ended
   * are written by the server, never sent by a client.
   */
  reverse_trial_started: {
    platform: PLATFORM,
  },
  reverse_trial_ended: {
    /** The feature that became the personal limit; "none" when none was used. */
    feature: ["ai", "notes", "study", "audio", "none"],
    platform: PLATFORM,
  },
  /** "Je Pro-dagen zitten erop" was put on screen - once per account, recorded by the server. */
  trial_recap_shown: {
    platform: PLATFORM,
  },
  /** What the reader did on the recap. */
  trial_recap_action: {
    action: ["upgrade", "continue_free"],
    feature: ["ai", "notes", "study", "audio", "none"],
    platform: PLATFORM,
  },
  /** A gate refused the reader because of their personal limit, not the normal free one. */
  personal_limit_hit: {
    feature: ["ai", "notes", "study", "audio"],
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
   * The tree's own funnel (PROGRESS_TREE_GROWTH_PLAN.md §13). There is no
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
  /**
   * The app's hands-on onboarding guide, right after setup: four steps the
   * reader does for real (mark a verse and write a note, swipe to Studie, ask
   * the assistant, open the commentary). `guide_started` is the denominator;
   * per step, `guide_step_completed` and `guide_step_skipped` show where people
   * drop off. `how` on a completed step is `fallback` when the action itself
   * failed or was gated (offline, AI error) and the guide moved on anyway;
   * on a skipped step it is `skip` (the Overslaan link) or `close` (the guide
   * was stopped there - every later step is then left out, not reported).
   * `replay` marks a run started again from Profiel.
   */
  guide_started: {
    replay: BOOL,
    platform: PLATFORM,
  },
  guide_step_completed: {
    step: GUIDE_STEPS,
    how: ["done", "fallback"],
    platform: PLATFORM,
  },
  guide_step_skipped: {
    step: GUIDE_STEPS,
    how: ["skip", "close"],
    platform: PLATFORM,
  },
  /** Walked to the end. `done` / `skipped` count the four steps. */
  guide_finished: {
    done: num(0, 4),
    skipped: num(0, 4),
    platform: PLATFORM,
  },

  /**
   * Retention (smart reminders, daily goal, levels, win-back mail). Every prop
   * is a closed set or a bounded number, like the rest of this file.
   *
   * `type` is the app's local notification type id (NotifType.id in
   * lib/core/notifications/notification_service.dart). `push_ignored` is sent
   * by the app when it next opens: a reminder that fired and was neither
   * tapped nor followed by an open within three hours.
   */
  push_opened: {
    type: REMINDER_TYPES,
    platform: PLATFORM,
  },
  push_ignored: {
    type: REMINDER_TYPES,
    platform: PLATFORM,
  },
  /** The reminders went quiet: this many ignored in a row (lib/core/notifications/reminder_policy.dart). */
  reminders_paused: {
    ignored: num(0, 50),
    platform: PLATFORM,
  },
  /** A daily goal was picked or changed. */
  daily_goal_set: {
    minutes: DAILY_GOAL_MINUTES,
    source: ["setup", "settings", "start", "web_dashboard", "web_settings"],
    platform: PLATFORM,
  },
  /** Written by the server, once per day, the moment the goal is met (lib/dailyGoal.ts). */
  daily_goal_reached: {
    minutes: DAILY_GOAL_MINUTES,
    platform: PLATFORM,
  },
  /** Written by the server in lib/gamification.ts `grantXp` whenever XP crosses a level. */
  level_up: {
    level: num(1, 1000),
  },
  /** Written by the win-back cron (lib/winback.ts), one per mail that left. */
  winback_email_sent: {
    stage: WINBACK_STAGES,
  },
  /** The mail's button, counted by the redirect at /api/email/c. */
  winback_email_clicked: {
    stage: WINBACK_STAGES,
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
