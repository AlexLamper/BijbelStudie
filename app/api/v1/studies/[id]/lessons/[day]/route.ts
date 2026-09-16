import { requireUser } from '../../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../../../lib/apiV1';
import { findLesson, resolveCommentaryId } from '../../../../../../../lib/studyFlow';
import { findStudy, getEnrollment } from '../../../../../../../lib/studyEnrollmentService';
import { buildLessonCore } from '../../../../../../../lib/lessonPayload';

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
 *
 * The payload itself is built by lib/lessonPayload, shared with the web pages
 * and the single-chapter study endpoint.
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

    const enrollment = await getEnrollment(auth.id, id);

    return jsonV1(
      buildLessonCore({
        study,
        lesson,
        translation: enrollment?.translation ?? study.startVersion,
        commentaryId: resolveCommentaryId({ enrollmentCommentary: enrollment?.commentary }),
      }),
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
