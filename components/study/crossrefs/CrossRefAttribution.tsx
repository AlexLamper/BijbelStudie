'use client';

import React from 'react';

import { getBibleAttribution } from '../../../lib/bible-attribution';
import {
  OPENBIBLE_CROSSREF_ATTRIBUTION,
  OPENBIBLE_CROSSREF_ATTRIBUTION_SHORT,
} from '../../../lib/mobileLicensing';
import { cn } from '../../../lib/utils';

/**
 * The credit under every cross-reference list.
 *
 * TWO LICENCES CAN LAND HERE. The reference data is OpenBible.info under CC BY,
 * which obliges us to credit the source and to say that we changed it (we
 * filter it and renumber it into each translation's versification) - that is
 * the constant from `lib/mobileLicensing.ts`, imported rather than retyped so
 * web and app can never drift into two wordings of one credit. On top of that,
 * a preview row quotes the reader's translation, and when that translation is
 * the NBG-vertaling 1951 its copyright string is contractual and must appear
 * EXACTLY as `getBibleAttribution` returns it. Nothing here may reword, wrap or
 * truncate either string.
 *
 * Same treatment as the chapter licence line at the foot of `ChapterViewer`:
 * 11 px on the muted token, which measures 8.6:1 - a required notice has to be
 * readable, so it is not the faint token.
 */
export default function CrossRefAttribution({
  version,
  form = 'short',
  className,
}: {
  /** The translation the previews are quoting, if any are shown. */
  version?: string | null;
  /** `short` in the inline panel where space is tight, `long` in the tab. */
  form?: 'short' | 'long';
  className?: string;
}) {
  const crossRefs =
    form === 'long' ? OPENBIBLE_CROSSREF_ATTRIBUTION : OPENBIBLE_CROSSREF_ATTRIBUTION_SHORT;
  const bible = getBibleAttribution(version);

  return (
    <div
      className={cn(
        'mt-3 border-t border-line-soft pt-2 text-[11px] leading-snug text-ink-muted',
        className,
      )}
    >
      <p>{crossRefs}</p>
      {bible && <p className="mt-1">{bible}</p>}
    </div>
  );
}
