/**
 * The only module that talks to bijbelquiz.com.
 *
 * Everything here is server-side. The service key cannot go anywhere near a
 * browser, and the question payload must be filtered before it reaches one -
 * which is the whole reason the study flow proxies through
 * `/api/v1/study-quiz` instead of letting the client call the other server.
 *
 * Nothing in here throws. A quiz is the last step of a lesson, and the other
 * deploy being down, slow or misconfigured must degrade to "geen quiz voor dit
 * gedeelte" rather than break someone's devotional halfway through.
 */

import {
  fetchQuestionsFromPublicCatalogue,
  gradeWithPublicCatalogue,
} from './quizBankPublic';

const REQUEST_TIMEOUT_MS = 5000;

export interface QuizQuestion {
  id: string;
  quizId: string;
  quizSlug: string;
  quizTitle: string;
  text: string;
  answers: { id: string; text: string }[];
  bibleReference: string | null;
  difficulty: string;
}

export interface QuizQuestionsResult {
  questions: QuizQuestion[];
  total: number;
  matchedBy: string;
}

export interface GradedAnswer {
  id: string;
  known: boolean;
  correct: boolean;
  correctAnswerId: string | null;
  explanation: string | null;
  bibleReference?: string | null;
}

export interface GradeResult {
  results: GradedAnswer[];
  score: number;
  total: number;
}

function baseUrl(): string | null {
  const configured = process.env.BIJBELQUIZ_API_BASE?.trim();
  if (!configured) return null;
  return configured.replace(/\/$/, '');
}

function serviceHeaders(): Record<string, string> | null {
  const key = process.env.BIJBELQUIZ_SERVICE_KEY?.trim();
  if (!key) return null;
  return {
    'x-service-key': key,
    'x-service-client': 'bijbelstudie',
    'content-type': 'application/json',
  };
}

/**
 * True when questions can be reached at all.
 *
 * The service key is NOT required: without it the public-catalogue fallback
 * below still answers, and gating on the key would turn a missing env var into
 * "this lesson has no quiz" - the one failure mode this module exists to avoid.
 */
export function isQuizBankConfigured(): boolean {
  return baseUrl() !== null;
}

/**
 * Whether the service route is known to be missing on the other deploy.
 *
 * A 404 means the route was never shipped, not that this passage has no
 * questions. Remembering it skips one dead round trip per lesson step; it is
 * reset per process, so deploying the route there fixes this one without a
 * deploy here.
 */
let serviceRouteMissing = false;

/**
 * One attempt plus one retry.
 *
 * The retry is worth it because a cold serverless function on the other side
 * routinely costs more than the timeout; a second failure is a real outage and
 * is reported as "no questions" rather than retried into a slow page.
 */
async function call(path: string, init: RequestInit): Promise<Response | null> {
  const base = baseUrl();
  const headers = serviceHeaders();
  if (!base || !headers || serviceRouteMissing) {
    if (!headers) console.warn('[quizBank] BIJBELQUIZ_SERVICE_KEY is not set');
    return null;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${base}${path}`, {
        ...init,
        headers: { ...headers, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: 'no-store',
      });

      // A 404 is the route not existing on that deploy, not a bad request.
      if (response.status === 404) {
        serviceRouteMissing = true;
        return null;
      }
      // A 4xx is a real answer - retrying a bad request just wastes the timeout.
      if (response.ok || (response.status >= 400 && response.status < 500)) return response;
    } catch (error) {
      if (attempt === 1) {
        console.error('[quizBank] Request failed:', error instanceof Error ? error.message : error);
      }
    }
  }

  return null;
}

/** Questions for a passage, or null when the bank could not be reached. */
export async function fetchQuestions(options: {
  book: string;
  chapter: number;
  verseStart?: number | null;
  verseEnd?: number | null;
  count?: number;
  quizSlugs?: string[];
  seed: string;
}): Promise<QuizQuestionsResult | null> {
  const params = new URLSearchParams({
    book: options.book,
    chapter: String(options.chapter),
    seed: options.seed,
  });
  if (options.verseStart != null) params.set('verseStart', String(options.verseStart));
  if (options.verseEnd != null) params.set('verseEnd', String(options.verseEnd));
  if (options.count) params.set('count', String(options.count));
  if (options.quizSlugs?.length) params.set('quizSlugs', options.quizSlugs.join(','));

  const response = await call(`/api/service/study-questions?${params.toString()}`, {
    method: 'GET',
  });

  if (response?.ok) {
    try {
      const data = (await response.json()) as QuizQuestionsResult;
      return {
        questions: data.questions ?? [],
        total: data.total ?? 0,
        matchedBy: data.matchedBy ?? 'none',
      };
    } catch {
      return null;
    }
  }
  if (response) {
    console.warn(`[quizBank] Questions request returned ${response.status}`);
    return null;
  }

  // No service route on the other deploy: read the public catalogue instead.
  const base = baseUrl();
  if (!base) return null;
  return fetchQuestionsFromPublicCatalogue(base, options);
}

/**
 * Marks answers on the server that owns them.
 *
 * The correct answers are deliberately never fetched into this process, so
 * there is no path by which they reach a browser before the reader has answered.
 */
export async function gradeAnswers(
  answers: { id: string; answerId: string | null }[],
): Promise<GradeResult | null> {
  if (answers.length === 0) return { results: [], score: 0, total: 0 };

  const response = await call('/api/service/study-questions/grade', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });

  if (response?.ok) {
    try {
      return (await response.json()) as GradeResult;
    } catch {
      return null;
    }
  }
  if (response) return null;

  const base = baseUrl();
  if (!base) return null;
  return gradeWithPublicCatalogue(base, answers);
}
