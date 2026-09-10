'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';

import { SkeletonChapter } from '../../../ui/skeletons';
import { getBibleAttribution } from '../../../../lib/bible-attribution';

type VerseMap = Record<string, string>;

/**
 * The passage a lesson reads - read-only.
 *
 * Deliberately NOT `components/study/flow/PassageReader`. That component is
 * right for the real flow, but it hangs a "+" on every verse that opens
 * `CreateNoteModal` and it loads the reader's verse annotations, so a reviewer
 * clicking around a design preview would write a real note against a real
 * account. These three screens are supposed to be incapable of touching
 * anything, and a renderer that cannot write is the only way to promise that.
 *
 * Everything else is the same: it asks /api/bible/chapter for the chapter -
 * the route the browser already uses, never the JSON under /public/data - and
 * slices the lesson's verses out of the answer here. `getBibleAttribution` is
 * reused rather than reimplemented: the NBG51 notice is contractually exact and
 * must appear wherever its text does.
 */
export default function PassageC({
  book,
  chapter,
  version,
  verseStart,
  verseEnd,
  className = '',
}: {
  book: string;
  chapter: number;
  version: string | null;
  verseStart: number | null;
  verseEnd: number | null;
  className?: string;
}) {
  const [verses, setVerses] = useState<VerseMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Bumped by "Opnieuw proberen", which is the only way to re-run the effect. */
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
      } catch (problem) {
        if (!cancelled) {
          setError(problem instanceof Error ? problem.message : 'Er ging iets mis bij het laden.');
        }
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
    return (
      <div className={className} role="status" aria-label="Bijbeltekst laden">
        <SkeletonChapter verses={7} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`pc-edge rounded-xl border p-5 ${className}`}>
        <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-gray-700 dark:text-foreground">
          <AlertCircle size={16} aria-hidden className="mt-0.5 flex-none text-red-500" />
          <span>{error}</span>
        </p>
        <button
          type="button"
          onClick={retry}
          className="pc-focus press mt-3 inline-flex h-9 items-center rounded-lg border border-gray-200 px-3.5 text-[12.5px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-border dark:text-foreground dark:hover:bg-secondary"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (inRange.length === 0) {
    return (
      <p className={`text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground ${className}`}>
        Dit gedeelte is nog niet beschikbaar in deze vertaling. Kies hiernaast een andere vertaling.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {inRange.map(([number, text]) => (
          <p
            key={number}
            id={`vers-${number}`}
            className="font-serif text-[17px] leading-[1.78] text-gray-900 dark:text-foreground"
          >
            <sup className="mr-2 select-none text-[0.62em] font-semibold tabular-nums text-gray-400 dark:text-muted-foreground">
              {number}
            </sup>
            {text}
          </p>
        ))}
      </div>

      {attribution && (
        <p className="pc-edge mt-8 border-t pt-4 text-[11px] leading-snug text-gray-400 dark:text-muted-foreground">
          {attribution}
        </p>
      )}
    </div>
  );
}
