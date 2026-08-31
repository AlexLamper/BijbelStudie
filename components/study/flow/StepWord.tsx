'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

import PassageReader from './PassageReader';
import { ReadingPreferencesMenu } from '../ReadingPreferencesMenu';
import SpeakButton from '../SpeakButton';
import { SpokenTextScope } from '../SpokenText';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

const TEAL = '#0D9488';

/** Group headings for the translation picker, Dutch first. */
const LANGUAGE_LABELS: Record<string, string> = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  af: 'Afrikaans',
};

/**
 * The translation the passage is rendered in.
 *
 * A study is configured with one translation, and that is the right default -
 * but a reader who wants to check a verse against another one should not have to
 * leave the lesson, change a setting and come back. Switching here is a view
 * change only: it does not rewrite the enrollment.
 *
 * Grouped by language with Dutch first, matching the picker on /lezen; a version
 * with no `language` counts as "overig" rather than being guessed into Dutch.
 */
function TranslationPicker({
  versions,
  value,
  onChange,
}: {
  versions: { id: string; name: string; language?: string }[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  if (versions.length === 0) return null;

  const groups = new Map<string, { id: string; name: string }[]>();
  for (const option of versions) {
    const key = option.language ?? 'overig';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(option);
  }
  const languages = [...groups.keys()].sort((a, b) =>
    a === 'nl' ? -1 : b === 'nl' ? 1 : a.localeCompare(b),
  );

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Bijbelvertaling</span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        title="Bijbelvertaling"
        data-track="study_word_version"
        className="h-8 max-w-[170px] cursor-pointer rounded-md border border-gray-200 dark:border-border bg-white dark:bg-card pl-2.5 pr-2 text-[12.5px] font-medium text-foreground outline-none transition-colors hover:bg-gray-50 dark:hover:bg-secondary focus-visible:ring-2"
        style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
      >
        {languages.map((language) => (
          <optgroup key={language} label={LANGUAGE_LABELS[language] ?? 'Overige vertalingen'}>
            {groups.get(language)!.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/**
 * Step 2. The passage, and as little else as possible.
 *
 * Uses PassageReader rather than ChapterViewer: the lesson decides the passage,
 * so there is no book or chapter selector here, the rest of the chapter is not
 * rendered, and the verses that ARE rendered are not tinted. Everything on this
 * step is the text the lesson asked you to read.
 *
 * The reading preferences from /lezen are available in the header, because
 * someone who reads at 20px there does not suddenly read at 16px here - and so
 * is the translation, for the same reason.
 */
export default function StepWord({
  book,
  chapter,
  version,
  versions = [],
  onVersionChange,
  verseStart,
  verseEnd,
  readingCue,
  preferences,
  onUpdatePreferences,
}: {
  book: string;
  chapter: number;
  version: string | null;
  versions?: { id: string; name: string; language?: string }[];
  onVersionChange?: (id: string) => void;
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
    // The scope has to sit above both halves of this step: the button that
    // reads the whole gedeelte lives in the header here, while the words it
    // lights up are rendered by PassageReader further down.
    <SpokenTextScope>
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

              <div className="flex-none flex items-center gap-1.5">
                {onVersionChange && (
                  <TranslationPicker
                    versions={versions}
                    value={version}
                    onChange={onVersionChange}
                  />
                )}
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
    </SpokenTextScope>
  );
}
