'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import ChapterViewer from '../ChapterViewer';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

const TEAL = '#0D9488';

/**
 * Step 2. The passage, and as little else as possible.
 *
 * Uses ChapterViewer directly rather than BibleViewerSection: the latter carries
 * the version/book/chapter selectors, and a book dropdown in the middle of a
 * guided lesson is an invitation to get lost. The lesson decides the passage.
 */
export default function StepWord({
  book,
  chapter,
  version,
  maxChapter,
  verseStart,
  verseEnd,
  readingCue,
  preferences,
}: {
  book: string;
  chapter: number;
  version: string | null;
  maxChapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  readingCue?: string | null;
  preferences?: ReadingPreferences;
}) {
  const reference =
    verseStart == null
      ? `${book} ${chapter}`
      : verseEnd && verseEnd !== verseStart
        ? `${book} ${chapter}:${verseStart}-${verseEnd}`
        : `${book} ${chapter}:${verseStart}`;

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex-none px-5 sm:px-8 pt-7 pb-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-1.5">
          <BookOpen size={14} style={{ color: TEAL }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
            {reference}
          </span>
        </div>
        {readingCue && (
          <p className="text-sm text-gray-500 dark:text-muted-foreground">{readingCue}</p>
        )}
      </header>

      <div className="flex-1 min-h-0">
        <ChapterViewer
          version={version}
          book={book}
          chapter={chapter}
          maxChapter={maxChapter}
          preferences={preferences}
          highlightRange={
            verseStart != null ? { start: verseStart, end: verseEnd ?? verseStart } : undefined
          }
        />
      </div>
    </div>
  );
}
