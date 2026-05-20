import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import { CreateNoteModal } from './CreateNoteModal';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';
import { cn } from '../../lib/utils';

type Props = {
  version: string | null;
  book: string;
  chapter: number;
  maxChapter: number;
  preferences?: ReadingPreferences;
};

type VerseData = { [key: string]: string };

interface SelectedVerse {
  verseNumber: string;
  text: string;
  reference: string;
}

export default function ChapterViewer({
  version,
  book,
  chapter,
  preferences
}: Props) {
  const [verses, setVerses] = useState<VerseData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);

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
        console.groupEnd();
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
  };

  const handleCancelNote = () => {
    setShowCreateNoteModal(false);
    setSelectedVerse(null);
  };

  return (
    <div>
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-6" style={{ color: '#0D9488' }} />
            <p className="font-inter text-gray-700 dark:text-muted-foreground text-lg font-medium">Bijbeltekst laden...</p>
          </div>
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

      {!loading && !error && Object.keys(verses).length > 0 && (
        <>
          <div className={cn(
            "space-y-2 text-justify",
            prefs.highContrast && "contrast-more:text-black dark:contrast-more:text-white"
          )}>
            {Object.entries(verses).map(([verseNumber, text]) => (
              <div key={verseNumber} className="group relative">
                <p className={cn(
                  "dark:text-foreground text-gray-900",
                  fontSizeClass,
                  fontFamilyClass,
                  lineHeightClass,
                  letterSpacingClass,
                  prefs.highContrast && "text-black dark:text-white font-medium"
                )}>
                  {prefs.showVerseNumbers && (
                    <sup className={cn(
                      "font-semibold text-gray-700 dark:text-muted-foreground mr-1",
                      prefs.highContrast && "text-black dark:text-white"
                    )}>
                      {verseNumber}
                    </sup>
                  )}
                  <span className="hover:bg-[#0D9488]/10 cursor-pointer transition-colors px-1"
                        onClick={() => handleVerseClick(verseNumber, text)}>
                    {text}
                  </span>
                </p>
                <button
                  onClick={() => handleVerseClick(verseNumber, text)}
                  className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0D9488] hover:bg-[#0f766e] text-white p-1.5 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)]"
                  title="Add note to this verse"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

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
        </>
      )}

      {!loading && !error && Object.keys(verses).length === 0 && (
        <div className="py-12 text-center font-inter text-gray-500 dark:text-muted-foreground">
          Geen bijbeltekst gevonden voor dit hoofdstuk. Probeer een ander hoofdstuk.
        </div>
      )}
    </div>
  );
}
