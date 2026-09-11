'use client';

import React from 'react';
import { Check } from 'lucide-react';

import { TEAL, TEAL_ON_DARK } from '../../scene/tokens';
import { FOCUS_RING, INK_FAINT, RULE } from './lesson-layout';
import { STEP_LABELS, type StepKey } from '../../../lib/studyFlow';

// The labels moved to lib/studyFlow.ts so server code can read them too; they
// are re-exported here because this is where the rest of the flow imports them.
export { STEP_LABELS };

/**
 * Where you are in the lesson, in the two shapes this screen needs.
 *
 * `index` is the register ontwerp B put in the left margin: the steps numbered
 * 01..05 down the page, the one you are on marked by a rule in the left gutter
 * rather than by a fill, a check beside the ones behind you, and a final
 * "Afronding" row that is never a target - it says the lesson ends somewhere
 * without pretending you can jump there. That is the primary shape now.
 *
 * `bar` is the segmented track that used to span the header, kept for the widths
 * where the margin is not on screen. Below lg there is no room for a 216px
 * register beside a reading column, and "how far along am I" still has to be
 * answerable there.
 *
 * Both shapes are the same control: the same reachability rule, the same
 * `onSelect`. Anything already visited stays reachable and nothing beyond the
 * current step ever is - skipping ahead to the quiz makes the lesson pointless.
 */
export default function StudyStepRail({
  steps,
  current,
  completed,
  onSelect,
  variant = 'bar',
}: {
  steps: StepKey[];
  current: StepKey;
  completed: string[];
  onSelect: (step: StepKey) => void;
  variant?: 'bar' | 'index';
}) {
  const currentIndex = steps.indexOf(current);

  if (variant === 'index') {
    return (
      <ol className="mt-4 space-y-0.5">
        {steps.map((step, index) => {
          const isCurrent = step === current;
          const reachable = completed.includes(step) || index <= currentIndex;
          const done = index < currentIndex || completed.includes(step);

          return (
            <li key={step}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onSelect(step)}
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'flex w-full items-baseline gap-2 rounded-sm border-l-2 py-1.5 pl-2.5 text-left text-[12.5px] transition-colors',
                  FOCUS_RING,
                  isCurrent ? 'font-semibold' : 'border-l-transparent',
                  reachable
                    ? isCurrent
                      ? ''
                      : `${INK_FAINT} hover:text-white`
                    : `${INK_FAINT} cursor-not-allowed opacity-45`,
                ].join(' ')}
                // The marker on the current step is the accent as type and as a
                // rule - never a fill, which would put white on #2DD4BF.
                style={isCurrent ? { color: TEAL_ON_DARK, borderLeftColor: TEAL_ON_DARK } : undefined}
              >
                <span className="flex-none text-[10.5px] tabular-nums opacity-70">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 truncate">{STEP_LABELS[step]}</span>
                {done && !isCurrent ? (
                  <Check
                    size={11}
                    strokeWidth={2.5}
                    aria-hidden
                    className="ml-auto flex-none"
                    style={{ color: TEAL }}
                  />
                ) : null}
              </button>
            </li>
          );
        })}

        {/* Not a button, and deliberately so: finishing a lesson writes XP and a
            note, and that happens through "Les afronden" or not at all. */}
        <li className={`mt-1.5 border-t pt-1.5 ${RULE}`}>
          <span
            className={`flex w-full items-baseline gap-2 border-l-2 border-l-transparent py-1.5 pl-2.5 text-[12.5px] ${INK_FAINT} opacity-70`}
          >
            <span className="flex-none text-[10.5px] tabular-nums opacity-70">
              {String(steps.length + 1).padStart(2, '0')}
            </span>
            <span>Afronding</span>
          </span>
        </li>
      </ol>
    );
  }

  return (
    <nav aria-label="Voortgang" className="w-full flex items-center gap-1">
      {steps.map((step, index) => {
        const isCurrent = step === current;
        const reachable = completed.includes(step) || index <= currentIndex;
        const filled = index <= currentIndex;

        return (
          <button
            key={step}
            type="button"
            disabled={!reachable}
            onClick={() => reachable && onSelect(step)}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={STEP_LABELS[step]}
            title={STEP_LABELS[step]}
            className={[
              'group flex-1 min-w-0 py-2 -my-2 rounded-sm',
              // A 3px bar has nowhere to show a ring, so the focus state is on
              // the hit area rather than on the track inside it.
              FOCUS_RING,
              reachable ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          >
            {/* The track is always drawn; the teal sits on top of it. Only the
                segment you have just arrived at sweeps in - React keeps the
                other filled spans mounted, so they never replay the animation
                and the bar does not ripple on every step. */}
            <span
              className={[
                'relative block w-full h-[3px] rounded-full overflow-hidden bg-white/15 transition-colors',
                reachable && !filled ? 'group-hover:bg-white/25' : '',
              ].join(' ')}
            >
              {filled && (
                <span
                  className={[
                    'absolute inset-0 rounded-full origin-left',
                    isCurrent ? 'motion-safe:animate-rail-fill' : '',
                  ].join(' ')}
                  style={{ backgroundColor: TEAL }}
                />
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
