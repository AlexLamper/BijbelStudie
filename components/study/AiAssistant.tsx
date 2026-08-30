'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Send, Sparkles } from 'lucide-react';
import { SkeletonBlock } from '../ui/skeletons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import UpgradePrompt from "../pricing/UpgradePrompt";

interface AiAssistantProps {
  book: string;
  chapter: number;
  version: string | null;
  // Question handed off from the floating popup; auto-sent once on mount.
  initialQuestion?: string | null;
  onInitialQuestionConsumed?: () => void;
  /**
   * Replaces the generic starters with prompts that fit the current step of a
   * guided lesson. Kept as a prop rather than putting step logic in here: this
   * component is also mounted outside the study flow.
   */
  starterQuestions?: string[];
  /** Prefills the composer without sending, e.g. after selecting a verse. */
  draft?: string | null;
  onDraftConsumed?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface QuotaState {
  configured: boolean;
  used: number;
  cap: number;
  unlimited: boolean;
}

/**
 * One line of the newline-delimited stream from POST /api/ai/chat.
 *
 * `meta` arrives first, then `delta` per fragment, then exactly one terminator:
 * `done`, `blocked` (safety filter ate the answer) or `error`. An `error` with
 * `partial: true` means words already arrived and are worth keeping.
 */
interface StreamEvent {
  type: 'meta' | 'delta' | 'done' | 'blocked' | 'error';
  text?: string;
  reply?: string;
  used?: number;
  cap?: number | null;
  error?: string;
  code?: string;
  partial?: boolean;
}

const STARTER_QUESTIONS = [
  'Wat is de kernboodschap van dit hoofdstuk?',
  'Leg de historische achtergrond van dit hoofdstuk uit',
  'Wat betekent dit hoofdstuk voor mijn leven vandaag?',
  'Welke andere bijbelgedeelten sluiten hierop aan?',
];

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Escalating reassurance while an answer is generating, so a slow reply reads
 * as "still working" instead of "broken" and the user stays on the page.
 *
 * Since the answer streams, this covers only the gap before the FIRST token -
 * from then on the text itself is the progress indicator and this disappears.
 * A cached answer returns almost immediately and never reaches stage 1. Past
 * ~10s the request is almost certainly inside the retry path in lib/aiGemini.ts
 * - the primary model retried after a 600ms backoff, then the fallback - which
 * is slow but still progressing.
 *
 * The copy deliberately never claims the answer is nearly ready, and never
 * names a mechanism the client cannot observe: from here the only knowable
 * fact is that the request is still open.
 */
const WAIT_STAGES = [
  { afterMs: 0, text: 'Bezig met antwoorden…' },
  { afterMs: 4_000, text: 'Het antwoord wordt opgesteld…' },
  {
    afterMs: 10_000,
    text: 'Dit duurt wat langer dan gewoonlijk. Blijf gerust op deze pagina - het antwoord verschijnt vanzelf.',
  },
  {
    afterMs: 25_000,
    text: 'Het kan nu druk zijn bij de AI-dienst. Je vraag staat nog open; sluit dit venster niet.',
  },
] as const;

const markdownComponents = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="font-semibold text-sm mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="font-semibold text-sm mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="font-semibold text-sm mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-2 border-teal-300 dark:border-teal-700 pl-3 italic text-gray-600 dark:text-gray-400 mb-2"
      {...props}
    />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-[#0D9488] underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
};

export default function AiAssistant({
  book,
  chapter,
  version,
  initialQuestion,
  starterQuestions,
  draft,
  onDraftConsumed,
  onInitialQuestionConsumed,
}: AiAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);
  // True from the first streamed token until the answer ends. The skeleton is
  // for an empty panel; once words are arriving they are the better progress
  // indicator, and showing both would be a placeholder next to the real thing.
  const [streaming, setStreaming] = useState(false);
  const [waitStage, setWaitStage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSentInitialRef = useRef<string | null>(null);

  // Load quota state on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai/chat')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setQuota({
          configured: !!data.configured,
          used: data.used ?? 0,
          cap: data.cap ?? 5,
          unlimited: !!data.unlimited,
        });
        if (!data.unlimited && data.used >= data.cap) setQuotaHit(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Advance the reassurance copy while a request is in flight. Resetting on
  // every change of `loading` means the message disappears the instant the
  // answer lands - nothing here delays anything.
  useEffect(() => {
    if (!loading) {
      setWaitStage(0);
      return;
    }
    const timers = WAIT_STAGES.slice(1).map((stage, i) =>
      setTimeout(() => setWaitStage(i + 1), stage.afterMs),
    );
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  // Auto-scroll on new messages, and when the waiting copy grows a line.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, waitStage]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setLoading(true);
      setStreaming(false);
      setInput('');
      const history = messages.slice(-10);
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);

      // Puts the composer back exactly as the user left it, so a failure costs
      // them the wait but never the typing.
      const undoSend = () => {
        setMessages((prev) => prev.slice(0, -1));
        setInput(trimmed);
      };

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, history, book, chapter, version }),
        });

        // Only a live generation streams. A cache hit, and every refusal the
        // server can decide before calling Gemini, still answers as one JSON
        // object with its own status code.
        const body = res.body;
        const streamed =
          res.ok && (res.headers.get('content-type') ?? '').includes('ndjson') && !!body;

        if (!streamed || !body) {
          const data = await res.json().catch(() => null);

          if (!res.ok) {
            if (data?.code === 'QUOTA_EXCEEDED') {
              setQuotaHit(true);
              setQuota((q) => (q ? { ...q, used: data.used ?? q.used } : q));
              // Remove the optimistically added user message
              setMessages((prev) => prev.slice(0, -1));
            } else {
              setError(data?.error || 'Er ging iets mis. Probeer het opnieuw.');
              undoSend();
            }
            return;
          }

          setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
          setQuota((q) =>
            q ? { ...q, used: typeof data.used === 'number' ? data.used : q.used } : q,
          );
          if (data.cap !== null && typeof data.used === 'number' && data.used >= data.cap) {
            setQuotaHit(true);
          }
          return;
        }

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let answer = '';
        let started = false;
        let capFromMeta: number | null = null;

        // Appends into the assistant bubble, creating it on the first fragment.
        // Replacing only the last entry keeps the earlier messages
        // referentially stable while tokens arrive.
        const paint = (content: string) => {
          if (!started) {
            started = true;
            setStreaming(true);
            setMessages((prev) => [...prev, { role: 'assistant', content }]);
            return;
          }
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content };
            return next;
          });
        };

        const apply = (event: StreamEvent) => {
          switch (event.type) {
            case 'meta':
              if (typeof event.cap === 'number') capFromMeta = event.cap;
              if (typeof event.used === 'number') {
                const used = event.used;
                setQuota((q) => (q ? { ...q, used } : q));
              }
              break;
            case 'delta':
              answer += event.text ?? '';
              paint(answer);
              break;
            case 'blocked':
              answer = event.reply ?? '';
              paint(answer);
              if (typeof event.used === 'number') {
                const used = event.used;
                setQuota((q) => (q ? { ...q, used } : q));
              }
              break;
            case 'done':
              if (typeof event.used === 'number') {
                const used = event.used;
                setQuota((q) => (q ? { ...q, used } : q));
                if (capFromMeta !== null && used >= capFromMeta) setQuotaHit(true);
              }
              break;
            case 'error':
              // Words that already arrived are kept: half an answer is worth
              // more than a panel that erases itself and blames the network.
              setError(event.error || 'Er ging iets mis. Probeer het opnieuw.');
              if (!event.partial) undoSend();
              break;
          }
        };

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newline = buffer.indexOf('\n');
          while (newline >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (line) {
              try {
                apply(JSON.parse(line) as StreamEvent);
              } catch {
                // A malformed line is not worth failing the whole answer over;
                // the terminating event still decides the outcome.
              }
            }
            newline = buffer.indexOf('\n');
          }
        }

        // The connection ended without ever producing a token - a dropped
        // stream rather than a refusal. Hand the question back.
        if (!started) {
          setError('Er ging iets mis. Probeer het opnieuw.');
          undoSend();
        }
      } catch {
        setError('Er ging iets mis. Controleer je verbinding en probeer het opnieuw.');
        // Only the user's own message is rolled back; a partial answer that
        // already arrived stays on screen.
        setMessages((prev) =>
          prev.length > 0 && prev[prev.length - 1].role === 'user' ? prev.slice(0, -1) : prev,
        );
        setInput(trimmed);
      } finally {
        setLoading(false);
        setStreaming(false);
      }
    },
    [messages, loading, book, chapter, version],
  );

  /**
   * Prefills the composer from a verse selection, without sending.
   *
   * Deliberately not auto-sent, unlike `initialQuestion`: picking a verse means
   * "I want to ask something about this", and the user still has to say what.
   */
  useEffect(() => {
    if (!draft) return;
    setInput(draft);
    onDraftConsumed?.();
  }, [draft, onDraftConsumed]);

  // Auto-send the question handed off from the floating popup (once per hand-off).
  useEffect(() => {
    if (!initialQuestion) {
      lastSentInitialRef.current = null;
      return;
    }
    if (lastSentInitialRef.current === initialQuestion) return;
    lastSentInitialRef.current = initialQuestion;
    sendMessage(initialQuestion);
    onInitialQuestionConsumed?.();
  }, [initialQuestion, sendMessage, onInitialQuestionConsumed]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  };

  const notConfigured = quota !== null && !quota.configured;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Scrollable area: intro + messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 pt-4 pb-2">
        {/* Intro panel */}
        <div className="mb-4 rounded-lg border border-teal-200/70 dark:border-teal-900/50 bg-gradient-to-br from-teal-50/70 to-white dark:from-teal-950/30 dark:to-background p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
              <Sparkles size={16} className="text-teal-700 dark:text-teal-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                AI-assistent
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Stel vragen over {book ? `${book} ${chapter}` : 'de Bijbel'} of over de Bijbel in
                het algemeen. Antwoorden kunnen fouten bevatten, toets alles aan de Schrift.
              </p>
            </div>
          </div>
        </div>

        {/* Not configured */}
        {notConfigured && (
          <div className="flex items-start gap-2.5 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              De AI-assistent is momenteel niet beschikbaar.
            </div>
          </div>
        )}

        {/* Starter questions (empty state) */}
        {!notConfigured && messages.length === 0 && !quotaHit && (
          <div className="flex flex-col gap-2 mt-2">
            {(starterQuestions && starterQuestions.length > 0
              ? starterQuestions
              : STARTER_QUESTIONS
            ).map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-left text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-teal-200/80 dark:border-teal-900/60 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:border-teal-300 dark:hover:border-teal-800 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="space-y-3">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="content-in flex justify-end">
                <div className="bg-[#0D9488] text-white rounded-2xl rounded-br-sm px-3.5 py-2 text-sm max-w-[85%] whitespace-pre-wrap break-words">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="content-in flex justify-start">
                <div className="bg-gray-100 dark:bg-secondary text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm max-w-[92%] break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ),
          )}

          {/* Loading - only until the first token arrives; after that the text
              itself is the progress indicator. */}
          {loading && !streaming && (
            <div className="px-1 py-1 space-y-2">
              <SkeletonBlock className="h-3" />
              <SkeletonBlock className="h-3 w-11/12" />
              <SkeletonBlock className="h-3 w-2/3" />
              {/* Keyed on the stage so each new line fades in rather than
                  swapping under the reader's eyes. */}
              <p
                key={waitStage}
                role="status"
                aria-live="polite"
                className="content-in flex items-start gap-1.5 pt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400"
              >
                <Loader2
                  size={12}
                  aria-hidden
                  className="mt-0.5 flex-shrink-0 animate-spin text-[#0F766E] dark:text-teal-400"
                />
                <span>{WAIT_STAGES[waitStage].text}</span>
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">{error}</div>
            </div>
          )}
        </div>
      </div>

      {/* Input area / quota CTA - pb-6 clears the decorative bottom gradient */}
      {!notConfigured && (
        <div className="flex-none px-3 sm:px-4 pb-6 pt-1 relative z-20 bg-white dark:bg-background">
          {quotaHit && !quota?.unlimited ? (
            <UpgradePrompt
              surface="ai_limit"
              title="Dagelijkse limiet bereikt"
              body={`Je hebt je ${quota?.cap ?? 5} gratis vragen voor vandaag gesteld. Morgen kun je weer verder, of ga onbeperkt verder met Pro.`}
              cta="Onbeperkt vragen stellen"
            />
          ) : (
            <>
              {quota && !quota.unlimited && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 px-1">
                  {quota.used} van {quota.cap} vragen vandaag
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoGrow();
                  }}
                  onKeyDown={handleKeyDown}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Stel een vraag over de Bijbel…"
                  disabled={loading}
                  className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488] disabled:opacity-60"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || input.trim().length === 0}
                  aria-label="Versturen"
                  className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-md text-white bg-[#0D9488] hover:bg-[#0f766e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
