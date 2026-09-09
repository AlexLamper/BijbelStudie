'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';

import { ATTRIBUTION_INK, VERSE_NUMBER_INK } from '../../scene/tokens';
import { CreateNoteModal } from '../CreateNoteModal';
import SpeakButton from '../SpeakButton';
import { SpokenText, SpokenTextScope } from '../SpokenText';
import VerseMarkers from '../VerseMarkers';
import { getBibleAttribution } from '../../../lib/bible-attribution';
import { cn } from '../../../lib/utils';
import { HIGHLIGHT_TINTS, useVerseAnnotations } from '../../../hooks/useVerseAnnotations';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

type VerseMap = Record<string, string>;

/**
 * The passage a lesson reads - and nothing else.
 *
 * EVERY COLOUR HERE IS FIXED, AND FIXED FOR THE WINDOW'S OWN GROUND. The
 * passage used to be laid on the scene's light `PLATE`; it now stands on the
 * same ground as everything around it (see StepWord), and that ground does not
 * flip with the reader's theme - so a `dark:` variant on anything inside would
 * paint light type on light the moment someone switched. The shared
 * `SkeletonChapter` is not used for the same reason; the local one below is a
 * dark-ground skeleton.
 *
 * The measured contrasts on SCENE_BG: scripture 18.5:1, verse numbers 11.0:1
 * (VERSE_NUMBER_INK), the licensing line 8.6:1 (ATTRIBUTION_INK). All three are
 * higher than on the plate they replace, and all three are the values /lezen
 * reads at - the two reading screens are now one screen twice.
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
  const { annotations, reload: reloadAnnotations } = useVerseAnnotations(book, chapter);

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
      <div className="py-2 space-y-4" role="status" aria-label="Bijbeltekst laden">
        {[100, 94, 88, 97, 82, 92, 76, 90].map((width, index) => (
          <div key={index} className="flex gap-3">
            <div className="h-3.5 w-5 flex-none rounded skeleton-pulse bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 rounded skeleton-pulse bg-white/10" />
              <div
                className="h-3.5 rounded skeleton-pulse bg-white/10"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        {/* #F87171 on the window's ground measures 6.6:1; the red-600/700 this
            used to carry was drawn for a white plate and lands under 3:1 here.
            Same pair StepQuiz uses for the same reason. */}
        <AlertCircle className="h-9 w-9 text-red-400 mx-auto mb-4" />
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (inRange.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-white/80">
        Geen bijbeltekst gevonden voor dit gedeelte.
      </div>
    );
  }

  return (
    // A scope of its own so the per-verse buttons work wherever this reader is
    // used; inside the study flow StepWord has already opened one, and this
    // call then falls through to it rather than shadowing it.
    <SpokenTextScope>
      <div className="content-in">
        <div className="space-y-4">
          {inRange.map(([number, text]) => {
            const marks = annotations.get(number);
            const tint = marks?.highlight ? HIGHLIGHT_TINTS[marks.highlight] : null;

            return (
            <div
              key={number}
              id={`verse-${number}`}
              className="group relative rounded-md -mx-2 px-2"
              style={
                tint
                  ? { backgroundColor: tint.bg, boxShadow: `inset 2px 0 0 0 ${tint.border}` }
                  : undefined
              }
            >
              {/* Scripture is the literal white the rest of the scene writes
                  in: 18.5:1 on the window's ground, and the same ink /lezen
                  sets the same verses in. */}
              <p className={`${typography} text-white`}>
                {prefs.showVerseNumbers && (
                  <sup
                    className="font-semibold mr-2 text-[0.62em] select-none"
                    style={{ color: VERSE_NUMBER_INK }}
                  >
                    {number}
                  </sup>
                )}
                <span
                  className="cursor-pointer transition-colors hover:bg-[#0D9488]/10 rounded px-0.5"
                  onClick={() => setSelected({ verseNumber: String(number), text })}
                >
                  <SpokenText text={text} />
                </span>
                {/* VerseMarkers paints its glyph #2DD4BF under a `dark` scope,
                    which is what the night ground wants - 9.7:1 - and it is the
                    same value /lezen shows the same markers in. The local
                    override that pulled it back to #0F766E existed only because
                    this reader used to sit on a light plate. */}
                <VerseMarkers annotation={marks} />
              </p>

              <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <SpeakButton
                  compact
                  showSettings={false}
                  getText={() => text}
                  label={`Vers ${number} voorlezen`}
                  className="shadow-sm border border-white/20"
                />
                <button
                  onClick={() => setSelected({ verseNumber: String(number), text })}
                  // #0F766E, not #0D9488: a white glyph on the lighter brand
                  // fill measures 3.74:1. Same swatch, one step down.
                  className="bg-[#0F766E] hover:bg-[#115E59] text-white p-1.5 rounded-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-white"
                  title={`Notitie bij vers ${number}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            );
          })}
        </div>

        {/* The licensing line. `getBibleAttribution` returns it verbatim and
            nothing here may reword, truncate or wrap it - the NBG51 licence is
            an exact string. It is ATTRIBUTION_INK, 8.6:1 on the window's
            ground: the same value /lezen sets the same notice in, and well
            clear of the 4.5:1 floor, because a required copyright notice is the
            last line on a screen that may be allowed to go quiet. */}
        {attribution && (
          <p
            className="mt-8 pt-4 border-t border-white/10 text-[11px] leading-snug"
            style={{ color: ATTRIBUTION_INK }}
          >
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
            onSave={() => {
              setSelected(null);
              void reloadAnnotations();
            }}
            availableVerses={inRange.map(([number]) => number)}
          />
        )}
      </div>
    </SpokenTextScope>
  );
}
