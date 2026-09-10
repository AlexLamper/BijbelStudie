'use client';

import React from 'react';
import { StickyNote } from 'lucide-react';

import type { VerseAnnotation } from '../../hooks/useVerseAnnotations';

/**
 * The mark's colour, as classes rather than an inline style, so it can answer
 * the ground it lands on. #0D9488 is the brand fill for a white page; on the
 * night ground /lezen now reads on it measures 5.0:1, and only 3.2:1 once the
 * reader has highlighted the verse underneath it. #2DD4BF is the same swatch's
 * on-dark value: 10.2:1 plain, 6.4:1 on the loudest highlight tint.
 */
const MARK = 'text-[#0D9488] dark:text-[#2DD4BF]';

/**
 * The "you have written something here" mark, rendered inline after a verse.
 *
 * Deliberately one small glyph rather than a badge, a count bubble or a coloured
 * gutter rail. The reader is reading Scripture; a marker that competes with the
 * text for attention is worse than no marker, and the highlight tint on the
 * verse itself already carries the loud signal. This only has to answer "did I
 * leave a note on this one" at a glance.
 *
 * A highlight alone renders nothing here - the tint is the marker. Only a note
 * with actual text gets the icon, because that is the thing you cannot see just
 * by looking at the verse.
 */
export default function VerseMarkers({ annotation }: { annotation?: VerseAnnotation }) {
  if (!annotation || annotation.notes === 0) return null;

  const label = annotation.notes === 1 ? '1 notitie bij dit vers' : `${annotation.notes} notities bij dit vers`;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="ml-1.5 inline-flex translate-y-[1px] items-center gap-0.5 align-middle"
    >
      <StickyNote size={12} className={MARK} aria-hidden />
      {annotation.notes > 1 && (
        <span className={`text-[0.62em] font-bold leading-none ${MARK}`}>
          {annotation.notes}
        </span>
      )}
    </span>
  );
}
