'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

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
  versions,
  books,
  t
}: EmptyStateProps) {
  // Don't show empty state if we have all required selections
  if (selectedBook && selectedChapter && selectedVersion) {
    return null;
  }

  // Don't show empty state while actively loading
  if (loadingBooks || loadingChapters) {
    return null;
  }

  return (
    <div className="py-12 text-center font-inter text-gray-500 dark:text-muted-foreground">
      <div className="space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-[#798777]/20 to-[#798777]/30 dark:from-[#9aaa98]/20 dark:to-[#9aaa98]/30 flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8 text-[#798777] dark:text-[#9aaa98]" />
        </div>
        <div>
          <h3 className="text-lg font-merriweather font-medium text-gray-900 dark:text-foreground mb-2">
            {t('ready_to_study')}
          </h3>
          <div className="text-sm font-inter space-y-1">
            {loadingVersions && <p>{t('loading_translations')}</p>}
            {!loadingVersions && versions.length === 0 && <p>{t('no_translations_available')}</p>}
            {!loadingVersions && versions.length > 0 && selectedVersion && loadingBooks && <p>{t('loading_books')}</p>}
            {!loadingVersions && versions.length > 0 && selectedVersion && !loadingBooks && books.length === 0 && <p>{t('no_books_available')}</p>}
            {!loadingVersions && versions.length > 0 && selectedVersion && !selectedBook && <p>{t('select_book_chapter')}</p>}
            {!selectedVersion && <p>{t('select_translation_start')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

