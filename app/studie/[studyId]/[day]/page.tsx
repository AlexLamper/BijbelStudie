import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../lib/authOptions';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import StudyLessonState from '../../../../models/StudyLessonState.js';
import { getLessonContent } from '../../../../lib/data/study-lessons';
import { CHAPTER_COUNTS } from '../../../../lib/data/bible-chapter-counts';
import {
  findLesson,
  isStepKey,
  nextLessonDay,
  resolveCommentaryId,
  resolvePassage,
  resolveReflectionQuestion,
  resolveSteps,
  type StepKey,
} from '../../../../lib/studyFlow';
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
  searchParams: Promise<{ stap?: string }>;
}

/**
 * One lesson of a guided study.
 *
 * Everything is resolved on the server - authored prose, the passage, which
 * commentary the depth setting implies - so the client bundle never carries the
 * study content and a client cannot ask for a passage the lesson is not about.
 */
export default async function StudyLessonPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/inloggen');

  const { studyId, day } = await params;
  const { stap } = await searchParams;

  const lessonDay = Number(day);
  const study = findStudy(studyId);
  if (!study || !Number.isInteger(lessonDay)) redirect('/studies');

  const lesson = findLesson(study, lessonDay);
  if (!lesson) redirect(`/studies/${studyId}`);

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

  const content = getLessonContent(studyId, lessonDay);
  const steps = resolveSteps(lesson, content);
  const passage = resolvePassage(lesson, content);

  const state = await StudyLessonState.findOne({ userId, studyId, lessonDay }).lean<{
    stepsCompleted?: string[];
    currentStep?: string;
    reflection?: { text?: string; updatedAt?: Date | null; noteId?: unknown };
    quiz?: { score?: number | null; total?: number | null; attempts?: number };
    completedAt?: Date | null;
  }>();

  // The URL wins when it names a real step, so a shared or refreshed link lands
  // where it says; otherwise resume where the reader left off.
  const fromUrl = isStepKey(stap) && steps.includes(stap) ? (stap as StepKey) : null;
  const fromState =
    state?.currentStep && isStepKey(state.currentStep) && steps.includes(state.currentStep)
      ? (state.currentStep as StepKey)
      : null;
  const initialStep: StepKey = fromUrl ?? fromState ?? steps[0];

  const payload: LessonPayload = {
    study: { id: study.id, title: study.title, lessonsTotal: study.lessons.length },
    lesson: {
      day: lesson.day,
      title: lesson.title,
      estimatedMinutes: lesson.estimatedMinutes ?? 12,
    },
    steps,
    passage,
    translation: enrollment.translation ?? study.startVersion,
    commentaryId: resolveCommentaryId({
      enrollmentCommentary: enrollment.commentary,
      depth: enrollment.depth,
      userPreference: user.preferences?.commentary ?? null,
    }),
    content: {
      intro: content?.intro ?? null,
      readingCue: content?.word?.readingCue ?? null,
      depth: content?.depth ?? null,
      reflection: {
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
  };

  const initialState: LessonStatePayload = {
    stepsCompleted: state?.stepsCompleted ?? [],
    currentStep: state?.currentStep ?? steps[0],
    reflection: {
      text: state?.reflection?.text ?? '',
      updatedAt: state?.reflection?.updatedAt ? state.reflection.updatedAt.toISOString() : null,
      noteId: state?.reflection?.noteId ? String(state.reflection.noteId) : null,
    },
    quiz: {
      score: state?.quiz?.score ?? null,
      total: state?.quiz?.total ?? null,
      attempts: state?.quiz?.attempts ?? 0,
    },
    completedAt: state?.completedAt ? state.completedAt.toISOString() : null,
  };

  return (
    <StudyFlowShell
      lesson={payload}
      initialState={initialState}
      initialStep={initialStep}
      maxChapter={CHAPTER_COUNTS[passage.book] ?? passage.chapter}
    />
  );
}
