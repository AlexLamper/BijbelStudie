'use client';

import React from 'react';
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
 * The lesson progress indicator: a single thin segmented bar, one segment per
 * step, spanning the header's full width.
 *
 * It used to carry a bolder beam plus a label and a check icon under every step,
 * with a glow around the current one. That is a lot of furniture for "how far
 * along am I" - the answer is just the filled proportion. So: no labels, no
 * icons, no halo. One 3px track, teal up to and including the current step,
 * muted after it. The header text already says "stap 3 van 5".
 *
 * Segments stay individually clickable (with an invisible tall hit area) so a
 * reader can step back to the passage while answering the reflection question.
 * Steps not yet reached are inert - skipping ahead to the quiz makes the lesson
 * pointless.
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
    <nav aria-label="Voortgang" className="w-full flex items-center gap-1">
      {steps.map((step, index) => {
        const isCurrent = step === current;
        // Anything already visited stays reachable; nothing beyond does.
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
              'group flex-1 min-w-0 py-2 -my-2',
              reachable ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          >
            <span
              className={[
                'block w-full h-[3px] rounded-full transition-colors',
                filled ? '' : 'bg-gray-200 dark:bg-border',
                reachable && !filled ? 'group-hover:bg-gray-300 dark:group-hover:bg-muted' : '',
              ].join(' ')}
              style={filled ? { backgroundColor: TEAL } : undefined}
            />
          </button>
        );
      })}
    </nav>
  );
}
