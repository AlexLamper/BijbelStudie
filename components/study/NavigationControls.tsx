'use client';

import React from 'react';

interface NavigationControlsProps {
  selectedChapter: number;
  maxChapter: number;
  loadingChapters: boolean;
  selectedBook: string;
  chapters: number[];
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  t: (key: string) => string;
}

export default function NavigationControls({
  selectedChapter,
  maxChapter,
  loadingChapters,
  selectedBook,
  chapters,
  onPreviousChapter,
  onNextChapter,
  t
}: NavigationControlsProps) {
  const isPreviousDisabled = selectedChapter <= 1 || loadingChapters || !selectedBook || chapters.indexOf(selectedChapter) === 0;
  const isNextDisabled = selectedChapter >= maxChapter || loadingChapters || !selectedBook || chapters.indexOf(selectedChapter) === chapters.length - 1;

  return (
    <div className="flex items-end gap-1 sm:gap-2">
      <button
        className="p-1 sm:p-2 bg-gray-100 hover:bg-gray-200 hover:ring-2 hover:ring-[#0D9488] transition shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] dark:bg-card dark:hover:bg-accent dark:hover:ring-[#0D9488] dark:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('previous_chapter')}
        onClick={onPreviousChapter}
        disabled={isPreviousDisabled}
      >
        <svg width="14" height="14" className="sm:w-[18px] sm:h-[18px]" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        className="p-1 sm:p-2 bg-gray-100 hover:bg-gray-200 hover:ring-2 hover:ring-[#0D9488] transition shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] dark:bg-card dark:hover:bg-accent dark:hover:ring-[#0D9488] dark:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('next_chapter')}
        onClick={onNextChapter}
        disabled={isNextDisabled}
      >
        <svg width="14" height="14" className="sm:w-[18px] sm:h-[18px]" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
