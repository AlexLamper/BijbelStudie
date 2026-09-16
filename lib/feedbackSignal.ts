/**
 * One-tap signals: a thumb under an AI answer, a thumb under a finished lesson.
 *
 * These are not prompts. Nobody is asked anything: the reader chose to tap, so
 * there is no budget, no token and no sampling. What they do share with the
 * quiz per-question signal in `app/api/feedback/route.ts` is the shape of the
 * risk - one request per tap - so they get their own rate-limit bucket and
 * never spend the feedback form's allowance.
 *
 * Pure: validates a body and shapes the document, without touching Mongo, so
 * the web and the app produce the same record.
 */

import type { RateLimitRule } from './rateLimit';

export const SIGNAL_KINDS = ['ai_answer', 'lesson_quality'] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

export const SIGNAL_VALUES = ['up', 'down'] as const;
export type SignalValue = (typeof SIGNAL_VALUES)[number];

/** The follow-up chips after a thumbs-down, per kind. Dutch labels for both clients. */
export const SIGNAL_REASONS: Record<SignalKind, { key: string; label: string }[]> = {
  ai_answer: [
    { key: 'onjuist', label: 'Onjuist' },
    { key: 'te_vaag', label: 'Te vaag' },
    { key: 'niet_mijn_vraag', label: 'Niet mijn vraag' },
    { key: 'te_lang', label: 'Te lang' },
    { key: 'anders', label: 'Anders' },
  ],
  lesson_quality: [
    { key: 'onduidelijk', label: 'Onduidelijk' },
    { key: 'te_lang', label: 'Te lang' },
    { key: 'te_oppervlakkig', label: 'Te oppervlakkig' },
    { key: 'fout', label: 'Er klopt iets niet' },
    { key: 'anders', label: 'Anders' },
  ],
};

/**
 * 60 taps per account per hour: the same size as the quiz signal's bucket,
 * under its own scope so a long AI conversation cannot block the quiz review
 * or the form, and the other way round.
 */
export const SIGNAL_RATE: RateLimitRule = { scope: 'feedback:signal', limit: 60, windowMs: 60 * 60 * 1000 };

/**
 * The key a one-tap signal is limited on: the account when there is one, the
 * address otherwise. Shared with the quiz signal so both read the same way.
 */
export function signalRateKey(userId: string | null | undefined, ip: string): string {
  return userId ? `user:${userId}` : `ip:${ip}`;
}

const PLATFORMS = ['web', 'ios', 'android'] as const;
type Platform = (typeof PLATFORMS)[number];

export type SignalIdentity = { id: string; name: string; email: string };

export type SignalDoc = {
  userId: string;
  name: string;
  email: string;
  category: 'other';
  touchpoint: SignalKind;
  message: string;
  page: string;
  answers: { key: string; value: string }[];
  context: {
    routeKey: string | null;
    studyId: string | null;
    lessonDay: number | null;
    platform: Platform;
    appVersion: string | null;
    locale: 'nl';
    isPro: boolean | null;
  };
};

export type SignalBuildResult =
  | { ok: true; doc: SignalDoc }
  | { ok: false; code: 'INVALID_KIND' | 'INVALID_VALUE' | 'INVALID_REASON' | 'MISSING_FIELDS'; message: string };

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

/**
 * Validates one signal. An unknown kind, value or reason is a rejection rather
 * than a fallback, because a stored "misschien" would quietly corrupt the
 * tally, the same rule `validateAnswers` applies to prompt options.
 *
 * `routeKey` is resolved by the caller (a `lib/analyticsRoutes.ts` key), never
 * taken raw from the body.
 */
export function buildSignal(
  body: Record<string, unknown>,
  user: SignalIdentity,
  extra: { routeKey?: string | null; isPro?: boolean | null } = {},
): SignalBuildResult {
  const kind = body.kind;
  if (typeof kind !== 'string' || !(SIGNAL_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, code: 'INVALID_KIND', message: 'Onbekend soort signaal' };
  }
  const value = body.value;
  if (typeof value !== 'string' || !(SIGNAL_VALUES as readonly string[]).includes(value)) {
    return { ok: false, code: 'INVALID_VALUE', message: 'Ongeldige waarde' };
  }

  const signalKind = kind as SignalKind;
  let reason: string | null = null;
  if (body.reason !== undefined && body.reason !== null && body.reason !== '') {
    const allowed = SIGNAL_REASONS[signalKind].map((option) => option.key);
    if (value !== 'down' || typeof body.reason !== 'string' || !allowed.includes(body.reason)) {
      return { ok: false, code: 'INVALID_REASON', message: 'Ongeldige reden' };
    }
    reason = body.reason;
  }

  const studyId = str(body.studyId, 100);
  const lessonDayRaw = Number(body.lessonDay);
  const lessonDay = Number.isInteger(lessonDayRaw) && lessonDayRaw > 0 ? lessonDayRaw : null;
  if (signalKind === 'lesson_quality' && (!studyId || lessonDay === null)) {
    return { ok: false, code: 'MISSING_FIELDS', message: 'studyId en lessonDay zijn verplicht' };
  }

  const platformRaw = typeof body.platform === 'string' ? body.platform.toLowerCase() : 'web';
  const platform = (PLATFORMS as readonly string[]).includes(platformRaw) ? (platformRaw as Platform) : 'web';
  const appVersionRaw = str(body.appVersion, 40);
  const appVersion = appVersionRaw && /^[0-9A-Za-z.+_-]+$/.test(appVersionRaw) ? appVersionRaw : null;

  const reasonLabel = reason ? SIGNAL_REASONS[signalKind].find((option) => option.key === reason)?.label : null;
  const subject = signalKind === 'ai_answer' ? 'AI-antwoord' : 'Les';
  const verdict = value === 'up' ? 'nuttig' : 'niet nuttig';

  const answers = [{ key: 'duim', value }];
  if (reason) answers.push({ key: 'reden', value: reason });

  return {
    ok: true,
    doc: {
      userId: user.id,
      name: user.name,
      email: user.email,
      category: 'other',
      touchpoint: signalKind,
      message: `${subject} ${verdict}${reasonLabel ? ` (${reasonLabel.toLowerCase()})` : ''}`,
      page: '',
      answers,
      context: {
        routeKey: extra.routeKey ?? null,
        studyId,
        lessonDay,
        platform,
        appVersion,
        locale: 'nl',
        isPro: extra.isPro ?? null,
      },
    },
  };
}
