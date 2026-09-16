import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../lib/authOptions';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import StudyLessonState from '../../../../models/StudyLessonState.js';
import StudyProgress from '../../../../models/StudyProgress.js';
import { getLessonContent } from '../../../../lib/data/study-lessons';
import { getVersions } from '../../../../lib/local-data';
import {
  findLesson,
  isStepKey,
  resolveCommentaryId,
  resolveSteps,
  type StepKey,
} from '../../../../lib/studyFlow';
import {
  buildLessonPayload,
  buildLessonState,
  EMPTY_LESSON_STATE,
  type StoredLessonState,
} from '../../../../lib/lessonPayload';
import { findStudy, getEnrollment } from '../../../../lib/studyEnrollmentService';
import StudyFlowShell, {
  type LessonPayload,
  type LessonStatePayload,
} from '../../../../components/study/flow/StudyFlowShell';
import { generatePageMetadata } from '../../../../lib/pageMetadata';

export const dynamic = 'force-dynamic';

/** Behind auth, so it must never be indexed. */
export const metadata = generatePageMetadata('study');

interface PageProps {
  params: Promise<{ studyId: string; day: string }>;
  searchParams: Promise<{ stap?: string; vertaling?: string }>;
}

/**
 * One lesson of a guided study.
 *
 * Everything is resolved on the server - authored prose, the passage, which
 * commentary the depth setting implies - so the client bundle never carries the
 * study content and a client cannot ask for a passage the lesson is not about.
 *
 * A GUEST MAY OPEN IT.
 *
 * This page used to `redirect('/inloggen')` without a session, which meant a
 * visitor could browse every study and open none. The lesson content is the
 * same authored text and the same public passage a signed-in reader gets, so
 * there is nothing here to protect: a guest gets the lesson built from the
 * study's own defaults (its start translation, the default commentary, an
 * empty state) and no database is touched for them. The flow keeps their
 * progress in the browser and asks for an account only at the end, when there
 * is something to save - see StudyFlowShell.
 */
export default async function StudyLessonPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  const { studyId, day } = await params;
  const { stap, vertaling } = await searchParams;

  const lessonDay = Number(day);
  const study = findStudy(studyId);
  if (!study || !Number.isInteger(lessonDay)) redirect('/studies');

  const lesson = findLesson(study, lessonDay);
  if (!lesson) redirect(`/studies/${studyId}`);

  if (!session?.user?.email) {
    return <GuestLesson study={study} lesson={lesson} stap={stap} vertaling={vertaling} />;
  }

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email })
    .select('_id preferences.commentary')
    .lean<{ _id: unknown; preferences?: { commentary?: string } }>();
  if (!user) redirect('/inloggen');

  const userId = String(user._id);

  // Not enrolled yet: the detail page is where a study is configured and
  // started, so send them there rather than silently enrolling them.
  const enrollment = await getEnrollment(userId, studyId);
  if (!enrollment) redirect(`/studies/${studyId}`);

  // Every translation the reader may switch to on the passage step. Resolved
  // here rather than fetched from the client: the list is static, and a select
  // that populates a second after the passage does reads as broken.
  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );

  const steps = resolveSteps(lesson, getLessonContent(studyId, lessonDay));

  // Which lessons are already done, for the navigator in the flow header. The
  // reader could previously only see that list by leaving the lesson.
  const completedDays = new Set(
    ((await StudyProgress.distinct('lessonDay', { userId, studyId })) as (number | null)[]).filter(
      (day): day is number => day != null,
    ),
  );

  const state = await StudyLessonState.findOne({ userId, studyId, lessonDay }).lean<StoredLessonState>();

  // The URL wins when it names a real step, so a shared or refreshed link lands
  // where it says; otherwise resume where the reader left off.
  const fromUrl = isStepKey(stap) && steps.includes(stap) ? (stap as StepKey) : null;
  const fromState =
    state?.currentStep && isStepKey(state.currentStep) && steps.includes(state.currentStep)
      ? (state.currentStep as StepKey)
      : null;
  const initialStep: StepKey = fromUrl ?? fromState ?? steps[0];

  const payload: LessonPayload = buildLessonPayload({
    study,
    lesson,
    translation: enrollment.translation ?? study.startVersion,
    translations: versions,
    commentaryId: resolveCommentaryId({
      enrollmentCommentary: enrollment.commentary,
      userPreference: user.preferences?.commentary ?? null,
    }),
    completedDays,
  });

  const initialState: LessonStatePayload = buildLessonState(state, steps[0]);

  return (
    <StudyFlowShell lesson={payload} initialState={initialState} initialStep={initialStep} />
  );
}

/**
 * The same lesson, for a visitor without an account.
 *
 * Built entirely from the study definition and the authored content - no User,
 * no enrollment, no StudyLessonState, no StudyProgress. The translation is the
 * study's own start version unless the study page handed one along in the URL
 * (`?vertaling=`, validated against the real list so an arbitrary id cannot be
 * asked for), and the commentary is whatever the default resolves to with no
 * preference on either side. The step comes from the URL or is the first;
 * anything the browser remembers is applied client-side by the shell.
 */
async function GuestLesson({
  study,
  lesson,
  stap,
  vertaling,
}: {
  study: NonNullable<ReturnType<typeof findStudy>>;
  lesson: NonNullable<ReturnType<typeof findLesson>>;
  stap?: string;
  vertaling?: string;
}) {
  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );
  const translation =
    vertaling && versions.some((version) => version.id === vertaling)
      ? vertaling
      : study.startVersion;

  const steps = resolveSteps(lesson, getLessonContent(study.id, lesson.day));
  const initialStep: StepKey =
    isStepKey(stap) && steps.includes(stap) ? (stap as StepKey) : steps[0];

  const payload: LessonPayload = buildLessonPayload({
    study,
    lesson,
    translation,
    translations: versions,
    commentaryId: resolveCommentaryId({ enrollmentCommentary: null, userPreference: null }),
    completedDays: new Set<number>(),
  });

  const initialState: LessonStatePayload = { ...EMPTY_LESSON_STATE, currentStep: initialStep };

  return (
    <StudyFlowShell lesson={payload} initialState={initialState} initialStep={initialStep} guest />
  );
}
