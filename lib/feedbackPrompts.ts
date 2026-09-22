/**
 * Every question the product is allowed to ask, in one closed set.
 *
 * Same role as `lib/analyticsSchema.ts`, and for the same reason: the response
 * endpoint validates against this, so no client-chosen prompt id, answer key or
 * option value ever reaches Mongo. A prompt that is not here cannot be served
 * and an answer to it cannot be stored.
 *
 * Two consequences of putting the Dutch copy here rather than in the clients:
 *
 * - The app renders whatever `question`, `options` and `followUp` the server
 *   sends. A Flutter release takes days to reach readers; the whole point of
 *   this system is iterating on wording, so no prompt copy ships in the binary.
 * - `version` is bumped whenever the wording of a question changes, and the
 *   version is stored on every answer. Two different questions are then never
 *   averaged together, which is the mistake that makes a year of survey data
 *   worthless.
 *
 * House rule from lib/aiPrompt.ts: no em-dash and no en-dash in Dutch copy,
 * only the plain hyphen.
 */

import { STEP_LABELS, STEP_ORDER } from './studyFlow';

/** The surfaces that may ask. Mirrors the enum on models/Feedback.js. */
export const TOUCHPOINTS = [
  'unprompted',
  'study_lesson_complete',
  'quiz_question_review',
  'quiz_complete',
  'study_abandoned',
  'onboarding_abandoned',
  'subscription_cancel',
  'dormant_return',
  'pmf_survey',
  'study_complete',
  'paywall_dismiss',
] as const;

export type Touchpoint = (typeof TOUCHPOINTS)[number];

/** Reader states, resolved by `feedbackSegments.ts`. */
export const SEGMENTS = ['nieuw', 'actief', 'verdiepend', 'afhakend', 'slapend', 'opgezegd'] as const;

export type Segment = (typeof SEGMENTS)[number];

export type PromptInput = 'text' | 'choice' | 'binary';

export interface PromptOption {
  key: string;
  label: string;
}

export interface PromptFollowUp {
  /** The answer key the follow-up text is stored under. */
  key: string;
  question: string;
}

export interface PromptDef {
  touchpoint: Touchpoint;
  /** Bumped when the Dutch wording changes. Stored on every answer. */
  version: number;
  /** Dutch, at most 90 characters, no em-dash or en-dash. */
  question: string;
  input: PromptInput;
  /** For `choice` and `binary`. */
  options?: PromptOption[];
  /** Which chosen option opens a free-text line, and what it asks. */
  followUp?: Record<string, PromptFollowUp>;
  /** The answer key a free-text body is stored under. */
  freeTextKey?: string;
  /** Placeholder for a text input. */
  placeholder?: string;
  maxLen: number;
  segments: Segment[];
  cooldownDays: number;
  lifetimeCap: number;
  platforms: ('web' | 'ios' | 'android')[];
  /**
   * Whether this counts against the global fatigue budget: the 14-day
   * cooldown, the monthly cap and the annual cap. False only for one-tap
   * micro-signals, which carry no dismissal cost and have their own limits.
   */
  budgeted: boolean;
  /**
   * The option keys are "1" to "5" and the chosen one is also stored as the
   * document's `rating`, so the inbox's rating filter covers it.
   */
  ratingScale?: boolean;
  /**
   * Whether a happy answer here may ask permission to be quoted on the site.
   * Only on a `ratingScale` prompt, and the consent is only ever offered - and
   * only ever accepted - on a rating of `PUBLISH_MIN_RATING` or better that
   * also carries a written note. See `resolvePublishConsent`.
   */
  publishConsent?: boolean;
  /**
   * Whether a happy answer here may be followed by the one-time invitation to
   * leave a public store review. Web only, once per reader ever, never paid
   * for. See `lib/storeReviewCta.ts`.
   */
  storeReviewCta?: boolean;
}

/** A rating at or above this may be asked for consent, and for a store review. */
export const PUBLISH_MIN_RATING = 4;

/** What a reader may choose to be credited as. Short on purpose. */
export const DISPLAY_NAME_MAX = 60;

/** Five faces for a 1 to 5 rating. The keys are the numbers. */
const RATING_OPTIONS: PromptOption[] = [
  { key: '1', label: '😞' },
  { key: '2', label: '🙁' },
  { key: '3', label: '😐' },
  { key: '4', label: '🙂' },
  { key: '5', label: '😄' },
];

const OPTIONAL_NOTE: PromptFollowUp = { key: 'toelichting', question: 'Wil je er iets over kwijt? (optioneel)' };

/**
 * The step labels, off STEP_ORDER itself rather than retyped, so the trade-off
 * question cannot come to name a step the flow does not have - or miss one it
 * gained. The list was a literal once, and adding Bijbelse context to the flow
 * would have left it silently asking about five of six steps.
 */
const STEP_OPTIONS: PromptOption[] = STEP_ORDER.map((key) => ({
  key,
  label: STEP_LABELS[key] ?? key,
}));

export const PROMPTS: Record<string, PromptDef> = {
  /**
   * T1a - the default ask after a lesson. The reader has just spent fifteen
   * minutes inside this lesson and is on a screen whose only job is to say
   * "well done": maximum context, minimum defensiveness.
   */
  t1a_least_clear: {
    touchpoint: 'study_lesson_complete',
    version: 1,
    question: 'Wat was in deze les het minst duidelijk?',
    input: 'text',
    freeTextKey: 'antwoord',
    placeholder: 'Eén zin is genoeg',
    maxLen: 600,
    segments: ['nieuw', 'actief', 'verdiepend'],
    cooldownDays: 90,
    lifetimeCap: 2,
    platforms: ['web'],
    budgeted: true,
  },

  /** T1b - the second ask, so a returning reader is not asked the same thing. */
  t1b_missing: {
    touchpoint: 'study_lesson_complete',
    version: 1,
    question: 'Wat had je in deze les nog willen lezen dat er niet stond?',
    input: 'text',
    freeTextKey: 'antwoord',
    placeholder: 'Eén zin is genoeg',
    maxLen: 600,
    segments: ['actief', 'verdiepend'],
    cooldownDays: 90,
    lifetimeCap: 2,
    platforms: ['web'],
    budgeted: true,
  },

  /**
   * T1c - the forced trade-off. One tap, no submit button: which step does the
   * reader actually sacrifice when they are in a hurry? That answer decides
   * what the lesson flow may cost.
   */
  t1c_skipped_step: {
    touchpoint: 'study_lesson_complete',
    version: 1,
    question: 'Als je haast hebt, welke stap sla je over?',
    input: 'choice',
    options: STEP_OPTIONS,
    maxLen: 0,
    segments: ['actief', 'verdiepend'],
    cooldownDays: 180,
    lifetimeCap: 1,
    platforms: ['web'],
    budgeted: true,
  },

  /**
   * P1 - leaving a lesson halfway. Optional, one tap, inside the dialog the
   * reader already opened, and outside the fatigue budget: they are leaving
   * anyway, so this costs them nothing they were going to spend. It is the
   * only instrument in the set that can tell the difference between "too long"
   * and "not what I was looking for", which are opposite fixes.
   */
  p1_exit_reason: {
    touchpoint: 'study_abandoned',
    version: 1,
    question: 'Waarom stop je hier? (optioneel)',
    input: 'choice',
    options: [
      { key: 'geen_tijd', label: 'Geen tijd nu' },
      { key: 'te_lang', label: 'Te lang' },
      { key: 'te_moeilijk', label: 'Te moeilijk' },
      { key: 'niet_gezocht', label: 'Niet wat ik zocht' },
      { key: 'fout', label: 'Er ging iets mis' },
    ],
    maxLen: 0,
    segments: ['nieuw', 'actief', 'verdiepend', 'afhakend'],
    cooldownDays: 30,
    lifetimeCap: 3,
    platforms: ['web'],
    budgeted: false,
  },

  /**
   * T2b - after the quiz. This is the reader's-side check on the whole
   * passage-matching mechanism: a run of "Nee" on one lesson means the quiz
   * slugs for that lesson are wrong, which is a five-minute fix that would
   * otherwise never be found.
   */
  t2b_quiz_match: {
    touchpoint: 'quiz_complete',
    version: 1,
    question: 'Ging deze quiz over wat je net gelezen had?',
    input: 'choice',
    options: [
      { key: 'ja', label: 'Ja' },
      { key: 'deels', label: 'Deels' },
      { key: 'nee', label: 'Nee' },
    ],
    followUp: {
      deels: { key: 'toelichting', question: 'Wat hoorde er niet bij?' },
      nee: { key: 'toelichting', question: 'Wat hoorde er niet bij?' },
    },
    maxLen: 600,
    segments: ['nieuw', 'actief', 'verdiepend'],
    cooldownDays: 90,
    lifetimeCap: 2,
    platforms: ['web'],
    budgeted: true,
  },

  /**
   * S1 - a whole study finished. Asked on the next dashboard visit rather
   * than on the reward screen itself, so the finish stays a finish. A rating
   * first (one tap), then an optional line.
   */
  s1_study_rating: {
    touchpoint: 'study_complete',
    version: 1,
    question: 'Je hebt een studie afgerond. Hoe vond je hem?',
    input: 'choice',
    options: RATING_OPTIONS,
    followUp: Object.fromEntries(RATING_OPTIONS.map((option) => [option.key, OPTIONAL_NOTE])),
    maxLen: 600,
    segments: ['nieuw', 'actief', 'verdiepend', 'afhakend', 'slapend', 'opgezegd'],
    cooldownDays: 60,
    lifetimeCap: 3,
    platforms: ['web'],
    budgeted: true,
    ratingScale: true,
    publishConsent: true,
    storeReviewCta: true,
  },

  /**
   * W1 - closing an upgrade prompt with "Niet nu". Outside the budget for the
   * same reason as P1: the reader is already saying no, and this only asks
   * why. Once per reader, ever.
   */
  w1_paywall_reason: {
    touchpoint: 'paywall_dismiss',
    version: 1,
    question: 'Wat houdt je tegen?',
    input: 'choice',
    options: [
      { key: 'te_duur', label: 'Te duur' },
      { key: 'onduidelijk', label: 'Weet niet wat ik krijg' },
      { key: 'later', label: 'Later misschien' },
      { key: 'gratis_genoeg', label: 'Gratis is genoeg' },
    ],
    maxLen: 0,
    segments: ['nieuw', 'actief', 'verdiepend', 'afhakend', 'slapend', 'opgezegd'],
    cooldownDays: 365,
    lifetimeCap: 1,
    platforms: ['web'],
    budgeted: false,
  },

  /**
   * D1 - an enrolled reader back after 14 or more quiet days. Asked on the
   * dashboard, once, before they have had to explain themselves anywhere else.
   */
  d1_dormant_reason: {
    touchpoint: 'dormant_return',
    version: 1,
    question: 'Welkom terug. Wat hield je tegen?',
    input: 'choice',
    options: [
      { key: 'geen_tijd', label: 'Geen tijd' },
      { key: 'vergeten', label: 'Vergeten' },
      { key: 'te_zwaar', label: 'Te zwaar of te lang' },
      { key: 'niet_gezocht', label: 'Niet wat ik zocht' },
      { key: 'anders', label: 'Iets anders' },
    ],
    followUp: { anders: { key: 'toelichting', question: 'Wat was het?' } },
    maxLen: 600,
    // 14+ idle days resolves to one of these (lib/feedbackSegments.ts).
    segments: ['afhakend', 'slapend', 'opgezegd'],
    cooldownDays: 90,
    lifetimeCap: 2,
    platforms: ['web'],
    budgeted: true,
  },
};

export type PromptId = keyof typeof PROMPTS;

export const PROMPT_IDS = Object.keys(PROMPTS) as readonly string[];

/** Every prompt registered for one surface, in declaration order. */
export function promptsFor(touchpoint: Touchpoint): PromptId[] {
  return PROMPT_IDS.filter((id) => PROMPTS[id].touchpoint === touchpoint);
}

/** The chrome around every prompt, so the two clients word it identically. */
export const PROMPT_CHROME = {
  eyebrow: 'Eén korte vraag',
  submit: 'Versturen',
  skip: 'Sla over',
  thanks: 'Dank je. Dit gaat rechtstreeks naar de maker.',
  privacy: 'Je antwoord is gekoppeld aan je account. Alleen de maker leest het.',
  /**
   * The consent to be quoted. Two lines on purpose: the first is what is being
   * asked, the second is exactly what would end up on the site. The checkbox is
   * unticked, the answer is stored either way, and nothing here is worded as a
   * favour - consent that is nudged is not freely given.
   */
  consent: 'Je mag dit als aanbeveling op de site tonen',
  consentDetail:
    'We tonen dan alleen deze tekst en de naam die je hieronder kiest. Verder niets, en je kunt het later laten weghalen.',
  consentName: 'Naam bij de aanbeveling',
  consentNamePlaceholder: 'Bijvoorbeeld: Marieke',
  consentNameHint: 'Laat leeg om zonder naam getoond te worden.',
} as const;

/**
 * What a client is allowed to send back, given the definition.
 *
 * Returns the answers to store, or null when the submission does not match the
 * prompt it claims to answer. Unknown keys are dropped rather than rejected -
 * the same choice `sanitizeProps` makes for analytics - but an unknown OPTION
 * is a rejection: storing "misschien" for a question that offers three answers
 * would quietly corrupt the tally.
 */
export function validateAnswers(
  def: PromptDef,
  raw: unknown,
): { key: string; value: string }[] | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;
  const out: { key: string; value: string }[] = [];

  if (def.input === 'text') {
    const key = def.freeTextKey ?? 'antwoord';
    const value = typeof input[key] === 'string' ? (input[key] as string).trim() : '';
    if (!value) return null;
    out.push({ key, value: value.slice(0, def.maxLen) });
    return out;
  }

  const chosen = typeof input.keuze === 'string' ? input.keuze : null;
  if (!chosen) return null;
  if (!(def.options ?? []).some((option) => option.key === chosen)) return null;
  out.push({ key: 'keuze', value: chosen });

  const followUp = def.followUp?.[chosen];
  if (followUp) {
    const extra = typeof input[followUp.key] === 'string' ? (input[followUp.key] as string).trim() : '';
    if (extra) out.push({ key: followUp.key, value: extra.slice(0, def.maxLen) });
  }

  return out;
}

/**
 * The 1 to 5 rating carried by a validated answer set, or null.
 *
 * Only a `ratingScale` prompt has one: the option keys of every other choice
 * question are words, and a question that offers "ja" and "nee" has no score
 * hiding in it.
 */
export function ratingFromAnswers(
  def: PromptDef,
  answers: { key: string; value: string }[],
): number | null {
  if (!def.ratingScale) return null;
  const chosen = answers.find((entry) => entry.key === 'keuze')?.value;
  return chosen && /^[1-5]$/.test(chosen) ? Number(chosen) : null;
}

/** Whether a validated answer set carries a written note beside the choice. */
export function hasWrittenNote(answers: { key: string; value: string }[]): boolean {
  return answers.some((entry) => entry.key !== 'keuze' && entry.value.trim().length > 0);
}

export interface PublishConsent {
  mayPublish: boolean;
  /** What the reader chose to be credited as. Empty means: no name. */
  displayName: string;
}

const NO_CONSENT: PublishConsent = { mayPublish: false, displayName: '' };

/**
 * Whether this submission may be quoted on the site, decided on the server.
 *
 * The client sends `{ mayPublish, displayName }` and none of it is believed.
 * Consent survives only when all four hold, and the last two are the reason
 * this is a server-side function rather than a checkbox:
 *
 *   1. the prompt is one that may ask at all (`publishConsent`),
 *   2. the reader actually ticked the box (strictly `true`, never "true"),
 *   3. the rating is `PUBLISH_MIN_RATING` or better,
 *   4. there is a written note - a bare 5 is a score, not a testimonial.
 *
 * Anything else is coerced to "no", not rejected: a 3-star answer that claims
 * consent is still a perfectly good piece of feedback and is stored as one.
 *
 * `displayName` is only kept when consent stands, is taken from the body rather
 * than from the account, and is never defaulted to the reader's real name.
 */
export function resolvePublishConsent(
  def: PromptDef,
  answers: { key: string; value: string }[],
  raw: unknown,
): PublishConsent {
  if (!def.publishConsent) return NO_CONSENT;
  if (!raw || typeof raw !== 'object') return NO_CONSENT;

  const input = raw as Record<string, unknown>;
  if (input.mayPublish !== true) return NO_CONSENT;

  const rating = ratingFromAnswers(def, answers);
  if (rating === null || rating < PUBLISH_MIN_RATING) return NO_CONSENT;
  if (!hasWrittenNote(answers)) return NO_CONSENT;

  const displayName =
    typeof input.displayName === 'string' ? input.displayName.trim().slice(0, DISPLAY_NAME_MAX) : '';
  return { mayPublish: true, displayName };
}

/** The shape served to a client. Copy included; internal rules excluded. */
export function serialisePrompt(id: PromptId, token: string) {
  const def = PROMPTS[id];
  return {
    promptId: id,
    promptVersion: def.version,
    touchpoint: def.touchpoint,
    question: def.question,
    input: def.input,
    options: def.options ?? null,
    followUp: def.followUp ?? null,
    freeTextKey: def.freeTextKey ?? null,
    placeholder: def.placeholder ?? null,
    maxLen: def.maxLen,
    // The client needs to know whether the options are a score and whether the
    // consent line may appear at all. Both are rules, not copy, so they are
    // re-checked on the way back in; this only decides what is drawn.
    ratingScale: def.ratingScale ?? false,
    publishConsent: def.publishConsent ?? false,
    publishMinRating: PUBLISH_MIN_RATING,
    displayNameMax: DISPLAY_NAME_MAX,
    chrome: PROMPT_CHROME,
    token,
  };
}

export type SerialisedPrompt = ReturnType<typeof serialisePrompt>;
