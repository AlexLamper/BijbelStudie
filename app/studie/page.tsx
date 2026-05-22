'use client';

import React, { useCallback, useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useTranslation } from '../i18n/client';
import { useSearchParams } from 'next/navigation';
import { useBibleData } from '../../hooks/useBibleData';
import { useReadingPreferences } from '../../hooks/useReadingPreferences';
import BibleViewerSection from '../../components/study/BibleViewerSection';
import StudyMaterialsSection from '../../components/study/StudyMaterialsSection';
import StartupAnimation from '../../components/ui/startup-animation';
import { CheckCircle, ChevronLeft, ChevronRight, X, Trophy } from 'lucide-react';

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

  return (
    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-t border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50">
      <button
        onClick={() => onGoto(lessonIdx - 1)}
        disabled={lessonIdx === 0}
        className="flex items-center justify-center w-6 h-6 rounded disabled:opacity-30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
        title="Vorige les"
      >
        <ChevronLeft size={14} />
      </button>

      <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 tabular-nums">
        {lessonIdx + 1}/{total}
      </span>

      <button
        onClick={() => onMarkDone(lessonIdx)}
        className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
          isDone
            ? 'text-teal-500 cursor-default'
            : 'text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900'
        }`}
        title={isDone ? 'Gedaan' : 'Markeer als gedaan'}
      >
        <CheckCircle size={14} />
      </button>

      {!isLast ? (
        <button
          onClick={() => onGoto(lessonIdx + 1)}
          className="flex items-center justify-center w-6 h-6 rounded text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
          title="Volgende les"
        >
          <ChevronRight size={14} />
        </button>
      ) : (
        <button
          onClick={onFinish}
          className="flex items-center justify-center w-6 h-6 rounded text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
          title="Studie afronden"
        >
          <Trophy size={13} />
        </button>
      )}

      <button
        onClick={onDismiss}
        className="ml-auto flex items-center justify-center w-5 h-5 rounded text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
        title="Studie verbergen"
      >
        <X size={11} />
      </button>
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

      <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">
        <div className="h-full w-full lg:w-1/2 lg:flex-none min-h-0 min-w-0 overflow-hidden border-r border-border">
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

        <div className="h-full w-full lg:w-1/2 lg:flex-none min-h-0 min-w-0 overflow-hidden">
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
