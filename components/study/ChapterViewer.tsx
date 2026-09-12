import React, { useEffect, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { SkeletonChapter } from '../ui/skeletons';
import { CreateNoteModal } from './CreateNoteModal';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';
import { HIGHLIGHT_TINTS, type AnnotationMap } from '../../hooks/useVerseAnnotations';
import { cn } from '../../lib/utils';
import { getBibleAttribution } from '../../lib/bible-attribution';
import SpeakButton from './SpeakButton';
import { SpokenText } from './SpokenText';
import VerseMarkers from './VerseMarkers';

type Props = {
  version: string | null;
  book: string;
  chapter: number;
  maxChapter: number;
  preferences?: ReadingPreferences;
  highlightRange?: { start: number; end: number };
  /**
   * What the reader has marked in this chapter. Owned by BibleViewerSection,
   * which also needs the counts for the chapter line - one caller, one request.
   */
  annotations: AnnotationMap;
  /** Called after a note is saved, so the pane can refresh those marks. */
  onAnnotationsChanged?: () => void;
  /** Publishes the chapter as one string, for the toolbar's read-aloud button. */
  onChapterText?: (text: string) => void;
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
  annotations,
  onAnnotationsChanged,
  onChapterText,
}: Props) {
  const [verses, setVerses] = useState<VerseData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);

  const API_BASE_URL = '/api/bible';

  // Default preferences if not provided. Serif, because scripture is Lora in
  // this design and Inter is the UI face; a reader who picks another family in
  // the reading-preferences menu still wins.
  const prefs = preferences || {
    fontSize: 'base',
    fontFamily: 'serif',
    lineHeight: 'relaxed',
    letterSpacing: 'normal',
    highContrast: false,
    showVerseNumbers: true,
  };

  // The design sets scripture at 17px / 1.8 (design_handoff_web/TOKENS.md), so
  // "Normaal" is 17 and the other steps move around it. Tailwind's own scale
  // has no 17, and `text-base` at 16 read a step small beside the commentary.
  const fontSizeClass = {
    sm: 'text-[15px]',
    base: 'text-[17px]',
    lg: 'text-[19px]',
    xl: 'text-[21px]',
  }[prefs.fontSize] || 'text-[17px]';

  const fontFamilyClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[prefs.fontFamily] || 'font-serif';

  const lineHeightClass = {
    normal: 'leading-[1.55]',
    relaxed: 'leading-[1.8]',
    loose: 'leading-[2.05]',
  }[prefs.lineHeight] || 'leading-[1.8]';

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

  // Hand the chapter up as one string, so the toolbar's read-aloud button has
  // something to speak. It is the same join the button used to do for itself
  // when it lived in this component's header.
  useEffect(() => {
    if (!onChapterText) return;
    onChapterText(Object.keys(verses).length > 0 ? buildChapterText(verses) : '');
  }, [verses, onChapterText]);

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
    onAnnotationsChanged?.();
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
          <div className="max-w-md text-center">
            <AlertCircle className="mx-auto mb-6 h-10 w-10 text-danger" />
            <p className="mb-3 text-lg font-bold text-danger">Fout bij laden</p>
            <p className="text-[13.5px] leading-relaxed text-ink-body">{error}</p>
          </div>
        </div>
      )}

      {/* The chapter itself. The "GENESIS 5" line and the read-aloud button
          used to sit here; both moved up into BibleViewerSection, where the
          design puts them - above the scroller, so they stay put while the
          passage travels. The SpokenTextScope moved up with them and this
          component now renders inside it. */}
      {!loading && !error && Object.keys(verses).length > 0 && (
          <div className="content-in">
            <div className="space-y-0">
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
                  // The lesson's own range is the design's highlight: a plain
                  // amber wash with a 4 px radius, no rule down the side. The
                  // reader's own colour still wins over it.
                  className={cn(
                    'group relative -mx-1 mb-[14px] rounded-[4px] px-1',
                    isHighlighted && !tint && 'bg-highlight',
                  )}
                  style={
                    tint
                      ? { backgroundColor: tint.bg, boxShadow: `inset 2px 0 0 0 ${tint.border}` }
                      : undefined
                  }
                >
                  <p className={cn(
                    'text-scripture',
                    fontSizeClass,
                    fontFamilyClass,
                    lineHeightClass,
                    letterSpacingClass,
                  )}>
                    {/* Inter, not the passage's own face, and `ink-faint`: the
                        design sets the verse number as a UI mark beside the
                        scripture rather than as part of it. 11 px is the floor
                        the token sheet allows for it. */}
                    {prefs.showVerseNumbers && (
                      <sup
                        className={cn(
                          'mr-[5px] align-super font-sans text-[11px] font-semibold',
                          isHighlighted ? 'text-teal-dark' : 'text-ink-faint',
                        )}
                      >
                        {verseNumber}
                      </sup>
                    )}
                    <span
                      className="cursor-pointer px-1 transition-colors hover:bg-[var(--teal-wash)]"
                      onClick={() => handleVerseClick(verseNumber, text)}
                    >
                      <SpokenText text={text} />
                    </span>
                    <VerseMarkers annotation={marks} />
                  </p>
                  <div className="absolute right-0 top-0 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <SpeakButton
                      compact
                      showSettings={false}
                      getText={() => text}
                      label={`Vers ${verseNumber} voorlezen`}
                      className="border border-line bg-white shadow-field"
                    />
                    <button
                      onClick={() => handleVerseClick(verseNumber, text)}
                      // teal-dark, not teal: a white glyph on the lighter brand
                      // fill measures 3.74:1.
                      className="rounded-sm bg-teal-dark p-1.5 text-white shadow-field outline-none transition-opacity hover:opacity-90"
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
              <p className="mt-4 border-t border-line-soft pt-3 text-[11px] leading-snug text-ink-muted">
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
      )}

      {!loading && !error && Object.keys(verses).length === 0 && (
        <div className="py-12 text-center text-[13.5px] text-ink-muted">
          Geen bijbeltekst gevonden voor dit hoofdstuk. Probeer een ander hoofdstuk.
        </div>
      )}
    </div>
  );
}
