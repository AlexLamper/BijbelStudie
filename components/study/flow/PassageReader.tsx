'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';

import { SkeletonChapter } from '../../ui/skeletons';
import { CreateNoteModal } from '../CreateNoteModal';
import SpeakButton from '../SpeakButton';
import { getBibleAttribution } from '../../../lib/bible-attribution';
import { cn } from '../../../lib/utils';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

type VerseMap = Record<string, string>;

/**
 * The passage a lesson reads - and nothing else.
 *
 * Two deliberate differences from `ChapterViewer`:
 *
 *  - It renders ONLY the verses in range. The chapter viewer showed the whole
 *    chapter and coloured the lesson's verses in, which asks the reader to find
 *    their own gedeelte in a wall of text and to ignore the rest of it.
 *  - There is no highlight. When only the right verses are on screen, tinting
 *    them adds nothing except visual noise.
 *
 * The fetch still asks for the whole chapter because that is what the bible API
 * serves; the slicing happens here.
 */
export default function PassageReader({
  book,
  chapter,
  version,
  verseStart,
  verseEnd,
  preferences,
}: {
  book: string;
  chapter: number;
  version: string | null;
  verseStart: number | null;
  verseEnd: number | null;
  preferences?: ReadingPreferences;
}) {
  const [verses, setVerses] = useState<VerseMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ verseNumber: string; text: string } | null>(null);

  const prefs = preferences ?? {
    fontSize: 'base',
    fontFamily: 'serif',
    lineHeight: 'relaxed',
    letterSpacing: 'normal',
    highContrast: false,
    showVerseNumbers: true,
  };

  // One step larger than the same preference renders on /lezen. There the text
  // shares the screen with the commentary pane; here it has the whole width, and
  // 16px across a 1100px card reads as small print. The Aa control still moves
  // it from wherever this lands.
  const typography = cn(
    { sm: 'text-base', base: 'text-lg', lg: 'text-xl', xl: 'text-2xl' }[prefs.fontSize] ?? 'text-lg',
    { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }[prefs.fontFamily] ?? 'font-sans',
    { normal: 'leading-normal', relaxed: 'leading-relaxed', loose: 'leading-loose' }[prefs.lineHeight] ??
      'leading-relaxed',
    { tight: 'tracking-tight', normal: 'tracking-normal', wide: 'tracking-wide' }[prefs.letterSpacing] ??
      'tracking-normal',
  );

  useEffect(() => {
    if (!book || !chapter || !version) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setVerses({});

    (async () => {
      try {
        const params = new URLSearchParams({ book, chapter: String(chapter), version });
        const res = await fetch(`/api/bible/chapter?${params.toString()}`);
        if (!res.ok) throw new Error('De bijbeltekst kon niet worden geladen.');

        const data = await res.json();
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
  }, [book, chapter, version]);

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
      <div className="py-4">
        <SkeletonChapter verses={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="h-9 w-9 text-red-500 mx-auto mb-4" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (inRange.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-500 dark:text-muted-foreground">
        Geen bijbeltekst gevonden voor dit gedeelte.
      </div>
    );
  }

  return (
    <div className="content-in">
      <div className="space-y-4">
        {inRange.map(([number, text]) => (
          <div key={number} id={`verse-${number}`} className="group relative rounded-md -mx-2 px-2">
            <p className={cn('text-gray-900 dark:text-foreground', typography)}>
              {prefs.showVerseNumbers && (
                <sup className="font-semibold mr-2 text-[0.62em] text-gray-400 dark:text-muted-foreground select-none">
                  {number}
                </sup>
              )}
              <span
                className="cursor-pointer transition-colors hover:bg-[#0D9488]/10 rounded px-0.5"
                onClick={() => setSelected({ verseNumber: String(number), text })}
              >
                {text}
              </span>
            </p>

            <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <SpeakButton
                compact
                showSettings={false}
                getText={() => text}
                label={`Vers ${number} voorlezen`}
                className="bg-white dark:bg-card shadow-sm border border-gray-200 dark:border-border"
              />
              <button
                onClick={() => setSelected({ verseNumber: String(number), text })}
                className="bg-[#0D9488] hover:bg-[#0f766e] text-white p-1.5 rounded-sm shadow-sm"
                title={`Notitie bij vers ${number}`}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {attribution && (
        <p className="mt-8 pt-4 border-t border-gray-100 dark:border-border text-[11px] leading-snug text-gray-400 dark:text-muted-foreground">
          {attribution}
        </p>
      )}

      {selected && (
        <CreateNoteModal
          isOpen
          onClose={() => setSelected(null)}
          verseReference={`${book} ${chapter}:${selected.verseNumber}`}
          book={book}
          chapter={chapter}
          verse={parseInt(selected.verseNumber, 10)}
          verseText={selected.text}
          translation={version || 'statenvertaling'}
          onSave={() => setSelected(null)}
          availableVerses={inRange.map(([number]) => number)}
        />
      )}
    </div>
  );
}
