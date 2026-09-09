'use client';

import React from 'react';

import PassageReader from './PassageReader';
import LessonLayout, { FOCUS_RING, INK_FAINT, INK_MUTED, Marginal } from './lesson-layout';
import { PLATE } from '../../scene/tokens';
import { ReadingPreferencesMenu } from '../ReadingPreferencesMenu';
import SpeakButton from '../SpeakButton';
import { SpokenTextScope } from '../SpokenText';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

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
    <label className="block">
      <span className="sr-only">Bijbelvertaling</span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        title="Bijbelvertaling"
        data-track="study_word_version"
        className={`h-9 w-full cursor-pointer rounded-lg border border-white/20 bg-white/10 px-2.5 text-[12.5px] font-medium text-white transition-colors hover:bg-white/15 ${FOCUS_RING}`}
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
 * THE ONE LIT OBJECT. The passage sits on the scene's light `PLATE` while the
 * window around it is night, and it is the only plate in the whole flow. That is
 * not decoration: scripture is what this screen exists to show, a plate is where
 * the scene design says the eye should go first, and the pale verse highlights,
 * the note popover and the per-verse controls are all drawn for white paper. The
 * plate does not follow the theme any more than the rest of the window does.
 *
 * What supports the reading - the leeswijzer, the translation, the type
 * controls, the question that is coming - stands in the margin beside the text
 * rather than in a toolbar above it.
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
  eyebrow,
  reflectionQuestion,
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
  eyebrow?: string;
  /** Shown in the margin as "Straks de vraag", so the reading has a purpose. */
  reflectionQuestion?: string | null;
}) {
  const reference =
    verseStart == null
      ? `${book} ${chapter}`
      : verseEnd && verseEnd !== verseStart
        ? `${book} ${chapter}:${verseStart}-${verseEnd}`
        : `${book} ${chapter}:${verseStart}`;

  const versionName = versions.find((entry) => entry.id === version)?.name ?? version ?? '';

  return (
    // The scope has to sit above both halves of this step: the button that
    // reads the whole gedeelte lives in the margin here, while the words it
    // lights up are rendered by PassageReader in the column.
    <SpokenTextScope>
      <LessonLayout
        eyebrow={eyebrow ?? 'Het Woord'}
        heading={reference}
        aside={
          <>
            {readingCue ? (
              <Marginal label="Leeswijzer">
                <p className="italic">{readingCue}</p>
              </Marginal>
            ) : null}

            <Marginal label="Vertaling">
              {onVersionChange && (
                <TranslationPicker
                  versions={versions}
                  value={version}
                  onChange={onVersionChange}
                />
              )}
              <div className="mt-2.5 flex items-center gap-1.5">
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
                  className="border border-white/20 rounded-md"
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
            </Marginal>

            {reflectionQuestion ? (
              <Marginal label="Straks de vraag">
                <p className="italic">{reflectionQuestion}</p>
              </Marginal>
            ) : null}
          </>
        }
      >
        {versionName ? (
          <p className={`mt-1.5 text-[11.5px] uppercase tracking-[0.14em] ${INK_FAINT}`}>
            {versionName}
          </p>
        ) : null}

        <section className={`${PLATE} mt-5 px-6 sm:px-9 py-8 sm:py-9`}>
          <PassageReader
            book={book}
            chapter={chapter}
            version={version}
            verseStart={verseStart}
            verseEnd={verseEnd}
            preferences={preferences}
          />
        </section>

        <p className={`mt-3.5 text-xs ${INK_MUTED}`}>
          Klik op een vers om er een notitie bij te maken.
        </p>
      </LessonLayout>
    </SpokenTextScope>
  );
}
