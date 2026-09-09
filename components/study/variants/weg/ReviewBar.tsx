import React from 'react';

import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';

/**
 * The strip that says which design you are looking at, and lets you hop to the
 * other three or to the other two screens of this one.
 *
 * Review furniture, not product: it is deliberately quiet, and it goes away
 * with the /studies/versie-* and /studie/versie-* routes once a direction is
 * chosen. These pages are noindex for the same reason.
 */
export default function ReviewBar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-dashed border-gray-200 dark:border-border pb-2 ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
        Ontwerp 3 &middot; Weg
      </span>
      <StudyFlowVariantSwitcher />
    </div>
  );
}
