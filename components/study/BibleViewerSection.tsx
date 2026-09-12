'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, NotebookPen, Volume2 } from 'lucide-react';
import ChapterViewer from './ChapterViewer';
import BibleSelector from './BibleSelector';
import EmptyState from './EmptyState';
import SpeakButton from './SpeakButton';
import { SpokenTextScope } from './SpokenText';
import { ReadingPreferencesMenu } from './ReadingPreferencesMenu';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';
import { useVerseAnnotations } from '../../hooks/useVerseAnnotations';
import { FadeBottom } from '../kit/primitives';

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
}

/** A 36 px square control in the toolbar: white, hairline border, radius 9. */
const TOOL_BTN =
  'flex h-9 w-9 flex-none items-center justify-center rounded-[9px] border border-line bg-white text-ink-body transition-colors hover:bg-line-soft disabled:cursor-not-allowed disabled:opacity-40';

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

  return (
    <SpokenTextScope>
      <section className="flex h-full min-w-0 flex-col bg-white">
        {/* Toolbar - 56 px, in the design's order: reading preferences, a rule,
            then the chapter controls, and read-aloud alone on the right. */}
        <div
          data-tour="bible-selector"
          className="flex h-14 flex-none items-center gap-[9px] border-b border-line px-4"
        >
          <ReadingPreferencesMenu preferences={preferences} onUpdate={onUpdatePreferences} />

          <div className="mx-[2px] h-[22px] w-px flex-none bg-line" />

          <button
            onClick={onPreviousChapter}
            disabled={selectedChapter <= 1}
            title={t('previous_chapter')}
            aria-label={t('previous_chapter')}
            className={TOOL_BTN}
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
            className={TOOL_BTN}
          >
            <ChevronRight size={17} strokeWidth={2} />
          </button>

          <div className="flex-1" />

          {/* An icon button, never a labelled one: the toolbar is already five
              controls wide and the glyph says it. */}
          <SpeakButton
            compact
            showSettings={false}
            getText={() => chapterText}
            label="Lees hoofdstuk voor"
            className="h-8 w-8 flex-none rounded-lg text-teal hover:bg-line-soft"
            icon={<Volume2 size={17} strokeWidth={1.9} />}
          />
        </div>

        {/* The chapter line. It sits ABOVE the scroller, so it stays put while
            the passage moves under it. */}
        {selectedBook && selectedChapter ? (
          <div className="flex flex-none items-center px-[30px] pt-[14px]">
            <div className="flex-1 text-[12px] font-bold uppercase tracking-[1.3px] text-ink-muted">
              {selectedBook} {selectedChapter}
            </div>
            {(marks.notes > 0 || marks.highlights > 0) && (
              <div className="flex items-center gap-[6px]">
                <NotebookPen size={15} strokeWidth={1.8} className="text-teal" />
                {/* teal-dark, not teal: #0D9488 as 12 px type on white is 3.1:1. */}
                <span className="text-[12px] font-semibold text-teal-dark tabular-nums">{marks.notes}</span>
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
          <div className="absolute inset-0 overflow-y-auto px-[30px] pb-32 pt-[14px]">
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
