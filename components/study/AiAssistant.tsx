'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Send, Sparkles } from 'lucide-react';
import { SkeletonBlock } from '../ui/skeletons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AiAssistantProps {
  book: string;
  chapter: number;
  version: string | null;
  // Question handed off from the floating popup; auto-sent once on mount.
  initialQuestion?: string | null;
  onInitialQuestionConsumed?: () => void;
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

const STARTER_QUESTIONS = [
  'Wat is de kernboodschap van dit hoofdstuk?',
  'Leg de historische achtergrond van dit hoofdstuk uit',
  'Wat betekent dit hoofdstuk voor mijn leven vandaag?',
  'Welke andere bijbelgedeelten sluiten hierop aan?',
];

const MAX_MESSAGE_LENGTH = 2000;

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
  onInitialQuestionConsumed,
}: AiAssistantProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);
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

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setLoading(true);
      setInput('');
      const history = messages.slice(-10);
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, history, book, chapter, version }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if (data?.code === 'QUOTA_EXCEEDED') {
            setQuotaHit(true);
            setQuota((q) => (q ? { ...q, used: data.used ?? q.used } : q));
            // Remove the optimistically added user message
            setMessages((prev) => prev.slice(0, -1));
          } else {
            setError(data?.error || 'Er ging iets mis. Probeer het opnieuw.');
            setMessages((prev) => prev.slice(0, -1));
            setInput(trimmed);
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
      } catch {
        setError('Er ging iets mis. Controleer je verbinding en probeer het opnieuw.');
        setMessages((prev) => prev.slice(0, -1));
        setInput(trimmed);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, book, chapter, version],
  );

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
            {STARTER_QUESTIONS.map((q) => (
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
              <div key={i} className="flex justify-end">
                <div className="bg-[#0D9488] text-white rounded-2xl rounded-br-sm px-3.5 py-2 text-sm max-w-[85%] whitespace-pre-wrap break-words">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="bg-gray-100 dark:bg-secondary text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm max-w-[92%] break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ),
          )}

          {/* Loading */}
          {loading && (
            <div className="px-1 py-1 space-y-2" role="status" aria-label="Antwoord genereren">
              <SkeletonBlock className="h-3" />
              <SkeletonBlock className="h-3 w-11/12" />
              <SkeletonBlock className="h-3 w-2/3" />
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
            <div className="max-w-[340px] mx-auto rounded-xl border border-gray-200 dark:border-border bg-gradient-to-br from-gray-50 to-white dark:from-card dark:to-background p-5 text-center shadow-sm">
              <Sparkles className="h-5 w-5 mx-auto mb-2.5 text-[#0D9488]" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1.5">
                Dagelijkse limiet bereikt
              </h3>
              <p className="text-xs text-muted-foreground max-w-[260px] mx-auto leading-relaxed mb-4">
                Je hebt je {quota?.cap ?? 5} gratis vragen voor vandaag gesteld. Morgen kun je
                weer verder, of upgrade naar Pro voor onbeperkt gebruik van de AI-assistent.
              </p>
              <button
                onClick={() => router.push('/abonnement')}
                className="px-5 h-9 rounded-md text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0f766e] transition-colors"
              >
                Upgrade naar Pro
              </button>
            </div>
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
