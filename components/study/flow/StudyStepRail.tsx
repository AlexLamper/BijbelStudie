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
 * The "stap 3 van 5" indicator.
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
    <nav aria-label="Stappen" className="flex items-center gap-1.5 sm:gap-2">
      {steps.map((step, index) => {
        const isDone = completed.includes(step);
        const isCurrent = step === current;
        // Anything already visited stays reachable; nothing beyond does.
        const reachable = isDone || index <= currentIndex;

        return (
          <React.Fragment key={step}>
            {index > 0 && (
              <span
                aria-hidden
                className="h-px w-3 sm:w-6 flex-none"
                style={{ backgroundColor: index <= currentIndex ? TEAL : 'currentColor', opacity: index <= currentIndex ? 1 : 0.2 }}
              />
            )}
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onSelect(step)}
              aria-current={isCurrent ? 'step' : undefined}
              title={STEP_LABELS[step]}
              className={[
                'group flex items-center gap-1.5 rounded-full transition-colors',
                reachable ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              <span
                className={[
                  'h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-none border transition-colors',
                  isCurrent
                    ? 'text-white border-transparent'
                    : isDone
                      ? 'border-transparent'
                      : 'text-gray-400 dark:text-muted-foreground border-gray-200 dark:border-border',
                ].join(' ')}
                style={
                  isCurrent
                    ? { backgroundColor: TEAL }
                    : isDone
                      ? { backgroundColor: 'rgba(13,148,136,0.12)', color: TEAL }
                      : undefined
                }
              >
                {isDone && !isCurrent ? <Check size={13} /> : index + 1}
              </span>
              <span
                className={[
                  'hidden md:inline text-xs font-medium pr-1',
                  isCurrent ? 'text-foreground' : 'text-gray-500 dark:text-muted-foreground',
                ].join(' ')}
              >
                {STEP_LABELS[step]}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
