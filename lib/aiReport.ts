/**
 * A reader flagging one AI-assistant answer (Google Play's AI-Generated
 * Content policy: offensive or harmful output must be reportable in-app).
 *
 * Reports are stored as `Feedback` documents with `touchpoint: "ai_report"`,
 * so they land in the read-out at `/beheer/feedback` next to everything else
 * instead of in a console nobody opens. This module is the pure half: it
 * validates a request body and shapes the document, without touching Mongo,
 * so both the app route and any web route produce the same record.
 */

export const AI_REPORT_REASONS = ['onjuist', 'aanstootgevend', 'schadelijk', 'anders'] as const;
export type AiReportReason = (typeof AI_REPORT_REASONS)[number];

export const AI_REPORT_REASON_LABELS: Record<AiReportReason, string> = {
  onjuist: 'Onjuist',
  aanstootgevend: 'Aanstootgevend',
  schadelijk: 'Schadelijk',
  anders: 'Anders',
};

/** Where the answer was shown. Anything else is stored as `onbekend`. */
export const AI_REPORT_SURFACES = ['study_ai', 'lesson_ai', 'web_ai'] as const;

export const AI_REPORT_LIMITS = {
  comment: 1000,
  question: 2000,
  answer: 4000,
  model: 80,
  appVersion: 40,
} as const;

const PLATFORMS = ['web', 'ios', 'android'] as const;

export type AiReportIdentity = { id: string; name: string; email: string };

export type AiReportDoc = {
  userId: string;
  name: string;
  email: string;
  category: 'other';
  touchpoint: 'ai_report';
  message: string;
  page: string;
  userAgent: string;
  answers: { key: string; value: string }[];
  aiReport: {
    reason: AiReportReason;
    comment: string;
    question: string;
    answer: string;
    surface: string;
    model: string | null;
  };
  context: {
    platform: (typeof PLATFORMS)[number] | null;
    appVersion: string | null;
    locale: string;
  };
};

export type AiReportBuildResult =
  | { ok: true; doc: AiReportDoc }
  | { ok: false; code: 'INVALID_REASON' | 'MISSING_FIELDS'; message: string };

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validates a report body and returns the document to store.
 *
 * Only `reason` and `answer` are required: the answer is the thing being
 * reported, and a report without it cannot be acted on. Everything free-form
 * is truncated rather than rejected - a reader who took the trouble to flag
 * something should never be told their report was too long.
 */
export function buildAiReport(
  body: Record<string, unknown>,
  user: AiReportIdentity,
  userAgent: string,
): AiReportBuildResult {
  const reason = str(body.reason) as AiReportReason;
  if (!(AI_REPORT_REASONS as readonly string[]).includes(reason)) {
    return { ok: false, code: 'INVALID_REASON', message: 'Kies een reden' };
  }

  const answer = str(body.answer).slice(0, AI_REPORT_LIMITS.answer);
  if (!answer) {
    return { ok: false, code: 'MISSING_FIELDS', message: 'answer is required' };
  }

  const comment = str(body.comment).slice(0, AI_REPORT_LIMITS.comment);
  const question = str(body.question).slice(0, AI_REPORT_LIMITS.question);
  const rawSurface = str(body.surface);
  const surface = (AI_REPORT_SURFACES as readonly string[]).includes(rawSurface) ? rawSurface : 'onbekend';
  const model = str(body.model).slice(0, AI_REPORT_LIMITS.model) || null;
  const rawPlatform = str(body.platform);
  const platform = (PLATFORMS as readonly string[]).includes(rawPlatform)
    ? (rawPlatform as (typeof PLATFORMS)[number])
    : null;
  const appVersion = str(body.appVersion).slice(0, AI_REPORT_LIMITS.appVersion) || null;

  const label = AI_REPORT_REASON_LABELS[reason];

  return {
    ok: true,
    doc: {
      userId: user.id,
      name: user.name,
      email: user.email,
      category: 'other',
      touchpoint: 'ai_report',
      // `message` is required on the collection and is what the list view
      // leads with, so it carries the reader's own words when there are any.
      message: comment || `AI-antwoord gemeld: ${label.toLowerCase()}`,
      page: surface,
      userAgent: userAgent.slice(0, 300),
      answers: [
        { key: 'reden', value: reason },
        { key: 'onderdeel', value: surface },
        ...(model ? [{ key: 'model', value: model }] : []),
      ],
      aiReport: { reason, comment, question, answer, surface, model },
      context: { platform, appVersion, locale: 'nl' },
    },
  };
}
