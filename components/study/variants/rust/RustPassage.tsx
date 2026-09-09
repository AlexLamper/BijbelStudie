'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { getBibleAttribution } from '../../../../lib/bible-attribution';
import { SCRIPTURE_MEASURE, TEAL } from './typography';

/**
 * The passage, set as running prose.
 *
 * This is where the variant makes its case. `PassageReader` in the live flow
 * puts every verse in its own block with hover controls over it; here the text
 * is set the way a bible is set - one column, continuous paragraph, verse
 * numbers as small superscript figures that you can ignore while reading. The
 * measure is ~62 characters, the leading is 1.85, and the face is the serif.
 * Nothing else is on the screen.
 *
 * It fetches its own text from /api/bible/chapter, exactly as the live reader
 * does, and slices the lesson's verses out of the chapter the API returns. No
 * server data, no session: safe on a preview route.
 */

type VerseMap = Record<string, string>;

export default function RustPassage({
  book,
  chapter,
  version,
  versionLabel,
  verseStart,
  verseEnd,
}: {
  book: string;
  chapter: number;
  version: string;
  /** The translation's own name, for the line under the text. */
  versionLabel: string;
  verseStart: number | null;
  verseEnd: number | null;
}) {
  const [verses, setVerses] = useState<VerseMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Bumped by "probeer opnieuw" to re-run the fetch. */
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!book || !chapter || !version) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setVerses({});

    (async () => {
      try {
        const params = new URLSearchParams({ book, chapter: String(chapter), version });
        const response = await fetch(`/api/bible/chapter?${params.toString()}`);
        if (!response.ok) throw new Error('De bijbeltekst kon niet worden geladen.');

        const data = await response.json();
        if (cancelled) return;
        if (!data.verses || Object.keys(data.verses).length === 0) {
          throw new Error('Geen verzen gevonden voor dit gedeelte.');
        }
        setVerses(data.verses as VerseMap);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fout bij het laden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [book, chapter, version, attempt]);

  /** Only the verses this lesson asks for, in numeric order. */
  const inRange = useMemo(() => {
    const rows = Object.entries(verses)
      .map(([number, text]) => [parseInt(number, 10), text] as [number, string])
      .filter(([number]) => Number.isFinite(number))
      .sort((a, b) => a[0] - b[0]);

    if (verseStart == null) return rows;
    const last = verseEnd ?? verseStart;
    return rows.filter(([number]) => number >= verseStart && number <= last);
  }, [verses, verseStart, verseEnd]);

  const attribution = getBibleAttribution(version);

  if (loading) {
    // Ruled lines at the measure and leading of the text they stand in for, so
    // nothing shifts when the passage arrives.
    return (
      <div className={SCRIPTURE_MEASURE}>
        <p className="sr-only" role="status">
          De bijbeltekst wordt geladen.
        </p>
        <div className="space-y-[0.85rem]" aria-hidden>
          {[100, 96, 99, 91, 97, 88, 94, 63].map((width, index) => (
            <div
              key={index}
              className="skeleton-pulse h-[0.9rem] rounded-sm bg-border"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={SCRIPTURE_MEASURE}>
        <p className="text-[15px] leading-relaxed text-foreground">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 text-[13px] font-medium underline underline-offset-4"
          style={{ color: TEAL }}
        >
          Probeer opnieuw
        </button>
      </div>
    );
  }

  if (inRange.length === 0) {
    return (
      <p className={`${SCRIPTURE_MEASURE} text-[15px] leading-relaxed text-muted-foreground`}>
        Voor dit gedeelte is in deze vertaling geen tekst gevonden.
      </p>
    );
  }

  return (
    <div className={`${SCRIPTURE_MEASURE} content-in`}>
      <p className="font-serif text-[19px] leading-[1.85] text-foreground">
        {inRange.map(([number, text]) => (
          <React.Fragment key={number}>
            <sup className="select-none pr-[0.2em] align-super font-sans text-[0.58em] font-semibold tabular-nums text-muted-foreground">
              {number}
            </sup>
            {text.trim()}{' '}
          </React.Fragment>
        ))}
      </p>

      <p className="mt-8 border-t border-border pt-3 text-[11.5px] leading-relaxed text-muted-foreground">
        {versionLabel}
        {attribution ? ` — ${attribution}` : ''}
      </p>
    </div>
  );
}
