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
    <section className="flex flex-col h-full bg-white dark:bg-background">

      {/* Toolbar */}
      <div data-tour="bible-selector" className="h-14 flex items-center justify-between px-3 flex-none gap-2 border-b bg-gray-50 dark:bg-card border-gray-200 dark:border-border">
        <ReadingPreferencesMenu preferences={preferences} onUpdate={onUpdatePreferences} />

        <div className="w-px h-5 mx-1 bg-gray-200 dark:bg-border" />

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

      {/* Content */}
      <div className="flex-1 relative min-h-0 bg-white dark:bg-background">
        <div className="h-full overflow-y-auto p-4 sm:p-6 pb-36">
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
        <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10
          bg-gradient-to-t from-white dark:from-background to-transparent" />
      </div>

      {bottomBar}
    </section>
  );
}
