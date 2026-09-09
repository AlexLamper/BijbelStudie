'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';

import { getBibleAttribution } from '../../../../lib/bible-attribution';
import { SkeletonChapter } from '../../../ui/skeletons';

/**
 * Het gedeelte van deze les, en verder niets.
 *
 * Bewust NIET `components/study/flow/PassageReader`. Die is prima, maar hij
 * hangt een plusknop aan elk vers die `CreateNoteModal` opent, en dat schrijft
 * een echte notitie weg op het account van wie dit ontwerp beoordeelt. Een
 * beoordelings-URL hoort niets achter te laten, dus deze kolom leest alleen:
 * één GET naar /api/bible/chapter, geen notities, geen markeringen, geen
 * sessie.
 *
 * De verzen worden hier gesneden, niet door de API: die serveert het hele
 * hoofdstuk, en de les vraagt om een gedeelte.
 *
 * De bronvermelding onderaan is niet optioneel. De NBG-vertaling 1951 mag
 * alleen worden getoond met de exacte regel uit `lib/bible-attribution.ts`.
 */

type VerseMap = Record<string, string>;

export default function PassageColumn({
  book,
  chapter,
  version,
  verseStart,
  verseEnd,
}: {
  book: string;
  chapter: number;
  version: string | null;
  verseStart: number | null;
  verseEnd: number | null;
}) {
  const [verses, setVerses] = useState<VerseMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Verhoogd door "Opnieuw proberen"; verder nergens voor gebruikt. */
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
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Er ging iets mis bij het laden.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [book, chapter, version, attempt]);

  /** Alleen de verzen waar deze les om vraagt, op nummer. */
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
      <div className="py-3">
        <SkeletonChapter verses={7} />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="py-10 text-center">
        <AlertCircle className="mx-auto mb-3 h-7 w-7 text-red-500" aria-hidden />
        <p className="text-[13.5px] text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="press mt-4 inline-flex h-9 items-center rounded-lg border border-gray-200 px-4 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 dark:border-border dark:text-foreground dark:hover:bg-secondary"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (inRange.length === 0) {
    return (
      <p className="py-10 text-center text-[13.5px] text-gray-500 dark:text-muted-foreground">
        Geen bijbeltekst gevonden voor dit gedeelte. Kies hiernaast een andere vertaling — niet elke
        vertaling heeft elk boek.
      </p>
    );
  }

  return (
    <div className="content-in">
      <div className="space-y-3.5">
        {inRange.map(([number, text]) => (
          <p
            key={number}
            id={`vers-${number}`}
            className="font-serif text-[17px] leading-[1.78] text-gray-900 dark:text-foreground"
          >
            <sup className="mr-1.5 select-none text-[0.6em] font-semibold text-gray-400 tabular-nums dark:text-muted-foreground">
              {number}
            </sup>
            {text}
          </p>
        ))}
      </div>

      {attribution ? (
        <p className="mt-7 border-t border-gray-100 pt-3 text-[11px] leading-snug text-gray-400 dark:border-border dark:text-muted-foreground">
          {attribution}
        </p>
      ) : null}
    </div>
  );
}
