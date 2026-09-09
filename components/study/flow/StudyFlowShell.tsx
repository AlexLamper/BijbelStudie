'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ListChecks,
  Lock,
  Maximize2,
  Minimize2,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

import StudyStepRail, { STEP_LABELS } from './StudyStepRail';
import { FOCUS_RING, INK, INK_FAINT, INK_MUTED, RULE } from './lesson-layout';
import { EYEBROW, PANEL_DEEP, SCENE_BG, TEAL_DEEP, TEAL_ON_DARK } from '../../scene/tokens';
import StepIntro from './StepIntro';
import StepWord from './StepWord';
import StepDepth from './StepDepth';
import StepReflection from './StepReflection';
import StepQuiz from './StepQuiz';
import LessonCompleteCard, { type CompletionSummary } from './LessonCompleteCard';
import { useLevensboom } from '../../../hooks/useLevensboom';
import AiDock from './AiDock';
import StudyExitGuard from './StudyExitGuard';
import StudySettingsMenu from './StudySettingsMenu';
import { useReadingPreferences } from '../../../hooks/useReadingPreferences';
import { playComplete, playSwipe } from '../../../lib/studySound';
import {
  isStepKey,
  nextStep as advance,
  previousStep as goBack,
  stepPosition,
  type StepKey,
} from '../../../lib/studyFlow';

/**
 * The brand, in the roles components/scene/tokens.ts defines for it.
 *
 * Every colour on this screen now comes from that file. The window no longer
 * answers the reader's light/dark setting, so teal as TYPE no longer needs a
 * class pair either: the ground under it is the scene's night in both themes,
 * and TEAL_ON_DARK (#2DD4BF, 10.1:1 on #0B1220) is the one legible shade there.
 * TEAL stays the fill that carries no type - the rail's bar, a dot, a check -
 * and TEAL_DEEP any solid fill with white type on it.
 */

/** localStorage key for the one-time "go full screen" offer. */
const FULLSCREEN_HINT_KEY = 'study:fullscreen-hint';
/** localStorage key for the sound toggle. Absent means on. */
const SOUND_KEY = 'study:sound';

/**
 * The step transition: one page sliding over another, both moving at once.
 *
 * The earlier version nudged the outgoing step 56px and faded it, with
 * `mode="wait"` holding the incoming one back until it had gone. That is a
 * crossfade with a lean, and it left a blank frame in the middle. This is the
 * real thing: the arriving step comes in from a full screen width away and the
 * leaving one parallaxes out at a third of that speed while dimming, so the new
 * page reads as sliding ON TOP of the old one rather than replacing it.
 *
 * The 3:1 speed difference is what sells it. Two layers moving at the same rate
 * look like a filmstrip; a slower back layer looks like depth.
 *
 * `custom` carries the direction - +1 forward through the lesson, -1 back - so
 * "Vorige" is its own movement rather than the forward one played in reverse,
 * and `zIndex` keeps the arriving page above the departing one either way.
 */
const stepVariants = {
  enter: (direction: number) => ({
    x: `${direction * 100}%`,
    opacity: 1,
    scale: 1,
    zIndex: 2,
  }),
  center: { x: '0%', opacity: 1, scale: 1, zIndex: 2 },
  exit: (direction: number) => ({
    x: `${direction * -32}%`,
    opacity: 0,
    scale: 0.97,
    zIndex: 1,
  }),
};

/** Reduced motion keeps the crossfade and drops every transform. */
const calmVariants = {
  enter: { opacity: 0, zIndex: 2 },
  center: { opacity: 1, zIndex: 2 },
  exit: { opacity: 0, zIndex: 1 },
};

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
  /** Everything the reader may switch the passage to on the Woord step. */
  translations: { id: string; name: string; language?: string }[];
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
  /** The translation last shown in this lesson; null means "use the study's". */
  viewTranslation: string | null;
  /** The Verdieping step's last open panel. */
  depthPanel: string | null;
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
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<StepKey>(initialStep);
  /** +1 forward, -1 back. Drives which way a step swipes in and out. */
  const [direction, setDirection] = useState(1);
  const [completed, setCompleted] = useState<string[]>(initialState.stepsCompleted);
  const [quizScore, setQuizScore] = useState<number | null>(initialState.quiz.score);
  const [quizTotal, setQuizTotal] = useState<number | null>(initialState.quiz.total);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  // The Levensboom applies the grant at once, so the navbar and the tree on
  // the completion card move without waiting for a refetch.
  const { applyXp } = useLevensboom();
  const [finishing, setFinishing] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /**
   * The translation actually on screen.
   *
   * Seeded from what this lesson was last read in, falling back to the
   * enrollment. Switching it writes `StudyLessonState.viewTranslation` and
   * deliberately NOT `StudyEnrollment.translation`: wanting to check a verse in
   * the NBG is not the same as deciding this study is an NBG study, and the
   * setting drives every future lesson plus the reminder mail.
   *
   * It lives here rather than in StepWord so the choice survives stepping away
   * to the commentary and back, and so the assistant quotes the text being read.
   */
  const [version, setVersion] = useState(initialState.viewTranslation ?? lesson.translation);
  /** The Verdieping step's right-hand panel, hoisted for the same reason. */
  const [depthPanel, setDepthPanel] = useState(initialState.depthPanel ?? 'media');
  /**
   * The reflection, mirrored out of the step.
   *
   * StepReflection is seeded once and remounts on every step change, so holding
   * the text only in there meant Reflectie -> Toetsing -> Reflectie came back to
   * an EMPTY box: the page-load snapshot was stale and the localStorage crash
   * buffer had already been cleared by the successful autosave. The text was
   * safe in Mongo, but a reader who retyped would overwrite it.
   */
  const [reflectionText, setReflectionText] = useState(initialState.reflection.text);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenHint, setFullscreenHint] = useState(false);
  /**
   * Sound on the step transition. On by default, and a ref alongside the state
   * so the navigation callbacks can read it without every one of them taking a
   * dependency on it and being rebuilt when it flips.
   */
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(true);
  /** Drag-to-advance is for fingers only; a mouse drag would eat text selection. */
  const [coarsePointer, setCoarsePointer] = useState(false);
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

  // Opening a lesson is what "where was I" means, so it has to be written the
  // moment the lesson opens - not on the first step transition. Jumping to
  // lesson 5 from the navigator and closing the tab used to leave the resume
  // cursor on lesson 3, and /studie sent the reader back there.
  //
  // Keyed on the lesson, so it fires once per lesson rather than once per step.
  const cursorWrittenRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${lesson.study.id}:${lesson.lesson.day}`;
    if (cursorWrittenRef.current === key) return;
    cursorWrittenRef.current = key;
    void patch({ currentStep: initialStep });
  }, [patch, lesson.study.id, lesson.lesson.day, initialStep]);

  // The dashboard's weekly strip is backed by ReadingSession documents. The old
  // /lezen page logs these through useBibleData, but the new guided /studie flow
  // bypasses that hook; without this, studying a lesson shows as "Geen activiteit".
  useEffect(() => {
    const key = `${lesson.study.id}:${lesson.lesson.day}:${lesson.passage.book}:${lesson.passage.chapter}`;
    if (loggedActivityKeyRef.current === key) return;
    loggedActivityKeyRef.current = key;
    fetch('/api/user/log-reading', { method: 'POST' }).catch(() => {});

    // Reading a passage in a lesson is reading it. Without this the dashboard's
    // "Verder lezen" card and the bible-completion percentages ignored every
    // chapter someone met through a guided study.
    //
    // `awardXp: false` because the lesson already grants `study_lesson` on
    // completion - the chapter must not be paid for twice.
    fetch('/api/user/last-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book: lesson.passage.book,
        chapter: lesson.passage.chapter,
        version: lesson.translation,
        awardXp: false,
      }),
    }).catch(() => {});
  }, [lesson]);

  // Full screen is offered rather than imposed: the whole point of the flow is
  // one lesson and nothing else on the glass, and the browser will only grant it
  // from a real gesture anyway.
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const dismissFullscreenHint = useCallback(() => {
    setFullscreenHint(false);
    try {
      localStorage.setItem(FULLSCREEN_HINT_KEY, 'seen');
    } catch {
      /* private mode; the offer simply returns next time */
    }
  }, []);

  // Offered once, on the first lesson someone opens, a beat after the step has
  // settled - not as a modal in front of the thing they came to read.
  useEffect(() => {
    if (!document.documentElement.requestFullscreen) return;
    try {
      if (localStorage.getItem(FULLSCREEN_HINT_KEY) === 'seen') return;
    } catch {
      return;
    }
    const show = setTimeout(() => setFullscreenHint(true), 1200);
    const hide = setTimeout(() => setFullscreenHint(false), 13000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    setCoarsePointer(window.matchMedia?.('(pointer: coarse)').matches ?? false);
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === 'off') {
        setSoundOn(false);
        soundOnRef.current = false;
      }
    } catch {
      /* private mode: sound stays on */
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      soundOnRef.current = next;
      try {
        localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
      } catch {
        /* not worth failing over */
      }
      // Play on the way ON only, so the toggle demonstrates what it just enabled
      // instead of making noise on the way to silence.
      if (next) playSwipe(1);
      return next;
    });
  }, []);

  /** The page-turn, muted by the toggle and by a reduced-motion preference. */
  const swipeSound = useCallback(
    (towards: 1 | -1) => {
      if (!soundOnRef.current || reduceMotion) return;
      playSwipe(towards);
    },
    [reduceMotion],
  );

  // Escape closes the navigator, like every other overlay in the app.
  useEffect(() => {
    if (!outlineOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOutlineOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [outlineOpen]);

  const changeVersion = useCallback(
    (next: string) => {
      setVersion(next);
      void patch({ viewTranslation: next });
    },
    [patch],
  );

  const changeDepthPanel = useCallback(
    (next: string) => {
      setDepthPanel(next);
      void patch({ depthPanel: next });
    },
    [patch],
  );

  const goTo = useCallback(
    (next: StepKey) => {
      const towards: 1 | -1 = steps.indexOf(next) >= steps.indexOf(step) ? 1 : -1;
      setDirection(towards);
      swipeSound(towards);
      setStep(next);
      void patch({ currentStep: next });
    },
    [patch, steps, step, swipeSound],
  );

  const onNext = useCallback(async () => {
    setDirection(1);
    swipeSound(1);
    setCompleted((current) => (current.includes(step) ? current : [...current, step]));

    const next = advance(steps, step);
    if (next !== 'done') {
      await patch({ completeStep: step, currentStep: next });
      setStep(next);
      return;
    }

    setFinishing(true);
    const data = await patch({ completeStep: step, complete: true });
    // The streak lives on User and is advanced by /api/streak, which until now
    // was only ever called from the old /lezen page - so someone who studied
    // exclusively in the guided flow kept a streak of zero while the badge rules
    // in lib/gamification handed out streak30/60/90 off that same zero.
    // Fire-and-forget: a lesson must never fail to complete because of a badge.
    void fetch('/api/streak', { method: 'POST' }).catch(() => {});
    setFinishing(false);
    if (soundOnRef.current && !reduceMotion) playComplete();

    const completion = data?.completion;
    applyXp(completion?.xp ?? null);
    setSummary({
      xpAwarded: completion?.xp?.awarded ?? 0,
      levelledUp: !!completion?.xp?.levelledUp,
      newBadges: completion?.xp?.newBadges ?? [],
      studyCompleted: !!completion?.studyCompleted,
      noteId: completion?.noteId ?? null,
      nextLessonDay: completion?.nextLessonDay ?? lesson.nextLessonDay,
    });
  }, [steps, step, patch, lesson.nextLessonDay, swipeSound, reduceMotion, applyXp]);

  const onPrevious = useCallback(() => {
    const previous = goBack(steps, step);
    if (previous) goTo(previous);
  }, [steps, step, goTo]);

  // Arrow keys move through the lesson like pages. Deliberately NOT wired to the
  // last step: finishing a lesson writes XP and a note, and that should take a
  // deliberate click rather than one more tap on a key you were already holding.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))
      ) {
        return;
      }
      if (outlineOpen) return;
      if (event.key === 'ArrowRight' && stepPosition(steps, step) < steps.length) {
        event.preventDefault();
        void onNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps, step, onNext, onPrevious, outlineOpen]);

  const saveReflection = useCallback(
    async (text: string) => {
      // Mirrored here BEFORE the request, so a step change during the round trip
      // still remounts the textarea with what the reader typed.
      setReflectionText(text);
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
    // Ontwerp B's numbered eyebrow. The margin register says the same thing in
    // the left gutter, but that register is hidden below lg - and above a
    // heading the number is the only thing that says how far in this page sits.
    const eyebrow = `Stap ${String(stepPosition(steps, step)).padStart(2, '0')} · ${
      STEP_LABELS[step]
    }`;

    switch (step) {
      case 'intro':
        return lesson.content.intro ? (
          <StepIntro
            intro={lesson.content.intro}
            lessonTitle={lesson.lesson.title}
            eyebrow={eyebrow}
          />
        ) : null;
      case 'word':
        return (
          <StepWord
            book={lesson.passage.book}
            chapter={lesson.passage.chapter}
            version={version}
            versions={lesson.translations}
            onVersionChange={changeVersion}
            verseStart={lesson.passage.verseStart}
            verseEnd={lesson.passage.verseEnd}
            readingCue={lesson.content.readingCue}
            preferences={preferences}
            onUpdatePreferences={updatePreferences}
            eyebrow={eyebrow}
            reflectionQuestion={lesson.content.reflection.question}
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
            panel={depthPanel}
            onPanelChange={changeDepthPanel}
            onAskAi={askAi}
          />
        );
      case 'reflection':
        return (
          <StepReflection
            studyId={lesson.study.id}
            lessonDay={lesson.lesson.day}
            reflection={lesson.content.reflection}
            initialText={reflectionText}
            serverUpdatedAt={initialState.reflection.updatedAt}
            onSave={saveReflection}
            eyebrow={eyebrow}
            passageReference={passageReference}
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
            eyebrow={eyebrow}
            passageReference={passageReference}
            reflectionQuestion={lesson.content.reflection.question}
          />
        );
      default:
        return null;
    }
  }, [
    step,
    steps,
    lesson,
    version,
    changeVersion,
    depthPanel,
    changeDepthPanel,
    reflectionText,
    preferences,
    updatePreferences,
    initialState,
    saveReflection,
    quizScore,
    quizTotal,
    askAi,
    passageReference,
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
      // The reward screen rises rather than replaces: the last thing the reader
      // did was press a button, and a hard cut makes that feel like a page load.
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="h-full"
      >
      <LessonCompleteCard
        studyId={lesson.study.id}
        studyTitle={lesson.study.title}
        lessonTitle={lesson.lesson.title}
        lessonDay={lesson.lesson.day}
        lessonsTotal={lesson.study.lessonsTotal}
        lessonsCompleted={lessonsCompleted}
        passageReference={passageReference}
        minutes={lesson.lesson.estimatedMinutes}
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
      </motion.div>
    );
  }

  const isLast = position === steps.length;
  const canGoBack = position > 1;

  /** For the ledger at the foot of the margin register. */
  const lessonsDone = lesson.outline.filter((entry) => entry.completed).length;

  return (
    // `relative` so the full-screen offer can sit against this frame rather than
    // the viewport - in the windowed layout those are not the same box.
    //
    // The ground is the scene's own, painted rather than inherited from
    // `bg-background`: this window keeps one palette in light and dark, the way
    // every other scene surface in the app does.
    <div className="relative h-full flex flex-col" style={{ backgroundColor: SCENE_BG }}>
      {/* Asks before an in-app link, a refresh or the Back button pulls the
          reader out of a lesson they are partway through. */}
      <StudyExitGuard enabled={!finishing} />

      {/* `relative` is the navigator panel's anchor - centred on the header, which
          is the window, rather than on the flexible middle column between two
          button groups of different widths. That off-by-half-a-button was why it
          never looked centred.

          No `backdrop-filter` here. It makes the header a containing block for
          every `fixed` descendant, which quietly shrank the navigator's
          click-anywhere-to-dismiss layer to the height of the header itself.

          z-50 puts the header - and therefore that dismiss layer - above the
          study rail, so a click on the sidebar closes the panel too. */}
      <header
        className={`relative z-50 flex-none border-b ${RULE}`}
        style={{ backgroundColor: SCENE_BG }}
      >
        {/* Three tracks, and the outer two share whatever is left over.
            `justify-between` with a `flex-1` middle looked centred and was not:
            the close button is 32px and the control cluster on the right is
            three times that, so the middle column started 60-odd pixels left of
            the window centre and took the lesson title with it. Equal `flex-1`
            gutters put the title on the actual midline whatever the right-hand
            cluster grows to. */}
        <div className="px-3 sm:px-5 h-14 flex items-center gap-2">
          <div className="flex-1 flex items-center justify-start min-w-0">
          <Link
            href={`/studies/${lesson.study.id}`}
            aria-label="Terug naar de studie"
            title="Terug naar de studie"
            className={`h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white/10 ${INK_FAINT} hover:text-white no-underline flex-none ${FOCUS_RING}`}
          >
            <X size={17} />
          </Link>
          </div>

          {/* Lesson navigator. What lessons there are and which are done was
              previously only visible on the detail page, one navigation away. */}
          <div className="min-w-0 flex-none max-w-[56%]">
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                setOutlineOpen((open) => !open);
              }}
              aria-expanded={outlineOpen}
              className={`w-full min-w-0 flex flex-col items-center rounded-md px-2 py-1 hover:bg-white/10 transition-colors ${FOCUS_RING}`}
            >
              <span className="flex items-center gap-1.5 max-w-full">
                <span className={`text-xs font-semibold truncate ${INK}`}>
                  {lesson.lesson.title}
                </span>
                <ListChecks size={12} className={`flex-none ${INK_FAINT}`} />
              </span>
              <span className={`text-[11px] ${INK_FAINT}`}>
                Les {lesson.lesson.day} van {lesson.study.lessonsTotal} &middot; stap {position} van{' '}
                {steps.length}
              </span>
            </button>

          </div>

          <div className="flex-1 flex items-center justify-end gap-1.5">
            {/* Nothing but the lesson on the glass. Hidden below sm: phone
                browsers either ignore element fullscreen or hand back a
                chrome-less view the reader cannot leave. */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-pressed={fullscreen}
              data-track="study_fullscreen"
              title={fullscreen ? 'Volledig scherm sluiten' : 'Volledig scherm'}
              aria-label={fullscreen ? 'Volledig scherm sluiten' : 'Volledig scherm'}
              className={`press hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${INK_FAINT} hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              data-track="study_sound"
              title={soundOn ? 'Geluid uit' : 'Geluid aan'}
              aria-label={soundOn ? 'Geluid uit' : 'Geluid aan'}
              className={`press hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${INK_FAINT} hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
            >
              {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* Everything about how this session is presented - translation,
                type, sound, full screen - behind one control, because the two
                bare icons beside it never said what family they belonged to. */}
            <button
              type="button"
              onClick={() => {
                setOutlineOpen(false);
                setSettingsOpen((value) => !value);
              }}
              aria-expanded={settingsOpen}
              data-track="study_session_settings"
              title="Instellingen voor deze sessie"
              aria-label="Instellingen voor deze sessie"
              className={[
                'press inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                FOCUS_RING,
                settingsOpen
                  ? `bg-white/15 ${INK}`
                  : `${INK_FAINT} hover:bg-white/10 hover:text-white`,
              ].join(' ')}
            >
              <Settings2 size={15} />
            </button>

            <button
              type="button"
              onClick={() => setAiOpen((open) => !open)}
              aria-pressed={aiOpen}
              data-track="ai_open"
              title="AI-assistent"
              className={[
                'press flex-none inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-lg text-[12px] font-semibold transition-colors border',
                FOCUS_RING,
                aiOpen
                  ? 'text-white border-transparent'
                  : `border-white/20 ${INK} hover:bg-white/10`,
              ].join(' ')}
              // TEAL_DEEP, not TEAL: this fill carries the white word "AI".
              style={aiOpen ? { backgroundColor: TEAL_DEEP } : undefined}
            >
              <Sparkles size={14} style={aiOpen ? undefined : { color: TEAL_ON_DARK }} />
              <span className="hidden sm:inline">AI</span>
            </button>
          </div>
        </div>

        {/* Only where the margin register is not on screen. From lg up the steps
            are the numbered index in the left gutter, and a second progress
            indicator in the header would be the same answer twice. */}
        <div className="px-4 sm:px-6 pb-3 lg:hidden">
          <StudyStepRail
            steps={steps}
            current={step}
            completed={completed}
            onSelect={goTo}
            variant="bar"
          />
        </div>

        <StudySettingsMenu
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          preferences={preferences}
          onUpdatePreferences={updatePreferences}
          version={version}
          versions={lesson.translations}
          onVersionChange={changeVersion}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          fullscreen={fullscreen}
          onToggleFullscreen={toggleFullscreen}
          reduceMotion={reduceMotion}
        />

        {/* The lesson navigator, hung off the header rather than off its trigger.
            Two things follow from that: it is centred on the window, and its
            dismiss layer is a real full-viewport surface - a click anywhere at
            all closes it, not only a second click on the title. */}
        <AnimatePresence>
          {outlineOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40"
                onClick={() => setOutlineOpen(false)}
                onWheel={() => setOutlineOpen(false)}
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ backgroundColor: 'rgba(11,18,32,0.35)' }}
              />
              <motion.div
                role="dialog"
                aria-label="Lessen in deze studie"
                // The half-width offset is a MOTION value, not a Tailwind class.
                // `-translate-x-1/2` and framer's animated `y`/`scale` both write
                // `transform`, and framer's inline style wins - which silently
                // dropped the centring and left the panel hanging half its own
                // width to the right of the middle.
                initial={
                  reduceMotion
                    ? { opacity: 0, x: '-50%' }
                    : { opacity: 0, x: '-50%', y: -8, scale: 0.97 }
                }
                animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0, x: '-50%' }
                    : { opacity: 0, x: '-50%', y: -8, scale: 0.97 }
                }
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute z-50 top-full mt-1.5 left-1/2 w-[min(92vw,360px)] max-h-[min(60vh,420px)] overflow-y-auto ${PANEL_DEEP} shadow-[0_40px_80px_-32px_rgba(0,0,0,0.85)] p-1.5`}
              >
                <p className={`px-2 py-1.5 ${EYEBROW}`}>{lesson.study.title}</p>
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
                        FOCUS_RING,
                        reachable ? 'hover:bg-white/10' : 'opacity-50 cursor-default',
                      ].join(' ')}
                      style={isCurrent ? { backgroundColor: 'rgba(45,212,191,0.10)' } : undefined}
                    >
                      <span
                        className={[
                          'h-5 w-5 flex-none rounded-full flex items-center justify-center text-[10px] font-bold border',
                          entry.completed
                            ? 'border-transparent text-white'
                            : isCurrent
                              ? 'border-transparent'
                              : `border-white/20 ${INK_FAINT}`,
                        ].join(' ')}
                        style={
                          entry.completed
                            ? { backgroundColor: TEAL_DEEP }
                            : isCurrent
                              ? { backgroundColor: 'rgba(45,212,191,0.16)', color: TEAL_ON_DARK }
                              : undefined
                        }
                      >
                        {entry.completed ? <Check size={11} /> : entry.day}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[12.5px] font-medium truncate ${INK}`}>
                          {entry.title}
                        </span>
                        <span className={`block text-[11px] truncate ${INK_FAINT}`}>
                          {entry.reference}
                        </span>
                      </span>
                      {!reachable && <Lock size={11} className={`flex-none ${INK_FAINT}`} />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* The margin, then the lesson.
          Ontwerp B's shape: the steps as a numbered register down the left
          gutter with the lesson's own ledger under it, and the reading column
          beside it. It replaces the progress bar that used to span the header -
          a bar answers "how far along", a register also answers "what is this
          lesson, what have I done, and what is left". */}
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Stappen in deze les"
          className={`hidden w-[216px] flex-none flex-col border-r px-4 py-4 lg:flex ${RULE}`}
        >
          <p className={EYEBROW}>Deze les</p>
          {/* Not a heading element: the one h1 on this screen belongs to the step
              being read, and an h2 before it would invert the order. */}
          <p className={`mt-1.5 text-[14px] font-semibold leading-snug ${INK}`}>
            {lesson.lesson.title}
          </p>

          <StudyStepRail
            steps={steps}
            current={step}
            completed={completed}
            onSelect={goTo}
            variant="index"
          />

          <dl className={`mt-auto space-y-1.5 border-t pt-3 text-[11px] ${RULE}`}>
            <div className="flex justify-between gap-2">
              <dt className={INK_FAINT}>Gedeelte</dt>
              <dd className={`text-right tabular-nums ${INK_MUTED}`}>{passageReference}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className={INK_FAINT}>Tijd</dt>
              <dd className={`tabular-nums ${INK_MUTED}`}>
                &plusmn; {lesson.lesson.estimatedMinutes} min
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className={INK_FAINT}>Van de studie</dt>
              <dd className={`tabular-nums ${INK_MUTED}`}>
                {lessonsDone}/{lesson.study.lessonsTotal}
              </dd>
            </div>
          </dl>
        </nav>

        {/* A row: the step, and the assistant beside it.
            `relative` because the Verdieping step's `half` dock pins itself to
            the right half of THIS box. Everywhere else the dock is a real column
            in this row, so opening it narrows the step instead of covering it -
            the passage re-centres in the space that is left rather than being
            read through a panel.

            The dock is scoped to the lesson body rather than the screen: an
            earlier version was a viewport-height drawer that pushed the header
            and footer too, so asking a question reflowed the whole frame. */}
        <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden flex">
        <div className="relative flex-1 min-w-0 h-full">
        {/* No `mode`, deliberately: both steps are mounted for the length of the
            transition so one can slide over the other. `initial={false}` keeps
            the first paint still - the lesson should be there when the page is,
            not slide in once.

            The spring, not a duration, is what makes it feel like a thing with
            weight being pushed rather than a timed animation being played. */}
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={reduceMotion ? calmVariants : stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              reduceMotion
                ? { duration: 0.14 }
                : {
                    x: { type: 'spring', stiffness: 340, damping: 36, mass: 0.9 },
                    opacity: { duration: 0.28 },
                    scale: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
                  }
            }
            // Touch only. On a phone the lesson reads like a stack of cards you
            // push aside; on a desktop the same binding would hijack every
            // attempt to select a verse.
            drag={coarsePointer && !reduceMotion ? 'x' : false}
            dragDirectionLock
            dragElastic={0.12}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_event, info) => {
              const far = Math.abs(info.offset.x) > 90;
              const fast = Math.abs(info.velocity.x) > 500;
              if (!far && !fast) return;
              if (info.offset.x < 0 && !isLast) void onNext();
              else if (info.offset.x > 0 && canGoBack) onPrevious();
            }}
            // Absolute and opaque: the two pages overlap during the swipe, so
            // the arriving one has to cover the departing one instead of letting
            // it show through.
            //
            // No standing `will-change`: it would make this box the containing
            // block for every `fixed` descendant (the reading-preferences menu,
            // note popovers) even when nothing is moving. Framer sets and clears
            // it for the duration of the transition on its own.
            className="absolute inset-0"
            style={{ backgroundColor: SCENE_BG }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
        </div>

        {/* One instance, at a stable position in the tree across every step, so
            the conversation survives both moving between steps and closing the
            panel. `layout` is what changes, not the element. */}
        <AiDock
          open={aiOpen}
          onOpenChange={setAiOpen}
          book={lesson.passage.book}
          chapter={lesson.passage.chapter}
          version={version}
          step={isStepKey(step) ? step : 'word'}
          // Half the screen is right on the commentary step, where the left half
          // is already a column of prose the assistant is talking about. On every
          // other step it swallowed a centred passage, a textarea or a quiz card,
          // so there it is a drawer against the right edge instead.
          layout={step === 'depth' ? 'half' : 'push'}
          draft={aiDraft}
          onDraftConsumed={() => setAiDraft(null)}
          question={aiQuestion}
          onQuestionConsumed={() => setAiQuestion(null)}
        />
        </div>
      </div>

      <footer
        className={`flex-none border-t ${RULE} px-4 sm:px-6 py-3 flex items-center justify-between gap-3`}
        style={{ backgroundColor: SCENE_BG }}
      >
        {/* A lit outline rather than a transparent one: on the previous
            grey-on-grey button the only thing separating "Vorige" from the
            footer was a hairline. */}
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoBack}
          data-track="study_step_previous"
          className={[
            'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors',
            FOCUS_RING,
            canGoBack
              ? `border-white/20 bg-white/10 ${INK} hover:bg-white/20`
              : 'bg-transparent border-transparent text-transparent pointer-events-none',
          ].join(' ')}
        >
          <ArrowLeft size={15} /> Vorige
        </button>

        <span className={`hidden sm:block text-xs ${INK_FAINT}`}>{STEP_LABELS[step]}</span>

        <button
          type="button"
          onClick={() => void onNext()}
          disabled={finishing}
          data-track={isLast ? "study_lesson_complete" : "study_step_next"}
          className="press inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ backgroundColor: TEAL_DEEP }}
        >
          {finishing ? 'Afronden...' : isLast ? 'Les afronden' : 'Volgende'}
          {!finishing && <ArrowRight size={15} />}
        </button>
      </footer>

      {/* The full-screen offer, once ever. It sits above the footer instead of
          in front of the lesson, and it is dismissed by either answer - a
          suggestion that has to be refused twice is a modal wearing a costume. */}
      <AnimatePresence>
        {fullscreenHint && !fullscreen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-x-0 bottom-20 z-40 hidden sm:flex justify-center px-4"
          >
            <div
              className={`pointer-events-auto flex items-center gap-3 ${PANEL_DEEP} px-3.5 py-2.5 shadow-[0_40px_80px_-32px_rgba(0,0,0,0.85)]`}
            >
              <Maximize2 size={15} className="flex-none" style={{ color: TEAL_ON_DARK }} />
              <p className={`text-[12.5px] ${INK}`}>
                Studeer in volledig scherm, zonder afleiding?
              </p>
              <button
                type="button"
                onClick={() => {
                  toggleFullscreen();
                  dismissFullscreenHint();
                }}
                data-track="study_fullscreen_hint_accept"
                className="press h-7 px-2.5 rounded-lg text-[12px] font-semibold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white"
                style={{ backgroundColor: TEAL_DEEP }}
              >
                Ja, graag
              </button>
              <button
                type="button"
                onClick={dismissFullscreenHint}
                aria-label="Sluiten"
                className={`press h-7 w-7 inline-flex items-center justify-center rounded-lg ${INK_FAINT} hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
