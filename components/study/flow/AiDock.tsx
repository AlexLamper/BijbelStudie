'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import AiAssistant from '../AiAssistant';
import type { StepKey } from '../../../lib/studyFlow';

const TEAL = '#0D9488';

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
 * Mounted ONCE by the flow shell, outside the step body, so the conversation
 * survives moving between steps. The passage and step travel with it as context.
 *
 * It has NO floating trigger of its own. It used to render a pill at
 * `bottom-6 right-5`, which is exactly where the flow's "Volgende" button sits -
 * on the quiz step the pill covered it and the lesson could not be finished. The
 * trigger now lives in the flow header, where nothing else is.
 *
 * WHERE IT OPENS. From lg it rises into the right half of the step body - the
 * space the supporting panels (Toelichting / Beeld / Grondtekst / Notities) use.
 * That half is already the "things that help you read this" column, which is
 * what the assistant is, and the passage on the left keeps its width and its
 * scroll position. The previous version was a 420px viewport-height drawer that
 * shrank the header, body and footer to make room, so asking a question reflowed
 * the whole lesson around the reader.
 *
 * It is positioned against the step body, so the shell must give that container
 * `relative`. Below lg it stays a viewport bottom sheet with a backdrop: half a
 * phone screen is not enough to read and ask at once.
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
  question,
  onQuestionConsumed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: string;
  chapter: number;
  version: string | null;
  step: StepKey;
  draft?: string | null;
  onDraftConsumed?: () => void;
  /** Sent immediately on arrival, unlike `draft` which only fills the input. */
  question?: string | null;
  onQuestionConsumed?: () => void;
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

  if (!open) return null;

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
          'bg-white dark:bg-card border-gray-200 dark:border-border flex flex-col animate-panel-up',
          // Bottom sheet on small screens: fixed to the viewport, over the backdrop.
          'fixed z-50 inset-x-0 bottom-0 h-[75vh] rounded-t-2xl border-t',
          // From lg: the right half of the step body, floor to ceiling. `left-1/2`
          // lands on the divider the supporting panels already sit behind, so the
          // panel replaces that column exactly instead of overlapping the passage.
          'lg:absolute lg:z-30 lg:inset-y-0 lg:left-1/2 lg:right-0 lg:h-auto lg:w-auto lg:rounded-none lg:border-t-0 lg:border-l',
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
              initialQuestion={question}
              onInitialQuestionConsumed={onQuestionConsumed}
            />
          )}
        </div>
      </aside>
    </>
  );
}
