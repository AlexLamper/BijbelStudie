import React from 'react';

import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';

/**
 * The strip that says "this is a design under review".
 *
 * Deliberately outside the design: plain card background, muted text, its own
 * border. Everything below it is the proposal; this line is the reviewer's
 * furniture, and mixing the two would make the variant look like it ships with
 * a debug bar. It also carries the one honest disclaimer the three screens
 * need - the progress on them is invented - so no individual control has to
 * apologise for itself.
 */
export default function ReviewBar({ sticky = true }: { sticky?: boolean }) {
  return (
    <div
      className={[
        'flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5',
        'border-b border-gray-200 dark:border-border bg-white/95 dark:bg-card/95 backdrop-blur',
        'px-4 sm:px-6 py-2',
        sticky ? 'sticky top-0 z-40' : '',
      ].join(' ')}
    >
      <StudyFlowVariantSwitcher />
      <p className="text-[11px] leading-none text-gray-400 dark:text-muted-foreground">
        Ontwerpvoorbeeld — voortgang is voorbeelddata en wordt niet opgeslagen.
      </p>
    </div>
  );
}
