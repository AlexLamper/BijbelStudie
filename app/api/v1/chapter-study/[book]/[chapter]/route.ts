import { resolveUser } from '../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../../lib/apiV1';
import connectMongoDB from '../../../../../../lib/mongodb';
import User from '../../../../../../models/User';
import StudyProgress from '../../../../../../models/StudyProgress.js';
import { resolveCommentaryId } from '../../../../../../lib/studyFlow';
import { getEnrollment } from '../../../../../../lib/studyEnrollmentService';
import {
  chapterStudyContext,
  chapterStudyLesson,
  resolveChapterStudy,
} from '../../../../../../lib/chapterStudy';
import { buildLessonCore } from '../../../../../../lib/lessonPayload';
import { isMobileAllowed } from '../../../../../../lib/mobileLicensing';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ book: string; chapter: string }>;
}

export async function OPTIONS() {
  return corsPreflight();
}

/** The floor every client may show; see DEFAULT_COMMENTARY in lib/studyFlow. */
const MOBILE_FALLBACK_COMMENTARY = 'matthew_henry_nl';

/**
 * True for the Flutter app: a bearer token, or `?client=app` for a request
 * made before sign-in. The website sends neither.
 */
function isMobileRequest(req: Request, url: URL): boolean {
  const header = req.headers.get('authorization') ?? '';
  if (header.toLowerCase().startsWith('bearer ') && header.slice(7).trim()) return true;
  return url.searchParams.get('client') === 'app';
}

/**
 * GET /api/v1/chapter-study/:book/:chapter - one chapter, studied on its own.
 *
 * `:book` is the book slug (any spelling lib/chapterStudy `findBook` accepts
 * works). No login required: the lesson is the same authored text and public
 * passage a guest gets on the web. Signed in, the commentary follows the
 * reader's preference and an enrollment in the book study, and `enrolled` /
 * `completed` say where they stand. Nothing is written - opening a chapter
 * never creates an enrollment.
 *
 * For the app the commentary is filtered through lib/mobileLicensing: a
 * preference for a source the app may not show falls back to Matthew Henry.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const url = new URL(req.url);
    const { book, chapter } = await params;

    const target = resolveChapterStudy(book, Number(chapter));
    const resolved = target ? chapterStudyLesson(target) : null;
    if (!target || !resolved) return errorV1('NOT_FOUND', 404, 'Onbekend hoofdstuk');
    const { study, lesson } = resolved;
    const context = chapterStudyContext(target);

    const auth = await resolveUser(req);

    let userPreference: string | null = null;
    let enrollment: Awaited<ReturnType<typeof getEnrollment>> = null;
    let completed = false;

    if (auth) {
      await connectMongoDB();
      const user = await User.findById(auth.id)
        .select('preferences.commentary')
        .lean<{ preferences?: { commentary?: string } }>();
      userPreference = user?.preferences?.commentary ?? null;
      enrollment = await getEnrollment(auth.id, context.followStudy.id);
      completed = !!(await StudyProgress.exists({
        userId: auth.id,
        studyId: study.id,
        lessonDay: lesson.day,
      }));
    }

    const settings = enrollment && context.followStudy.id === study.id ? enrollment : null;
    let commentaryId = resolveCommentaryId({
      enrollmentCommentary: settings?.commentary,
      userPreference,
    });
    let translation = settings?.translation ?? study.startVersion;
    if (isMobileRequest(req, url)) {
      if (!isMobileAllowed('commentary', commentaryId)) commentaryId = MOBILE_FALLBACK_COMMENTARY;
      if (!isMobileAllowed('bible', translation)) translation = 'statenvertaling';
    }

    return jsonV1({
      ...context,
      enrolled: !!enrollment,
      completed,
      lesson: buildLessonCore({
        study,
        lesson,
        translation,
        commentaryId,
        // A single chapter, opened on its own: the context step always shows.
        standalone: true,
      }),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
