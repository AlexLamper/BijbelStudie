'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import TabComponent from './TabComponent';
import { FadeBottom } from '../kit/primitives';

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
  // Optional controlled tab (used by the studie page to jump to the AI tab)
  activeTab?: string;
  onActiveTabChange?: (id: string) => void;
  aiQuestion?: string | null;
  onAiQuestionConsumed?: () => void;
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
  activeTab: activeTabProp,
  onActiveTabChange,
  aiQuestion,
  onAiQuestionConsumed,
}: StudyMaterialsSectionProps) {
  const [internalTab, setInternalTab] = useState('commentary');
  const activeTab = activeTabProp ?? internalTab;
  const setActiveTab = onActiveTabChange ?? setInternalTab;

  /**
   * The five tabs, in the design's order and with its two marks: a PRO label on
   * Grondtekst, and a filled star on the AI assistant. Only Commentaar carries
   * an icon - the rest are words, so the row fits the 446 px pane without
   * wrapping (design_handoff_web/PAGES.md §3).
   */
  const tabs = [
    { id: 'commentary', label: t('tabs.commentary'),   icon: true,  isPro: false, star: false },
    { id: 'original',   label: t('tabs.original'),     icon: false, isPro: true,  star: false },
    { id: 'historical', label: t('tabs.general_info'), icon: false, isPro: false, star: false },
    { id: 'notes',      label: t('tabs.notes'),        icon: false, isPro: false, star: false },
    { id: 'ai',         label: 'AI-assistent',         icon: false, isPro: false, star: true  },
  ];

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden bg-white">

      {/* Tab bar - 56 px, underline style, the pane's only hairline. */}
      <div className="flex h-14 flex-none items-stretch gap-[14px] overflow-x-auto border-b border-line px-4">
        {tabs.map(({ id, label, icon, isPro, star }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={label}
              data-track={`reading_tab_${id === "historical" ? "historical" : id}`}
              className={[
                'flex h-full flex-none items-center gap-[6px] whitespace-nowrap border-b-2 px-[2px] text-[13px] outline-none transition-colors',
                active
                  ? 'border-teal font-semibold text-teal'
                  : 'border-transparent font-medium text-ink-muted hover:text-ink-body',
              ].join(' ')}
            >
              {icon && <MessageSquare size={15} strokeWidth={1.8} className="flex-shrink-0" />}
              {star && (
                // A filled four-point star in teal-dark: the one glyph that
                // says "this answer is generated", and the same mark the FAB
                // in the corner wears.
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="flex-shrink-0 fill-teal-dark">
                  <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
                </svg>
              )}
              <span>{label}</span>
              {isPro && (
                <span className="rounded-[4px] bg-gold px-[5px] py-[2px] text-[10px] font-bold tracking-[0.6px] text-gold-ink">
                  PRO
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
          aiQuestion={aiQuestion}
          onAiQuestionConsumed={onAiQuestionConsumed}
        />
        {/* The same 96 px wash the passage pane draws. */}
        <FadeBottom />
      </div>
    </section>
  );
}
