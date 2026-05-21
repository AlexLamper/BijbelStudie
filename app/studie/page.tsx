'use client';

import React, { useCallback, useState, useEffect, Suspense } from 'react';
import { useTranslation } from '../i18n/client';
import { useSearchParams } from 'next/navigation';
import { useBibleData } from '../../hooks/useBibleData';
import { useReadingPreferences } from '../../hooks/useReadingPreferences';
import BibleViewerSection from '../../components/study/BibleViewerSection';
import StudyMaterialsSection from '../../components/study/StudyMaterialsSection';
import StartupAnimation from '../../components/ui/startup-animation';

function StudyPageInner() {
  const { t, i18n } = useTranslation('study');
  const lng = i18n.resolvedLanguage;
  const searchParams = useSearchParams();

  const { preferences, updatePreferences } = useReadingPreferences();
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem('study-startup-shown');
    if (!hasShown) {
      setShowAnimation(true);
    }
  }, []);

  const handleAnimationComplete = () => {
    sessionStorage.setItem('study-startup-shown', 'true');
    setShowAnimation(false);
  };

  const initialBook    = searchParams.get('book')    ?? undefined;
  const initialChapter = searchParams.get('chapter') ? Number(searchParams.get('chapter')) : undefined;
  const initialVersion = searchParams.get('version') ?? undefined;

  const {
    versions,
    books,
    chapters,
    selectedVersion,
    selectedBook,
    selectedChapter,
    selectedCommentary,
    maxChapter,
    loadingVersions,
    loadingBooks,
    loadingChapters,
    isInitialLoading,
    handleVersionChange,
    handleBookChange,
    handleChapterChange,
    handleCommentaryChange,
    handlePreviousChapter,
    handleNextChapter,
  } = useBibleData(lng ?? 'nl', { initialBook, initialChapter, initialVersion });

  const handleDownload = useCallback(() => {}, []);

  return (
    <div className="h-full flex flex-col font-inter overflow-hidden">
      {showAnimation && (
        <StartupAnimation
          isReady={!isInitialLoading}
          onComplete={handleAnimationComplete}
        />
      )}

      <div className="flex flex-col lg:flex-row h-full w-full">
        {/* Left: Bible viewer */}
        <div className="h-full w-full lg:w-1/2 min-h-0 overflow-hidden border-r border-border">
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
          />
        </div>

        {/* Right: Study materials */}
        <div className="h-full w-full lg:w-1/2 min-h-0 overflow-hidden">
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
          />
        </div>
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense>
      <StudyPageInner />
    </Suspense>
  );
}
