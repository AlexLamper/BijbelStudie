'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

import StudyStepRail, { STEP_LABELS } from './StudyStepRail';
import StepIntro from './StepIntro';
import StepWord from './StepWord';
import StepDepth from './StepDepth';
import StepReflection from './StepReflection';
import StepQuiz from './StepQuiz';
import LessonCompleteCard, { type CompletionSummary } from './LessonCompleteCard';
import AiDock from './AiDock';
import { useReadingPreferences } from '../../../hooks/useReadingPreferences';
import {
  isStepKey,
  nextStep as advance,
  previousStep as goBack,
  stepPosition,
  type StepKey,
} from '../../../lib/studyFlow';

const TEAL = '#0D9488';

export interface LessonPayload {
  study: { id: string; title: string; lessonsTotal: number };
  lesson: { day: number; title: string; estimatedMinutes: number };
  steps: StepKey[];
  passage: {
    book: string;
    chapter: number;
    verseRange?: string;
    verseStart: number | null;
    verseEnd: number | null;
  };
  translation: string;
  commentaryId: string;
  content: {
    intro: { headline: string; body: string[]; watchFor?: string[] } | null;
    readingCue: string | null;
    depth: { body?: string[]; terms?: { term: string; meaning: string }[]; showMedia?: boolean } | null;
    reflection: { question: string; prompts: string[]; placeholder: string | null };
    quiz: { enabled: boolean; questionCount: number };
  };
  nextLessonDay: number | null;
}

export interface LessonStatePayload {
  stepsCompleted: string[];
  currentStep: string;
  reflection: { text: string; updatedAt: string | null; noteId: string | null };
  quiz: { score: number | null; total: number | null; attempts: number };
  completedAt: string | null;
}

/**
 * The step chrome around a lesson: progress rail, navigation, autosave, AI dock.
 *
 * Every step transition is persisted, so the resume cursor in StudyEnrollment
 * is never more than one step behind what the reader actually did. That is the
 * whole reason this feature exists - the previous design kept it in
 * sessionStorage, and closing the tab threw the study away.
 */
export default function StudyFlowShell({
  lesson,
  initialState,
  initialStep,
  maxChapter,
}: {
  lesson: LessonPayload;
  initialState: LessonStatePayload;
  initialStep: StepKey;
  maxChapter: number;
}) {
  const router = useRouter();
  const { preferences } = useReadingPreferences();

  const [step, setStep] = useState<StepKey>(initialStep);
  const [completed, setCompleted] = useState<string[]>(initialState.stepsCompleted);
  const [quizScore, setQuizScore] = useState<number | null>(initialState.quiz.score);
  const [quizTotal, setQuizTotal] = useState<number | null>(initialState.quiz.total);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const [finishing, setFinishing] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);

  const { steps } = lesson;
  const position = stepPosition(steps, step);

  /** One writer for every lesson-state change the flow makes. */
  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch('/api/v1/study-lesson-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyId: lesson.study.id,
          lessonDay: lesson.lesson.day,
          ...body,
        }),
      });
      if (!res.ok) return null;
      return res.json();
    },
    [lesson.study.id, lesson.lesson.day],
  );

  // Keep the URL in step with the flow, so a refresh or a shared link lands in
  // the same place. replace, not push: the browser Back button should leave the
  // lesson rather than walk back through five steps.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('stap') !== step) {
      url.searchParams.set('stap', step);
      window.history.replaceState(null, '', url.toString());
    }
  }, [step]);

  const goTo = useCallback(
    (next: StepKey) => {
      setStep(next);
      void patch({ currentStep: next });
    },
    [patch],
  );

  const onNext = useCallback(async () => {
    setCompleted((current) => (current.includes(step) ? current : [...current, step]));

    const next = advance(steps, step);
    if (next !== 'done') {
      await patch({ completeStep: step, currentStep: next });
      setStep(next);
      return;
    }

    setFinishing(true);
    const data = await patch({ completeStep: step, complete: true });
    setFinishing(false);

    const completion = data?.completion;
    setSummary({
      xpAwarded: completion?.xp?.awarded ?? 0,
      levelledUp: !!completion?.xp?.levelledUp,
      newBadges: completion?.xp?.newBadges ?? [],
      studyCompleted: !!completion?.studyCompleted,
      noteId: completion?.noteId ?? null,
      nextLessonDay: completion?.nextLessonDay ?? lesson.nextLessonDay,
    });
  }, [steps, step, patch, lesson.nextLessonDay]);

  const onPrevious = useCallback(() => {
    const previous = goBack(steps, step);
    if (previous) goTo(previous);
  }, [steps, step, goTo]);

  const saveReflection = useCallback(
    async (text: string) => {
      const data = await patch({ reflectionText: text });
      return data !== null;
    },
    [patch],
  );

  const body = useMemo(() => {
    switch (step) {
      case 'intro':
        return lesson.content.intro ? (
          <StepIntro intro={lesson.content.intro} lessonTitle={lesson.lesson.title} />
        ) : null;
      case 'word':
        return (
          <StepWord
            book={lesson.passage.book}
            chapter={lesson.passage.chapter}
            version={lesson.translation}
            maxChapter={maxChapter}
            verseStart={lesson.passage.verseStart}
            verseEnd={lesson.passage.verseEnd}
            readingCue={lesson.content.readingCue}
            preferences={preferences}
          />
        );
      case 'depth':
        return (
          <StepDepth
            book={lesson.passage.book}
            chapter={lesson.passage.chapter}
            commentaryId={lesson.commentaryId}
            depth={lesson.content.depth}
            preferences={preferences}
            t={(key) => key}
          />
        );
      case 'reflection':
        return (
          <StepReflection
            studyId={lesson.study.id}
            lessonDay={lesson.lesson.day}
            reflection={lesson.content.reflection}
            initialText={initialState.reflection.text}
            serverUpdatedAt={initialState.reflection.updatedAt}
            onSave={saveReflection}
          />
        );
      case 'quiz':
        return (
          <StepQuiz
            studyId={lesson.study.id}
            lessonDay={lesson.lesson.day}
            previousScore={quizScore}
            previousTotal={quizTotal}
            onAnswered={(score, total) => {
              setQuizScore(score);
              setQuizTotal(total);
            }}
          />
        );
      default:
        return null;
    }
  }, [step, lesson, preferences, maxChapter, initialState, saveReflection, quizScore, quizTotal]);

  if (summary) {
    return (
      <LessonCompleteCard
        studyId={lesson.study.id}
        studyTitle={lesson.study.title}
        lessonTitle={lesson.lesson.title}
        summary={summary}
        quizScore={quizScore}
        quizTotal={quizTotal}
        onContinue={() => {
          if (summary.nextLessonDay != null) {
            router.push(`/studie/${lesson.study.id}/${summary.nextLessonDay}`);
          }
        }}
      />
    );
  }

  const isLast = position === steps.length;

  return (
    <div className="h-full flex flex-col">
      <header className="flex-none border-b border-border bg-background">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href={`/studies/${lesson.study.id}`}
            aria-label="Terug naar de studie"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-secondary text-muted-foreground no-underline flex-none"
          >
            <X size={17} />
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-semibold text-foreground truncate">{lesson.lesson.title}</p>
            <p className="text-[11px] text-muted-foreground">
              Les {lesson.lesson.day} van {lesson.study.lessonsTotal} &middot; stap {position} van{' '}
              {steps.length}
            </p>
          </div>

          <div className="w-8 flex-none" />
        </div>

        <div className="px-4 sm:px-6 pb-3 flex justify-center">
          <StudyStepRail steps={steps} current={step} completed={completed} onSelect={goTo} />
        </div>
      </header>

      {/* The dock shrinks this column on lg rather than covering it. */}
      <div className={['flex-1 min-h-0 overflow-y-auto transition-all', aiOpen ? 'lg:mr-[420px]' : ''].join(' ')}>
        {body}
      </div>

      <footer
        className={[
          'flex-none border-t border-border bg-background px-4 sm:px-6 py-3 flex items-center justify-between gap-3 transition-all',
          aiOpen ? 'lg:mr-[420px]' : '',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={onPrevious}
          disabled={position <= 1}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-foreground disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-secondary"
        >
          <ArrowLeft size={15} /> Vorige
        </button>

        <span className="hidden sm:block text-xs text-muted-foreground">{STEP_LABELS[step]}</span>

        <button
          type="button"
          onClick={() => void onNext()}
          disabled={finishing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: TEAL }}
        >
          {finishing ? 'Afronden...' : isLast ? 'Les afronden' : 'Volgende'}
          {!finishing && <ArrowRight size={15} />}
        </button>
      </footer>

      <AiDock
        open={aiOpen}
        onOpenChange={setAiOpen}
        book={lesson.passage.book}
        chapter={lesson.passage.chapter}
        version={lesson.translation}
        step={isStepKey(step) ? step : 'word'}
        draft={aiDraft}
        onDraftConsumed={() => setAiDraft(null)}
      />
    </div>
  );
}
