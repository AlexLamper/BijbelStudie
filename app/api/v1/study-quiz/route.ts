import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import StudyLessonState from '../../../../models/StudyLessonState.js';
import { getLessonContent } from '../../../../lib/data/study-lessons';
import { findLesson, resolvePassage } from '../../../../lib/studyFlow';
import { findStudy } from '../../../../lib/studyEnrollmentService';
import { fetchQuestions, gradeAnswers, isQuizBankConfigured } from '../../../../lib/quizBank';
import { upsertLessonState } from '../../../../lib/lessonStateWrite';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * The quiz step, proxied through this server.
 *
 * The passage is resolved HERE from the lesson rather than taken from the query
 * string. A client that could name its own book and chapter could pull questions
 * for anything; the only thing it gets to choose is which lesson it is on.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const url = new URL(req.url);
    const studyId = url.searchParams.get('studyId') ?? '';
    const lessonDay = Number(url.searchParams.get('day'));

    if (!studyId || !Number.isInteger(lessonDay)) {
      return errorV1('MISSING_FIELDS', 400, 'studyId en day zijn verplicht');
    }

    const study = findStudy(studyId);
    if (!study) return errorV1('NOT_FOUND', 404, 'Onbekende studie');

    const lesson = findLesson(study, lessonDay);
    if (!lesson) return errorV1('NOT_FOUND', 404, 'Onbekende les');

    const content = getLessonContent(studyId, lessonDay);

    // A lesson may opt out of having a quiz at all.
    if (content?.quiz?.enabled === false) {
      return jsonV1({ available: false, reason: 'DISABLED', questions: [] });
    }
    if (!isQuizBankConfigured()) {
      return jsonV1({ available: false, reason: 'NOT_CONFIGURED', questions: [] });
    }

    const passage = resolvePassage(lesson, content);

    // Seeded per user and lesson: reloading returns the SAME questions, so a
    // half-finished quiz does not silently change under the reader, while two
    // people still get different sets.
    const result = await fetchQuestions({
      book: passage.book,
      chapter: passage.chapter,
      verseStart: passage.verseStart,
      verseEnd: passage.verseEnd,
      count: content?.quiz?.questionCount ?? 5,
      quizSlugs: content?.quiz?.quizSlugs,
      seed: `${auth.id}:${studyId}:${lessonDay}`,
    });

    if (!result) {
      // Reached only when the other server is down or erroring. The step still
      // renders and the lesson can still be finished.
      return jsonV1({ available: false, reason: 'UNAVAILABLE', questions: [] });
    }
    if (result.questions.length === 0) {
      return jsonV1({ available: false, reason: 'NO_QUESTIONS', questions: [] });
    }

    // Remember which questions were served, so the grade call can be checked
    // against them rather than trusting whatever ids the client sends back.
    await connectMongoDB();

    // Read BEFORE the write: what this reader already picked, and what they
    // already scored. `pickQuestions` is seeded per user and lesson, so the set
    // coming back is the same one those answers belong to.
    const previous = await StudyLessonState.findOne({ userId: auth.id, studyId, lessonDay })
      .select('quiz.answers quiz.score quiz.total')
      .lean<{
        quiz?: {
          answers?: { questionId: string; answerId: string }[];
          score?: number | null;
          total?: number | null;
        };
      }>();

    // The other half of the race described in lib/lessonStateWrite: this GET
    // runs when StepQuiz mounts, which is the same moment StudyFlowShell
    // patches `currentStep: 'quiz'`.
    await upsertLessonState(
      { userId: auth.id, studyId, lessonDay },
      {
        $setOnInsert: { userId: auth.id, studyId, lessonDay, startedAt: new Date() },
        $set: {
          'quiz.questionIds': result.questions.map((question) => question.id),
          'quiz.quizIds': [...new Set(result.questions.map((question) => question.quizId))],
        },
      },
    );

    return jsonV1({
      available: true,
      matchedBy: result.matchedBy,
      savedAnswers: (previous?.quiz?.answers ?? []).map((entry) => ({
        questionId: entry.questionId,
        answerId: entry.answerId,
      })),
      savedScore: previous?.quiz?.score ?? null,
      savedTotal: previous?.quiz?.total ?? null,
      questions: result.questions.map((question) => ({
        id: question.id,
        text: question.text,
        answers: question.answers,
        bibleReference: question.bibleReference,
      })),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * `PUT { studyId, lessonDay, answers: [{ id, answerId }] }`
 *
 * The picks so far, with no grading. Called as the reader answers, so stepping
 * back to the passage and returning does not empty the quiz - the previous
 * version held every pick in component state and the step remounts on every
 * navigation.
 *
 * Deliberately not the POST: this must never touch `attempts`, `score` or the
 * upstream grader.
 */
export async function PUT(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) ?? {};

    const studyId = typeof body.studyId === 'string' ? body.studyId.trim() : '';
    const lessonDay = Number(body.lessonDay);
    const submitted = Array.isArray(body.answers) ? body.answers : null;

    if (!studyId || !Number.isInteger(lessonDay) || !submitted) {
      return errorV1('MISSING_FIELDS', 400, 'studyId, lessonDay en answers zijn verplicht');
    }

    await connectMongoDB();
    const state = await StudyLessonState.findOne({ userId: auth.id, studyId, lessonDay }).lean<{
      quiz?: { questionIds?: string[] };
    }>();
    const served = new Set(state?.quiz?.questionIds ?? []);

    const answers = submitted
      .map((entry: { id?: unknown; answerId?: unknown }) => ({
        questionId: typeof entry.id === 'string' ? entry.id : '',
        answerId: typeof entry.answerId === 'string' ? entry.answerId : '',
      }))
      .filter(
        (entry: { questionId: string; answerId: string }) =>
          entry.questionId && entry.answerId && served.has(entry.questionId),
      );

    await StudyLessonState.updateOne(
      { userId: auth.id, studyId, lessonDay },
      { $set: { 'quiz.answers': answers } },
    );

    return jsonV1({ saved: answers.length });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * `{ studyId, lessonDay, answers: [{ id, answerId }] }`
 *
 * Grading happens on bijbelquiz, which is the only place the correct answers
 * live. The score is mirrored here so a finished lesson still shows its result
 * when that server is unreachable.
 *
 * Note what this does NOT do: grant XP. The lesson grants `study_lesson` once,
 * on completion. A separate quiz reward would be farmable by replaying one
 * lesson, and the anti-farm logic lives on the other server.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) ?? {};

    const studyId = typeof body.studyId === 'string' ? body.studyId.trim() : '';
    const lessonDay = Number(body.lessonDay);
    const submitted = Array.isArray(body.answers) ? body.answers : null;

    if (!studyId || !Number.isInteger(lessonDay) || !submitted) {
      return errorV1('MISSING_FIELDS', 400, 'studyId, lessonDay en answers zijn verplicht');
    }

    await connectMongoDB();
    const state = await StudyLessonState.findOne({ userId: auth.id, studyId, lessonDay }).lean<{
      quiz?: { questionIds?: string[]; attempts?: number };
    }>();

    const served = new Set(state?.quiz?.questionIds ?? []);
    const answers = submitted
      .map((entry: { id?: unknown; answerId?: unknown }) => ({
        id: typeof entry.id === 'string' ? entry.id : '',
        answerId: typeof entry.answerId === 'string' ? entry.answerId : null,
      }))
      // Only questions this user was actually served can be graded, so a client
      // cannot fish for the answer to an arbitrary question.
      .filter((entry: { id: string }) => entry.id && served.has(entry.id));

    if (answers.length === 0) {
      return errorV1('INVALID_FIELDS', 400, 'Geen bekende vragen om na te kijken');
    }

    const graded = await gradeAnswers(answers);
    if (!graded) return errorV1('UPSTREAM_UNAVAILABLE', 503, 'Quiz kon niet worden nagekeken');

    await StudyLessonState.updateOne(
      { userId: auth.id, studyId, lessonDay },
      {
        $set: {
          // Stored so a graded lesson reopens on its result rather than on an
          // empty form. Without this a refresh puts the reader back at question
          // one, and answering again increments `attempts` for a quiz they had
          // already finished.
          'quiz.answers': answers
            .filter((entry: { answerId: string | null }) => entry.answerId)
            .map((entry: { id: string; answerId: string | null }) => ({
              questionId: entry.id,
              answerId: entry.answerId as string,
            })),
          'quiz.score': graded.score,
          'quiz.total': graded.total,
          'quiz.lastAttemptAt': new Date(),
        },
        $inc: { 'quiz.attempts': 1 },
      },
    );

    return jsonV1({ results: graded.results, score: graded.score, total: graded.total });
  } catch (error) {
    return handleV1Error(error);
  }
}
