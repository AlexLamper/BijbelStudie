import React from 'react';

import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';

/**
 * The line that says "this is a design under review".
 *
 * Deliberately outside the design: card background, muted text, its own border.
 * Everything below it is the proposal, and mixing the two would make the
 * variant look like it ships with a debug bar. It also carries the one honest
 * disclaimer the three screens need - the progress on them is invented - so no
 * individual control has to apologise for itself.
 */
export default function ReviewStrip({
  sticky = true,
  children,
}: {
  sticky?: boolean;
  /** A back link or anything else that belongs on the same line. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={[
        'flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5',
        'border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-border dark:bg-card/95',
        'sm:px-6',
        sticky ? 'sticky top-0 z-40' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {children}
        <StudyFlowVariantSwitcher />
      </div>
      <p className="text-[11px] leading-none text-gray-400 dark:text-muted-foreground">
        Ontwerpvoorbeeld - voortgang is voorbeelddata en wordt niet opgeslagen.
      </p>
    </div>
  );
}
