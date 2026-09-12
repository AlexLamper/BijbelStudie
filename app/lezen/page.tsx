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
import AppShell from '../../components/shell/AppShell';

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
      {/* The page is a white one again, so the card is white and the glyph is
          the brand fill rather than its on-dark value. */}
      <div className="w-full max-w-sm rounded-card border border-line bg-white p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-faint">
          <Trophy size={38} className="text-teal" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-ink">Studie voltooid!</h2>
        <p className="mb-1 text-sm text-ink-muted">
          Je hebt alle <span className="font-semibold text-ink">{study.lessons.length} lessen</span> afgerond van
        </p>
        <p className="mb-6 mt-1 text-base font-bold text-teal">
          &ldquo;{study.studyTitle}&rdquo;
        </p>
        <div className="mb-7 flex items-center justify-center gap-2">
          {study.lessons.map((_, i) => (
            <span key={i} className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-teal" />
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-btn bg-teal py-3 text-sm font-semibold text-white outline-none transition-opacity hover:opacity-90"
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
    <div className="flex-shrink-0 border-t border-line bg-teal-faint">
      {/* Row 1: meta + dismiss */}
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2">
        <span className="inline-flex items-center gap-1 rounded bg-[var(--teal-wash)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal-dark">
          <BookOpen size={9} /> Studie
        </span>
        <span className="truncate text-[11px] font-semibold text-ink" title={study.studyTitle}>
          {study.studyTitle}
        </span>
        <span className="ml-auto flex-shrink-0 text-[10px] text-ink-muted tabular-nums">
          {lessonIdx + 1}<span className="opacity-60">/{total}</span>
        </span>
        <button
          onClick={onDismiss}
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:bg-line hover:text-ink-body"
          title="Studiebalk verbergen"
          aria-label="Studiebalk verbergen"
        >
          <X size={11} />
        </button>
      </div>

      {/* Row 2: current lesson line */}
      <div className="px-3 pb-1.5">
        <p className="truncate text-[11px] leading-tight text-ink-body" title={lesson?.title || ''}>
          <span className="font-medium">{lesson?.title}</span>
          {lesson?.verseRange && (
            <span className="ml-1.5 text-ink-muted">· {lesson.book} {lesson.chapter}:{lesson.verseRange}</span>
          )}
        </p>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-line" title={`${progressPct}% voltooid`}>
          <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Row 3: actions - prev (ghost) + primary (filled) */}
      <div className="flex items-center justify-end gap-1.5 px-2 pb-2">
        <button
          onClick={() => onGoto(lessonIdx - 1)}
          disabled={lessonIdx === 0}
          className="flex h-7 items-center gap-0.5 rounded-md px-2 text-[10.5px] font-medium text-ink-body transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-30"
          title="Vorige les"
          aria-label="Vorige les"
        >
          <ChevronLeft size={12} /> Vorige
        </button>

        <button
          onClick={handlePrimary}
          className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md bg-teal px-3 text-[11px] font-semibold text-white outline-none transition-opacity hover:opacity-90"
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
     * The reader (design_handoff_web/PAGES.md §3).
     *
     * `padded={false}`: this is one of the two routes whose body fills the shell
     * edge to edge. Two panes, no margin, no radius, no card border - the
     * passage at `flex:1.05` with a single hairline down its right side, the
     * study materials at `flex:1`. Neither pane paints anything but white.
     *
     * The page itself still does NOT scroll, for the reason it never did:
     * someone sits here with a chapter for twenty minutes, and each pane keeps
     * its own scroll container so the frame around the text stays put.
     *
     * The immersive room is gone with the landscape - no `dark` scope, no
     * READING_ROOM palette, no RAIL_GUTTER (the sidebar is a real column now,
     * so nothing has to be inset around a floating rail).
     */
    <>
      {showCompletionOverlay && activeStudy && (
        <CompletionOverlay study={activeStudy} onClose={handleCloseOverlay} />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {/* Mobile pane switcher - only below lg; the design is the desktop
            split, and a phone has room for one pane at a time. */}
        <div className="flex flex-none items-stretch border-b border-line lg:hidden">
          <button
            onClick={() => setMobileView('bible')}
            aria-pressed={mobileView === 'bible'}
            className={[
              'relative flex h-12 flex-1 items-center justify-center gap-1.5 text-sm font-semibold outline-none transition-colors',
              mobileView === 'bible' ? 'text-teal' : 'text-ink-muted hover:text-ink-body',
            ].join(' ')}
          >
            <BookOpen size={16} /> Bijbel
            {mobileView === 'bible' && (
              <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-teal" />
            )}
          </button>
          <button
            onClick={() => setMobileView('materials')}
            aria-pressed={mobileView === 'materials'}
            className={[
              'relative flex h-12 flex-1 items-center justify-center gap-1.5 text-sm font-semibold outline-none transition-colors',
              mobileView === 'materials' ? 'text-teal' : 'text-ink-muted hover:text-ink-body',
            ].join(' ')}
          >
            <MessageCircle size={16} /> Studie
            {mobileView === 'materials' && (
              <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-teal" />
            )}
          </button>
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden lg:flex-row">
        <div
          data-tour="bible-text"
          className={[
            'h-full min-h-0 w-full min-w-0 overflow-hidden lg:h-auto lg:flex-[1.05] lg:border-r lg:border-line',
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
            'relative h-full min-h-0 w-full min-w-0 overflow-hidden lg:h-auto lg:flex-1',
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
    </>
  );
}

export default function StudyPage() {
  return (
    <AppShell title="Lezen" padded={false}>
      <Suspense fallback={null}>
        <StudyPageInner />
      </Suspense>
    </AppShell>
  );
}
