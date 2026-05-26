'use client';

import React, { useState } from 'react';
import { MessageCircle, Users, Info, Languages } from 'lucide-react';
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
    { id: 'commentary', label: t('tabs.commentary'),   icon: MessageCircle, isPro: false },
    { id: 'original',   label: t('tabs.original'),     icon: Languages,     isPro: true },
    { id: 'historical', label: t('tabs.general_info'), icon: Info,          isPro: false },
    { id: 'notes',      label: t('tabs.notes'),        icon: Users,         isPro: false },
  ];

  return (
    <section className="flex flex-col h-full min-w-0 overflow-hidden bg-white dark:bg-background">

      {/* Tab bar */}
      <div className="h-14 flex items-center px-1 flex-none border-b bg-gray-50 dark:bg-card border-gray-200 dark:border-border">
        <div className="flex w-full gap-0.5">
          {tabs.map(({ id, label, icon: Icon, isPro }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                title={label}
                className={[
                  'relative flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 py-1.5 text-[9px] sm:text-xs font-medium rounded-lg transition-colors min-w-0',
                  active
                    ? 'text-[#0D9488] bg-[rgba(13,148,136,0.07)] dark:bg-[rgba(13,148,136,0.12)]'
                    : 'text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground hover:bg-gray-100 dark:hover:bg-secondary',
                ].join(' ')}
              >
                <Icon size={13} className="flex-shrink-0" />
                <span className="leading-tight truncate max-w-full">{label}</span>
                {isPro && (
                  <span className="hidden sm:inline text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none bg-[rgba(13,148,136,0.10)] dark:bg-[rgba(13,148,136,0.18)] text-[#0D9488] dark:text-teal-400">
                    Pro
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-1.5 right-1.5 h-0.5 rounded-full bg-[#0D9488]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col relative bg-white dark:bg-background">
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
