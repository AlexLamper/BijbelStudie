'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import AiAssistantIcon from '../ui/AiAssistantIcon';
import { useSession } from 'next-auth/react';
import TabComponent from './TabComponent';
import { FadeBottom } from '../kit/primitives';

import { ReadingPreferences } from '../../hooks/useReadingPreferences';
import { useIsPro } from '../../hooks/useIsPro';

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

  // The PRO mark on Grondtekst is an upsell, so a Pro reader never sees it.
  // Same flag OriginalText gates the verses on (session.user.isSubscribed via
  // useIsPro), so mark and access cannot disagree. Held back while the session
  // is still loading so a Pro reader never sees it flash in and out.
  const { status: sessionStatus } = useSession();
  const isPro = useIsPro();
  const showProMark = sessionStatus !== 'loading' && !isPro;

  /**
   * The five tabs, in the design's order and with its two marks: a PRO label on
   * Grondtekst (not for Pro readers), and an "AI" speech bubble on the AI assistant. Only Commentaar carries
   * an icon - the rest are words, so the row fits the 446 px pane without
   * wrapping (design_handoff_web/PAGES.md §3).
   */
  const tabs = [
    { id: 'commentary', label: t('tabs.commentary'),   icon: true,  isPro: false, star: false },
    { id: 'original',   label: t('tabs.original'),     icon: false, isPro: showProMark, star: false },
    { id: 'historical', label: t('tabs.general_info'), icon: false, isPro: false, star: false },
    { id: 'notes',      label: t('tabs.notes'),        icon: false, isPro: false, star: false },
    { id: 'ai',         label: 'AI-assistent',         icon: false, isPro: false, star: true  },
  ];

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden bg-surface">

      {/* Tab bar - 56 px, underline style, the pane's only hairline. */}
      <div className="flex h-14 flex-none items-stretch gap-[14px] overflow-x-auto border-b border-line px-4 max-md:h-12 max-md:gap-4 max-md:overscroll-x-contain">
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
                  ? 'border-teal font-semibold text-teal dark:text-teal-400'
                  : 'border-transparent font-medium text-ink-muted hover:text-ink-body',
              ].join(' ')}
            >
              {icon && <MessageSquare size={15} strokeWidth={1.8} className="flex-shrink-0" />}
              {star && (
                // The "AI" speech bubble: says "ask the assistant here", and is
                // the same mark the FAB in the corner wears.
                <AiAssistantIcon size={16} strokeWidth={1.8} className="flex-shrink-0" />
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
