'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';

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
 * same ground as everything around it (see StepWord). Every colour here is one
 * of the `les-*` tokens, so the column is right in BOTH lesson palettes: the
 * scripture is #1F2937 on the white page and #EAF2F1 on the night one, and the
 * verse numbers and the licence line step down from it in the same proportion
 * either way. The shared `SkeletonChapter` is still not used - the local one
 * below follows the lesson's card token instead of the app's.
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

  // The lesson's reading measure: Lora 17.5 / 1.85
  // (design_handoff_web/PAGES-STUDIE-EN-LES.md §11), one step above the 17 px
  // /lezen sets the same verses in - there the column shares the screen with the
  // commentary, here it has the measure to itself. The Aa control still moves it
  // from wherever this lands.
  const typography = cn(
    { sm: 'text-[15.5px]', base: 'text-[17.5px]', lg: 'text-[19.5px]', xl: 'text-[21.5px]' }[
      prefs.fontSize
    ] ?? 'text-[17.5px]',
    { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }[prefs.fontFamily] ?? 'font-serif',
    { normal: 'leading-[1.6]', relaxed: 'leading-[1.85]', loose: 'leading-[2.1]' }[prefs.lineHeight] ??
      'leading-[1.85]',
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
            <div className="skeleton-pulse h-3.5 w-5 flex-none rounded bg-les-card" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-pulse h-3.5 rounded bg-les-card" />
              <div
                className="skeleton-pulse h-3.5 rounded bg-les-card"
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
        <AlertCircle className="mx-auto mb-4 h-9 w-9 text-danger" />
        <p className="text-[13.5px] text-danger">{error}</p>
      </div>
    );
  }

  if (inRange.length === 0) {
    return (
      <div className="py-16 text-center text-[13.5px] text-les-body">
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
        <div className="space-y-[15px]">
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
              {/* Scripture in the lesson's own ink: #1F2937 on the light page
                  and #EAF2F1 on the night one. */}
              <p className={`${typography} text-les-scripture`}>
                {prefs.showVerseNumbers && (
                  <sup className="mr-[6px] select-none align-super font-sans text-[11px] font-semibold text-les-faint">
                    {number}
                  </sup>
                )}
                <span
                  className="cursor-pointer rounded px-0.5 transition-colors hover:bg-[var(--teal-wash)]"
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
                  className="border border-les-card-line bg-les-bg shadow-sm"
                />
                <button
                  onClick={() => setSelected({ verseNumber: String(number), text })}
                  // #0F766E, not #0D9488: a white glyph on the lighter brand
                  // fill measures 3.74:1. Same swatch, one step down.
                  className="rounded-sm bg-teal-dark p-1.5 text-white shadow-sm outline-none transition-opacity hover:opacity-90"
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
            an exact string. `les-muted` and not `les-faint`: a required
            copyright notice is the last line on a screen that may be allowed to
            go quiet, but it still has to clear 4.5:1. */}
        {attribution && (
          <p
            className="mt-8 border-t border-les-line pt-4 text-[11px] leading-snug text-les-muted"
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
