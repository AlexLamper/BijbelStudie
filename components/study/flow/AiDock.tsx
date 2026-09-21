'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import AiAssistant from '../AiAssistant';
import { FOCUS_RING, INK, INK_FAINT, PANEL_FLAT, RULE, scrim } from './lesson-layout';
import type { StepKey } from '../../../lib/studyFlow';

/** Step-specific starters, replacing the assistant's generic ones. */
const STARTERS: Record<StepKey, string[]> = {
  intro: [
    'Waar gaat dit gedeelte over?',
    'Waarom is dit gedeelte belangrijk?',
    'Wat moet ik weten voordat ik ga lezen?',
  ],
  context: [
    'Wie schreef dit, en voor wie?',
    'Waar in de bijbelse tijdlijn staat dit?',
    'Hoe zag het dagelijks leven er toen uit?',
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
    'Hoe breng ik dit deze week in praktijk?',
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
 * IT OPENS THE SAME WAY ON EVERY STEP: as a column in the FLOW, beside the
 * step rather than over it. The step is `flex-1`, this is `flex-none`, and the
 * width is what animates - so opening the assistant narrows the step and its
 * content re-centres in what is left, which reads as the page making room
 * rather than jumping.
 *
 * Verdieping used to be the exception. It is already a 50/50 split, so the dock
 * was pinned over the right half on the theory that it was replacing the
 * supporting-panel column. On screen it simply covered the commentary that was
 * being discussed, which is the one thing the assistant must never do.
 *
 * It does not resize the lesson. An earlier version was a 420px drawer in the
 * layout flow that shrank the header, body and footer to make room, so asking a
 * question reflowed the whole lesson around the reader.
 *
 * Below lg it is a fixed bottom sheet: half a phone screen is not enough to
 * read and ask at once.
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

  // Never unmounted once opened. `return null` here defeated the `mounted` flag
  // three lines up: closing the drawer destroyed AiAssistant and every message
  // in it, so reopening it started a new conversation about the same passage.
  // Hidden instead - the tree stays, the state stays, nothing is focusable.
  if (!open && !mounted) return null;

  return (
    // The outer element is what the flow lays out: an in-flow flex column whose
    // WIDTH is the animation - zero when closed, 400px when open, with
    // `overflow-hidden` clipping the panel inside it so the conversation does
    // not squash while the width moves. The step beside it is `flex-1`, so it
    // simply gets narrower.
    <div
      className={[
        open ? 'contents' : 'hidden',
        'lg:block lg:h-full lg:flex-none lg:overflow-hidden',
        'lg:transition-[width] lg:duration-300 lg:ease-out',
        open ? 'lg:w-[min(400px,36vw)]' : 'lg:w-0',
      ].join(' ')}
      aria-hidden={!open}
    >
      {/* Backdrop for the sheet only. On lg the panel sits beside the content. */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: scrim(0.55) }}
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}

      <aside
        role="dialog"
        aria-label="AI-assistent"
        className={[
          `${PANEL_FLAT} ${RULE} flex flex-col`,
          'animate-panel-up lg:animate-none',
          // Below md: taller, in dynamic viewport units so the browser's own
          // toolbar never hides the input, and clear of the home indicator.
          'fixed z-50 inset-x-0 bottom-0 h-[75vh] rounded-t-2xl border-t max-md:h-[85dvh] max-md:pb-[env(safe-area-inset-bottom)]',
          // Static and fixed-width, so the clipping parent can animate around it
          // without the header and the message list reflowing mid-slide.
          'lg:static lg:inset-auto lg:z-auto lg:h-full lg:w-[min(400px,36vw)] lg:rounded-none lg:border-t-0 lg:border-l',
        ].join(' ')}
      >
        <header className={`flex-none flex items-center justify-between px-4 h-14 border-b ${RULE}`}>
          {/* No icon: the panel is titled in words, and the trigger in the flow
              header is the one place a mark is still doing work (its label is
              hidden below sm). */}
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${INK}`}>AI-assistent</span>
            <span className={`text-xs ${INK_FAINT}`}>
              {book} {chapter}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Sluiten"
            className={`h-8 w-8 max-md:h-10 max-md:w-10 inline-flex items-center justify-center rounded-md hover:bg-les-card ${INK_FAINT} hover:text-les-ink ${FOCUS_RING}`}
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
