'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Languages, Plus } from 'lucide-react';

import { CreateNoteModal } from '../CreateNoteModal';
import SpeakButton from '../SpeakButton';
import { SpokenText, SpokenTextScope } from '../SpokenText';
import VerseMarkers from '../VerseMarkers';
import { FOCUS_RING } from './lesson-layout';
import CrossRefButton from '../crossrefs/CrossRefButton';
import CrossRefPanel from '../crossrefs/CrossRefPanel';
import OriginalVersePanel from './OriginalVersePanel';
import { useCrossRefCopy } from '../crossrefs/copy';
import { getBibleAttribution } from '../../../lib/bible-attribution';
import { toBookIndex } from '../../../lib/readChaptersCanon';
import { cn } from '../../../lib/utils';
import { useCrossRefs } from '../../../hooks/useCrossRefs';
import { HIGHLIGHT_TINTS, useVerseAnnotations } from '../../../hooks/useVerseAnnotations';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';
import { useIsPro } from '../../../hooks/useIsPro';

type VerseMap = Record<string, string>;

/**
 * The passage a lesson reads - and nothing else.
 *
 * EVERY COLOUR HERE IS FIXED, AND FIXED FOR THE WINDOW'S OWN GROUND. The
 * passage used to be laid on the scene's light `PLATE`; it now stands on the
 * same ground as everything around it (see StepWord). Every colour here is one
 * of the `les-*` tokens, so the column is right in BOTH lesson palettes: the
 * scripture is #1F2937 on the white page and #EDEDED on the dark one, and the
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

  /** The verse whose cross-reference panel is open, or null. One at a time. */
  const [crossRefVerse, setCrossRefVerse] = useState<number | null>(null);
  /**
   * The verse whose hover cluster was revealed by tapping its number. There is
   * no hover on a phone, and inside this window there is no materials tab to
   * fall back on either, so without this the controls are simply unreachable
   * there (CROSS_LINKS_PLAN.md §4.3).
   */
  const [revealedVerse, setRevealedVerse] = useState<number | null>(null);
  const crossRefButtons = useRef(new Map<number, HTMLButtonElement | null>());

  /**
   * The verse whose grondtekst is open under it, or null. One at a time, like
   * the cross-references. Pro only: a free reader who taps the control goes
   * straight to /abonnement - this is a bare icon in a hover cluster with no
   * surrounding context, not a moment worth interrupting with a dialog. The
   * ProOfferDialog stays for limits actually hit mid-task (notes, AI, groups)
   * and for the inline UpgradePrompt cards, which already carry their own
   * explanation (the whole-chapter grondtekst in Verdieping keeps its free
   * first verse - lib/proContent.ts).
   */
  const [originalVerse, setOriginalVerse] = useState<number | null>(null);
  const isPro = useIsPro();
  const router = useRouter();
  const toggleOriginal = (verse: number) => {
    if (!isPro) {
      router.push('/abonnement?source=original_tap');
      return;
    }
    setOriginalVerse((current) => (current === verse ? null : verse));
  };
  const crossRefCopy = useCrossRefCopy();

  /**
   * The chapter's references. `enabled` keeps the shard fetch lazy: it is a
   * static CDN file, but a lesson that nobody opens a panel in should not pay
   * for it. No `books` list is passed - the lesson has no translation book
   * index loaded, so targets fall back to their canonical Dutch names, which
   * `getChapter` resolves for every version through `getBookNameVariants`.
   */
  const crossRefs = useCrossRefs({
    version,
    book,
    chapter,
    enabled: crossRefVerse !== null,
  });
  const sourceBookIndex = useMemo(() => toBookIndex(book), [book]);

  const closeCrossRefs = (returnFocus = true) => {
    const verse = crossRefVerse;
    setCrossRefVerse(null);
    if (returnFocus && verse !== null) {
      crossRefButtons.current.get(verse)?.focus();
    }
  };

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
    // A new passage is a new set of verse numbers: an open panel or a revealed
    // cluster from the previous one would reopen on the wrong line.
    setCrossRefVerse(null);
    setRevealedVerse(null);
    crossRefButtons.current.clear();

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
        <AlertCircle className="mx-auto mb-4 h-9 w-9 text-danger dark:text-red-400" />
        <p className="text-[13.5px] text-danger dark:text-red-400">{error}</p>
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
            const crossRefsOpen = crossRefVerse === number;
            const originalOpen = originalVerse === number;
            const clusterRevealed = revealedVerse === number || crossRefsOpen || originalOpen;
            const originalPanelId = `studie-grondtekst-verse-${number}`;
            // An IDREF, so no spaces: the book name never goes in here.
            const crossRefPanelId = `studie-crossrefs-verse-${number}`;

            return (
            <div
              key={number}
              id={`verse-${number}`}
              className="group relative rounded-md -mx-2 px-2"
              onKeyDown={
                crossRefsOpen
                  ? (event) => {
                      if (event.key !== 'Escape') return;
                      // The window listens for Escape too (it leaves the
                      // lesson); closing the panel is what Escape means while
                      // one is open.
                      event.stopPropagation();
                      closeCrossRefs();
                    }
                  : undefined
              }
              style={
                tint
                  ? { backgroundColor: tint.bg, boxShadow: `inset 2px 0 0 0 ${tint.border}` }
                  : undefined
              }
            >
              {/* Scripture in the lesson's own ink: #1F2937 on the light page
                  and #EDEDED on the dark one. */}
              <p className={`${typography} text-les-scripture`}>
                {prefs.showVerseNumbers && (
                  <sup className="mr-[6px] select-none align-super">
                    {/* The number is also the touch handle for the controls
                        beside the verse - same face, size and colour as the
                        plain number it replaced, and only the label says what
                        it does. */}
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedVerse((current) => (current === number ? null : number))
                      }
                      aria-label={crossRefCopy('verse_actions_label', { n: number })}
                      className={`font-sans text-[11px] font-semibold text-les-faint outline-none transition-colors hover:text-les-accent ${FOCUS_RING}`}
                    >
                      {number}
                    </button>
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

              {/* Hover controls. Below md there is no hover: a tap on a phone left
                    them stuck over the end of the verse, and the tap itself
                    already opens the note dialog they lead to. The way in there
                    is the verse number above, which reveals this cluster at any
                    width; keyboard users get it through `focus-within`. */}
              <div
                data-no-page-swipe
                className={cn(
                  'absolute right-0 top-0 flex items-center gap-0.5 transition-opacity focus-within:opacity-100',
                  clusterRevealed
                    ? 'opacity-100'
                    : 'max-md:hidden opacity-0 group-hover:opacity-100',
                )}
              >
                <SpeakButton
                  compact
                  showSettings={false}
                  getText={() => text}
                  label={`Vers ${number} voorlezen`}
                  className="border border-les-card-line bg-les-bg shadow-sm"
                />
                {/* Languages IDENTIFIES the control: it is the glyph the
                    Grondtekst panel in Verdieping carries. */}
                <button
                  type="button"
                  onClick={() => toggleOriginal(number)}
                  aria-expanded={isPro ? originalOpen : undefined}
                  aria-controls={isPro ? originalPanelId : undefined}
                  aria-label={`Grondtekst van vers ${number}`}
                  title={isPro ? `Grondtekst van vers ${number}` : `Grondtekst van vers ${number} (Pro)`}
                  className={cn(
                    'inline-flex items-center justify-center rounded-md border p-1.5 shadow-field transition-colors',
                    originalOpen
                      ? 'border-teal bg-teal-dark text-white'
                      : 'border-line bg-surface text-gray-500 hover:border-teal-dark hover:bg-teal-dark hover:text-white dark:text-muted-foreground dark:hover:text-white',
                  )}
                >
                  <Languages className="h-3.5 w-3.5" aria-hidden />
                </button>
                <CrossRefButton
                  ref={(element) => {
                    crossRefButtons.current.set(number, element);
                  }}
                  verse={number}
                  open={crossRefsOpen}
                  panelId={crossRefPanelId}
                  onToggle={() =>
                    crossRefsOpen ? closeCrossRefs(false) : setCrossRefVerse(number)
                  }
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

              {/* Inline, under the verse it belongs to - not a popover, which in
                  this window would have to win a z-index argument with the AI
                  dock and the hover rail. `data-no-page-swipe` is what keeps a
                  drag inside it from turning the lesson page (see
                  StudyFlowShell#startsInSidewaysRegion); the panel is an
                  ordinary block in the step column, so the ResizableSplit
                  divider beside the dock never has to know it is there. */}
              {originalOpen && (
                <div data-no-page-swipe>
                  <OriginalVersePanel
                    id={originalPanelId}
                    book={book}
                    chapter={chapter}
                    verse={number}
                    onClose={() => setOriginalVerse(null)}
                  />
                </div>
              )}

              {crossRefsOpen && (
                <div data-no-page-swipe>
                  <CrossRefPanel
                    id={crossRefPanelId}
                    verse={number}
                    sourceLabel={`${book} ${chapter}:${number}`}
                    sourceBookIndex={sourceBookIndex}
                    refs={crossRefs.forVerse(number)}
                    loading={crossRefs.loading}
                    error={crossRefs.error}
                    numberingMayDiffer={crossRefs.numberingMayDiffer}
                    version={version}
                    surface="study_flow"
                    onClose={() => closeCrossRefs()}
                  />
                </div>
              )}
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
