'use client';

import React, { useEffect } from 'react';

import { track } from '../../../lib/analytics';
import { cn } from '../../../lib/utils';
import type { CrossRefTarget } from '../../../hooks/useCrossRefs';
import CrossRefAttribution from './CrossRefAttribution';
import CrossRefList, {
  type CrossRefNavigateTarget,
  type CrossRefSurface,
} from './CrossRefList';
import { useCrossRefCopy } from './copy';

/**
 * The references for one verse, opened INLINE UNDER THAT VERSE.
 *
 * Not a floating popover, and that is a decision rather than a shortcut
 * (CROSS_LINKS_PLAN.md §4.1): a popover would mean a new Radix dependency, a
 * z-index argument inside the immersive `/studie` window, a different layout at
 * phone width, and a focus order that has to be managed by hand. An inline
 * block is the same thing at every width, reads in document order, and pushes
 * the rest of the chapter down - which is exactly what a reader expects from
 * something they opened on a line of text.
 *
 * Escape closes it and hands focus back to the button that opened it; the
 * button carries `aria-expanded` and `aria-controls` pointing at this region.
 */
export default function CrossRefPanel({
  id,
  verse,
  sourceLabel,
  sourceBookIndex,
  refs,
  loading,
  error,
  numberingMayDiffer,
  version,
  surface = 'verse_panel',
  onClose,
  onNavigate,
  className,
}: {
  id: string;
  verse: number | string;
  /** `Psalmen 51:3` - this verse, as the title and the back chip spell it. */
  sourceLabel: string;
  sourceBookIndex: number | null;
  refs: CrossRefTarget[];
  loading: boolean;
  error: boolean;
  /** This translation has no versification profile - say so before they jump. */
  numberingMayDiffer: boolean;
  version: string | null;
  /**
   * Which reader this panel was opened in, for the funnel. `/lezen` is the
   * default so no existing call site had to change; `/studie`'s own reader
   * passes `study_flow`.
   */
  surface?: CrossRefSurface;
  onClose: () => void;
  onNavigate?: (target: CrossRefNavigateTarget) => void;
  className?: string;
}) {
  const c = useCrossRefCopy();

  useEffect(() => {
    track('crossref_opened', { surface, platform: 'web' });
  }, [surface]);

  return (
    <section
      id={id}
      role="region"
      aria-label={c('panel_label', { n: verse })}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onClose();
      }}
      className={cn(
        'mb-1 mt-2 rounded-card border border-line bg-surface px-3 py-2.5 font-sans',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 className="text-[12px] font-bold uppercase tracking-[1.1px] text-ink-muted">
          {c('panel_title', { ref: sourceLabel })}
        </h3>
        {refs.length > 0 && (
          <span className="text-[11px] text-ink-faint">{c('sort_hint')}</span>
        )}
      </div>

      {numberingMayDiffer && (
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-muted">
          {c('numbering_fallback')}
        </p>
      )}

      {loading && (
        <div className="space-y-2 py-2" role="status" aria-label={c('loading')}>
          {[0, 1, 2].map((row) => (
            <div key={row} className="space-y-1">
              <span className="block h-[11px] w-1/3 animate-pulse rounded bg-line-soft" />
              <span className="block h-[10px] w-full animate-pulse rounded bg-line-soft" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="py-2 text-[12.5px] text-ink-muted">{c('error')}</p>
      )}

      {!loading && !error && (
        <CrossRefList
          className="mt-1"
          refs={refs}
          version={version}
          surface={surface}
          sourceLabel={sourceLabel}
          sourceVerse={Number(verse)}
          sourceBookIndex={sourceBookIndex}
          onNavigate={onNavigate}
        />
      )}

      <CrossRefAttribution version={version} form="short" />
    </section>
  );
}
