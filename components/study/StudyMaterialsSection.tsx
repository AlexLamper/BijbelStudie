'use client';

import React, { useState } from 'react';
import { MessageCircle, Users, Info } from 'lucide-react';
import TabComponent from './TabComponent';

import { ReadingPreferences } from '../../hooks/useReadingPreferences';

interface StudyMaterialsSectionProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVersion: string | null;
  selectedCommentary: string;
  versions: { id: string; name: string; language?: string }[];
  onNextChapter: () => void;
  onPrevChapter: () => void;
  onCommentaryChange: (commentary: string) => void;
  onDownload: () => void;
  t: (key: string) => string;
  height?: number;
  preferences?: ReadingPreferences;
}

export default function StudyMaterialsSection({
  selectedBook,
  selectedChapter,
  selectedVersion,
  selectedCommentary,
  versions,
  onNextChapter,
  onPrevChapter,
  onCommentaryChange,
  onDownload,
  t,
  preferences,
}: StudyMaterialsSectionProps) {
  const [activeTab, setActiveTab] = useState('commentary');

  const tabs = [
    { id: 'commentary', label: t('tabs.commentary'),   icon: MessageCircle },
    { id: 'historical', label: t('tabs.general_info'), icon: Info },
    { id: 'notes',      label: t('tabs.notes'),        icon: Users },
  ];

  return (
    <section className="flex flex-col h-full bg-white dark:bg-background">

      {/* Tab bar */}
      <div className="h-14 flex items-center px-3 flex-none border-b overflow-x-auto bg-gray-50 dark:bg-card border-gray-200 dark:border-border">
        <div className="flex gap-0.5">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={[
                  'relative flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                  active
                    ? 'text-[#0D9488] bg-[rgba(13,148,136,0.07)] dark:bg-[rgba(13,148,136,0.12)]'
                    : 'text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground hover:bg-gray-100 dark:hover:bg-secondary',
                ].join(' ')}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#0D9488]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative bg-white dark:bg-background">
        <TabComponent
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          selectedVersion={selectedVersion}
          selectedCommentary={selectedCommentary}
          t={t}
          versions={versions}
          onNextChapter={onNextChapter}
          onPrevChapter={onPrevChapter}
          onCommentaryChange={onCommentaryChange}
          onDownload={onDownload}
          height={1}
          activeTab={activeTab}
          preferences={preferences}
        />
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10
          bg-gradient-to-t from-white dark:from-background to-transparent" />
      </div>
    </section>
  );
}
