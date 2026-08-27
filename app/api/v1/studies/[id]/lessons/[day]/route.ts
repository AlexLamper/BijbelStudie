import { requireUser } from '../../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../../../lib/apiV1';
import { getLessonContent } from '../../../../../../../lib/data/study-lessons';
import {
  findLesson,
  nextLessonDay,
  resolveCommentaryId,
  resolvePassage,
  resolveReflectionQuestion,
  resolveSteps,
} from '../../../../../../../lib/studyFlow';
import { findStudy, getEnrollment } from '../../../../../../../lib/studyEnrollmentService';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string; day: string }>;
}

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Everything one lesson needs to render, resolved server-side.
 *
 * Deliberately NOT part of `/api/v1/studies`: that response is hard-cached for
 * six hours and read by the shipped mobile app, so folding the prose into it
 * would balloon a payload the app cannot use. It also keeps the authored text
 * out of the client bundle - `lib/data/study-lessons` is server-only, while
 * `lib/data/curated-studies` is what the catalogue imports.
 *
 * The commentary is resolved here rather than in the browser so the "type
 * uitleg" setting cannot be talked out of by a client that forgets to send it.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const auth = await requireUser(req);
    const { id, day } = await params;

    const lessonDay = Number(day);
    if (!Number.isInteger(lessonDay)) {
      return errorV1('INVALID_FIELDS', 400, 'Ongeldige lesdag');
    }

    const study = findStudy(id);
    if (!study) return errorV1('NOT_FOUND', 404, 'Onbekende studie');

    const lesson = findLesson(study, lessonDay);
    if (!lesson) return errorV1('NOT_FOUND', 404, 'Onbekende les');

    const content = getLessonContent(id, lessonDay);
    const enrollment = await getEnrollment(auth.id, id);
    const passage = resolvePassage(lesson, content);

    return jsonV1({
      study: { id: study.id, title: study.title, lessonsTotal: study.lessons.length },
      lesson: {
        day: lesson.day,
        title: lesson.title,
        estimatedMinutes: lesson.estimatedMinutes ?? 12,
      },
      steps: resolveSteps(lesson, content),
      passage,
      translation: enrollment?.translation ?? study.startVersion,
      commentaryId: resolveCommentaryId({
        enrollmentCommentary: enrollment?.commentary,
        depth: enrollment?.depth,
      }),
      content: {
        intro: content?.intro ?? null,
        readingCue: content?.word?.readingCue ?? null,
        depth: content?.depth ?? null,
        reflection: {
          // Falls back to the lesson's legacy `focus` field, so a lesson with
          // no authored reflection still asks something real.
          question: resolveReflectionQuestion(lesson, content),
          prompts: content?.reflection?.prompts ?? [],
          placeholder: content?.reflection?.placeholder ?? null,
        },
        quiz: {
          enabled: content?.quiz?.enabled !== false,
          questionCount: content?.quiz?.questionCount ?? 5,
        },
      },
      nextLessonDay: nextLessonDay(study, lessonDay),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
