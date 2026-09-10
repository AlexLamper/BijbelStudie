import React, { useEffect, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { SkeletonChapter } from '../ui/skeletons';
import { CreateNoteModal } from './CreateNoteModal';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';
import { HIGHLIGHT_TINTS, useVerseAnnotations } from '../../hooks/useVerseAnnotations';
import { cn } from '../../lib/utils';
import { getBibleAttribution } from '../../lib/bible-attribution';
import SpeakButton from './SpeakButton';
import { SpokenText, SpokenTextScope } from './SpokenText';
import VerseMarkers from './VerseMarkers';
import { VERSE_NUMBER_INK } from '../scene/tokens';

type Props = {
  version: string | null;
  book: string;
  chapter: number;
  maxChapter: number;
  preferences?: ReadingPreferences;
  highlightRange?: { start: number; end: number };
};

type VerseData = { [key: string]: string };

function buildChapterText(verses: VerseData): string {
  return Object.entries(verses)
    .map(([, text]) => text.trim())
    .filter(Boolean)
    .join(' ');
}

interface SelectedVerse {
  verseNumber: string;
  text: string;
  reference: string;
}

export default function ChapterViewer({
  version,
  book,
  chapter,
  preferences,
  highlightRange,
}: Props) {
  const [verses, setVerses] = useState<VerseData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const { annotations, reload: reloadAnnotations } = useVerseAnnotations(book, chapter);

  const API_BASE_URL = '/api/bible';

  // Default preferences if not provided
  const prefs = preferences || {
    fontSize: 'base',
    fontFamily: 'sans',
    lineHeight: 'relaxed',
    letterSpacing: 'normal',
    highContrast: false,
    showVerseNumbers: true,
  };

  const fontSizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[prefs.fontSize] || 'text-base';

  const fontFamilyClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[prefs.fontFamily] || 'font-sans';

  const lineHeightClass = {
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
  }[prefs.lineHeight] || 'leading-relaxed';

  const letterSpacingClass = {
    tight: 'tracking-tight',
    normal: 'tracking-normal',
    wide: 'tracking-wide',
  }[prefs.letterSpacing] || 'tracking-normal';

  useEffect(() => {
    const fetchChapter = async () => {
      setLoading(true);
      setError(null);
      setVerses({});

      try {
        const params = new URLSearchParams({
          book,
          chapter: chapter.toString(),
        });

        if (version) {
          params.append('version', version);
        }

        const url = `${API_BASE_URL}/chapter?${params.toString()}`;

        const res = await fetch(url);

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`API gaf een fout terug: ${res.status} ${res.statusText} - ${errorText}`);
        }

        const data = await res.json();

        if (!data.verses || Object.keys(data.verses).length === 0) {
          throw new Error('Geen verzen gevonden in response. Mogelijk is het hoofdstuk leeg of ongeldig.');
        }

        setVerses(data.verses);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
          console.error('Chapter fetch error:', err.message);
        } else {
          setError('Fout bij het laden van de bijbeltekst');
          console.error('Unknown error during chapter fetch:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    if (book && chapter > 0 && version) {
      fetchChapter();
    } else {
      setVerses({});
      setLoading(false);
      setError(null);
    }
  }, [book, chapter, version]);

  // Auto-scroll to the first highlighted verse when highlightRange or verses change
  useEffect(() => {
    if (!highlightRange || loading || Object.keys(verses).length === 0) return;
    const el = document.getElementById(`verse-${highlightRange.start}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    }
  }, [highlightRange, verses, loading]);

  const handleVerseClick = (verseNumber: string, text: string) => {
    const reference = `${book} ${chapter}:${verseNumber}`;
    setSelectedVerse({
      verseNumber,
      text,
      reference
    });
    setShowCreateNoteModal(true);
  };

  const handleNoteSaved = () => {
    setShowCreateNoteModal(false);
    setSelectedVerse(null);
    // The marker has to appear straight away, or saving a note looks like it
    // did nothing until the next chapter change.
    void reloadAnnotations();
  };

  const handleCancelNote = () => {
    setShowCreateNoteModal(false);
    setSelectedVerse(null);
  };

  return (
    <div>
      {loading && (
        <div className="py-8">
          <SkeletonChapter verses={10} />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-6" />
            <p className="font-merriweather text-red-600 font-semibold mb-3 text-lg dark:text-red-400">Fout bij laden</p>
            <p className="font-inter text-gray-700 dark:text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* One scope for the whole chapter: the header button reads every verse,
          each verse has a button of its own, and all of them have to reach the
          same rendered text. */}
      {!loading && !error && Object.keys(verses).length > 0 && (
        <SpokenTextScope>
          <div className="content-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
                {book} {chapter}
              </p>
              <SpeakButton
                compact
                showSettings={false}
                getText={() => buildChapterText(verses)}
                label="Lees hoofdstuk voor"
              />
            </div>
            <div className="space-y-2 text-justify">
              {Object.entries(verses).map(([verseNumber, text]) => {
                const vNum = parseInt(verseNumber, 10);
                const isHighlighted = highlightRange
                  ? vNum >= highlightRange.start && vNum <= highlightRange.end
                  : false;
                const marks = annotations.get(vNum);
                // The reader's own highlight wins over the lesson's range tint:
                // one is something they chose, the other is context.
                const tint = marks?.highlight ? HIGHLIGHT_TINTS[marks.highlight] : null;
                return (
                <div
                  key={verseNumber}
                  id={`verse-${verseNumber}`}
                  className={cn(
                    "group relative rounded-sm -mx-1 px-1",
                    isHighlighted && !tint && "bg-teal-50 dark:bg-teal-950/30 border-l-2 border-teal-500 pl-2"
                  )}
                  style={
                    tint
                      ? { backgroundColor: tint.bg, boxShadow: `inset 2px 0 0 0 ${tint.border}` }
                      : undefined
                  }
                >
                  <p className={cn(
                    "dark:text-foreground text-gray-900",
                    fontSizeClass,
                    fontFamilyClass,
                    lineHeightClass,
                    letterSpacingClass,
                  )}>
                    {/* The verse number is pinned rather than left on
                        `--muted-foreground`. This viewer is /lezen's only, and
                        /lezen reads on the scene's own ground: the muted token
                        lands at 8.6:1 there, while the number measured 10.3:1
                        on the white page it used to sit on. A superscript this
                        small may not lose contrast in the move, so it gets
                        VERSE_NUMBER_INK - #BFC9CC, 11.0:1 - a clear step below
                        the passage's 18.5:1 and above what it replaced. It is
                        an inline colour rather than a `dark:` class so it
                        cannot be undone by a parent that has already fixed the
                        computed `color`. */}
                    {prefs.showVerseNumbers && (
                      <sup
                        className={cn(
                          "font-semibold mr-1",
                          isHighlighted && "text-teal-600 dark:text-teal-400"
                        )}
                        style={isHighlighted ? undefined : { color: VERSE_NUMBER_INK }}
                      >
                        {verseNumber}
                      </sup>
                    )}
                    <span className="hover:bg-[#0D9488]/10 cursor-pointer transition-colors px-1"
                          onClick={() => handleVerseClick(verseNumber, text)}>
                      <SpokenText text={text} />
                    </span>
                    <VerseMarkers annotation={marks} />
                  </p>
                  <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <SpeakButton
                      compact
                      showSettings={false}
                      getText={() => text}
                      label={`Vers ${verseNumber} voorlezen`}
                      className="bg-white dark:bg-card shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-border"
                    />
                    <button
                      onClick={() => handleVerseClick(verseNumber, text)}
                      // #0F766E, not #0D9488: a white glyph on the lighter
                      // brand fill measures 3.74:1. Same swatch, one step down
                      // - the value PassageReader already uses for this button.
                      className="bg-[#0F766E] hover:bg-[#115E59] text-white p-1.5 rounded-sm shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)] outline-none focus-visible:ring-2 focus-visible:ring-white"
                      title={`Notitie bij vers ${verseNumber}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            {/* The licensing line. `getBibleAttribution` returns it verbatim
                and nothing here may reword, truncate or wrap it - the NBG51
                licence is an exact string. It was #9CA3AF, which measures
                2.5:1 on white; a required copyright notice has to be readable,
                so on the room's ground it is the muted token, 8.6:1. */}
            {getBibleAttribution(version) && (
              <p className="mt-4 pt-3 border-t border-gray-100 dark:border-border text-[11px] leading-snug text-gray-600 dark:text-muted-foreground">
                {getBibleAttribution(version)}
              </p>
            )}

            {/* Note Creation Modal */}
            {selectedVerse && (
              <CreateNoteModal
                isOpen={showCreateNoteModal}
                onClose={handleCancelNote}
                verseReference={selectedVerse.reference}
                book={book}
                chapter={chapter}
                verse={parseInt(selectedVerse.verseNumber)}
                verseText={selectedVerse.text}
                translation={version || "statenvertaling"}
                onSave={handleNoteSaved}
                availableVerses={Object.keys(verses).map(Number).sort((a, b) => a - b)}
              />
            )}
          </div>
        </SpokenTextScope>
      )}

      {!loading && !error && Object.keys(verses).length === 0 && (
        <div className="py-12 text-center font-inter text-gray-500 dark:text-muted-foreground">
          Geen bijbeltekst gevonden voor dit hoofdstuk. Probeer een ander hoofdstuk.
        </div>
      )}
    </div>
  );
}
