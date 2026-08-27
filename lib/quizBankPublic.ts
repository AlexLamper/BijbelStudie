import { toBookCode } from './bookCanon';

/**
 * Fallback question source: bijbelquiz's PUBLIC catalogue.
 *
 * `lib/quizBank.ts` prefers `/api/service/study-questions`, which returns a
 * pre-filtered, answer-stripped payload. That route only exists in a bijbelquiz
 * deploy that has shipped it - a deploy that has not returns 404, and the last
 * step of every lesson then reads "geen quiz voor dit gedeelte" forever, with no
 * error anywhere to explain why.
 *
 * `GET /api/quizzes` has always existed and returns whole quiz documents. This
 * module does here what the service route does there: match questions to a
 * passage, shuffle deterministically, and - crucially - strip `isCorrect` and
 * `explanation` before anything leaves this process. The correct answers are
 * read on THIS server during grading and never travel to a browser.
 *
 * The matching logic below is intentionally a mirror of
 * bijbelquiz/src/app/api/service/study-questions/route.ts, so switching back to
 * the service route the moment it is deployed changes nothing a reader can see.
 */

const CATALOGUE_TTL_MS = 5 * 60 * 1000;
const CATALOGUE_TIMEOUT_MS = 12000;

interface PublicAnswer {
  _id?: unknown;
  text?: string;
  isCorrect?: boolean;
}

interface PublicQuestion {
  _id?: unknown;
  text?: string;
  answers?: PublicAnswer[];
  explanation?: string;
  bibleReference?: string;
  refBook?: string | null;
  refChapter?: number | null;
  refVerse?: number | null;
  refVerseEnd?: number | null;
}

interface PublicQuiz {
  _id?: unknown;
  title?: string;
  slug?: string;
  difficulty?: string;
  status?: string;
  questions?: PublicQuestion[];
}

let cache: { at: number; quizzes: PublicQuiz[] } | null = null;
let inFlight: Promise<PublicQuiz[] | null> | null = null;

/**
 * The whole catalogue, cached in-process.
 *
 * ~200 KB and a single round trip, so caching it beats one request per lesson
 * step. A cold serverless instance simply fetches again; nothing here is state
 * that has to survive.
 */
async function catalogue(base: string): Promise<PublicQuiz[] | null> {
  if (cache && Date.now() - cache.at < CATALOGUE_TTL_MS) return cache.quizzes;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch(`${base}/api/quizzes`, {
        signal: AbortSignal.timeout(CATALOGUE_TIMEOUT_MS),
        cache: 'no-store',
      });
      if (!response.ok) return null;

      const data = await response.json();
      if (!Array.isArray(data)) return null;

      const quizzes = data as PublicQuiz[];
      cache = { at: Date.now(), quizzes };
      return quizzes;
    } catch (error) {
      console.error(
        '[quizBankPublic] Catalogue fetch failed:',
        error instanceof Error ? error.message : error,
      );
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Deterministic 32-bit hash, so the same seed returns the same questions. */
function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Seeded shuffle: reloading a lesson must return the SAME questions. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let state = hashSeed(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type MatchTier = 'slug' | 'verse' | 'chapter' | 'book';

interface Candidate {
  tier: MatchTier;
  quiz: PublicQuiz;
  question: PublicQuestion;
}

function versesOverlap(
  aStart: number | null | undefined,
  aEnd: number | null | undefined,
  bStart: number | null,
  bEnd: number | null,
): boolean {
  if (aStart == null || bStart == null) return false;
  const a2 = aEnd ?? aStart;
  const b2 = bEnd ?? bStart;
  return aStart <= b2 && a2 >= bStart;
}

function isApproved(quiz: PublicQuiz): boolean {
  return quiz.status === undefined || quiz.status === 'approved';
}

/**
 * Every question a quiz slug or reference match yields, in tier order.
 *
 * A closer match always outranks a looser one, which is why the shuffle happens
 * WITHIN a tier: a chapter-level question must never displace a verse-level one
 * just because the seed said so.
 */
function collect(
  quizzes: PublicQuiz[],
  options: {
    book: string;
    chapter: number;
    verseStart?: number | null;
    verseEnd?: number | null;
    quizSlugs?: string[];
  },
): Candidate[] {
  const candidates: Candidate[] = [];
  const slugs = (options.quizSlugs ?? []).filter(Boolean);

  if (slugs.length > 0) {
    for (const quiz of quizzes) {
      if (!quiz.slug || !slugs.includes(quiz.slug)) continue;
      for (const question of quiz.questions ?? []) {
        candidates.push({ tier: 'slug', quiz, question });
      }
    }
    // A lesson that names its quizzes never gets unrelated questions mixed in.
    if (candidates.length > 0) return candidates;
  }

  const bookCode = toBookCode(options.book);
  if (!bookCode) return candidates;

  for (const quiz of quizzes) {
    if (!isApproved(quiz)) continue;
    for (const question of quiz.questions ?? []) {
      if (question.refBook !== bookCode) continue;

      if (question.refChapter === options.chapter) {
        const overlaps = versesOverlap(
          question.refVerse,
          question.refVerseEnd,
          options.verseStart ?? null,
          options.verseEnd ?? null,
        );
        candidates.push({
          tier: overlaps || options.verseStart == null ? 'verse' : 'chapter',
          quiz,
          question,
        });
      } else {
        candidates.push({ tier: 'book', quiz, question });
      }
    }
  }

  return candidates;
}

export interface PublicQuestionsResult {
  questions: {
    id: string;
    quizId: string;
    quizSlug: string;
    quizTitle: string;
    text: string;
    answers: { id: string; text: string }[];
    bibleReference: string | null;
    difficulty: string;
  }[];
  total: number;
  matchedBy: string;
}

/** Questions for a passage from the public catalogue, or null when unreachable. */
export async function fetchQuestionsFromPublicCatalogue(
  base: string,
  options: {
    book: string;
    chapter: number;
    verseStart?: number | null;
    verseEnd?: number | null;
    count?: number;
    quizSlugs?: string[];
    seed: string;
  },
): Promise<PublicQuestionsResult | null> {
  const quizzes = await catalogue(base);
  if (!quizzes) return null;

  const count = Math.min(options.count ?? 5, 10);
  const candidates = collect(quizzes, options);

  const picked: Candidate[] = [];
  for (const tier of ['slug', 'verse', 'chapter', 'book'] as MatchTier[]) {
    if (picked.length >= count) break;
    const inTier = candidates.filter((candidate) => candidate.tier === tier);
    picked.push(...seededShuffle(inTier, `${options.seed}:${tier}`).slice(0, count - picked.length));
  }

  return {
    questions: picked.map(({ quiz, question }) => ({
      id: `${String(quiz._id)}:${String(question._id)}`,
      quizId: String(quiz._id),
      quizSlug: quiz.slug ?? '',
      quizTitle: quiz.title ?? '',
      text: question.text ?? '',
      // Answers carry an id and text only. `isCorrect` stops here.
      answers: (question.answers ?? []).map((answer) => ({
        id: String(answer._id),
        text: answer.text ?? '',
      })),
      bibleReference: question.bibleReference ?? null,
      difficulty: quiz.difficulty ?? 'medium',
    })),
    total: picked.length,
    matchedBy: picked[0]?.tier ?? 'none',
  };
}

export interface PublicGradeResult {
  results: {
    id: string;
    known: boolean;
    correct: boolean;
    correctAnswerId: string | null;
    explanation: string | null;
    bibleReference?: string | null;
  }[];
  score: number;
  total: number;
}

/**
 * Grades against the catalogue rather than against remembered state.
 *
 * Deliberately stateless: a serverless instance that served the questions is
 * rarely the one that grades them, so anything held in memory between the two
 * calls would silently mark half of all submissions unknown.
 */
export async function gradeWithPublicCatalogue(
  base: string,
  answers: { id: string; answerId: string | null }[],
): Promise<PublicGradeResult | null> {
  const quizzes = await catalogue(base);
  if (!quizzes) return null;

  const byId = new Map<string, PublicQuestion>();
  for (const quiz of quizzes) {
    for (const question of quiz.questions ?? []) {
      byId.set(`${String(quiz._id)}:${String(question._id)}`, question);
    }
  }

  let score = 0;
  const results = answers.map((answer) => {
    const question = byId.get(answer.id);
    if (!question) {
      return {
        id: answer.id,
        known: false,
        correct: false,
        correctAnswerId: null,
        explanation: null,
      };
    }

    const correctAnswer = (question.answers ?? []).find((entry) => entry.isCorrect);
    const correctAnswerId = correctAnswer?._id ? String(correctAnswer._id) : null;
    const correct = correctAnswerId != null && answer.answerId === correctAnswerId;
    if (correct) score++;

    return {
      id: answer.id,
      known: true,
      correct,
      correctAnswerId,
      explanation: question.explanation ?? null,
      bibleReference: question.bibleReference ?? null,
    };
  });

  return { results, score, total: answers.length };
}
