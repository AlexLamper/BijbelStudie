'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * What the reader has already marked in this chapter.
 *
 * Notes and highlights share the `Note` collection - `type` is the
 * discriminator ('note' | 'highlight' | 'both'), and anything created in the
 * mobile app lands there too - so one request answers both questions. See
 * lib/mobileUserData.ts.
 *
 * Range notes are expanded across every verse they cover: a note on
 * "Genesis 12:1-9" has to show a marker on all nine verses, otherwise it looks
 * like it was attached to the first one only.
 */

export type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';

export interface VerseAnnotation {
  /** How many notes with actual text touch this verse. */
  notes: number;
  /** The colour to tint the verse with, or null when it is not highlighted. */
  highlight: HighlightColor | null;
}

export type AnnotationMap = Map<number, VerseAnnotation>;

interface NoteRow {
  _id?: string;
  chapter?: number;
  verse?: number | null;
  verseEnd?: number | null;
  noteText?: string;
  highlightColor?: string;
  type?: string;
}

const COLORS: HighlightColor[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'];

function asColor(value: unknown): HighlightColor | null {
  return typeof value === 'string' && (COLORS as string[]).includes(value)
    ? (value as HighlightColor)
    : null;
}

/** Tailwind-free tints, so the same values work in both themes via opacity. */
export const HIGHLIGHT_TINTS: Record<HighlightColor, { bg: string; border: string }> = {
  yellow: { bg: 'rgba(250, 204, 21, 0.20)', border: 'rgba(202, 138, 4, 0.85)' },
  blue: { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(37, 99, 235, 0.85)' },
  green: { bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(22, 163, 74, 0.85)' },
  pink: { bg: 'rgba(236, 72, 153, 0.16)', border: 'rgba(219, 39, 119, 0.85)' },
  purple: { bg: 'rgba(168, 85, 247, 0.16)', border: 'rgba(147, 51, 234, 0.85)' },
  orange: { bg: 'rgba(249, 115, 22, 0.18)', border: 'rgba(234, 88, 12, 0.85)' },
};

export function useVerseAnnotations(book: string | null | undefined, chapter: number | null | undefined) {
  const [annotations, setAnnotations] = useState<AnnotationMap>(new Map());

  const load = useCallback(async () => {
    if (!book || !chapter) {
      setAnnotations(new Map());
      return;
    }

    try {
      const params = new URLSearchParams({ book, chapter: String(chapter), limit: '200' });
      const res = await fetch(`/api/notes?${params.toString()}`);
      // 401 for a logged-out reader is the normal case, not an error.
      if (!res.ok) {
        setAnnotations(new Map());
        return;
      }

      const data = await res.json();
      const rows: NoteRow[] = Array.isArray(data?.notes) ? data.notes : [];
      const map: AnnotationMap = new Map();

      for (const row of rows) {
        if (row.chapter !== chapter) continue;
        const start = typeof row.verse === 'number' ? row.verse : null;
        if (start == null) continue;
        const end = typeof row.verseEnd === 'number' && row.verseEnd >= start ? row.verseEnd : start;

        const isHighlight = row.type === 'highlight' || row.type === 'both';
        const hasText = typeof row.noteText === 'string' && row.noteText.trim().length > 0;
        const color = asColor(row.highlightColor);

        for (let verse = start; verse <= end; verse++) {
          const current = map.get(verse) ?? { notes: 0, highlight: null };
          if (hasText && row.type !== 'highlight') current.notes += 1;
          // Last one wins, which matches "the most recently saved colour".
          if (isHighlight && color) current.highlight = color;
          map.set(verse, current);
        }
      }

      setAnnotations(map);
    } catch {
      setAnnotations(new Map());
    }
  }, [book, chapter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { annotations, reload: load };
}
