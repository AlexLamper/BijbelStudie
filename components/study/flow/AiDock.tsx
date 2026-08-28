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
 * WHERE IT OPENS depends on the step, because the steps are not shaped alike.
 *
 *  - `half` is for the Verdieping step, which is already a 50/50 split. The dock
 *    lands exactly on the divider and replaces the supporting-panel column, so
 *    the commentary on the left keeps its width and its scroll position.
 *  - `drawer` is for every other step. Their content is a single centred column
 *    - a passage, a textarea, a quiz card - and taking half the screen from
 *    those left the reading squeezed into a gutter with a wall of white beside
 *    it. Here the assistant is a fixed-width panel floating against the right
 *    edge, over the content rather than carved out of it.
 *
 * Neither variant resizes the lesson. An earlier version was a 420px drawer in
 * the layout flow that shrank the header, body and footer to make room, so
 * asking a question reflowed the whole lesson around the reader.
 *
 * It is positioned against the step body, so the shell must give that container
 * `relative`.
 */
export default function AiDock({
  open,
  onOpenChange,
  book,
  chapter,
  version,
  step,
  layout = 'drawer',
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
  /** `half` on the split Verdieping step, `drawer` everywhere else. */
  layout?: 'half' | 'drawer';
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

  // Never unmounted once opened. `return null` here defeated the `mounted` flag
  // three lines up: closing the drawer destroyed AiAssistant and every message
  // in it, so reopening it started a new conversation about the same passage.
  // Hidden instead - the tree stays, the state stays, nothing is focusable.
  if (!open && !mounted) return null;

  return (
    <div className={open ? undefined : 'hidden'} aria-hidden={!open}>
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
          // Bottom sheet on small screens: fixed to the viewport, over the
          // backdrop. Half a phone screen is not enough to read and ask at once.
          'fixed z-50 inset-x-0 bottom-0 h-[75vh] rounded-t-2xl border-t',
          'lg:absolute lg:z-30 lg:inset-y-0 lg:right-0 lg:h-auto lg:border-t-0 lg:border-l',
          layout === 'half'
            ? // Lands on the divider the supporting panels already sit behind,
              // so it replaces that column exactly.
              'lg:left-1/2 lg:w-auto lg:rounded-none'
            : // A panel floating over the step, wide enough to hold a
              // conversation and narrow enough to leave the reading readable.
              'lg:left-auto lg:w-[min(420px,38vw)] lg:rounded-l-2xl lg:shadow-[0_24px_70px_-28px_rgba(2,6,23,0.6)]',
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
    </div>
  );
}
