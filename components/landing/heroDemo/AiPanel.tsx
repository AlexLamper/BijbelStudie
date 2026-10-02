'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { HD, HERO_DEMO, type PanelProps } from './shared';

const QUESTION = HERO_DEMO.ai.question;
const WORDS = HERO_DEMO.ai.answer.split(' ');

/* The timeline, in ms from mount: typing ends at 1.56 s, the question is sent
   at 1.8 s, the answer streams from 2.5 s and its last word is fully opaque at
   about 4.3 s, which leaves the last two seconds of the scene for reading. */
const TYPE_AT = 300;
const CHAR_MS = 35;
const SEND_AT = TYPE_AT + QUESTION.length * CHAR_MS + 240;
const THINK_AT = SEND_AT + 200;
const STREAM_AT = THINK_AT + 500;
const WORD_MS = 50;
const END_AT = STREAM_AT + WORDS.length * WORD_MS;

type Stage = 'ask' | 'sent' | 'thinking' | 'answer';

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

/**
 * The side panel of scene `ai`: the reader's own question about the verse, and
 * the answer. A miniature of the AI-assistent beside a lesson - the same title,
 * bubbles, input row and caveat - playing one exchange: the question is typed
 * and sent, the assistant thinks for a moment, the answer arrives word by word.
 *
 * Nothing changes size while it plays. Both bubbles are laid out from the first
 * frame and only revealed; the mock input holds the whole question from the
 * start and uncovers it letter by letter; the caveat has its place before it is
 * shown. The whole answer is ordinary text in the DOM rather than a live region
 * that reads itself out word by word.
 *
 * Below `sm` the panel is short, so the input row and the caveat share one
 * slot: the input while the question is typed, the caveat once it is sent.
 */
export default function AiPanel({ reduce }: PanelProps) {
  const { title, placeholder, caveat } = HERO_DEMO.ai;
  const [typed, setTyped] = useState(0);
  const [stage, setStage] = useState<Stage>(reduce ? 'answer' : 'ask');
  const [words, setWords] = useState(reduce ? WORDS.length : 0);

  useEffect(() => {
    if (reduce) {
      setTyped(0);
      setStage('answer');
      setWords(WORDS.length);
      return;
    }
    // One clock: every tick derives the whole state from the time since mount,
    // so a throttled timer skips ahead instead of falling behind the scene.
    // It stops itself on the first tick after the last word.
    const started = performance.now();
    const tick = () => {
      const t = performance.now() - started;
      setTyped(clamp(Math.floor((t - TYPE_AT) / CHAR_MS) + 1, QUESTION.length));
      setStage(t >= STREAM_AT ? 'answer' : t >= THINK_AT ? 'thinking' : t >= SEND_AT ? 'sent' : 'ask');
      setWords(clamp(Math.floor((t - STREAM_AT) / WORD_MS) + 1, WORDS.length));
      if (t >= END_AT) window.clearInterval(id);
    };
    const id = window.setInterval(tick, 25);
    return () => window.clearInterval(id);
  }, [reduce]);

  const asked = stage !== 'ask';
  const answering = stage === 'thinking' || stage === 'answer';
  const draft = asked ? '' : QUESTION.slice(0, typed);

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden px-3.5 py-2.5 sm:gap-3 sm:p-4">
      {/* The same header as UitlegPanel and GrondtekstPanel, which swap in this
          column: eyebrow, then the title. */}
      <div className={`flex min-w-0 flex-none items-baseline gap-2 sm:block ${reduce ? '' : 'hd-rise'}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: HD.tealText }}>
          {title}
        </p>
        <p className="text-[13px] font-bold leading-snug sm:mt-0.5 sm:text-[14px]" style={{ color: HD.text }}>
          {HERO_DEMO.reference}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-2">
        <div
          className={`flex flex-none justify-end ${asked && !reduce ? 'hd-rise' : ''}`}
          style={asked ? undefined : { opacity: 0 }}
        >
          <p
            className="max-w-full rounded-2xl rounded-br-sm px-3 py-1.5 text-[12px] leading-[1.4] text-white sm:max-w-[92%]"
            style={{ backgroundColor: HD.teal }}
          >
            {QUESTION}
          </p>
        </div>

        <div className="flex flex-none justify-start">
          <div
            className={`relative max-w-full rounded-2xl rounded-bl-sm border px-[11px] py-1.5 sm:max-w-[96%] sm:py-[7px] ${answering && !reduce ? 'hd-pop' : ''}`}
            style={{ borderColor: HD.border, backgroundColor: HD.surface, opacity: answering ? undefined : 0 }}
          >
            <p className="text-[12px] leading-[1.4] sm:leading-[1.45]" style={{ color: HD.text }}>
              {WORDS.map((word, index) => (
                <span
                  key={index}
                  style={{
                    opacity: stage === 'answer' && index < words ? 1 : 0,
                    transition: reduce ? undefined : 'opacity 160ms linear',
                  }}
                >
                  {index < WORDS.length - 1 ? `${word} ` : word}
                </span>
              ))}
            </p>
            {stage === 'thinking' && (
              <span aria-hidden className="absolute inset-x-[11px] top-3 flex flex-col gap-2 motion-safe:animate-pulse">
                {['100%', '92%', '64%'].map((width) => (
                  <span key={width} className="block h-2 rounded-full" style={{ width, backgroundColor: HD.border }} />
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* The bottom slot. From `sm` up: the input row, and the caveat under it.
          Below `sm` the two share one grid cell, so the swap at "sent" changes
          what is visible and never how tall the slot is. */}
      <div className="grid flex-none grid-cols-1 gap-y-2">
        {/* A picture of the input, not a control: hidden from assistive tech so
            the question is not announced twice. */}
        <div
          aria-hidden
          className={`col-start-1 row-start-1 flex min-w-0 items-end gap-1.5 ${asked ? 'invisible sm:visible' : ''}`}
        >
          <span
            className="grid min-h-8 min-w-0 flex-1 grid-cols-1 items-center rounded-lg border px-2 py-1 text-[12px] leading-[1.35] sm:text-[11px]"
            style={{ borderColor: draft ? HD.teal : HD.border, backgroundColor: HD.surface }}
          >
            {/* The whole question is always laid out here, the untyped rest
                transparent, so the input has its final height before the first
                letter. The caret hangs off an empty inline anchor: it takes no
                room and adds no place for a line to break. */}
            <span className="col-start-1 row-start-1 min-w-0 break-words" style={{ color: HD.text }}>
              <span>{draft}</span>
              {!asked && (
                <span className="relative">
                  <span
                    className="hd-caret absolute left-px top-[0.14em] h-[1em] w-[2px]"
                    style={{ backgroundColor: HD.teal }}
                  />
                </span>
              )}
              <span style={{ opacity: 0 }}>{QUESTION.slice(draft.length)}</span>
            </span>
            {!draft && (
              <span className="col-start-1 row-start-1 min-w-0 truncate pl-1" style={{ color: HD.faint }}>
                {placeholder}
              </span>
            )}
          </span>
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: HD.teal, opacity: draft ? 1 : 0.4, transition: 'opacity 160ms linear' }}
          >
            <Send size={13} />
          </span>
        </div>

        <p
          className={`col-start-1 row-start-1 min-w-0 self-center text-[10px] leading-[13px] transition-opacity duration-200 motion-reduce:transition-none sm:row-start-2 sm:opacity-100 ${asked ? '' : 'opacity-0'}`}
          style={{ color: HD.muted }}
        >
          {caveat}
        </p>
      </div>
    </div>
  );
}
