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

import { STEP_LABELS } from './studyFlow';

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
] as const;

export type Touchpoint = (typeof TOUCHPOINTS)[number];

/** Reader states, as defined in FEEDBACK_PLAN.md section 2.6. */
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
}

/**
 * The five step labels, taken from the rail rather than retyped, so the
 * trade-off question cannot come to name a step the flow does not have.
 */
const STEP_OPTIONS: PromptOption[] = (
  ['intro', 'word', 'depth', 'reflection', 'quiz'] as const
).map((key) => ({ key, label: STEP_LABELS[key] ?? key }));

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
};

export type PromptId = keyof typeof PROMPTS;

export const PROMPT_IDS = Object.keys(PROMPTS) as readonly string[];

export function isPromptId(value: unknown): value is PromptId {
  return typeof value === 'string' && value in PROMPTS;
}

export function isSegment(value: unknown): value is Segment {
  return typeof value === 'string' && (SEGMENTS as readonly string[]).includes(value);
}

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
    chrome: PROMPT_CHROME,
    token,
  };
}

export type SerialisedPrompt = ReturnType<typeof serialisePrompt>;
