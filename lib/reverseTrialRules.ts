/**
 * The reverse trial, as pure rules: no Mongoose, no clock of its own, so every
 * edge is tested without a database (tests/reverseTrial.test.ts, local only).
 * The writes live in lib/reverseTrial.ts.
 *
 * Alex, November 2026: instead of a paywall a reader meets before they know the
 * app, every NEW account gets Pro for its first three ACTIVE days - Dutch
 * calendar days on which the reader actually opened the app or the website.
 * While those days run the server counts how much they lean on four features
 * (lib/entitlements.ts `ProFeature`). When they end, the one they used most
 * keeps a tiny daily allowance (`limitsFor`) and every other feature drops to
 * the normal free limits.
 *
 * HOW PRO IS GIVEN. Through the comp mechanism (lib/compedPro.ts): `subscribed`
 * plus `compedProUntil`, so the dozens of places that gate on `subscribed`
 * treat a trial reader as Pro without a line changed. `compedProUntil` is kept
 * at the end of the current active day (Amsterdam midnight) and moved on each
 * new active day while days remain, so it always states truthfully until when
 * the reader has Pro. A reader who stays away is dropped to free by the daily
 * sweep and picked up again - same trial, next day - on their next visit.
 *
 * Never shortened: the grant is `$max(current, end of today)`, so a referral
 * week (lib/referralRules.ts `compWeekUpdate`, which stacks on the same field)
 * always survives the trial, and the reader ends up with the longer of the two.
 */

import {
  REVERSE_TRIAL_DAYS,
  isProFeature,
  limitsFor,
  pickTopFeature,
  type Limits,
  type ProFeature,
  type TrialUsage,
} from './entitlements';
import { isAdminEmail } from './adminEmails';

export const TRIAL_TIME_ZONE = 'Europe/Amsterdam';

/**
 * Accounts created at or after this moment get the reverse trial; older free
 * accounts are left exactly as they were (Alex: nothing is granted to them
 * automatically). Set to when this shipped.
 */
export const REVERSE_TRIAL_LAUNCH = new Date('2026-11-09T17:00:00Z');

/** The stored subdocument, `User.reverseTrial`. Every field absent on an account without a trial. */
export interface ReverseTrialFields {
  startedAt?: Date | string | null;
  /** Amsterdam calendar days ('YYYY-MM-DD') with activity, at most REVERSE_TRIAL_DAYS. */
  days?: string[] | null;
  /** End of the last active day; set when the last day is recorded. */
  endsAt?: Date | string | null;
  /** When the trial was closed and its top feature frozen. */
  endedAt?: Date | string | null;
  usage?: TrialUsage | null;
  topFeature?: string | null;
  recapSeenAt?: Date | string | null;
  /**
   * `new`: started on an account created after REVERSE_TRIAL_LAUNCH.
   * `existing`: given once to an older free account that never paid
   * (`isExistingFreeAccount`), announced with "Je hebt 3 dagen Pro gekregen".
   * Absent on trials started before this field existed: those are `new`.
   */
  origin?: 'new' | 'existing' | null;
  /** The announcement was shown (either client). */
  announceSeenAt?: Date | string | null;
  /**
   * An `existing` trial that should never have started because the account
   * has Pro of its own (see [hasOwnPro]). A voided trial is invisible: no
   * announcement, no recap, no personal limit.
   */
  voidedAt?: Date | string | null;
}

/** The billing fields the touch needs, beside the trial itself. */
export interface TrialAccountFields {
  createdAt?: Date | null;
  reverseTrial?: ReverseTrialFields | null;
  subscribed?: boolean;
  compedProUntil?: Date | null;
  storePremium?: boolean | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  // What "never paid, never had Pro by a store or Stripe" is read from, for
  // the one-time trial of an existing account (`isExistingFreeAccount`).
  isAdmin?: boolean | null;
  subscriptionStartedAt?: Date | null;
  proTrialUsedAt?: Date | null;
  storePremiumPlatform?: 'apple' | 'google' | null;
  storePremiumExpiresAt?: Date | null;
  storeTrialStartedAt?: Date | null;
  firstPaidAt?: Date | null;
  /** For ADMIN_EMAILS: the owner is admin by address, not by the `isAdmin` flag. */
  email?: string | null;
  /**
   * Per request, never stored: the app's store SDK says this reader has an
   * active subscription or store trial (`X-Bs-Store-Pro: 1`). The app's first
   * request of a launch can reach us before the RevenueCat sync does, and the
   * account then looks free here. Client-asserted, but it can only ever
   * withhold or void a trial, never grant anything.
   */
  storeProClaimed?: boolean;
}

/** The `.select()` for everything here, for routes that load a lean row. */
export const TRIAL_ACCOUNT_FIELDS =
  'createdAt reverseTrial subscribed compedProUntil storePremium stripeSubscriptionId subscriptionStatus ' +
  'isAdmin subscriptionStartedAt proTrialUsedAt storePremiumPlatform storePremiumExpiresAt storeTrialStartedAt firstPaidAt email';

export type TrialState = 'none' | 'active' | 'ended';

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ------------------------------ day arithmetic ----------------------------- */

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TRIAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const wallClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: TRIAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** 'YYYY-MM-DD' of [date] in Amsterdam. */
export function amsterdamDay(date: Date): string {
  return dayFormat.format(date);
}

/** Minutes Amsterdam is ahead of UTC at [date]: 60 in winter, 120 in summer. */
function offsetMinutes(date: Date): number {
  const parts = wallClock.formatToParts(date);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

/** The instant the Amsterdam day after [date] begins - "tonight at midnight". DST-safe. */
export function endOfAmsterdamDay(date: Date): Date {
  const [y, m, d] = amsterdamDay(date).split('-').map(Number);
  const midnightAsUtc = Date.UTC(y, m - 1, d + 1);
  // Two passes: the offset at the guess can differ from the one at the answer
  // when the clocks change that night.
  let instant = midnightAsUtc - offsetMinutes(new Date(midnightAsUtc)) * 60_000;
  instant = midnightAsUtc - offsetMinutes(new Date(instant)) * 60_000;
  return new Date(instant);
}

/* --------------------------------- state ---------------------------------- */

export function trialState(trial: ReverseTrialFields | null | undefined, now: Date): TrialState {
  if (!trial || !toDate(trial.startedAt)) return 'none';
  if (toDate(trial.voidedAt)) return 'ended';
  const days = trial.days?.length ?? 0;
  if (days < REVERSE_TRIAL_DAYS) return 'active';
  const endsAt = toDate(trial.endsAt);
  return endsAt && endsAt.getTime() > now.getTime() ? 'active' : 'ended';
}

/** The frozen top feature, or the one the counters point at if the trial was not closed yet. */
export function trialTopFeature(trial: ReverseTrialFields | null | undefined): ProFeature | null {
  if (!trial) return null;
  if (isProFeature(trial.topFeature)) return trial.topFeature;
  if (trial.endedAt && trial.topFeature === null) return null;
  return pickTopFeature(trial.usage);
}

/**
 * The feature with a personal limit on this account right now: only after the
 * trial ended, only while the account is not Pro.
 */
export function personalLimitFeature(
  trial: ReverseTrialFields | null | undefined,
  isPro: boolean,
  now: Date,
): ProFeature | null {
  if (isPro) return null;
  if (trialState(trial, now) !== 'ended') return null;
  return trialTopFeature(trial);
}

/** The limits for an account, trial included. Pure; every route and both clients start here. */
export function accountLimits(
  trial: ReverseTrialFields | null | undefined,
  isPro: boolean,
  now: Date,
): Limits {
  return limitsFor(isPro, personalLimitFeature(trial, isPro, now));
}

/** May this account still be counted? Only while the trial runs. */
export function isCountingUsage(trial: ReverseTrialFields | null | undefined, now: Date): boolean {
  return trialState(trial, now) === 'active';
}

/* --------------------------------- touch ---------------------------------- */

/** Comp-only access: the only kind the trial may revoke. Mirrors COMPED_ACCESS_FILTER. */
export function isCompOnly(account: TrialAccountFields): boolean {
  return Boolean(
    account.subscribed &&
      !account.storePremium &&
      !account.stripeSubscriptionId &&
      !account.subscriptionStatus,
  );
}

/** Mirrors referralRules `canReceiveCompWeek`: a grant may be written here. */
export function canGrantComp(account: TrialAccountFields): boolean {
  if (account.storePremium) return false;
  if (account.stripeSubscriptionId || account.subscriptionStatus) return false;
  return !account.subscribed || Boolean(account.compedProUntil);
}

/** Admin by the database flag or by ADMIN_EMAILS - the session and /me use both. */
export function isAdminAccount(account: TrialAccountFields): boolean {
  return Boolean(account.isAdmin) || isAdminEmail(account.email);
}

const LIVE_STRIPE_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * Pro that is not the reverse trial's own comp: admin, a store subscription or
 * store trial (known here, or claimed by the app's store SDK), or a live
 * Stripe subscription. Nobody with Pro of their own is ever in a reverse
 * trial, and nobody is told "Je hebt 3 dagen Pro gekregen" while they pay.
 */
export function hasOwnPro(account: TrialAccountFields): boolean {
  return Boolean(
    isAdminAccount(account) ||
      account.storePremium ||
      account.storeProClaimed ||
      (account.subscriptionStatus && LIVE_STRIPE_STATUSES.has(account.subscriptionStatus)),
  );
}

/**
 * An account from before the reverse trial that gets it once, on its next
 * visit (Alex, Nov 2026): created before REVERSE_TRIAL_LAUNCH (or with no
 * creation date at all), never paid or trialled through Stripe or a store,
 * not an admin, and not Pro right now by any route - a subscription, an admin
 * grant or a referral week. "Not already given one" is the caller's check
 * (no `reverseTrial.startedAt`). Decided per visit, so nothing is migrated.
 */
export function isExistingFreeAccount(account: TrialAccountFields): boolean {
  const created = toDate(account.createdAt);
  if (created && created.getTime() >= REVERSE_TRIAL_LAUNCH.getTime()) return false;
  if (account.subscribed || account.storePremium || isAdminAccount(account)) return false;
  if (account.storeProClaimed) return false;
  if (toDate(account.compedProUntil)) return false;
  return !(
    account.stripeSubscriptionId ||
    account.subscriptionStatus ||
    account.subscriptionStartedAt ||
    account.proTrialUsedAt ||
    account.storePremiumPlatform ||
    account.storePremiumExpiresAt ||
    account.storeTrialStartedAt ||
    account.firstPaidAt
  );
}

export interface TouchPlan {
  /** Begin the trial on this account (first visit after REVERSE_TRIAL_LAUNCH). */
  start: boolean;
  /** Which kind of account the trial is started on; set with [start]. */
  origin?: 'new' | 'existing';
  /** Record today as an active day. */
  addDay: string | null;
  /** Set when [addDay] is the last trial day: Pro ends tonight. */
  endsAt: Date | null;
  /** Make sure the account has Pro until at least this moment. */
  grantUntil: Date | null;
  /** Close the trial and freeze this top feature (null: none was used). */
  finalise: { topFeature: ProFeature | null } | null;
  /** The comp ran out and the daily sweep has not caught it yet: drop to free now. */
  revoke: boolean;
  /** An `existing` trial on an account with Pro of its own: void it (see [hasOwnPro]). */
  void: boolean;
  /**
   * The comp a voided trial wrote (Pro until tonight at most) on an account
   * the server now knows pays through a store. Cleared so it cannot linger as
   * a "stripe" Pro after the store subscription ends - the comp sweep skips
   * store accounts.
   */
  clearTrialComp: boolean;
}

const NOTHING: TouchPlan = {
  start: false,
  addDay: null,
  endsAt: null,
  grantUntil: null,
  finalise: null,
  revoke: false,
  void: false,
  clearTrialComp: false,
};

export function isNothing(plan: TouchPlan): boolean {
  return (
    !plan.start && !plan.addDay && !plan.grantUntil && !plan.finalise && !plan.revoke && !plan.void && !plan.clearTrialComp
  );
}

/** A comp that can only be the trial's own grant: comp-only billing, ending tonight at the latest. */
function isTrialGrant(account: TrialAccountFields, tonight: Date): boolean {
  const until = toDate(account.compedProUntil);
  return Boolean(
    account.subscribed &&
      until &&
      until.getTime() <= tonight.getTime() &&
      !account.stripeSubscriptionId &&
      !account.subscriptionStatus,
  );
}

/**
 * What a visit at [now] should write. Called on every authenticated request
 * (the app's bearer, the website's session) and almost always answers
 * "nothing": the writes happen once per active day at most.
 */
export function planTouch(account: TrialAccountFields, now: Date): TouchPlan {
  const trial = account.reverseTrial ?? null;
  const today = amsterdamDay(now);
  const tonight = endOfAmsterdamDay(now);

  if (!trial || !toDate(trial.startedAt)) {
    // Admins and anyone the store already says has Pro never start one.
    if (isAdminAccount(account) || account.storeProClaimed) return NOTHING;
    const created = toDate(account.createdAt);
    const isNew = Boolean(created && created.getTime() >= REVERSE_TRIAL_LAUNCH.getTime());
    if (!isNew && !isExistingFreeAccount(account)) return NOTHING;
    return {
      ...NOTHING,
      start: true,
      origin: isNew ? 'new' : 'existing',
      addDay: today,
      endsAt: (REVERSE_TRIAL_DAYS as number) <= 1 ? tonight : null,
      grantUntil: canGrantComp(account) ? tonight : null,
    };
  }

  if (toDate(trial.voidedAt)) {
    // The trial's own comp can outlive a void that came from the app's header
    // before the store sync did: once the sync confirms the store, clear it.
    return account.storePremium && isTrialGrant(account, tonight) ? { ...NOTHING, clearTrialComp: true } : NOTHING;
  }

  // An older account's one-time trial that started before we knew it has Pro
  // of its own (an admin by address, a store trial the RevenueCat sync had not
  // delivered yet): take it back so nothing about it ever shows.
  if (trial.origin === 'existing' && hasOwnPro(account)) {
    return { ...NOTHING, void: true, clearTrialComp: Boolean(account.storePremium) && isTrialGrant(account, tonight) };
  }

  const days = trial.days ?? [];
  const state = trialState(trial, now);

  if (state === 'active') {
    if (days.includes(today) || days.length >= REVERSE_TRIAL_DAYS) {
      // Today is already counted (or the last day is still running). Pro
      // normally runs until tonight already; this only repairs a grant that
      // went missing (a write that failed half-way), never extends one.
      const until = toDate(account.compedProUntil);
      const missing = !account.subscribed || !until || until.getTime() < tonight.getTime();
      return days.includes(today) && missing && canGrantComp(account)
        ? { ...NOTHING, grantUntil: tonight }
        : NOTHING;
    }
    const last = days.length + 1 === REVERSE_TRIAL_DAYS;
    return {
      ...NOTHING,
      addDay: today,
      endsAt: last ? tonight : null,
      grantUntil: canGrantComp(account) ? tonight : null,
    };
  }

  // Ended.
  const plan: TouchPlan = { ...NOTHING };
  if (!toDate(trial.endedAt)) plan.finalise = { topFeature: pickTopFeature(trial.usage) };
  const until = toDate(account.compedProUntil);
  if (isCompOnly(account) && until && until.getTime() <= now.getTime()) plan.revoke = true;
  return plan;
}

/** [account] as it reads after [plan] was written, so the caller need not reload it. */
export function applyTouch<T extends TrialAccountFields>(account: T, plan: TouchPlan, now: Date): T {
  if (isNothing(plan)) return account;
  const trial: ReverseTrialFields = { ...(account.reverseTrial ?? {}) };
  if (plan.start) {
    trial.startedAt = now;
    trial.days = [];
    trial.origin = plan.origin ?? 'new';
  }
  if (plan.addDay && !(trial.days ?? []).includes(plan.addDay)) {
    trial.days = [...(trial.days ?? []), plan.addDay];
  }
  if (plan.endsAt) trial.endsAt = plan.endsAt;
  if (plan.finalise) {
    trial.endedAt = now;
    trial.topFeature = plan.finalise.topFeature;
  }
  const next: T = { ...account, reverseTrial: trial };
  if (plan.grantUntil) {
    const current = toDate(account.compedProUntil);
    next.subscribed = true;
    next.compedProUntil =
      current && current.getTime() > plan.grantUntil.getTime() ? current : plan.grantUntil;
  }
  if (plan.revoke) {
    next.subscribed = false;
    next.compedProUntil = null;
  }
  if (plan.void) {
    trial.voidedAt = now;
    trial.announceSeenAt = trial.announceSeenAt ?? now;
    trial.recapSeenAt = trial.recapSeenAt ?? now;
    if (!toDate(trial.endedAt)) {
      trial.endedAt = now;
      trial.topFeature = null;
    }
  }
  if (plan.clearTrialComp) {
    next.subscribed = false;
    next.compedProUntil = null;
  }
  return next;
}

/* ------------------------------ what clients see --------------------------- */

export interface TrialSummary {
  state: 'active' | 'ended';
  daysUsed: number;
  daysTotal: number;
  /** Known once the last day is under way. */
  endsAt: string | null;
  /** The feature that is (or will be, judging by now) the personal limit. */
  topFeature: ProFeature | null;
  usage: Required<TrialUsage>;
  /** Show "Je Pro-dagen zitten erop" on the next screen. Once, on either client. */
  recapPending: boolean;
  /** `existing` for the one-time trial of an older account; `new` otherwise. */
  origin: 'new' | 'existing';
  /** Show "Je hebt 3 dagen Pro gekregen" (existing accounts, once, while it runs). */
  announce: boolean;
}

function counter(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/** The `trial` object on /api/v1/me and in the website session; null without a reverse trial. */
export function trialSummary(
  trial: ReverseTrialFields | null | undefined,
  isPro: boolean,
  now: Date,
): TrialSummary | null {
  const state = trialState(trial, now);
  if (state === 'none' || !trial) return null;
  if (toDate(trial.voidedAt)) return null;
  const usage = trial.usage ?? {};
  const endsAt = toDate(trial.endsAt);
  return {
    state,
    daysUsed: Math.min(trial.days?.length ?? 0, REVERSE_TRIAL_DAYS),
    daysTotal: REVERSE_TRIAL_DAYS,
    endsAt: endsAt ? endsAt.toISOString() : null,
    topFeature: trialTopFeature(trial),
    usage: {
      ai: counter(usage.ai),
      notes: counter(usage.notes),
      highlights: counter(usage.highlights),
      study: counter(usage.study),
      audio: counter(usage.audio),
      lessons: counter(usage.lessons),
      lessonSteps: counter(usage.lessonSteps),
      chapters: counter(usage.chapters),
    },
    recapPending: state === 'ended' && !isPro && !toDate(trial.recapSeenAt),
    origin: trial.origin === 'existing' ? 'existing' : 'new',
    announce: trial.origin === 'existing' && state === 'active' && !toDate(trial.announceSeenAt),
  };
}
