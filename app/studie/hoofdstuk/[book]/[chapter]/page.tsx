import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../../lib/authOptions';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import StudyLessonState from '../../../../../models/StudyLessonState.js';
import StudyProgress from '../../../../../models/StudyProgress.js';
import { getLessonContent } from '../../../../../lib/data/study-lessons';
import { getVersions } from '../../../../../lib/local-data';
import { isStepKey, resolveCommentaryId, resolveSteps, type StepKey } from '../../../../../lib/studyFlow';
import { getEnrollment } from '../../../../../lib/studyEnrollmentService';
import {
  chapterStudyContext,
  chapterStudyLesson,
  readerChapterHref,
  resolveChapterStudy,
  safeReturnPath,
} from '../../../../../lib/chapterStudy';
import {
  buildLessonPayload,
  buildLessonState,
  EMPTY_LESSON_STATE,
  type StoredLessonState,
} from '../../../../../lib/lessonPayload';
import StudyFlowShell from '../../../../../components/study/flow/StudyFlowShell';
import { generatePageMetadata } from '../../../../../lib/pageMetadata';

export const dynamic = 'force-dynamic';

/** Like every lesson page: personal, never indexed. */
export const metadata = generatePageMetadata('study');

interface PageProps {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{ stap?: string; vertaling?: string; van?: string }>;
}

/**
 * One chapter, studied on its own ("Bestudeer dit hoofdstuk").
 *
 * This is lesson <chapter> of the book's existing study (see
 * lib/chapterStudy.ts), rendered in the same immersive flow as any lesson but
 * WITHOUT requiring or creating an enrollment - the lesson page proper sends a
 * reader who is not enrolled back to the study page, this one does not. The
 * shell runs in chapter mode: prev/next chapter instead of the lesson outline,
 * the way out goes back to the reader, and every write carries
 * `entry: 'chapter'` so the resume cursor of a followed study is never moved.
 *
 * An unknown book or chapter goes to /studies. A guest gets the lesson the way
 * the guest lesson page builds it: study defaults, nothing read from or written
 * to the database.
 */
export default async function ChapterStudyPage({ params, searchParams }: PageProps) {
  const { book, chapter } = await params;
  const { stap, vertaling, van } = await searchParams;

  const target = resolveChapterStudy(book, Number(chapter));
  const resolved = target ? chapterStudyLesson(target) : null;
  if (!target || !resolved) redirect('/studies');
  const { study, lesson } = resolved;

  const session = await getServerSession(authOptions);
  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );
  const fromUrlVersion =
    vertaling && versions.some((version) => version.id === vertaling) ? vertaling : null;

  const steps = resolveSteps(lesson, getLessonContent(study.id, lesson.day));
  const urlStep = isStepKey(stap) && steps.includes(stap) ? (stap as StepKey) : null;
  const context = chapterStudyContext(target);

  if (!session?.user?.email) {
    const translation = fromUrlVersion ?? study.startVersion;
    const initialStep = urlStep ?? steps[0];
    return (
      <StudyFlowShell
        guest
        lesson={buildLessonPayload({
          study,
          lesson,
          translation,
          translations: versions,
          commentaryId: resolveCommentaryId({ enrollmentCommentary: null, userPreference: null }),
          completedDays: new Set<number>(),
        })}
        initialState={{ ...EMPTY_LESSON_STATE, currentStep: initialStep }}
        initialStep={initialStep}
        chapterMode={{
          context,
          enrolled: false,
          exitHref: safeReturnPath(van) ?? readerChapterHref(target.book, target.chapter, translation),
        }}
      />
    );
  }

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email })
    .select('_id preferences.commentary')
    .lean<{ _id: unknown; preferences?: { commentary?: string } }>();
  if (!user) redirect('/inloggen');
  const userId = String(user._id);

  // Read only. An enrollment in the book study lends its translation and
  // commentary; its absence is fine and nothing is created.
  const enrollment = await getEnrollment(userId, context.followStudy.id);
  const settings = context.followStudy.id === study.id ? enrollment : null;

  const completedDays = new Set(
    ((await StudyProgress.distinct('lessonDay', { userId, studyId: study.id })) as (number | null)[]).filter(
      (day): day is number => day != null,
    ),
  );
  const state = await StudyLessonState.findOne({
    userId,
    studyId: study.id,
    lessonDay: lesson.day,
  }).lean<StoredLessonState>();

  const fromState =
    state?.currentStep && isStepKey(state.currentStep) && steps.includes(state.currentStep)
      ? (state.currentStep as StepKey)
      : null;
  const initialStep: StepKey = urlStep ?? fromState ?? steps[0];

  const translation = fromUrlVersion ?? settings?.translation ?? study.startVersion;

  return (
    <StudyFlowShell
      lesson={buildLessonPayload({
        study,
        lesson,
        translation,
        translations: versions,
        commentaryId: resolveCommentaryId({
          enrollmentCommentary: settings?.commentary,
          userPreference: user.preferences?.commentary ?? null,
        }),
        completedDays,
      })}
      initialState={buildLessonState(state, steps[0])}
      initialStep={initialStep}
      chapterMode={{
        context,
        enrolled: !!enrollment,
        exitHref: safeReturnPath(van) ?? readerChapterHref(target.book, target.chapter, translation),
      }}
    />
  );
}
