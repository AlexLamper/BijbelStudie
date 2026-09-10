'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { SkeletonChapter } from '../ui/skeletons';

interface EmptyStateProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVersion: string | null;
  loadingBooks: boolean;
  loadingChapters: boolean;
  loadingVersions: boolean;
  versions: string[];
  books: string[];
  t: (key: string) => string;
}

export default function EmptyState({
  selectedBook,
  selectedChapter,
  selectedVersion,
  loadingBooks,
  loadingChapters,
  loadingVersions,
}: EmptyStateProps) {
  if (selectedBook && selectedChapter && selectedVersion) return null;

  // Books, chapters and the last-read position resolve in parallel on startup.
  // The pane keeps the shape of a chapter while that runs, so it never sits empty.
  if (loadingVersions || loadingBooks || loadingChapters) {
    return (
      <div className="px-6 py-8" role="status" aria-label="Bijbel laden">
        <SkeletonChapter verses={6} />
      </div>
    );
  }

  // Every colour below was an inline literal drawn for a white page - #111827
  // on #FFFFFF, and a #0D9488 glyph on an 8% teal tint. An inline style is the
  // one thing /lezen's `dark` scope cannot correct, and this pane now stands on
  // the scene's navy ground, where #111827 is invisible. Theme tokens instead,
  // so the state reads in both worlds: the heading measures 18.1:1 on the room
  // and the body copy 8.1:1, and the glyph uses the brand's on-dark value.
  return (
    <div className="content-in flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5 bg-[rgba(13,148,136,0.08)] dark:bg-[rgba(45,212,191,0.10)]">
        <BookOpen className="h-7 w-7 text-[#0D9488] dark:text-[#2DD4BF]" />
      </div>

      <h2 className="text-base font-semibold mb-1.5 text-gray-900 dark:text-foreground">
        Klaar om te studeren
      </h2>

      <p className="text-sm leading-relaxed max-w-xs text-gray-600 dark:text-muted-foreground">
        {!selectedVersion
          ? 'Selecteer een vertaling om je studie te beginnen.'
          : !selectedBook
          ? 'Kies een Bijbelboek om verder te gaan.'
          : 'Selecteer een hoofdstuk.'}
      </p>
    </div>
  );
}
