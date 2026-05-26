'use client';

import React, { useCallback, useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useTranslation } from '../i18n/client';
import { useSearchParams } from 'next/navigation';
import { useBibleData } from '../../hooks/useBibleData';
import { useReadingPreferences } from '../../hooks/useReadingPreferences';
import BibleViewerSection from '../../components/study/BibleViewerSection';
import StudyMaterialsSection from '../../components/study/StudyMaterialsSection';
import StartupAnimation from '../../components/ui/startup-animation';
import { BookOpen, CheckCircle, ChevronLeft, ChevronRight, X, Trophy, MessageCircle } from 'lucide-react';

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

/* ── Completion overlay ──────────────────────────────────────── */
function CompletionOverlay({ study, onClose }: { study: ActiveStudy; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center border border-border animate-in fade-in zoom-in-95 duration-200">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
        >
          <Trophy size={38} style={{ color: '#0D9488' }} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Studie voltooid!</h2>
        <p className="text-sm text-muted-foreground mb-1">
          Je hebt alle <span className="font-semibold text-foreground">{study.lessons.length} lessen</span> afgerond van
        </p>
        <p className="text-base font-bold mt-1 mb-6" style={{ color: '#0D9488' }}>
          &ldquo;{study.studyTitle}&rdquo;
        </p>
        <div className="flex items-center gap-2 justify-center mb-7">
          {study.lessons.map((_, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#0D9488' }} />
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#0D9488' }}
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
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(13,148,136,0.15)', color: '#0F766E' }}>
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
          className="inline-flex items-center gap-1 px-3 h-7 rounded-md text-[11px] font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
          style={{ backgroundColor: '#0D9488' }}
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
  const [showAnimation, setShowAnimation]           = useState(false);
  const [activeStudy, setActiveStudy]               = useState<ActiveStudy | null>(null);
  const [lessonIdx, setLessonIdx]                   = useState(0);
  const [pendingChapter, setPendingChapter]         = useState<number | null>(null);
  const [studyCompleted, setStudyCompleted]         = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [mobileView, setMobileView]                 = useState<'bible' | 'materials'>('bible');

  useEffect(() => {
    const hasShown = sessionStorage.getItem('study-startup-shown');
    if (!hasShown) setShowAnimation(true);
  }, []);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('activeStudy');
      if (stored) {
        const s: ActiveStudy = JSON.parse(stored);
        if (!s.completedLessons) s.completedLessons = [];
        setActiveStudy(s);
        setLessonIdx(s.currentLessonIndex ?? 0);
      }
    } catch { /* noop */ }
  }, []);

  const handleAnimationComplete = () => {
    sessionStorage.setItem('study-startup-shown', 'true');
    setShowAnimation(false);
  };

  const initialBook    = searchParams.get('book')    ?? undefined;
  const initialChapter = searchParams.get('chapter') ? Number(searchParams.get('chapter')) : undefined;
  const initialVersion = searchParams.get('version') ?? undefined;

  const {
    versions, books, chapters,
    selectedVersion, selectedBook, selectedChapter,
    selectedCommentary, maxChapter,
    loadingVersions, loadingBooks, loadingChapters, isInitialLoading,
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
    // Auto-advance if not last
    if (idx < activeStudy.lessons.length - 1) goToLesson(idx + 1);
  }, [activeStudy, saveStudy, goToLesson]);

  // Called when user clicks the trophy (finish) button — completes the entire study immediately
  const finishStudy = useCallback(() => {
    if (!activeStudy) return;
    // Mark every lesson as done
    const allDone = activeStudy.lessons.map((_, i) => i);
    const updated = { ...activeStudy, completedLessons: allDone };
    saveStudy(updated);
    // Persist completion to localStorage for /studies page badge
    markStudyCompleted(activeStudy.studyId);
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
    <div className="h-full flex flex-col font-inter overflow-hidden">
      {showAnimation && (
        <StartupAnimation isReady={!isInitialLoading} onComplete={handleAnimationComplete} />
      )}

      {showCompletionOverlay && activeStudy && (
        <CompletionOverlay study={activeStudy} onClose={handleCloseOverlay} />
      )}

      {/* Mobile pane switcher — only below lg; desktop/landscape keeps the split */}
      <div className="lg:hidden flex-none flex items-stretch border-b border-gray-200 dark:border-border bg-gray-50 dark:bg-card">
        <button
          onClick={() => setMobileView('bible')}
          aria-pressed={mobileView === 'bible'}
          className={[
            'flex-1 flex items-center justify-center gap-1.5 h-12 text-sm font-semibold relative transition-colors',
            mobileView === 'bible'
              ? 'text-[#0D9488] bg-[rgba(13,148,136,0.07)] dark:bg-[rgba(13,148,136,0.12)]'
              : 'text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground',
          ].join(' ')}
        >
          <BookOpen size={16} /> Bijbel
          {mobileView === 'bible' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-[#0D9488]" />
          )}
        </button>
        <button
          onClick={() => setMobileView('materials')}
          aria-pressed={mobileView === 'materials'}
          className={[
            'flex-1 flex items-center justify-center gap-1.5 h-12 text-sm font-semibold relative transition-colors',
            mobileView === 'materials'
              ? 'text-[#0D9488] bg-[rgba(13,148,136,0.07)] dark:bg-[rgba(13,148,136,0.12)]'
              : 'text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground',
          ].join(' ')}
        >
          <MessageCircle size={16} /> Studie
          {mobileView === 'materials' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-[#0D9488]" />
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full overflow-hidden">
        <div
          data-tour="bible-text"
          className={[
            'h-full w-full lg:w-1/2 lg:flex-none min-h-0 min-w-0 overflow-hidden border-r border-border',
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
            'h-full w-full lg:w-1/2 lg:flex-none min-h-0 min-w-0 overflow-hidden',
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
          />
        </div>
      </div>
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
