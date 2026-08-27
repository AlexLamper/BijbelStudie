'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

import PassageReader from './PassageReader';
import { ReadingPreferencesMenu } from '../ReadingPreferencesMenu';
import SpeakButton from '../SpeakButton';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

const TEAL = '#0D9488';

/**
 * Step 2. The passage, and as little else as possible.
 *
 * Uses PassageReader rather than ChapterViewer: the lesson decides the passage,
 * so there are no book or version selectors here, the rest of the chapter is not
 * rendered, and the verses that ARE rendered are not tinted. Everything on this
 * step is the text the lesson asked you to read.
 *
 * The reading preferences from /lezen are available in the header, because
 * someone who reads at 20px there does not suddenly read at 16px here.
 */
export default function StepWord({
  book,
  chapter,
  version,
  verseStart,
  verseEnd,
  readingCue,
  preferences,
  onUpdatePreferences,
}: {
  book: string;
  chapter: number;
  version: string | null;
  verseStart: number | null;
  verseEnd: number | null;
  readingCue?: string | null;
  preferences?: ReadingPreferences;
  onUpdatePreferences?: (prefs: Partial<ReadingPreferences>) => void;
}) {
  const reference =
    verseStart == null
      ? `${book} ${chapter}`
      : verseEnd && verseEnd !== verseStart
        ? `${book} ${chapter}:${verseStart}-${verseEnd}`
        : `${book} ${chapter}:${verseStart}`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-6 sm:px-10 xl:px-14 py-8 sm:py-10">
        {/* Left-aligned, like the text underneath it. A centred reference above
            left-aligned prose reads as two unrelated blocks. */}
        <header className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-1"
                style={{ color: TEAL }}
              >
                <BookOpen size={13} /> Lees eerst het bijbelgedeelte
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                {reference}
              </h1>
              {readingCue && (
                <p className="mt-2 text-[15px] text-gray-500 dark:text-muted-foreground leading-relaxed">
                  {readingCue}
                </p>
              )}
            </div>

            <div className="flex-none flex items-center gap-1">
              <SpeakButton
                compact
                showSettings={false}
                getText={() => {
                  const nodes = document.querySelectorAll('[id^="verse-"] p');
                  return Array.from(nodes)
                    .map((node) => node.textContent?.trim() ?? '')
                    .filter(Boolean)
                    .join(' ');
                }}
                label="Lees het gedeelte voor"
                className="border border-gray-200 dark:border-border rounded-md"
              />
              {onUpdatePreferences && (
                <ReadingPreferencesMenu
                  preferences={
                    preferences ?? {
                      fontSize: 'base',
                      fontFamily: 'serif',
                      lineHeight: 'relaxed',
                      letterSpacing: 'normal',
                      highContrast: false,
                      showVerseNumbers: true,
                    }
                  }
                  onUpdate={onUpdatePreferences}
                />
              )}
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card px-6 sm:px-10 xl:px-14 py-8 sm:py-10">
          <PassageReader
            book={book}
            chapter={chapter}
            version={version}
            verseStart={verseStart}
            verseEnd={verseEnd}
            preferences={preferences}
          />
        </section>

        <p className="mt-4 text-xs text-gray-400 dark:text-muted-foreground">
          Klik op een vers om er een notitie bij te maken.
        </p>
      </div>
    </div>
  );
}
