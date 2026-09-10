'use client';

import React, { useCallback, useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useTranslation } from '../i18n/client';
import { useSearchParams } from 'next/navigation';
import { useBibleData } from '../../hooks/useBibleData';
import { useReadingPreferences } from '../../hooks/useReadingPreferences';
import BibleViewerSection from '../../components/study/BibleViewerSection';
import StudyMaterialsSection from '../../components/study/StudyMaterialsSection';
import AiAssistantWidget from '../../components/study/AiAssistantWidget';
import { BookOpen, CheckCircle, ChevronLeft, ChevronRight, X, Trophy, MessageCircle } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { TEAL_DEEP, TEAL_ON_DARK } from '../../components/scene/tokens';
import { RAIL_GUTTER, READING_ROOM, ROOM_HEIGHT } from './room';

const COMPLETED_KEY = 'bijbelstudie_completed_studies';

function markStudyCompleted(studyId: string) {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
    if (!existing.includes(studyId)) {
      localStorage.setItem(COMPLETED_KEY, JSON.stringify([...existing, studyId]));
    }
  } catch { /* noop */ }
}

/* ── Types ──────────────────────────────────────────────────── */
interface Lesson {
  day: number; title: string; book: string; chapter: number; verseRange?: string; focus: string;
}
interface ActiveStudy {
  studyId: string; studyTitle: string; lessons: Lesson[];
  currentLessonIndex: number; completedLessons: number[];
}

function parseVerseRange(vr?: string): { start: number; end: number } | undefined {
  if (!vr) return undefined;
  const parts = vr.split(/[-–—]/);
  const start = parseInt(parts[0], 10);
  const end   = parseInt(parts[parts.length - 1], 10);
  if (isNaN(start) || isNaN(end)) return undefined;
  return { start, end };
}

/**
 * Sends a finished lesson to the server.
 *
 * Lesson completion used to live only in sessionStorage, so closing the tab
 * threw the study away and the database could not tell a worked-through study
 * from a chapter someone scrolled past. The server ignores a lesson it already
 * has, so retries are safe.
 */
async function recordLesson(studyId: string, studyTitle: string, lesson: Lesson) {
  const range = parseVerseRange(lesson.verseRange);
  try {
    const response = await fetch('/api/v1/study-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'curated',
        studyId,
        lessonDay: lesson.day,
        book: lesson.book,
        chapter: lesson.chapter,
        verseStart: range?.start ?? null,
        verseEnd: range?.end ?? null,
      }),
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (data.xp?.awarded) {
      toast({
        title: `+${data.xp.awarded} XP`,
        description: data.xp.levelledUp ? `Niveau ${data.xp.level} bereikt!` : studyTitle,
      });
    }
    return data;
  } catch {
    return null;
  }
}

/* ── Completion overlay ──────────────────────────────────────── */
function CompletionOverlay({ study, onClose }: { study: ActiveStudy; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center border border-border animate-in fade-in zoom-in-95 duration-200">
        {/* The overlay is inside the room's `dark` scope, so its card is the
            scene's own panel and #0D9488 - a brand fill meant for a white page
            - measures about 4.3:1 on it. TEAL_ON_DARK is the same swatch's
            on-dark value and measures 8.6:1 there. */}
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(45,212,191,0.10)' }}
        >
          <Trophy size={38} style={{ color: TEAL_ON_DARK }} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Studie voltooid!</h2>
        <p className="text-sm text-muted-foreground mb-1">
          Je hebt alle <span className="font-semibold text-foreground">{study.lessons.length} lessen</span> afgerond van
        </p>
        <p className="text-base font-bold mt-1 mb-6" style={{ color: TEAL_ON_DARK }}>
          &ldquo;{study.studyTitle}&rdquo;
        </p>
        <div className="flex items-center gap-2 justify-center mb-7">
          {study.lessons.map((_, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TEAL_ON_DARK }} />
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white"
          style={{ backgroundColor: TEAL_DEEP }}
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}

/* ── Minimal Study Bar ───────────────────────────────────────── */
function MiniStudyBar({
  study, lessonIdx, onGoto, onMarkDone, onFinish, onDismiss,
}: {
  study: ActiveStudy;
  lessonIdx: number;
  onGoto: (idx: number) => void;
  onMarkDone: (idx: number) => void;
  onFinish: () => void;
  onDismiss: () => void;
}) {
  const total  = study.lessons.length;
  const isDone = study.completedLessons.includes(lessonIdx);
  const isLast = lessonIdx === total - 1;
  const lesson = study.lessons[lessonIdx];
  const progressPct = Math.round((study.completedLessons.length / total) * 100);

  const handlePrimary = () => {
    if (isLast) {
      if (!isDone) onMarkDone(lessonIdx);
      onFinish();
    } else {
      if (isDone) onGoto(lessonIdx + 1);
      else onMarkDone(lessonIdx);
    }
  };

  const primaryLabel = isLast
    ? (isDone ? 'Afronden' : 'Markeer & afronden')
    : (isDone ? 'Volgende les' : 'Markeer & verder');

  return (
    <div className="flex-shrink-0 border-t-2 border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/50">
      {/* Row 1: meta + dismiss */}
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
        {/* The one inline colour in this bar, so it is the one the `dark` scope
            cannot correct: #0F766E on the dark teal band is barely visible.
            TEAL_ON_DARK reads at 8:1 there. */}
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(45,212,191,0.12)', color: TEAL_ON_DARK }}>
          <BookOpen size={9} /> Studie
        </span>
        <span className="text-[11px] font-semibold text-teal-900 dark:text-teal-100 truncate" title={study.studyTitle}>
          {study.studyTitle}
        </span>
        <span className="text-[10px] tabular-nums text-teal-700 dark:text-teal-300 ml-auto flex-shrink-0">
          {lessonIdx + 1}<span className="opacity-50">/{total}</span>
        </span>
        <button
          onClick={onDismiss}
          className="flex items-center justify-center w-5 h-5 rounded text-teal-500 hover:text-teal-800 dark:hover:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors flex-shrink-0"
          title="Studiebalk verbergen"
          aria-label="Studiebalk verbergen"
        >
          <X size={11} />
        </button>
      </div>

      {/* Row 2: current lesson line */}
      <div className="px-3 pb-1.5">
        <p className="text-[11px] leading-tight text-teal-800 dark:text-teal-200 truncate" title={lesson?.title || ''}>
          <span className="font-medium">{lesson?.title}</span>
          {lesson?.verseRange && (
            <span className="text-teal-600 dark:text-teal-400 ml-1.5">· {lesson.book} {lesson.chapter}:{lesson.verseRange}</span>
          )}
        </p>
        {/* Progress bar */}
        <div className="mt-1 h-1 rounded-full bg-teal-200/70 dark:bg-teal-900 overflow-hidden" title={`${progressPct}% voltooid`}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, backgroundColor: '#0D9488' }}
          />
        </div>
      </div>

      {/* Row 3: actions - prev (ghost) + primary (filled) */}
      <div className="flex items-center justify-end gap-1.5 px-2 pb-2">
        <button
          onClick={() => onGoto(lessonIdx - 1)}
          disabled={lessonIdx === 0}
          className="flex items-center gap-0.5 px-2 h-7 rounded-md text-[10.5px] font-medium disabled:opacity-30 disabled:cursor-not-allowed text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
          title="Vorige les"
          aria-label="Vorige les"
        >
          <ChevronLeft size={12} /> Vorige
        </button>

        <button
          onClick={handlePrimary}
          className="inline-flex items-center gap-1 px-3 h-7 rounded-md text-[11px] font-semibold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap"
          style={{ backgroundColor: TEAL_DEEP }}
          title={primaryLabel}
        >
          {isLast && isDone ? <Trophy size={12} /> : <CheckCircle size={12} />}
          {primaryLabel}
          {!isLast && <ChevronRight size={12} />}
        </button>
      </div>
    </div>
  );
}

/* ── Inner page ──────────────────────────────────────────────── */
function StudyPageInner() {
  const { t, i18n } = useTranslation('study');
  const lng = i18n.resolvedLanguage;
  const searchParams = useSearchParams();

  const { preferences, updatePreferences } = useReadingPreferences();
  const [activeStudy, setActiveStudy]               = useState<ActiveStudy | null>(null);
  const [lessonIdx, setLessonIdx]                   = useState(0);
  const [pendingChapter, setPendingChapter]         = useState<number | null>(null);
  const [studyCompleted, setStudyCompleted]         = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [mobileView, setMobileView]                 = useState<'bible' | 'materials'>('bible');
  const [materialsTab, setMaterialsTab]             = useState('commentary');
  const [aiQuestion, setAiQuestion]                 = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    try {
      const stored = sessionStorage.getItem('activeStudy');
      if (!stored) return;

      const s: ActiveStudy = JSON.parse(stored);
      if (!s.completedLessons) s.completedLessons = [];
      setActiveStudy(s);
      setLessonIdx(s.currentLessonIndex ?? 0);

      // sessionStorage only knows about this tab. Anything already recorded on
      // the server - from another device, or before a refresh wiped the tab -
      // is merged back in so a lesson is never asked for twice.
      void (async () => {
        try {
          const response = await fetch(`/api/v1/study-progress?studyId=${encodeURIComponent(s.studyId)}`);
          if (!response.ok || cancelled) return;

          const data = await response.json();
          const doneDays: number[] = data.lessonsByStudy?.[s.studyId] ?? [];
          if (doneDays.length === 0) return;

          const doneIndices = s.lessons
            .map((lesson, index) => (doneDays.includes(lesson.day) ? index : -1))
            .filter((index) => index >= 0);

          setActiveStudy((current) => {
            if (!current || current.studyId !== s.studyId) return current;
            const merged = { ...current, completedLessons: [...new Set([...current.completedLessons, ...doneIndices])] };
            sessionStorage.setItem('activeStudy', JSON.stringify(merged));
            return merged;
          });
        } catch { /* offline is fine - sessionStorage still holds this session */ }
      })();
    } catch { /* noop */ }

    return () => { cancelled = true; };
  }, []);

  const initialBook    = searchParams.get('book')    ?? undefined;
  const initialChapter = searchParams.get('chapter') ? Number(searchParams.get('chapter')) : undefined;
  const initialVersion = searchParams.get('version') ?? undefined;

  const {
    versions, books, chapters,
    selectedVersion, selectedBook, selectedChapter,
    selectedCommentary, maxChapter,
    loadingVersions, loadingBooks, loadingChapters,
    handleVersionChange, handleBookChange, handleChapterChange,
    handleCommentaryChange, handlePreviousChapter, handleNextChapter,
  } = useBibleData(lng ?? 'nl', { initialBook, initialChapter, initialVersion });

  const bookChangeRef    = useRef(handleBookChange);
  const chapterChangeRef = useRef(handleChapterChange);
  bookChangeRef.current    = handleBookChange;
  chapterChangeRef.current = handleChapterChange;

  useEffect(() => {
    if (!loadingChapters && pendingChapter !== null) {
      chapterChangeRef.current(pendingChapter);
      setPendingChapter(null);
    }
  }, [loadingChapters, pendingChapter]);

  const handleDownload = useCallback(() => {}, []);

  // Question typed in the floating popup: jump to the AI tab and hand it off.
  const handleAiAsk = useCallback((question: string) => {
    setAiQuestion(question);
    setMaterialsTab('ai');
    setMobileView('materials');
  }, []);

  const handleAiQuestionConsumed = useCallback(() => setAiQuestion(null), []);

  // No highlight range when study is completed
  const currentLesson  = activeStudy?.lessons[lessonIdx] ?? null;
  const highlightRange = useMemo(() => {
    if (studyCompleted) return undefined;
    return parseVerseRange(currentLesson?.verseRange);
  }, [studyCompleted, currentLesson?.verseRange]);

  const saveStudy = useCallback((updated: ActiveStudy) => {
    sessionStorage.setItem('activeStudy', JSON.stringify(updated));
    setActiveStudy(updated);
  }, []);

  const goToLesson = useCallback((idx: number) => {
    if (!activeStudy) return;
    const lesson = activeStudy.lessons[idx];
    const updated = { ...activeStudy, currentLessonIndex: idx };
    saveStudy(updated);
    setLessonIdx(idx);
    if (lesson.book !== selectedBook) {
      bookChangeRef.current(lesson.book);
      setPendingChapter(lesson.chapter);
    } else {
      chapterChangeRef.current(lesson.chapter);
    }
  }, [activeStudy, selectedBook, saveStudy]);

  const markLessonDone = useCallback((idx: number) => {
    if (!activeStudy) return;
    const done = [...new Set([...activeStudy.completedLessons, idx])];
    const updated = { ...activeStudy, completedLessons: done };
    saveStudy(updated);
    // Recorded server-side too, so the lesson survives the tab closing and
    // counts as studying rather than reading.
    void recordLesson(activeStudy.studyId, activeStudy.studyTitle, activeStudy.lessons[idx]);
    // Auto-advance if not last
    if (idx < activeStudy.lessons.length - 1) goToLesson(idx + 1);
  }, [activeStudy, saveStudy, goToLesson]);

  // Called when user clicks the trophy (finish) button - completes the entire study immediately
  const finishStudy = useCallback(() => {
    if (!activeStudy) return;
    // Mark every lesson as done
    const allDone = activeStudy.lessons.map((_, i) => i);
    const updated = { ...activeStudy, completedLessons: allDone };
    saveStudy(updated);
    // Persist completion to localStorage for /studies page badge
    markStudyCompleted(activeStudy.studyId);
    // …and to the server, which is what the badges, XP and the profile read.
    // Sequential rather than parallel so the "study completed" bonus is
    // evaluated once, after the final lesson has landed.
    void (async () => {
      for (const lesson of activeStudy.lessons) {
        await recordLesson(activeStudy.studyId, activeStudy.studyTitle, lesson);
      }
    })();
    // Stop highlighting and hide the study bar
    setStudyCompleted(true);
    // Show the overlay
    setShowCompletionOverlay(true);
  }, [activeStudy, saveStudy]);

  const dismissStudy = useCallback(() => {
    sessionStorage.removeItem('activeStudy');
    setActiveStudy(null);
    setStudyCompleted(false);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setShowCompletionOverlay(false);
    // Clear the active study entirely so the bar disappears
    sessionStorage.removeItem('activeStudy');
    setActiveStudy(null);
    setStudyCompleted(false);
  }, []);

  // Show study bar only when study is active AND not yet completed
  const studyBar = (activeStudy && !studyCompleted)
    ? (
      <MiniStudyBar
        study={activeStudy}
        lessonIdx={lessonIdx}
        onGoto={goToLesson}
        onMarkDone={markLessonDone}
        onFinish={finishStudy}
        onDismiss={dismissStudy}
      />
    )
    : null;

  return (
    /*
     * The reading room is a FIXED frame on the scene, not a scrolling page.
     *
     * Every other converted screen lets the document scroll, which is what
     * drives the shell's depth engine. This one deliberately does not, for the
     * reason the whole page exists: someone sits here with a chapter for twenty
     * minutes, and a landscape sliding underneath the verse they are following
     * is the one thing atmosphere must never do. The passage and the study
     * materials keep their own scroll containers, exactly as before, and the
     * scene stays where it is.
     *
     * What changed: the room no longer sits IN the scene, it IS the scene. No
     * outer padding, no rounded plate, no shadow, no gutter of landscape around
     * a white card - the room runs from the underside of the navbar to all four
     * edges, transparent, over the shell's muted picture (see ../layout.tsx),
     * and the rail stands on it the way it stands on every other converted
     * screen. See `./room`, which holds both the palette and the height so
     * `loading.tsx` can stream into an identical frame.
     */
    <div className={`dark relative flex ${ROOM_HEIGHT} w-full min-w-0 flex-col overflow-hidden font-inter text-foreground`} style={READING_ROOM}>
      {showCompletionOverlay && activeStudy && (
        <CompletionOverlay study={activeStudy} onClose={handleCloseOverlay} />
      )}

      {/*
       * The page's heading, kept for the document outline and for a screen
       * reader, and taken off the screen: it was an eyebrow over the frame that
       * cost a line of vertical space and repeated what the rail's active item
       * and the chapter selector both already say. On a screen whose entire
       * job is the number of verses that fit, that line is measure.
       */}
      <h1 className="sr-only">Lezen</h1>

      {/* Mobile pane switcher - only below lg; desktop/landscape keeps the split.
          Recessed rather than lifted (`bg-black/25`, the scene's own scrim
          value), so the passage stays the lightest thing in the room. */}
      <div className="lg:hidden flex-none flex items-stretch border-b border-white/10 bg-black/25">
        <button
          onClick={() => setMobileView('bible')}
          aria-pressed={mobileView === 'bible'}
          className={[
            'flex-1 flex items-center justify-center gap-1.5 h-12 text-sm font-semibold relative outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2DD4BF]',
            mobileView === 'bible'
              ? 'text-[#2DD4BF] bg-[rgba(45,212,191,0.10)]'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
          ].join(' ')}
        >
          <BookOpen size={16} /> Bijbel
          {mobileView === 'bible' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-[#2DD4BF]" />
          )}
        </button>
        <button
          onClick={() => setMobileView('materials')}
          aria-pressed={mobileView === 'materials'}
          className={[
            'flex-1 flex items-center justify-center gap-1.5 h-12 text-sm font-semibold relative outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2DD4BF]',
            mobileView === 'materials'
              ? 'text-[#2DD4BF] bg-[rgba(45,212,191,0.10)]'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
          ].join(' ')}
        >
          <MessageCircle size={16} /> Studie
          {mobileView === 'materials' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-[#2DD4BF]" />
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full overflow-hidden">
        {/*
         * RAIL_GUTTER is the ONLY inset left on this page, and it is not
         * margin - it is the strip the rail stands in, exactly 13rem wide, so
         * the pane's left edge is the rail's right edge. See `./room`, which
         * explains why this route sets it itself instead of taking `SCENE_X`,
         * and what has to move with it.
         *
         * The split leans left by half that strip (`calc(50% + 6.5rem)`, half
         * of RAIL_GUTTER's 13rem) so the inset comes out of the page rather
         * than out of the passage: the two panes each get an even half of the
         * width that is left beside the rail, and the two widths sum to exactly
         * 100%. (At the old 14rem they were 50%+7rem and 50%-3rem, which sums
         * to 100%+4rem - the materials pane ran 4rem past the right edge and was
         * clipped there.)
         */}
        <div
          data-tour="bible-text"
          className={[
            `h-full w-full lg:w-[calc(50%_+_6.5rem)] lg:flex-none min-h-0 min-w-0 overflow-hidden lg:border-r lg:border-white/10 ${RAIL_GUTTER}`,
            mobileView === 'bible' ? 'block' : 'hidden',
            'lg:block',
          ].join(' ')}
        >
          <BibleViewerSection
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            selectedVersion={selectedVersion}
            maxChapter={maxChapter}
            loadingBooks={loadingBooks}
            loadingChapters={loadingChapters}
            loadingVersions={loadingVersions}
            versions={versions}
            books={books}
            chapters={chapters}
            onVersionChange={handleVersionChange}
            onBookChange={handleBookChange}
            onChapterChange={handleChapterChange}
            onPreviousChapter={handlePreviousChapter}
            onNextChapter={handleNextChapter}
            t={t}
            preferences={preferences}
            onUpdatePreferences={updatePreferences}
            highlightRange={highlightRange}
            bottomBar={studyBar}
          />
        </div>

        <div
          data-tour="commentary"
          className={[
            'h-full w-full lg:w-[calc(50%_-_6.5rem)] lg:flex-none min-h-0 min-w-0 overflow-hidden',
            mobileView === 'materials' ? 'block' : 'hidden',
            'lg:block',
          ].join(' ')}
        >
          <StudyMaterialsSection
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            selectedVersion={selectedVersion}
            selectedCommentary={selectedCommentary}
            versions={versions}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePreviousChapter}
            onCommentaryChange={handleCommentaryChange}
            onDownload={handleDownload}
            t={t}
            preferences={preferences}
            activeTab={materialsTab}
            onActiveTabChange={setMaterialsTab}
            aiQuestion={aiQuestion}
            onAiQuestionConsumed={handleAiQuestionConsumed}
          />
        </div>
      </div>

      {/* Hide the floating widget whenever the AI tab itself is visible:
          on lg+ the materials pane is always shown; below lg only when the
          user is on the 'materials' pane. */}
      <AiAssistantWidget
        onAsk={handleAiAsk}
        className={
          materialsTab === 'ai'
            ? mobileView === 'materials'
              ? 'hidden'
              : 'lg:hidden'
            : ''
        }
      />
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={null}>
      <StudyPageInner />
    </Suspense>
  );
}
