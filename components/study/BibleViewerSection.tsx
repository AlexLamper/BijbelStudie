'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ChapterViewer from './ChapterViewer';
import BibleSelector from './BibleSelector';
import EmptyState from './EmptyState';
import { ReadingPreferencesMenu } from './ReadingPreferencesMenu';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';

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
  return (
    /*
     * Transparent, not white.
     *
     * This section and StudyMaterialsSection are the two panes of /lezen and of
     * nothing else - the guided lesson reads through PassageReader, not through
     * here. Since the reading room became the scene's own ground rather than a
     * lit plate floating on it (see READING_ROOM in app/lezen/page.tsx), the
     * pane must not paint a surface of its own: it lets the room show through,
     * and the room's `dark` scope is what turns every token below into its
     * light-on-dark value. Scripture lands at 18.1:1 on that ground.
     */
    <section className="flex flex-col h-full min-w-0">

      {/* Toolbar. Recessed with the scene's own scrim value rather than lifted
          on `bg-card`, so the passage stays the lightest thing in the room; the
          hairline is white at low alpha, the way every edge on a scene page is.
          Controls measure 16.8:1 and their chips 13.7:1 against it. */}
      <div data-tour="bible-selector" className="h-14 flex items-center justify-between px-3 flex-none gap-2 border-b border-white/10 bg-black/25">
        <ReadingPreferencesMenu preferences={preferences} onUpdate={onUpdatePreferences} />

        <div className="w-px h-5 mx-1 bg-white/15" />

        {/* Previous */}
        <button
          onClick={onPreviousChapter}
          disabled={selectedChapter <= 1}
          title={t('previous_chapter')}
          className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-8 h-8
            bg-gray-100 dark:bg-secondary border border-gray-200 dark:border-border
            text-gray-700 dark:text-foreground hover:bg-gray-200 dark:hover:bg-secondary/70"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Selector */}
        <div className="flex-1 px-1 sm:px-3 flex justify-center">
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
        </div>

        {/* Next */}
        <button
          onClick={onNextChapter}
          disabled={selectedChapter >= maxChapter}
          title={t('next_chapter')}
          className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-8 h-8
            bg-gray-100 dark:bg-secondary border border-gray-200 dark:border-border
            text-gray-700 dark:text-foreground hover:bg-gray-200 dark:hover:bg-secondary/70"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content. The scroll container is unchanged - same measure, same
          padding, same `overflow-y-auto`: the room stays still and only the
          passage moves, which is the whole reason this page does not scroll. */}
      <div className="flex-1 relative min-h-0">
        <div className="h-full overflow-y-auto px-4 sm:px-6 pt-3 pb-36">
          {selectedBook && selectedChapter && selectedVersion ? (
            <ChapterViewer
              version={selectedVersion}
              book={selectedBook}
              chapter={selectedChapter}
              maxChapter={maxChapter}
              preferences={preferences}
              highlightRange={highlightRange}
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
        {/* The fade that says there is more below. It has to end on the exact
            colour of the ground it stands on, and the ground is now the scene's
            own #0B1220 rather than a theme surface - `from-background` would
            paint the token, which nested panes may already have shifted. */}
        <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10
          bg-gradient-to-t from-[#0B1220] to-transparent" />
      </div>

      {bottomBar}
    </section>
  );
}
