'use client';

import React from 'react';
import { StickyNote } from 'lucide-react';

import type { VerseAnnotation } from '../../hooks/useVerseAnnotations';

const TEAL = '#0D9488';

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
      <StickyNote size={12} style={{ color: TEAL }} aria-hidden />
      {annotation.notes > 1 && (
        <span className="text-[0.62em] font-bold leading-none" style={{ color: TEAL }}>
          {annotation.notes}
        </span>
      )}
    </span>
  );
}
