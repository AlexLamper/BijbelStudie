'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, GraduationCap, MoreVertical, NotebookPen, Pause, Play, Square, Volume2 } from 'lucide-react';
import ChapterViewer from './ChapterViewer';
import BibleSelector from './BibleSelector';
import EmptyState from './EmptyState';
import SpeakButton, { type SpeakButtonHandle, type SpeakStatus } from './SpeakButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { SpokenTextScope } from './SpokenText';
import { ReadingPreferencesMenu } from './ReadingPreferencesMenu';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';
import { useVerseAnnotations } from '../../hooks/useVerseAnnotations';
import { FadeBottom } from '../kit/primitives';
import { chapterStudyHref } from '../../lib/chapterStudyRef';
import type { CrossRefNavigateTarget } from './crossrefs/CrossRefList';

interface BibleViewerSectionProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVersion: string | null;
  maxChapter: number;
  loadingBooks: boolean;
  loadingChapters: boolean;
  loadingVersions: boolean;
  versions: { id: string; name: string; language?: string }[];
  books: string[];
  chapters: number[];
  onVersionChange: (v: string) => void;
  onBookChange: (b: string) => void;
  onChapterChange: (c: number) => void;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  t: (key: string) => string;
  preferences: ReadingPreferences;
  onUpdatePreferences: (prefs: Partial<ReadingPreferences>) => void;
  highlightRange?: { start: number; end: number };
  bottomBar?: React.ReactNode;
  /**
   * Scroll to and mark one verse - where a followed cross-reference lands.
   * Handed straight to `ChapterViewer`, which reuses its highlight scroll.
   */
  focusVerse?: number | null;
  /** A cross-reference was followed; the page moves the reader. */
  onCrossRefNavigate?: (target: CrossRefNavigateTarget) => void;
  /**
   * A chip beside the chapter line - today only "Terug naar Psalmen 51:3"
   * after a cross-reference jump. A node rather than a string, because the page
   * owns the one-level back stack and this pane only finds it a place to sit.
   */
  headerChip?: React.ReactNode;
}

/** A 36 px square control in the toolbar: white, hairline border, radius 9. */
const TOOL_BTN =
  'flex h-9 w-9 flex-none items-center justify-center rounded-[9px] border border-line bg-surface text-ink-body transition-colors hover:bg-line-soft disabled:cursor-not-allowed disabled:opacity-40 max-md:h-10 max-md:w-10';

/** One row in the "Meer opties" menu: 40 px tall, so it is a real tap target. */
const MENU_ITEM =
  'min-h-10 cursor-pointer gap-2.5 rounded-lg px-3 text-[13.5px] font-medium text-ink-body no-underline dark:text-foreground [&_svg]:text-teal dark:[&_svg]:text-teal-400';

export default function BibleViewerSection({
  selectedBook,
  selectedChapter,
  selectedVersion,
  maxChapter,
  loadingBooks,
  loadingChapters,
  loadingVersions,
  versions,
  books,
  chapters,
  onVersionChange,
  onBookChange,
  onChapterChange,
  onPreviousChapter,
  onNextChapter,
  t,
  preferences,
  onUpdatePreferences,
  highlightRange,
  bottomBar,
  focusVerse,
  onCrossRefNavigate,
  headerChip,
}: BibleViewerSectionProps) {
  /**
   * What the reader has already marked in THIS chapter.
   *
   * The hook used to be called inside ChapterViewer. It is called here instead
   * and the map is handed down, because the chapter line above the scroller
   * needs the same answer and two callers would mean two requests for one
   * question. This is the second of the two read-only derived values
   * design_handoff_web/RULES.md §3 asks for: a count of notes and of
   * highlights on the open chapter, derived from what /api/notes already
   * returns. Nothing new is stored.
   */
  const { annotations, reload: reloadAnnotations } = useVerseAnnotations(selectedBook, selectedChapter);

  const marks = useMemo(() => {
    let notes = 0;
    let highlights = 0;
    for (const annotation of annotations.values()) {
      if (annotation.notes > 0) notes += 1;
      if (annotation.highlight) highlights += 1;
    }
    return { notes, highlights };
  }, [annotations]);

  /**
   * The chapter's text, published upward by the viewer that fetched it, so the
   * toolbar's read-aloud button has something to hand the voice. The whole
   * pane is one `SpokenTextScope`, so that button and the verses below it
   * share one store and the read-along highlight still lands on the right word.
   */
  const [chapterText, setChapterText] = useState('');

  /**
   * Read-aloud lives in the "Meer opties" menu now, but the voice itself still
   * belongs to one SpeakButton in the toolbar: the menu drives it through this
   * handle and words its row from `speakStatus`. While the voice is busy that
   * button shows beside the menu, so pause/resume stays one tap away.
   */
  const speakRef = useRef<SpeakButtonHandle>(null);
  const [speakStatus, setSpeakStatus] = useState<SpeakStatus>('idle');
  const speakActive = speakStatus === 'playing' || speakStatus === 'paused';
  const canSpeak = speakStatus !== 'unsupported';

  /**
   * "Bestudeer dit hoofdstuk": the open chapter as a single-chapter study
   * (lib/chapterStudy.ts). Null for a book name outside the canon - an English
   * or German translation's own spelling, say - and then no entry point shows.
   * The translation rides along; the study page only accepts a real one.
   */
  const studyHref = useMemo(() => {
    const base = selectedBook && selectedChapter ? chapterStudyHref(selectedBook, selectedChapter) : null;
    if (!base) return null;
    return selectedVersion ? `${base}?vertaling=${encodeURIComponent(selectedVersion)}` : base;
  }, [selectedBook, selectedChapter, selectedVersion]);

  return (
    <SpokenTextScope>
      <section className="flex h-full min-w-0 flex-col bg-surface">
        {/* Toolbar - 56 px, in the design's order: reading preferences, a rule,
            then the chapter controls, and read-aloud alone on the right.

            Below md that single row is 600-odd px of fixed-width boxes, so it
            wraps into two with `order`: translation, type and read-aloud on
            top; previous, book, chapter and next underneath. The DOM order -
            and with it the md+ row - is untouched. */}
        <div
          className="flex h-14 flex-none items-center gap-[9px] border-b border-line px-4 max-md:h-auto max-md:flex-wrap max-md:gap-x-2 max-md:gap-y-0 max-md:px-3 max-md:py-2"
        >
          <ReadingPreferencesMenu
            preferences={preferences}
            onUpdate={onUpdatePreferences}
            triggerClassName="max-md:order-2"
          />

          <div className="mx-[2px] h-[22px] w-px flex-none bg-line max-md:hidden" />

          <button
            onClick={onPreviousChapter}
            disabled={selectedChapter <= 1}
            title={t('previous_chapter')}
            aria-label={t('previous_chapter')}
            className={`${TOOL_BTN} max-md:order-5`}
          >
            <ChevronLeft size={17} strokeWidth={2} />
          </button>

          <BibleSelector
            versions={versions}
            books={books}
            chapters={chapters}
            selectedVersion={selectedVersion}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            onVersionChange={onVersionChange}
            onBookChange={onBookChange}
            onChapterChange={onChapterChange}
            loadingVersions={loadingVersions}
            loadingBooks={loadingBooks}
            loadingChapters={loadingChapters}
            t={t}
          />

          <button
            onClick={onNextChapter}
            disabled={selectedChapter >= maxChapter}
            title={t('next_chapter')}
            aria-label={t('next_chapter')}
            className={`${TOOL_BTN} max-md:order-8`}
          >
            <ChevronRight size={17} strokeWidth={2} />
          </button>

          {/* The spacer; below md, the line break between the two rows. */}
          <div className="flex-1 max-md:order-4 max-md:h-2 max-md:basis-full" />

          {/* The read-aloud control while the voice is busy (loading, playing,
              paused, failed); nothing while idle. It also carries the
              sign-in dialog and the error toast, so it is always mounted. */}
          <SpeakButton
            compact
            showSettings={false}
            hideWhenIdle
            controlRef={speakRef}
            onStatusChange={setSpeakStatus}
            getText={() => chapterText}
            label="Lees hoofdstuk voor"
            className="h-9 w-9 flex-none rounded-lg text-teal dark:text-teal-400 hover:bg-line-soft max-md:order-3 max-md:h-10 max-md:w-10"
            icon={<Volume2 size={17} strokeWidth={1.9} />}
          />

          {/* Voorlezen and "Bestudeer dit hoofdstuk" behind one kebab: the
              toolbar is already five controls wide. */}
          {(canSpeak || studyHref) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Meer opties"
                  aria-label="Meer opties"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-ink-body transition-colors hover:bg-line-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] data-[state=open]:bg-line-soft dark:text-foreground max-md:order-3 max-md:h-10 max-md:w-10"
                >
                  <MoreVertical size={18} strokeWidth={1.9} aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px] rounded-xl p-1.5 dark:border-border">
                {canSpeak && (
                  <DropdownMenuItem
                    className={MENU_ITEM}
                    disabled={speakStatus === 'loading'}
                    onSelect={() => speakRef.current?.toggle()}
                  >
                    {speakStatus === 'playing' ? (
                      <><Pause aria-hidden /> Pauzeer voorlezen</>
                    ) : speakStatus === 'paused' ? (
                      <><Play aria-hidden /> Hervat voorlezen</>
                    ) : (
                      <><Volume2 aria-hidden /> Lees hoofdstuk voor</>
                    )}
                  </DropdownMenuItem>
                )}
                {canSpeak && speakActive && (
                  <DropdownMenuItem className={MENU_ITEM} onSelect={() => speakRef.current?.stop()}>
                    <Square aria-hidden /> Stop voorlezen
                  </DropdownMenuItem>
                )}
                {studyHref && (
                  <DropdownMenuItem asChild className={MENU_ITEM}>
                    <Link href={studyHref} data-track="chapter_study_reader_toolbar">
                      <GraduationCap aria-hidden /> Bestudeer dit hoofdstuk
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* The chapter line. It sits ABOVE the scroller, so it stays put while
            the passage moves under it. */}
        {selectedBook && selectedChapter ? (
          <div className="flex flex-none items-center gap-2 px-[30px] pt-[14px] max-md:px-4">
            <div className="flex-none text-[12px] font-bold uppercase tracking-[1.3px] text-ink-muted">
              {selectedBook} {selectedChapter}
            </div>
            {headerChip}
            <div className="flex-1" />
            {(marks.notes > 0 || marks.highlights > 0) && (
              <div className="flex items-center gap-[6px]">
                <NotebookPen size={15} strokeWidth={1.8} className="text-teal dark:text-teal-400" />
                {/* teal-dark, not teal: #0D9488 as 12 px type on white is 3.1:1. */}
                <span className="text-[12px] font-semibold text-teal-dark dark:text-teal-400 tabular-nums">{marks.notes}</span>
                <span className="h-[3px] w-[3px] rounded-full bg-line-strong" />
                <span className="text-[12px] font-medium text-ink-muted tabular-nums">
                  {marks.highlights} {marks.highlights === 1 ? 'markering' : 'markeringen'}
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* The passage. Absolute scroller inside a relative box, so the fade at
            its foot lies over real text rather than pushing it up. */}
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 overflow-y-auto px-[30px] pb-32 pt-[14px] max-md:px-4">
            {selectedBook && selectedChapter && selectedVersion ? (
              <ChapterViewer
                version={selectedVersion}
                book={selectedBook}
                chapter={selectedChapter}
                maxChapter={maxChapter}
                preferences={preferences}
                highlightRange={highlightRange}
                annotations={annotations}
                onAnnotationsChanged={reloadAnnotations}
                onChapterText={setChapterText}
                studyHref={studyHref}
                books={books}
                focusVerse={focusVerse}
                onCrossRefNavigate={onCrossRefNavigate}
              />
            ) : (
              <EmptyState
                selectedBook={selectedBook}
                selectedChapter={selectedChapter}
                selectedVersion={selectedVersion}
                loadingBooks={loadingBooks}
                loadingChapters={loadingChapters}
                loadingVersions={loadingVersions}
                versions={versions.map(v => v.name)}
                books={books}
                t={t}
              />
            )}
          </div>
          <FadeBottom />
        </div>

        {bottomBar}
      </section>
    </SpokenTextScope>
  );
}
