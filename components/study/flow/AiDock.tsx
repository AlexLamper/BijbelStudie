'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import AiAssistant from '../AiAssistant';
import type { StepKey } from '../../../lib/studyFlow';

const TEAL = '#0D9488';

/** The pill label follows the step, so the offer is about what is on screen. */
const PILL_LABEL: Record<StepKey, string> = {
  intro: 'Vraag over deze studie',
  word: 'Vraag over dit vers',
  depth: 'Vraag over deze uitleg',
  reflection: 'Help me met deze vraag',
  quiz: 'Vraag over deze vragen',
};

/** Step-specific starters, replacing the assistant's generic ones. */
const STARTERS: Record<StepKey, string[]> = {
  intro: [
    'Wat is de context van dit gedeelte?',
    'Wie schreef dit, en voor wie?',
    'Waar in de bijbelse tijdlijn staat dit?',
  ],
  word: [
    'Leg dit gedeelte uit in eenvoudige woorden',
    'Welke woorden zijn hier belangrijk in de grondtekst?',
    'Welke andere gedeelten sluiten hierop aan?',
  ],
  depth: [
    'Wat is de kernboodschap van dit hoofdstuk?',
    'Leg de historische achtergrond uit',
    'Waarom is dit detail belangrijk?',
  ],
  reflection: [
    'Help me deze vraag te begrijpen',
    'Wat betekent dit gedeelte voor mijn leven vandaag?',
    'Geef me een voorbeeld uit het dagelijks leven',
  ],
  quiz: [
    'Leg uit waarom dit het juiste antwoord is',
    'Wat is de kernboodschap van dit hoofdstuk?',
  ],
};

/**
 * The assistant, always one click away and never in the way.
 *
 * Mounted ONCE by the flow shell, outside the step body. That placement is the
 * whole point: the conversation survives moving between steps, where the old
 * design made you type into a popup, teleported you to a tab, and lost the
 * thread. The passage and step travel with it as context.
 *
 * On large screens it opens as a side drawer and the step body SHRINKS rather
 * than being covered, so you can read and ask at the same time. Below that it
 * is a bottom sheet, because there is no room to do both.
 */
export default function AiDock({
  open,
  onOpenChange,
  book,
  chapter,
  version,
  step,
  draft,
  onDraftConsumed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: string;
  chapter: number;
  version: string | null;
  step: StepKey;
  draft?: string | null;
  onDraftConsumed?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  // Keep the assistant mounted after first open so the conversation is not
  // thrown away when the drawer closes.
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-20 right-5 sm:bottom-24 lg:bottom-6 z-40 inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full shadow-lg text-white text-sm font-semibold transition-transform hover:scale-105"
        style={{ backgroundColor: TEAL }}
      >
        <Sparkles size={15} />
        <span className="hidden sm:inline">{PILL_LABEL[step]}</span>
        <span className="sm:hidden">AI</span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop for the sheet only. The lg drawer sits beside the content. */}
      <div
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-label="AI-assistent"
        className={[
          'fixed z-50 bg-white dark:bg-card border-gray-200 dark:border-border flex flex-col',
          // Bottom sheet on small screens.
          'inset-x-0 bottom-0 h-[75vh] rounded-t-2xl border-t',
          // Side drawer from lg up.
          'lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:w-[420px] lg:rounded-none lg:border-t-0 lg:border-l',
        ].join(' ')}
      >
        <header className="flex-none flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={15} style={{ color: TEAL }} />
            <span className="text-sm font-bold text-foreground">AI-assistent</span>
            <span className="text-xs text-gray-400 dark:text-muted-foreground">
              {book} {chapter}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Sluiten"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-secondary text-muted-foreground"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 min-h-0">
          {mounted && (
            <AiAssistant
              book={book}
              chapter={chapter}
              version={version}
              starterQuestions={STARTERS[step]}
              draft={draft}
              onDraftConsumed={onDraftConsumed}
            />
          )}
        </div>
      </aside>
    </>
  );
}
