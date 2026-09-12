'use client';

import React, { useRef, useState } from 'react';
import { Send, X } from 'lucide-react';

interface AiAssistantWidgetProps {
  // Called with the typed question; the parent switches to the AI tab and
  // forwards the question to the chat there.
  onAsk: (question: string) => void;
  // Extra classes on the fixed elements - the parent hides the widget (e.g.
  // 'hidden' / 'lg:hidden') whenever the AI tab itself is visible.
  className?: string;
}

const MAX_MESSAGE_LENGTH = 2000;

// Floating launcher bottom-right: opens a small popup with a single question
// input. Submitting hands the question off to the AI tab in the study panel.
export default function AiAssistantWidget({ onAsk, className = '' }: AiAssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    setOpen(false);
    onAsk(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <>
      {/* Question popup */}
      <div
        className={[
          'fixed z-40 bottom-20 right-4 sm:bottom-24 sm:right-6',
          'w-[calc(100vw-2rem)] max-w-[340px]',
          'rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card shadow-2xl',
          'transition-all duration-200 origin-bottom-right',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none',
          className,
        ].join(' ')}
        role="dialog"
        aria-label="Vraag aan de AI-assistent"
        aria-hidden={!open}
      >
        <div className="p-3.5">
          {/* No avatar glyph next to the title: it identified nothing the word
              itself does not, and a decorative icon is not something this
              project ships. */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              AI-assistent
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              className="ml-auto flex items-center justify-center w-7 h-7 rounded-md text-gray-500 dark:text-gray-400 outline-none hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488]"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2.5">
            Stel een vraag over de Bijbel. Het gesprek opent in het studiepaneel.
          </p>

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Stel een vraag over de Bijbel…"
              className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]"
            />
            <button
              onClick={submit}
              disabled={input.trim().length === 0}
              aria-label="Vraag stellen"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-teal text-white outline-none transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Launcher button */}
      <button
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) setTimeout(() => textareaRef.current?.focus(), 200);
            return next;
          });
        }}
        aria-label={open ? 'AI-assistent sluiten' : 'AI-assistent openen'}
        aria-expanded={open}
        className={[
          // 52 px in the bottom-right corner of the study pane, with the design's
          // teal glow under it. The one element in this redesign that carries a
          // shadow besides the streak badge and the Studies search field.
          'fixed bottom-5 right-5 z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full',
          'bg-teal text-white shadow-fab outline-none transition-opacity duration-200 hover:opacity-90',
          className,
        ].join(' ')}
      >
        {open ? (
          <X size={22} />
        ) : (
          // The same filled four-point star the AI tab wears, so the two read
          // as one feature.
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="fill-white">
            <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
          </svg>
        )}
      </button>
    </>
  );
}
