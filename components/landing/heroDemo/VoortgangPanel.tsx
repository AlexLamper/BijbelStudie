'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { HD, HERO_DEMO, type VoortgangPanelProps } from './shared';

/** Steps already ticked when the scene opens (Inleiding, Bijbelse context). The
    rest - what the visitor has just watched - tick themselves off. */
const DONE_AT_START = 2;
const FIRST_TICK_MS = 400;
const TICK_EVERY_MS = 500;
/** The XP lands on the tree this long after the last step is ticked. With six
    steps: ticks at 400, 900, 1400 and 1900 ms, the badge at 2300 ms - settled
    by about 2.6 s, well inside the scene's 4000 ms dwell. */
const REWARD_AFTER_MS = 400;

/* The one keyframe this panel adds to the shared set: a check landing in its
   circle. Behind the reduced-motion query like the rest. */
const CSS = `
@keyframes hd-voortgang-tick { from { opacity: 0; transform: scale(0.5); } 60% { opacity: 1; transform: scale(1.18); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: no-preference) {
  .hd-voortgang-tick { animation: hd-voortgang-tick 380ms cubic-bezier(0.16, 1, 0.3, 1) both; }
}
`;

type StepStatus = 'done' | 'current' | 'todo';

function StepRow({ label, status, tick }: { label: string; status: StepStatus; tick: boolean }) {
  return (
    <li
      className="flex min-w-0 items-center gap-2 sm:flex-1 sm:gap-2.5 sm:border-t sm:first:border-t-0"
      style={{ borderColor: HD.border }}
    >
      {status === 'done' ? (
        <span
          key="done"
          className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-white ${tick ? 'hd-voortgang-tick' : ''}`}
          style={{ backgroundColor: HD.teal }}
        >
          <Check size={11} strokeWidth={3.5} aria-hidden />
        </span>
      ) : (
        <span
          key="open"
          className="h-[18px] w-[18px] flex-none rounded-full"
          style={{ border: status === 'current' ? `3px solid ${HD.teal}` : `2px solid ${HD.border}` }}
        />
      )}
      <span
        className={`min-w-0 truncate text-[12px] leading-tight sm:text-[13px] ${status === 'current' ? 'font-bold' : 'font-medium'}`}
        style={{ color: status === 'todo' ? HD.muted : HD.text }}
      >
        {label}
      </span>
    </li>
  );
}

/**
 * The last scene, `voortgang`, with the whole frame to itself: where the reader
 * stands after this lesson. The six steps tick themselves off (two are done on
 * arrival; the four the demo has just shown follow), the XP lands on the
 * reader's tree, and beside it sit the reading streak and how far the book is read. A miniature of what
 * the lesson's closing screen and the profile show, in the product's own words.
 *
 * Under reduced motion it starts no timers and renders the finished state.
 */
export default function VoortgangPanel({ reduce, treeSvg }: VoortgangPanelProps) {
  const { book, chapter, voortgang } = HERO_DEMO;
  const { steps, xp } = voortgang;
  const total = steps.length;
  // Widened from the literal types of HERO_DEMO, so the singular forms compile.
  const streakDays: number = voortgang.streakDays;
  const chaptersRead: number = voortgang.chaptersRead;
  const chaptersInBook: number = HERO_DEMO.chaptersInBook;
  const percent = Math.round((chaptersRead / chaptersInBook) * 100);

  const [done, setDone] = useState(reduce ? total : DONE_AT_START);
  const [rewarded, setRewarded] = useState(reduce);

  useEffect(() => {
    if (reduce) {
      setDone(total);
      setRewarded(true);
      return;
    }
    const timers: number[] = [];
    for (let step = DONE_AT_START; step < total; step += 1) {
      const at = FIRST_TICK_MS + (step - DONE_AT_START) * TICK_EVERY_MS;
      timers.push(window.setTimeout(() => setDone(step + 1), at));
    }
    const lastTick = FIRST_TICK_MS + Math.max(0, total - DONE_AT_START - 1) * TICK_EVERY_MS;
    timers.push(window.setTimeout(() => setRewarded(true), lastTick + REWARD_AFTER_MS));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduce, total]);

  const finished = done >= total;
  const rise = reduce ? '' : 'hd-rise';
  const delay = (ms: number) => (reduce ? null : { animationDelay: `${ms}ms` });

  return (
    <div className="flex h-full w-full flex-col gap-2.5 overflow-hidden p-4 sm:gap-3.5 sm:p-5">
      <style>{CSS}</style>

      <div className="flex flex-none items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2 sm:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: HD.tealText }}>
            Voortgang
          </p>
          <p className="text-[13px] font-bold leading-snug sm:mt-0.5 sm:text-[14px]" style={{ color: HD.text }}>
            {book} {chapter}
          </p>
        </div>
        <p
          key={finished ? 'afgerond' : 'bezig'}
          className={`inline-flex flex-none items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] font-semibold tabular-nums ${finished && !reduce ? 'hd-pop' : ''}`}
          style={
            finished
              ? { backgroundColor: HD.tealLight, borderColor: 'transparent', color: HD.tealDeep }
              : { borderColor: HD.border, color: HD.muted }
          }
        >
          {finished ? (
            <>
              <Check size={11} strokeWidth={3} aria-hidden /> Les afgerond
            </>
          ) : (
            `Stap ${done + 1} van ${total}`
          )}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 sm:flex-row sm:gap-4">
        <div
          className={`flex-none rounded-xl border p-2.5 sm:flex sm:w-[200px] sm:flex-col sm:px-3.5 sm:py-1.5 ${rise}`}
          style={{ borderColor: HD.border, backgroundColor: HD.surface }}
        >
          {/* Below sm: two columns filled top to bottom. The first takes its
              content width ("Bijbelse context"), the second the rest. */}
          <ol className="grid grid-flow-col grid-cols-[auto_minmax(0,1fr)] grid-rows-3 gap-x-3 gap-y-2 sm:flex sm:flex-1 sm:flex-col sm:gap-0">
            {steps.map((label, index) => (
              <StepRow
                key={label}
                label={label}
                status={index < done ? 'done' : index === done ? 'current' : 'todo'}
                tick={!reduce && index >= DONE_AT_START}
              />
            ))}
          </ol>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 sm:gap-3">
          <div
            className={`flex min-h-0 flex-1 items-center justify-center gap-4 rounded-xl px-3 sm:gap-5 sm:px-4 ${rise}`}
            style={{ backgroundColor: HD.sunken, ...delay(80) }}
          >
            <div className="flex flex-none flex-col items-center">
              <div className="relative h-24 w-24 sm:h-[124px] sm:w-[124px]">
                <div
                  className="h-full w-full overflow-hidden rounded-full"
                  style={{ boxShadow: `0 0 0 3px ${HD.surface}, 0 0 0 5px ${HD.teal}` }}
                >
                  <div
                    className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                    aria-hidden
                    dangerouslySetInnerHTML={{ __html: treeSvg }}
                  />
                </div>
                {rewarded && (
                  <span
                    className={`absolute -right-3 -top-1 rounded-full px-2 py-[3px] text-[11px] font-bold leading-none tabular-nums text-white sm:-right-2 sm:top-0 sm:text-[12px] ${reduce ? '' : 'hd-pop'}`}
                    style={{ backgroundColor: HD.teal, boxShadow: `0 0 0 2px ${HD.sunken}` }}
                  >
                    +{xp} XP
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] font-medium leading-none" style={{ color: HD.muted }}>
                Je boom
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: HD.muted }}>
                Leesreeks
              </p>
              <p
                className="mt-0.5 whitespace-nowrap text-[15px] font-bold leading-tight tabular-nums sm:text-[17px]"
                style={{ color: HD.text }}
              >
                {streakDays} {streakDays === 1 ? 'dag' : 'dagen'} op rij
              </p>
            </div>
          </div>

          <div
            className={`flex-none rounded-xl border p-2.5 sm:p-3 ${rise}`}
            style={{ borderColor: HD.border, backgroundColor: HD.surface, ...delay(160) }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold leading-tight" style={{ color: HD.text }}>
                {book}
              </p>
              <p className="text-[11.5px] leading-tight tabular-nums" style={{ color: HD.muted }}>
                {percent}%
              </p>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full sm:mt-2"
              style={{ backgroundColor: HD.sunken }}
              aria-hidden
            >
              <div
                className={`h-full rounded-full ${reduce ? '' : 'hd-bar'}`}
                style={{ width: `${percent}%`, backgroundColor: HD.teal, ...delay(400) }}
              />
            </div>
            <p className="mt-1.5 text-[11.5px] leading-tight sm:mt-2" style={{ color: HD.muted }}>
              {chaptersRead} van {chaptersInBook} {chaptersInBook === 1 ? 'hoofdstuk' : 'hoofdstukken'} gelezen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
