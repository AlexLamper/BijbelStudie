'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ListChecks, Lock, Sparkles, X } from 'lucide-react';

import StudyStepRail, { STEP_LABELS } from './StudyStepRail';
import StepIntro from './StepIntro';
import StepWord from './StepWord';
import StepDepth from './StepDepth';
import StepReflection from './StepReflection';
import StepQuiz from './StepQuiz';
import LessonCompleteCard, { type CompletionSummary } from './LessonCompleteCard';
import AiDock from './AiDock';
import StudyExitGuard from './StudyExitGuard';
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
  /** Every lesson of this study, for the navigator in the header. */
  outline: { day: number; title: string; reference: string; completed: boolean }[];
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
 *
 * The AI trigger sits in the header. It used to float above the bottom-right
 * corner, directly on top of the "Volgende" button, which made the quiz step
 * impossible to leave.
 */
export default function StudyFlowShell({
  lesson,
  initialState,
  initialStep,
}: {
  lesson: LessonPayload;
  initialState: LessonStatePayload;
  initialStep: StepKey;
}) {
  const router = useRouter();
  const { preferences, updatePreferences } = useReadingPreferences();

  const [step, setStep] = useState<StepKey>(initialStep);
  const [completed, setCompleted] = useState<string[]>(initialState.stepsCompleted);
  const [quizScore, setQuizScore] = useState<number | null>(initialState.quiz.score);
  const [quizTotal, setQuizTotal] = useState<number | null>(initialState.quiz.total);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const [finishing, setFinishing] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const loggedActivityKeyRef = useRef<string | null>(null);

  const { steps } = lesson;
  const position = stepPosition(steps, step);
  const passageReference = `${lesson.passage.book} ${lesson.passage.chapter}${
    lesson.passage.verseRange ? `:${lesson.passage.verseRange}` : ''
  }`;

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

  // The dashboard's weekly strip is backed by ReadingSession documents. The old
  // /lezen page logs these through useBibleData, but the new guided /studie flow
  // bypasses that hook; without this, studying a lesson shows as "Geen activiteit".
  useEffect(() => {
    const key = `${lesson.study.id}:${lesson.lesson.day}:${lesson.passage.book}:${lesson.passage.chapter}`;
    if (loggedActivityKeyRef.current === key) return;
    loggedActivityKeyRef.current = key;
    fetch('/api/user/log-reading', { method: 'POST' }).catch(() => {});
  }, [lesson]);

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

  const askAi = useCallback((questionText: string) => {
    setAiQuestion(questionText);
    setAiOpen(true);
  }, []);

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
            verseStart={lesson.passage.verseStart}
            verseEnd={lesson.passage.verseEnd}
            readingCue={lesson.content.readingCue}
            preferences={preferences}
            onUpdatePreferences={updatePreferences}
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
            onAskAi={askAi}
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
  }, [
    step,
    lesson,
    preferences,
    updatePreferences,
    initialState,
    saveReflection,
    quizScore,
    quizTotal,
    askAi,
  ]);

  if (summary) {
    const alreadyCounted = lesson.outline.some(
      (entry) => entry.day === lesson.lesson.day && entry.completed,
    );
    // `outline` was built before this lesson was finished, so the lesson just
    // completed has to be added - unless it was a repeat, which must not inflate
    // the count past the total.
    const lessonsCompleted =
      lesson.outline.filter((entry) => entry.completed).length + (alreadyCounted ? 0 : 1);

    const next =
      summary.nextLessonDay != null
        ? (lesson.outline.find((entry) => entry.day === summary.nextLessonDay) ?? null)
        : null;

    return (
      <LessonCompleteCard
        studyId={lesson.study.id}
        studyTitle={lesson.study.title}
        lessonTitle={lesson.lesson.title}
        lessonDay={lesson.lesson.day}
        lessonsTotal={lesson.study.lessonsTotal}
        lessonsCompleted={lessonsCompleted}
        passageReference={passageReference}
        minutes={lesson.lesson.estimatedMinutes}
        steps={steps}
        summary={summary}
        quizScore={quizScore}
        quizTotal={quizTotal}
        nextLesson={
          next ? { day: next.day, title: next.title, reference: next.reference } : null
        }
        onContinue={() => {
          if (summary.nextLessonDay != null) {
            router.push(`/studie/${lesson.study.id}/${summary.nextLessonDay}`);
          }
        }}
      />
    );
  }

  const isLast = position === steps.length;
  const canGoBack = position > 1;

  return (
    <div className="h-full flex flex-col">
      {/* Asks before an in-app link, a refresh or the Back button pulls the
          reader out of a lesson they are partway through. */}
      <StudyExitGuard enabled={!finishing} />

      <header className="flex-none border-b border-border bg-background">
        <div className="px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          <Link
            href={`/studies/${lesson.study.id}`}
            aria-label="Terug naar de studie"
            title="Terug naar de studie"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-secondary text-muted-foreground no-underline flex-none"
          >
            <X size={17} />
          </Link>

          {/* Lesson navigator. What lessons there are and which are done was
              previously only visible on the detail page, one navigation away. */}
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setOutlineOpen((open) => !open)}
              aria-expanded={outlineOpen}
              className="w-full min-w-0 flex flex-col items-center rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-1.5 max-w-full">
                <span className="text-xs font-semibold text-foreground truncate">
                  {lesson.lesson.title}
                </span>
                <ListChecks size={12} className="flex-none text-muted-foreground" />
              </span>
              <span className="text-[11px] text-muted-foreground">
                Les {lesson.lesson.day} van {lesson.study.lessonsTotal} &middot; stap {position} van{' '}
                {steps.length}
              </span>
            </button>

            {outlineOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setOutlineOpen(false)} aria-hidden />
                <div className="absolute z-40 top-full mt-1 left-1/2 -translate-x-1/2 w-[min(92vw,340px)] max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card shadow-xl p-1.5">
                  <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
                    {lesson.study.title}
                  </p>
                  {lesson.outline.map((entry) => {
                    const isCurrent = entry.day === lesson.lesson.day;
                    // Only what you have done, and the lesson you are on. Jumping
                    // ahead to lesson 9 of a book study skips its build-up.
                    const reachable = entry.completed || entry.day <= lesson.lesson.day;
                    return (
                      <button
                        key={entry.day}
                        type="button"
                        disabled={!reachable}
                        onClick={() => {
                          setOutlineOpen(false);
                          if (!isCurrent) router.push(`/studie/${lesson.study.id}/${entry.day}`);
                        }}
                        className={[
                          'w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                          reachable
                            ? 'hover:bg-gray-50 dark:hover:bg-secondary'
                            : 'opacity-50 cursor-default',
                        ].join(' ')}
                        style={isCurrent ? { backgroundColor: 'rgba(13,148,136,0.08)' } : undefined}
                      >
                        <span
                          className={[
                            'h-5 w-5 flex-none rounded-full flex items-center justify-center text-[10px] font-bold border',
                            entry.completed
                              ? 'border-transparent text-white'
                              : isCurrent
                                ? 'border-transparent'
                                : 'border-gray-200 dark:border-border text-gray-400 dark:text-muted-foreground',
                          ].join(' ')}
                          style={
                            entry.completed
                              ? { backgroundColor: TEAL }
                              : isCurrent
                                ? { backgroundColor: 'rgba(13,148,136,0.15)', color: TEAL }
                                : undefined
                          }
                        >
                          {entry.completed ? <Check size={11} /> : entry.day}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-medium text-foreground truncate">
                            {entry.title}
                          </span>
                          <span className="block text-[11px] text-gray-400 dark:text-muted-foreground truncate">
                            {entry.reference}
                          </span>
                        </span>
                        {!reachable && <Lock size={11} className="flex-none text-gray-400" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAiOpen((open) => !open)}
            aria-pressed={aiOpen}
            data-track="ai_open"
            title="AI-assistent"
            className={[
              'flex-none inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-lg text-[12px] font-semibold transition-colors border',
              aiOpen
                ? 'text-white border-transparent'
                : 'border-gray-200 dark:border-border text-foreground hover:bg-gray-50 dark:hover:bg-secondary',
            ].join(' ')}
            style={aiOpen ? { backgroundColor: TEAL } : undefined}
          >
            <Sparkles size={14} style={aiOpen ? undefined : { color: TEAL }} />
            <span className="hidden sm:inline">AI</span>
          </button>
        </div>

        {/* Not centred any more - the rail is a full-width progress bar now, so
            it spans the header rather than sitting as an island in the middle. */}
        <div className="px-4 sm:px-6 pb-3">
          <StudyStepRail steps={steps} current={step} completed={completed} onSelect={goTo} />
        </div>
      </header>

      {/* `relative` so the AI dock can take the right half of THIS box.
          The dock is a child of the step body, not a sibling of the whole
          screen: it used to be a viewport-height drawer at `right-0` that
          pushed the header, body and footer left by 420px, which reflowed the
          entire lesson every time the assistant was toggled. It now rises into
          the space the supporting panels (Toelichting / Beeld / Grondtekst /
          Notities) occupy, so the passage on the left never moves.
          `overflow-hidden` also clips the panel's slide-up. */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {body}

        {/* Sibling of `body`, and stays at this position in the tree across
            steps, so the conversation survives moving between them. */}
        <AiDock
          open={aiOpen}
          onOpenChange={setAiOpen}
          book={lesson.passage.book}
          chapter={lesson.passage.chapter}
          version={lesson.translation}
          step={isStepKey(step) ? step : 'word'}
          draft={aiDraft}
          onDraftConsumed={() => setAiDraft(null)}
          question={aiQuestion}
          onQuestionConsumed={() => setAiQuestion(null)}
        />
      </div>

      <footer className="flex-none border-t border-border bg-background px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* White rather than transparent: on the previous grey-on-grey button the
            only thing separating "Vorige" from the footer was a hairline. */}
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoBack}
          data-track="study_step_previous"
          className={[
            'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors',
            canGoBack
              ? 'bg-white dark:bg-card border-gray-300 dark:border-border text-foreground shadow-sm hover:bg-gray-50 dark:hover:bg-secondary'
              : 'bg-transparent border-transparent text-transparent pointer-events-none',
          ].join(' ')}
        >
          <ArrowLeft size={15} /> Vorige
        </button>

        <span className="hidden sm:block text-xs text-muted-foreground">{STEP_LABELS[step]}</span>

        <button
          type="button"
          onClick={() => void onNext()}
          disabled={finishing}
          data-track={isLast ? "study_lesson_complete" : "study_step_next"}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: TEAL }}
        >
          {finishing ? 'Afronden...' : isLast ? 'Les afronden' : 'Volgende'}
          {!finishing && <ArrowRight size={15} />}
        </button>
      </footer>

    </div>
  );
}
