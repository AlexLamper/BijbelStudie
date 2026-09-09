'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';

import { SCENE_BG, TEAL_DEEP } from '../../scene/tokens';
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
 * EVERY COLOUR HERE IS FIXED, AND FIXED FOR A LIGHT GROUND. This reader is laid
 * on the scene's light `PLATE` (see StepWord), which does not flip with the
 * reader's theme - so a `dark:` variant on anything inside it would paint dark
 * type on a light plate the moment someone switched to dark mode. The shared
 * `SkeletonChapter` is not used for exactly that reason; its blocks carry
 * `dark:bg-secondary`, and the local one below is a light-ground skeleton.
 *
 * The measured contrasts on #F9FAFB: scripture 18.1:1 (it is set in the scene's
 * own night, SCENE_BG, rather than in gray-900 - a hair darker, and the same
 * colour the window is standing in), verse numbers 7.2:1, the licensing line
 * 9.9:1. All three are higher than the light window they replace.
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
            <div className="h-3.5 w-5 flex-none rounded skeleton-pulse bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 rounded skeleton-pulse bg-gray-200" />
              <div
                className="h-3.5 rounded skeleton-pulse bg-gray-200"
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
        <AlertCircle className="h-9 w-9 text-red-600 mx-auto mb-4" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (inRange.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-700">
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
              {/* The ink is the scene's own night, so scripture is written in
                  the colour the window is standing in: 18.1:1 on the plate. */}
              <p className={typography} style={{ color: SCENE_BG }}>
                {prefs.showVerseNumbers && (
                  <sup className="font-semibold mr-2 text-[0.62em] text-gray-600 select-none">
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
                    which is right on the night ground /lezen reads on and 1.8:1
                    on this light plate. That file is shared with /lezen and is
                    being worked on there, so the colour is corrected here
                    instead: the value comes from the token through a custom
                    property, and `!` clears the `dark:` variant's specificity.
                    #0F766E on the plate measures 5.2:1. */}
                <span
                  className="[&_*]:!text-[color:var(--verse-mark)]"
                  style={{ '--verse-mark': TEAL_DEEP } as React.CSSProperties}
                >
                  <VerseMarkers annotation={marks} />
                </span>
              </p>

              <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <SpeakButton
                  compact
                  showSettings={false}
                  getText={() => text}
                  label={`Vers ${number} voorlezen`}
                  className="shadow-sm border border-gray-200"
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
            an exact string. It was set in #9CA3AF, which measures 2.5:1 on
            white; that was lifted to #4B5563 (7.5:1), and on the plate it is
            #374151 - 9.9:1, and one shade darker rather than lighter so the
            move to a fixed light ground cannot cost a required notice any
            legibility. */}
        {attribution && (
          <p className="mt-8 pt-4 border-t border-gray-200 text-[11px] leading-snug text-gray-700">
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
