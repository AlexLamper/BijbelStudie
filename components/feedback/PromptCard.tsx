'use client';

import React, { useState } from 'react';

import type { SerialisedPrompt } from '../../lib/feedbackPrompts';

/**
 * One short question, inline, on a dark scene surface.
 *
 * Never a modal. The reader has just finished something; a dialog they must
 * dismiss turns an accomplishment into an interruption, and the action they
 * came for - "Verder met les 4" - has to stay the dominant element on the
 * screen. So this is a bordered card with a teal hairline, in the same idiom as
 * the "Hierna" card beside it, and it can always be ignored.
 *
 * It answers itself: submit and skip both resolve locally to a single line of
 * thanks, no toast and no dialog. The server calls are fire-and-forget on
 * purpose - a failed feedback write must never surface to a reader who was
 * doing us a favour, and the prompt has already been counted as shown.
 *
 * A `choice` prompt with no follow-up submits on the tap: one question, one
 * tap, done. A choice that opens a follow-up shows the optional line and a
 * submit button, so the reader can send just the choice if they prefer.
 */
export default function PromptCard({
  prompt,
  context = {},
  onDone,
  tone = 'dark',
}: {
  prompt: SerialisedPrompt;
  /** Stored with the answer, so it can be read in context later. */
  context?: {
    studyId?: string | null;
    lessonDay?: number | null;
    stepKey?: string | null;
    quizId?: string | null;
    path?: string | null;
  };
  /** Called once the card has resolved, in case the parent wants to know. */
  onDone?: (outcome: 'submitted' | 'skipped') => void;
  /** `dark` for the lesson scene, `light` for a page on the app shell. */
  tone?: 'dark' | 'light';
}) {
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [state, setState] = useState<'open' | 'thanks' | 'gone'>('open');

  const dark = tone === 'dark';
  const ink = dark ? 'text-white' : 'text-gray-900';
  const inkMuted = dark ? 'text-white/70' : 'text-gray-500';
  const border = dark ? 'rgba(45,212,191,0.35)' : 'rgba(13,148,136,0.30)';
  const accent = dark ? '#2DD4BF' : '#0F766E';

  const followUp = choice ? prompt.followUp?.[choice] ?? null : null;
  const needsSubmit = prompt.input === 'text' || Boolean(followUp);

  function send(answers: Record<string, string>) {
    void fetch('/api/feedback/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promptId: prompt.promptId,
        token: prompt.token,
        answers,
        context,
      }),
    }).catch(() => {});
    setState('thanks');
    onDone?.('submitted');
  }

  function skip() {
    void fetch('/api/feedback/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId: prompt.promptId }),
    }).catch(() => {});
    setState('gone');
    onDone?.('skipped');
  }

  function pick(key: string) {
    setChoice(key);
    // A choice that opens nothing is the whole answer: send it on the tap.
    if (!prompt.followUp?.[key]) send({ keuze: key });
  }

  if (state === 'gone') return null;

  if (state === 'thanks') {
    return (
      <p className={`mt-4 text-[12.5px] ${inkMuted}`} role="status">
        {prompt.chrome.thanks}
      </p>
    );
  }

  return (
    <section
      aria-label={prompt.question}
      className="mt-4 rounded-xl border px-3.5 py-3"
      style={{ borderColor: border }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: accent }}
      >
        {prompt.chrome.eyebrow}
      </p>
      <p className={`mt-1.5 text-[13.5px] font-semibold leading-snug ${ink}`}>{prompt.question}</p>

      {prompt.input === 'text' && (
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          maxLength={prompt.maxLen}
          placeholder={prompt.placeholder ?? ''}
          className={`mt-2.5 w-full resize-none rounded-lg border px-2.5 py-2 text-[13px] outline-none ${
            dark
              ? 'border-white/15 bg-white/10 text-white placeholder:text-white/45'
              : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
          }`}
        />
      )}

      {prompt.input !== 'text' && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(prompt.options ?? []).map((option) => {
            const active = choice === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => pick(option.key)}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  dark
                    ? active
                      ? 'border-transparent bg-white text-gray-900'
                      : 'border-white/20 text-white/85 hover:bg-white/10'
                    : active
                      ? 'border-transparent bg-teal-700 text-white'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {followUp && (
        <>
          <p className={`mt-3 text-[12.5px] ${inkMuted}`}>{followUp.question}</p>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={2}
            maxLength={prompt.maxLen}
            className={`mt-1.5 w-full resize-none rounded-lg border px-2.5 py-2 text-[13px] outline-none ${
              dark
                ? 'border-white/15 bg-white/10 text-white placeholder:text-white/45'
                : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
            }`}
          />
        </>
      )}

      <div className="mt-3 flex items-center gap-4">
        {needsSubmit && (
          <button
            type="button"
            onClick={() => {
              if (followUp && choice) {
                send(text.trim() ? { keuze: choice, [followUp.key]: text } : { keuze: choice });
                return;
              }
              const key = prompt.freeTextKey ?? 'antwoord';
              if (text.trim()) send({ [key]: text });
            }}
            disabled={prompt.input === 'text' && !text.trim()}
            className={`rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-opacity disabled:opacity-40 ${
              dark ? 'text-gray-900' : 'text-white'
            }`}
            style={{ backgroundColor: dark ? '#FFFFFF' : '#0F766E' }}
          >
            {prompt.chrome.submit}
          </button>
        )}
        <button
          type="button"
          onClick={skip}
          className={`text-[12.5px] font-semibold ${inkMuted} hover:underline`}
        >
          {prompt.chrome.skip}
        </button>
      </div>

      <p className={`mt-2.5 text-[11px] leading-snug ${inkMuted}`}>{prompt.chrome.privacy}</p>
    </section>
  );
}
