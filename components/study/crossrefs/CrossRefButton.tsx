'use client';

import React, { forwardRef } from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { cn } from '../../../lib/utils';
import { useCrossRefCopy } from './copy';

/**
 * The third control in the verse's hover cluster, between "voorlezen" and
 * "notitie".
 *
 * `Link2` is here to IDENTIFY the control, which is the only reason this design
 * system allows an icon at all (CLAUDE.md: no decorative icons). It carries no
 * count and no dot: nearly every verse in the dataset has references, so a
 * badge would say nothing and would only compete with the scripture next to it
 * (CROSS_LINKS_PLAN.md §4.1 point 4, the same argument `VerseMarkers.tsx`
 * makes for itself).
 */
const CrossRefButton = forwardRef<
  HTMLButtonElement,
  {
    verse: number | string;
    open: boolean;
    /** The id of the panel this button owns, for `aria-controls`. */
    panelId: string;
    onToggle: () => void;
    className?: string;
  }
>(function CrossRefButton({ verse, open, panelId, onToggle, className }, ref) {
  const c = useCrossRefCopy();
  const label = c('button_label', { n: verse });

  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md border p-1.5 shadow-field transition-colors',
        open
          ? 'border-teal bg-teal-dark text-white'
          : 'border-line bg-surface text-gray-500 hover:border-teal-dark hover:bg-teal-dark hover:text-white dark:text-muted-foreground',
        className,
      )}
    >
      <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
});

export default CrossRefButton;
