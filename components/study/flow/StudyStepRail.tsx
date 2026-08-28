'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { StepKey } from '../../../lib/studyFlow';

const TEAL = '#0D9488';

/** Dutch labels for each step, shown under the rail on wider screens. */
export const STEP_LABELS: Record<StepKey, string> = {
  intro: 'Intro',
  word: 'Het Woord',
  depth: 'Verdieping',
  reflection: 'Reflectie',
  quiz: 'Toetsing',
};

/**
 * The "stap 3 van 5" indicator: one beam per step, spanning the full width.
 *
 * It used to be numbered circles joined by hairlines, centred in the header.
 * Five 28px circles carry almost no information about how far along the lesson
 * is - the eye has to count them - and centring left the progress sitting in a
 * small island with empty header either side of it. Beams read as a progress
 * bar, which is what this is, and stretching them edge to edge means the filled
 * proportion IS the answer to "how far am I".
 *
 * Every beam is equal width rather than weighted by step length: the steps are
 * roughly comparable in size, and an unequal bar would imply a precision about
 * remaining effort that the flow does not have.
 *
 * A completed step stays clickable so someone can look back at the passage
 * while answering the reflection question - the flow is meant to be focused,
 * not a cage. Steps that have not been reached yet are not clickable, because
 * skipping ahead to the quiz makes the lesson pointless.
 */
export default function StudyStepRail({
  steps,
  current,
  completed,
  onSelect,
}: {
  steps: StepKey[];
  current: StepKey;
  completed: string[];
  onSelect: (step: StepKey) => void;
}) {
  const currentIndex = steps.indexOf(current);

  return (
    <nav aria-label="Stappen" className="w-full flex items-stretch gap-1.5 sm:gap-2">
      {steps.map((step, index) => {
        const isDone = completed.includes(step);
        const isCurrent = step === current;
        // Anything already visited stays reachable; nothing beyond does.
        const reachable = isDone || index <= currentIndex;
        const filled = isDone || index <= currentIndex;

        return (
          <button
            key={step}
            type="button"
            disabled={!reachable}
            onClick={() => reachable && onSelect(step)}
            aria-current={isCurrent ? 'step' : undefined}
            title={STEP_LABELS[step]}
            className={[
              'group flex-1 min-w-0 flex flex-col gap-1.5 text-left',
              reachable ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          >
            {/* Every beam is the same height. The current step is marked by a
                halo and a bolder label instead of extra height, because a taller
                beam would push its own label out of line with the others. */}
            <span
              className={[
                'block w-full h-2 rounded-full transition-all',
                filled ? '' : 'bg-gray-200 dark:bg-border',
                reachable && !isCurrent ? 'group-hover:opacity-75' : '',
              ].join(' ')}
              style={{
                ...(filled ? { backgroundColor: TEAL } : null),
                ...(isCurrent ? { boxShadow: '0 0 0 3px rgba(13,148,136,0.20)' } : null),
              }}
            />
            <span
              className={[
                'flex items-center gap-1 text-[10.5px] sm:text-[11.5px] leading-none',
                isCurrent
                  ? 'font-bold text-foreground'
                  : filled
                    ? 'font-medium text-gray-600 dark:text-muted-foreground'
                    : 'font-medium text-gray-400 dark:text-muted-foreground',
              ].join(' ')}
            >
              {isDone && !isCurrent && (
                <Check size={11} className="flex-none" style={{ color: TEAL }} />
              )}
              <span className="truncate">{STEP_LABELS[step]}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
