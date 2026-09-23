/**
 * Whether this reader may be asked anything right now, and if so what.
 *
 * Pure functions of state plus a clock: no `Date.now()`, no database, no
 * session. Same shape as `ReviewPromptState.shouldAsk` in the app, and for the
 * same reason - a ninety-day cooldown you cannot test in a millisecond is a
 * cooldown nobody will ever verify.
 *
 * The budget itself:
 *
 * | global cooldown        | 14 days                     |
 * | per-prompt cooldown    | from the registry (90+ days) |
 * | lifetime cap per prompt| from the registry (1 or 2)  |
 * | monthly cap per user   | 1                            |
 * | annual cap per user    | 4                            |
 * | sampling               | FEEDBACK_SAMPLE_RATE, def. 1 |
 * | opt out                | permanent                    |
 *
 * Sampling is a deterministic bucket on the user and the prompt, never a random
 * draw per event: a draw means an unlucky reader is asked every time and a
 * lucky one never, and it makes the rate impossible to test.
 */

import { PROMPTS, PUBLISH_MIN_RATING, type PromptId, type Segment } from './feedbackPrompts';

export const GLOBAL_COOLDOWN_DAYS = 14;
export const MONTHLY_CAP = 1;
export const ANNUAL_CAP = 4;
/**
 * Everyone eligible is asked while the reader base is small. Lower it with the
 * `FEEDBACK_SAMPLE_RATE` env var (0 to 1) once answers start to pile up.
 */
export const DEFAULT_SAMPLE_RATE = 1;

/**
 * `FEEDBACK_SAMPLE_RATE` read defensively: anything that is not a number in
 * [0, 1] falls back to the default rather than silently switching prompts off.
 */
export function sampleRateFromEnv(raw: string | undefined | null): number {
  if (raw === undefined || raw === null || raw.trim() === '') return DEFAULT_SAMPLE_RATE;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) return DEFAULT_SAMPLE_RATE;
  return value;
}

const DAY_MS = 86_400_000;

export interface PromptStateLike {
  promptId: string;
  shownCount?: number | null;
  lastShownAt?: Date | string | null;
  answeredAt?: Date | string | null;
  skippedCount?: number | null;
}

export interface FeedbackStateLike {
  lastPromptAt?: Date | string | null;
  promptsThisMonth?: number | null;
  monthKey?: string | null;
  promptsThisYear?: number | null;
  yearKey?: string | null;
  microSignalCount?: number | null;
  optedOut?: boolean | null;
  prompts?: PromptStateLike[] | null;
}

/** "2026-09" in UTC, so the month never turns twice for one reader. */
export function monthKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function yearKey(now: Date): string {
  return String(now.getUTCFullYear());
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(from: Date, now: Date): number {
  return (now.getTime() - from.getTime()) / DAY_MS;
}

/** A counter that belongs to a period this reader has already left reads as 0. */
function countForPeriod(count: number | null | undefined, stored: string | null | undefined, current: string): number {
  return stored === current ? Math.max(0, Math.floor(count ?? 0)) : 0;
}

export function findPromptState(
  state: FeedbackStateLike,
  promptId: string,
): PromptStateLike | null {
  return (state.prompts ?? []).find((entry) => entry.promptId === promptId) ?? null;
}

/**
 * A 32-bit FNV-1a hash. Small, stable across processes, and nothing depends on
 * it being cryptographic - it only has to spread evenly and give the same
 * answer next week.
 */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Whether this reader is in this prompt's sample.
 *
 * Deterministic on `userId + promptId`: a reader either is or is not in the
 * bucket for a given question, forever. Different questions draw different
 * buckets, so being outside one does not exclude someone from all feedback.
 */
export function inSample(userId: string, promptId: string, rate = DEFAULT_SAMPLE_RATE): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return hash32(`${userId}:${promptId}`) / 0xffffffff < rate;
}

/** Why a prompt was refused. Useful in tests and in the health read-out. */
export type IneligibleReason =
  | 'opted_out'
  | 'wrong_segment'
  | 'wrong_platform'
  | 'lifetime_cap'
  | 'prompt_cooldown'
  | 'global_cooldown'
  | 'monthly_cap'
  | 'annual_cap';

export interface EligibilityInput {
  state: FeedbackStateLike;
  segment: Segment;
  now: Date;
  platform?: 'web' | 'ios' | 'android';
}

/**
 * The full decision for one prompt.
 *
 * Ordered cheapest-first, and per-prompt rules before the shared budget, so a
 * refusal reason names the narrowest thing that blocked it.
 */
export function ineligibleReason(
  promptId: PromptId,
  { state, segment, now, platform = 'web' }: EligibilityInput,
): IneligibleReason | null {
  const def = PROMPTS[promptId];
  if (!def) return 'wrong_segment';

  if (state.optedOut) return 'opted_out';
  if (!def.segments.includes(segment)) return 'wrong_segment';
  if (!def.platforms.includes(platform)) return 'wrong_platform';

  const own = findPromptState(state, promptId);
  if (own) {
    if (Math.max(0, Math.floor(own.shownCount ?? 0)) >= def.lifetimeCap) return 'lifetime_cap';
    const lastShown = toDate(own.lastShownAt);
    if (lastShown && daysSince(lastShown, now) < def.cooldownDays) return 'prompt_cooldown';
  }

  if (!def.budgeted) return null;

  const lastPrompt = toDate(state.lastPromptAt);
  if (lastPrompt && daysSince(lastPrompt, now) < GLOBAL_COOLDOWN_DAYS) return 'global_cooldown';
  if (countForPeriod(state.promptsThisMonth, state.monthKey, monthKey(now)) >= MONTHLY_CAP) {
    return 'monthly_cap';
  }
  if (countForPeriod(state.promptsThisYear, state.yearKey, yearKey(now)) >= ANNUAL_CAP) {
    return 'annual_cap';
  }

  return null;
}

export function isEligible(promptId: PromptId, input: EligibilityInput): boolean {
  return ineligibleReason(promptId, input) === null;
}

/**
 * Which of these prompts to ask, or null for "ask nothing".
 *
 * Candidates are tried in registry order, which is the order they were designed
 * to be asked in - T1a before T1b before the trade-off - and the first one that
 * clears both the budget and the sampling bucket wins. Sampling is checked last
 * so that a reader outside one bucket can still be offered the next question
 * rather than being silently excluded from the whole touchpoint.
 */
export function choosePrompt(
  candidates: readonly PromptId[],
  input: EligibilityInput & { userId: string; sampleRate?: number },
): PromptId | null {
  for (const promptId of candidates) {
    if (!isEligible(promptId, input)) continue;
    if (!inSample(input.userId, promptId, input.sampleRate)) continue;
    return promptId;
  }
  return null;
}

/**
 * The Mongo update that records "this was shown", given the clock.
 *
 * Built here rather than in the route so the period rollover lives next to the
 * rule it belongs to: a counter from a month the reader has left is SET to 1,
 * not incremented, which is what makes the monthly cap a cap rather than a
 * lifetime total.
 */
export function shownUpdate(
  promptId: PromptId,
  state: FeedbackStateLike,
  now: Date,
): Record<string, unknown> {
  const def = PROMPTS[promptId];
  const set: Record<string, unknown> = {};
  const inc: Record<string, number> = {};

  if (def?.budgeted) {
    set.lastPromptAt = now;

    const month = monthKey(now);
    if (state.monthKey === month) {
      inc.promptsThisMonth = 1;
    } else {
      set.monthKey = month;
      set.promptsThisMonth = 1;
    }

    const year = yearKey(now);
    if (state.yearKey === year) {
      inc.promptsThisYear = 1;
    } else {
      set.yearKey = year;
      set.promptsThisYear = 1;
    }
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(inc).length) update.$inc = inc;
  return update;
}

/* -------------------------------------------------------------------------- */
/* The store-review invitation                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Not a question, so not in `PROMPTS` - but it is an ask, so it is counted in
 * the same place every other ask is counted: a row in `FeedbackState.prompts`.
 * That is deliberately not a second mechanism. The array already survives a
 * logout, a new device and a cleared browser, which is what "once, ever" has to
 * mean, and `findPromptState` already reads it.
 */
export const STORE_REVIEW_CTA_ID = 'store_review_cta';

/** Once. Ever. A reader who has seen this invitation has seen it. */
export const STORE_REVIEW_CTA_LIFETIME_CAP = 1;

export interface StoreReviewCtaInput {
  state: FeedbackStateLike;
  /** The 1 to 5 rating just submitted, or null when there was none. */
  rating: number | null;
  /** False when the prompt that was answered does not carry the invitation. */
  offered: boolean;
}

/**
 * Whether to invite this reader to review in the store.
 *
 * Pure, for the same reason the rest of this file is: a cap that only ever
 * shows up in production is a cap nobody has checked. A reader who opted out of
 * being asked things is not asked this either - "stop asking" is not a setting
 * with exceptions.
 */
export function canShowStoreReviewCta({ state, rating, offered }: StoreReviewCtaInput): boolean {
  if (!offered) return false;
  if (state.optedOut) return false;
  if (rating === null || rating < PUBLISH_MIN_RATING) return false;
  const own = findPromptState(state, STORE_REVIEW_CTA_ID);
  return Math.max(0, Math.floor(own?.shownCount ?? 0)) < STORE_REVIEW_CTA_LIFETIME_CAP;
}
