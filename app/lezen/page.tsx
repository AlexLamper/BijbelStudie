'use client';

import React, { useCallback, useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useTranslation } from '../i18n/client';
import { useSearchParams } from 'next/navigation';
import { useBibleData } from '../../hooks/useBibleData';
import { useReadingPreferences } from '../../hooks/useReadingPreferences';
import BibleViewerSection from '../../components/study/BibleViewerSection';
import StudyMaterialsSection from '../../components/study/StudyMaterialsSection';
import AiAssistantWidget from '../../components/study/AiAssistantWidget';
import { ArrowLeft, BookOpen, CheckCircle, ChevronLeft, ChevronRight, X, Trophy, MessageCircle } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { normaliseDashes } from '../../lib/textFormat';
import { trackNow } from '../../lib/analytics';
import { toBookIndex } from '../../lib/readChaptersCanon';
import { resolveBookInList } from '../../lib/book-mapping';
import { buildReaderSearch, parseReaderLocation, readerLocationKey } from '../../lib/readerUrl';
import AppShell from '../../components/shell/AppShell';
import ResizableSplit from '../../components/ui/resizable-split';
import { testamentPair, type CrossRefNavigateTarget } from '../../components/study/crossrefs/CrossRefList';
import { useCrossRefCopy } from '../../components/study/crossrefs/copy';

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
  const parts = normaliseDashes(vr).split(/[-–]/);
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
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-faint">
          <Trophy size={38} className="text-teal" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-ink">Studie voltooid!</h2>
        <p className="mb-1 text-sm text-ink-muted">
          Je hebt alle <span className="font-semibold text-ink">{study.lessons.length} lessen</span> afgerond van
        </p>
        <p className="mb-6 mt-1 text-base font-bold text-teal dark:text-teal-400">
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
        <span className="inline-flex items-center gap-1 rounded bg-[var(--teal-wash)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal-dark dark:text-teal-400">
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
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:bg-line hover:text-ink-body max-md:-my-2 max-md:h-9 max-md:w-9"
          title="Studiebalk verbergen"
          aria-label="Studiebalk verbergen"
        >
          <X size={11} className="max-md:h-4 max-md:w-4" />
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
      <div className="flex items-center justify-end gap-1.5 px-2 pb-2 max-md:gap-2 max-md:px-3">
        <button
          onClick={() => onGoto(lessonIdx - 1)}
          disabled={lessonIdx === 0}
          className="flex h-7 items-center gap-0.5 rounded-md px-2 text-[10.5px] font-medium text-ink-body transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-30 max-md:h-10 max-md:px-3 max-md:text-[13px]"
          title="Vorige les"
          aria-label="Vorige les"
        >
          <ChevronLeft size={12} /> Vorige
        </button>

        <button
          onClick={handlePrimary}
          className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md bg-teal px-3 text-[11px] font-semibold text-white outline-none transition-opacity hover:opacity-90 max-md:h-10 max-md:px-4 max-md:text-[13px]"
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
  const c = useCrossRefCopy();
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
  /**
   * Where a cross-reference (or a verse heading in the Verwijzingen tab) sent
   * the reader. Stored as a full location rather than a bare verse number, so
   * the mark disappears by itself the moment they turn the page - see
   * `focusVerse` below.
   *
   * Seeded from `?vers`, which is what a cross-reference link carries and what
   * the Back button restores. Straight from the query rather than through an
   * effect, so the mark is already in place on the first render that has a
   * passage - an effect would set it one render too late and the URL sync
   * below would have written a `?vers`-less entry in between.
   */
  const [focusTarget, setFocusTarget] = useState<{ book: string; chapter: number; verse: number } | null>(() => {
    const linked = parseReaderLocation(searchParams);
    return linked?.verse ? { book: linked.book, chapter: linked.chapter, verse: linked.verse } : null;
  });
  /** One level of "back", offered as a chip beside the chapter line. */
  const [crossRefBack, setCrossRefBack] = useState<
    { book: string; chapter: number; verse: number; label: string; surface: string } | null
  >(null);

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

  /**
   * Opens a passage in this reader and marks the verse.
   *
   * Same two-step as `goToLesson`: a different book has to change the book
   * first and park the chapter in `pendingChapter`, because `handleBookChange`
   * resets the chapter to 1 and the real one can only be applied once that
   * book's chapter list has loaded.
   *
   * `verse` is null when the passage was asked for without one - a Back to a
   * plain chapter URL - and then nothing is marked.
   */
  const openPassage = useCallback((book: string, chapter: number, verse: number | null) => {
    setFocusTarget(verse === null ? null : { book, chapter, verse });
    if (book !== selectedBook) {
      bookChangeRef.current(book);
      setPendingChapter(chapter);
    } else {
      chapterChangeRef.current(chapter);
    }
    // On a phone only one pane is on screen; the jump is pointless behind the
    // materials pane.
    setMobileView('bible');
  }, [selectedBook]);

  const handleCrossRefNavigate = useCallback((target: CrossRefNavigateTarget) => {
    // ONE level of back, never a chain: the chip always points at the verse the
    // reader was on when they followed a reference (CROSS_LINKS_PLAN.md §4.2).
    setCrossRefBack({
      book: selectedBook,
      chapter: selectedChapter,
      verse: target.fromVerse,
      label: target.fromLabel,
      surface: target.surface,
    });
    openPassage(target.book, target.chapter, target.verse);
  }, [openPassage, selectedBook, selectedChapter]);

  /** A verse heading in the Verwijzingen tab: scroll the reader beside it. */
  const handleFocusVerse = useCallback((verse: number) => {
    setFocusTarget({ book: selectedBook, chapter: selectedChapter, verse });
    setMobileView('bible');
  }, [selectedBook, selectedChapter]);

  const handleCrossRefBack = useCallback(() => {
    if (!crossRefBack) return;
    const from = crossRefBack;
    setCrossRefBack(null);
    const pair = testamentPair(toBookIndex(selectedBook), toBookIndex(from.book));
    trackNow('crossref_followed', {
      surface: from.surface,
      action: 'back',
      platform: 'web',
      ...(pair ? { testament: pair } : {}),
    });
    openPassage(from.book, from.chapter, from.verse);
  }, [crossRefBack, openPassage, selectedBook]);

  /**
   * The mark only belongs to the passage it was set on, so turning the page
   * clears it without anything having to remember to.
   */
  const focusVerse =
    focusTarget && focusTarget.book === selectedBook && focusTarget.chapter === selectedChapter
      ? focusTarget.verse
      : null;

  /** Back where they started: nothing left to go back to. */
  const showBackChip =
    crossRefBack !== null &&
    !(crossRefBack.book === selectedBook && crossRefBack.chapter === selectedChapter);

  /* ── URL ⇄ reader (CROSS_LINKS_PLAN.md §4.2, phase 2b) ────────
   *
   * The reader's place lived in React state only: `useBibleData` read
   * `?book`/`?chapter` on mount and never again, so following a
   * cross-reference changed the screen but not the address bar, and Back left
   * /lezen altogether instead of undoing the jump.
   *
   * Two effects keep the two in step, both guarded by the same ref - the
   * location the URL is currently understood to name. Whichever side moves
   * first writes that ref, so the other side recognises its own move and does
   * not bounce it back. That is the whole loop guard.
   *
   * `history.pushState` rather than `router.push`: the history entry is the
   * same one (Back and Forward work), it is what this codebase already uses to
   * rewrite a query string (`lib/commands/deepLink.ts`,
   * `components/study/flow/StudyFlowShell.tsx`, /notities, /feedback), and it
   * is the only one of the two that is free - `router.push` to the same route
   * with different params still fetches an RSC payload and runs middleware on
   * every chapter turn, and per-request CPU here is a standing constraint.
   * Next.js patches both history methods, so `usePathname`/`useSearchParams`
   * follow along and a popstate restores the entry client-side.
   */
  /** Key of the location the URL names; null while it names none. */
  const urlLocationRef = useRef<string | null>(null);
  /** `?version` as last agreed, so a translation switch can be told apart. */
  const urlVersionRef  = useRef<string | null>(null);
  const urlSeededRef   = useRef(false);
  const urlWrittenRef  = useRef(false);

  // URL → reader. Declared first so that on mount it seeds the refs from the
  // deep link before the writing effect below can normalise it away.
  useEffect(() => {
    const target = parseReaderLocation(searchParams);

    if (!urlSeededRef.current) {
      // Mount: `useBibleData` is already opening this passage from these same
      // params, and `focusTarget` was seeded from `?vers`. Nothing to do but
      // remember what the URL says.
      urlSeededRef.current  = true;
      urlLocationRef.current = readerLocationKey(target);
      urlVersionRef.current  = searchParams.get('version');
      return;
    }

    // A bare /lezen - what the command palette and the rail link to - names no
    // passage, and that is not an instruction to move anyone.
    if (!target) return;
    // Our own write, coming back around through `useSearchParams`.
    if (readerLocationKey(target) === urlLocationRef.current) return;

    // Back, Forward, or a link into the reader from a page already on screen.
    // The book is resolved against the translation's own list first: a link
    // may spell it any way (`lib/bibleProgress.ts`, BijbelQuiz, an English
    // name), and handing an unknown one to the reader empties its chapter
    // list. Unresolvable for now (the book list is still loading) - leave the
    // ref alone and let the effect run again when `books` arrives.
    const book = books.length === 0 ? target.book : resolveBookInList(target.book, books);
    if (!book) return;

    urlLocationRef.current = readerLocationKey({ ...target, book });
    urlVersionRef.current  = searchParams.get('version');

    if (book === selectedBook && target.chapter === selectedChapter) {
      // Same passage, only the mark moves (Back over a `?vers` step).
      setFocusTarget(target.verse ? { book, chapter: target.chapter, verse: target.verse } : null);
      return;
    }
    openPassage(book, target.chapter, target.verse);
  }, [searchParams, books, selectedBook, selectedChapter, openPassage]);

  // Reader → URL.
  useEffect(() => {
    if (!urlSeededRef.current) return;
    if (!selectedBook || !selectedChapter || !selectedVersion) return;
    // Mid-navigation: a book change shows chapter 1 until `pendingChapter` is
    // applied, and that chapter is not a place anybody asked to be, let alone
    // a step Back should walk through.
    if (pendingChapter !== null || loadingBooks || loadingChapters) return;

    const key = readerLocationKey({ book: selectedBook, chapter: selectedChapter, verse: focusVerse });
    const sameLocation  = key === urlLocationRef.current;
    const sameVersion   = selectedVersion === urlVersionRef.current;
    const firstWrite    = !urlWrittenRef.current;
    urlWrittenRef.current = true;
    if (sameLocation && sameVersion) return;

    urlLocationRef.current = key;
    urlVersionRef.current  = selectedVersion;

    const search = buildReaderSearch(
      window.location.search,
      { book: selectedBook, chapter: selectedChapter, verse: focusVerse },
      selectedVersion,
    );
    const url = `${window.location.pathname}${search}${window.location.hash}`;

    // A new entry only for a passage the reader moved to themselves. The first
    // write only spells out where they already are (a bare /lezen resolves to
    // last-read), and switching translation keeps the same verse in view - two
    // Backs that would do nothing visible.
    if (firstWrite || !sameVersion) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  }, [
    selectedBook, selectedChapter, selectedVersion, focusVerse,
    pendingChapter, loadingBooks, loadingChapters,
  ]);

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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        {/* Mobile pane switcher - only below lg; the design is the desktop
            split, and a phone has room for one pane at a time. */}
        <div className="flex flex-none items-stretch border-b border-line lg:hidden">
          <button
            onClick={() => setMobileView('bible')}
            aria-pressed={mobileView === 'bible'}
            className={[
              'relative flex h-12 flex-1 items-center justify-center gap-1.5 text-sm font-semibold outline-none transition-colors',
              mobileView === 'bible' ? 'text-teal dark:text-teal-400' : 'text-ink-muted hover:text-ink-body',
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
              mobileView === 'materials' ? 'text-teal dark:text-teal-400' : 'text-ink-muted hover:text-ink-body',
            ].join(' ')}
          >
            <MessageCircle size={16} /> Studie
            {mobileView === 'materials' && (
              <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-teal" />
            )}
          </button>
        </div>

        {/* The two panes, with a divider the reader can move. The passage kept
            `flex:1.05` against the materials' `flex:1` for years, which is
            51.22% - that is still what an untouched reader gets, and the number
            is repeated in the `var()` fallback so the pane is never width:auto
            if the property is missing.

            The rule down the middle IS the handle now: the passage pane used to
            carry `lg:border-r`, and two hairlines next to each other would read
            as a seam. Below `lg` nothing changes - the panes stack and the
            handle is not rendered at all. */}
        <ResizableSplit
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden lg:flex-row"
          storageKey="bs:split:lezen"
          defaultRatio={51.22}
          minRatio={28}
          maxRatio={72}
          minPaneWidth={280}
          ariaLabel="Breedte van bijbeltekst en studiemateriaal aanpassen"
        >
        <div
          className={[
            'h-full min-h-0 w-full min-w-0 overflow-hidden lg:h-auto lg:w-[var(--bs-split-a,51.22%)] lg:flex-none',
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
            focusVerse={focusVerse}
            onCrossRefNavigate={handleCrossRefNavigate}
            headerChip={
              showBackChip && crossRefBack ? (
                <button
                  type="button"
                  onClick={handleCrossRefBack}
                  title={c('back_to', { ref: crossRefBack.label })}
                  className="inline-flex max-w-[55%] flex-none items-center gap-1 rounded-btn border border-line bg-surface px-2 py-[3px] text-[11.5px] font-semibold text-[#0D9488] outline-none transition-colors hover:bg-line-soft dark:text-[#2DD4BF]"
                >
                  <ArrowLeft size={12} aria-hidden className="flex-none" />
                  <span className="truncate">{c('back_to', { ref: crossRefBack.label })}</span>
                </button>
              ) : null
            }
          />
        </div>

        <div
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
            books={books}
            onFocusVerse={handleFocusVerse}
            onCrossRefNavigate={handleCrossRefNavigate}
          />
        </div>
        </ResizableSplit>
      </div>

      {/* Hide the floating widget whenever the AI tab itself is visible:
          on lg+ the materials pane is always shown; below lg only when the
          user is on the 'materials' pane.

          Below md it also steps aside while the study bar is up: a phone shows
          one pane at full width, so the launcher landed on the bar's primary
          button. The AI tab stays one tap away under "Studie". */}
      <AiAssistantWidget
        onAsk={handleAiAsk}
        className={[
          materialsTab === 'ai'
            ? mobileView === 'materials'
              ? 'hidden'
              : 'lg:hidden'
            : '',
          studyBar ? 'max-md:hidden' : '',
        ].join(' ')}
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
