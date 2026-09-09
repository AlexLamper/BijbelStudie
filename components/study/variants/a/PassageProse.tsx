'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';

import { SkeletonChapter } from '../../../ui/skeletons';
import { getBibleAttribution } from '../../../../lib/bible-attribution';

type VerseMap = Record<string, string>;

/**
 * Het gedeelte van de les, alleen om te lezen.
 *
 * Een eigen lezer in plaats van `components/study/flow/PassageReader`, om één
 * reden: die zet achter elk vers een "+" die `CreateNoteModal` opent, en dat
 * zou op een ontwerpvoorbeeld een echte notitie in de database van de
 * beoordelaar zetten. Dit scherm mag niets schrijven. Wat hier verder gebeurt
 * is hetzelfde: één GET naar /api/bible/chapter, en de verzen van de les eruit
 * gesneden in de browser — er wordt op de server geen bijbeldata aangeraakt.
 *
 * Alle drie de toestanden zijn echt: laden, mislukt (met opnieuw proberen) en
 * leeg. Bij zesenzestig gegenereerde boekstudies is "dit hoofdstuk bestaat niet
 * in deze vertaling" geen randgeval maar gewoon dinsdag.
 */
export default function PassageProse({
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
  /** Opnieuw proberen zonder de component te hoeven remonteren. */
  const [attempt, setAttempt] = useState(0);

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
        setVerses((data?.verses ?? {}) as VerseMap);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'De bijbeltekst kon niet worden geladen.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [book, chapter, version, attempt]);

  /** Alleen de verzen die deze les vraagt, op nummer gesorteerd. */
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
      <div className="py-3" aria-live="polite" aria-busy="true">
        <span className="sr-only">De bijbeltekst wordt geladen.</span>
        <SkeletonChapter verses={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center" role="alert">
        <AlertCircle size={22} aria-hidden className="mx-auto mb-3 text-red-500" />
        <p className="text-[14px] text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="va-focus press mt-4 inline-flex h-9 items-center rounded-lg border border-gray-200 px-4 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-secondary"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (inRange.length === 0) {
    return (
      <p className="py-10 text-center text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
        Voor dit gedeelte is in deze vertaling geen tekst gevonden. Kies hiernaast een andere
        vertaling.
      </p>
    );
  }

  return (
    <div className="content-in">
      <div className="space-y-4">
        {inRange.map(([number, text]) => (
          <p
            key={number}
            id={`vers-${number}`}
            className="font-serif text-[17px] leading-[1.78] text-slate-800 dark:text-foreground/90"
          >
            <sup className="mr-2 select-none text-[0.62em] font-semibold text-gray-400 dark:text-muted-foreground">
              {number}
            </sup>
            {text}
          </p>
        ))}
      </div>

      {attribution && (
        <p className="mt-8 border-t border-gray-100 pt-4 text-[11px] leading-snug text-gray-400 dark:border-border dark:text-muted-foreground">
          {attribution}
        </p>
      )}

      <p className="mt-4 text-[11.5px] leading-snug text-gray-400 dark:text-muted-foreground">
        In dit ontwerpvoorbeeld kun je nog geen notitie bij een vers maken.
      </p>
    </div>
  );
}
