'use client';

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SessionContext } from 'next-auth/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertCircle, Loader2, Send, X } from 'lucide-react';
import AiAssistantIcon from '../ui/AiAssistantIcon';
import { SkeletonBlock } from '../ui/skeletons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import UpgradePrompt from "../pricing/UpgradePrompt";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../ui/dialog';

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
      className="border-l-2 border-teal-300 dark:border-teal-700 pl-3 italic text-gray-600 dark:text-neutral-400 mb-2"
      {...props}
    />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-[#0D9488] dark:text-teal-400 underline underline-offset-2"
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
  // Read directly from context, not `useSession`: this component is also
  // mounted inside the /studie flow's AiDock, on routes with no
  // SessionProvider, where the hook throws. Without a provider the status is
  // simply unknown and the proactive guard below never fires - the 401 the
  // API still returns for an anonymous call opens the same dialog.
  const sessionCtx = useContext(SessionContext);
  const isGuest = sessionCtx?.status === 'unauthenticated';
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
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

      // A guest gets the sign-in dialog straight away instead of a request
      // that can only come back 401 - mirrors SpeakButton's guard for
      // voorlezen. The question stays in the composer, untouched.
      if (isGuest) {
        setLoginPromptOpen(true);
        return;
      }

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
            } else if (res.status === 401) {
              // The session lapsed between the guard above and this request
              // landing - same dialog, not the raw "Niet geauthenticeerd".
              undoSend();
              setLoginPromptOpen(true);
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
    [messages, loading, book, chapter, version, isGuest],
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
        {/* Intro panel: a plain header rule, matching the flat section
            headers used elsewhere in the study panel (e.g. the "book" bar in
            HistoricalContext) rather than the gradient card + circular icon
            badge this used to carry - the one part of the panel that still
            looked like the pre-redesign app. */}
        <div className="mb-4 pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <AiAssistantIcon size={16} strokeWidth={1.8} className="flex-shrink-0 text-teal" />
            <h3 className="text-sm font-semibold text-ink">AI-assistent</h3>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
            Stel vragen over {book ? `${book} ${chapter}` : 'de Bijbel'} of over de Bijbel in
            het algemeen. Antwoorden kunnen fouten bevatten, toets alles aan de Schrift.
          </p>
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
                className="text-left text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-line bg-surface text-ink-body transition-colors hover:border-teal disabled:opacity-50 disabled:hover:border-line outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40"
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
                <div className="bg-gray-100 dark:bg-secondary text-gray-900 dark:text-foreground rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm max-w-[92%] break-words">
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
                className="content-in flex items-start gap-1.5 pt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-neutral-400"
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
        <div className="flex-none px-3 sm:px-4 pb-6 pt-1 relative z-20 bg-surface max-md:pb-4">
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
                <div className="text-[11px] text-ink-faint mb-1.5 px-1">
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
                  className="flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm max-md:text-[16px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488] disabled:opacity-60"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || input.trim().length === 0}
                  aria-label="Versturen"
                  className="flex-shrink-0 h-9 w-9 max-md:h-10 max-md:w-10 flex items-center justify-center rounded-md text-white bg-[#0D9488] hover:bg-[#0f766e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

      <AiLoginDialog open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} />
    </div>
  );
}

/**
 * What a guest sees on asking the AI-assistant a question.
 *
 * The chat and quota endpoints both refuse an anonymous caller with a plain
 * 401, which used to reach the reader as the raw "Niet geauthenticeerd" text
 * inside the amber error panel - a fault report for something that is not a
 * fault. This says what is going on and offers the way in, mirroring
 * SpeakButton's `SpeakLoginDialog` for the same situation on voorlezen.
 *
 * Built on the Radix dialog primitives directly rather than the generic
 * `Modal` wrapper, for the lighter scrim and a z-index above the /studie
 * flow's own overlays (the AiDock backdrop and panel sit at z-40/z-50).
 */
function AiLoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  // The path to return to, read when the dialog opens so it includes the
  // query (chapter, translation). app/inloggen passes it through safeRedirect.
  const [next, setNext] = useState('/');
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      setNext(window.location.pathname + window.location.search);
    }
  }, [open]);
  const target = encodeURIComponent(next);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="z-[80] bg-slate-900/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[80] w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-[#0D9488] dark:text-teal-400">
            AI-assistent
          </p>
          <DialogTitle className="mt-2 text-lg font-semibold leading-snug text-ink">
            Log in om de AI-assistent te gebruiken
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-relaxed text-ink-muted">
            Vragen stellen aan de AI-assistent is alleen beschikbaar met een account. Met een
            gratis account stel je meteen vragen over de Bijbel en dit hoofdstuk.
          </DialogDescription>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-ink-body transition-colors hover:bg-line-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
              >
                Annuleren
              </button>
            </DialogClose>
            <Link
              href={`/inloggen?next=${target}`}
              onClick={onClose}
              data-track="ai_guest_signin"
              className="inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
              style={{ backgroundColor: '#0D9488' }}
            >
              Inloggen
            </Link>
          </div>

          <p className="mt-4 text-center text-[13px] text-ink-muted sm:text-right">
            Nog geen account?{' '}
            <Link
              href={`/registreren?next=${target}`}
              onClick={onClose}
              data-track="ai_guest_register"
              className="font-semibold underline-offset-4 hover:underline text-[#0D9488] dark:text-teal-400"
            >
              Gratis registreren
            </Link>
          </p>

          <DialogClose
            className="absolute right-4 top-4 rounded-md p-1 text-ink-faint transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
