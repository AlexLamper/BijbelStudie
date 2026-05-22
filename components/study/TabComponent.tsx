'use client';

import React from 'react';
import { ChapterNotes } from './ChapterNotes';
import HistoricalContext from './HistoricalContext';
import { useKeyboardShortcuts, KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';
import CommentaryComponent from './CommentaryComponent';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';

interface TabComponentProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVersion?: string | null;
  selectedCommentary?: string;
  t: (key: string) => string;
  versions: { id: string; name: string; language?: string }[];
  versionObjects?: { id: string; name: string; abbreviation: string }[];
  onNextChapter: () => void;
  onPrevChapter: () => void;
  onCommentaryChange?: (commentary: string) => void;
  onDownload: () => void;
  height?: number;
  preferences?: ReadingPreferences;
}

export default function TabComponent({
  selectedBook,
  selectedChapter,
  selectedCommentary,
  t,
  onNextChapter,
  onPrevChapter,
  onCommentaryChange,
  onDownload,
  height,
  activeTab,
  preferences,
}: TabComponentProps & { activeTab: string }) {
  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'ArrowRight',
      action: onNextChapter,
      description: t('shortcuts.next_chapter')
    },
    {
      key: 'ArrowLeft',
      action: onPrevChapter,
      description: t('shortcuts.prev_chapter')
    },
    {
      key: 'd',
      action: onDownload,
      description: t('shortcuts.download')
    },
  ];

  // Enable keyboard shortcuts
  useKeyboardShortcuts({ shortcuts });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'commentary':
        return (
          <CommentaryComponent
            book={selectedBook}
            chapter={selectedChapter}
            source={selectedCommentary || "matthew-henry"}
            onSourceChange={onCommentaryChange}
            height={height}
            preferences={preferences}
          />
        );
      case 'historical':
        return (
          <HistoricalContext
            book={selectedBook || ''}
            chapter={selectedChapter || 0}
            t={t}
            preferences={preferences}
          />
        );
      case 'notes':
        return (
          <div className="space-y-4">
            <ChapterNotes 
              book={selectedBook} 
              chapter={selectedChapter}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={height ? "flex flex-col h-full min-w-0" : "h-full min-w-0"}>
      {/* Tab Content */}
      <div className={height ? "flex-1 min-h-0 min-w-0 overflow-hidden" : "min-h-[400px] h-full min-w-0"}>
        {renderTabContent()}
      </div>
    </div>
  );
}
