'use client';

import React, { useRef, useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';

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
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-teal-700 dark:text-teal-300" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              AI-assistent
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              className="ml-auto flex items-center justify-center w-7 h-7 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-secondary transition-colors"
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
              className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-md text-white bg-[#0D9488] hover:bg-[#0f766e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          'fixed z-40 bottom-4 right-4 sm:bottom-6 sm:right-6',
          'w-12 h-12 rounded-full flex items-center justify-center',
          'text-white bg-[#0D9488] hover:bg-[#0f766e] shadow-lg hover:shadow-xl',
          'transition-all duration-200',
          className,
        ].join(' ')}
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>
    </>
  );
}
