'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import CommentaryComponent from '../CommentaryComponent';
import HistoricalContext from '../HistoricalContext';
import GeoImages from '../GeoImages';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

const TEAL = '#0D9488';

export interface DepthContentProps {
  body?: string[];
  terms?: { term: string; meaning: string }[];
  showMedia?: boolean;
}

/**
 * Step 3. Commentary, terms and imagery for this passage.
 *
 * The commentary source is decided server-side from the study's "type uitleg"
 * setting (see lib/studyFlow resolveCommentaryId) and passed in fixed. There is
 * no source picker here on purpose: choosing a commentary is a settings
 * decision, not something to re-litigate in the middle of every lesson.
 */
export default function StepDepth({
  book,
  chapter,
  commentaryId,
  depth,
  preferences,
  t,
}: {
  book: string;
  chapter: number;
  commentaryId: string;
  depth?: DepthContentProps | null;
  preferences?: ReadingPreferences;
  t: (key: string) => string;
}) {
  const showMedia = depth?.showMedia !== false;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-7 space-y-7">
      <div className="flex items-center gap-2">
        <Layers size={14} style={{ color: TEAL }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
          Verdieping
        </span>
      </div>

      {depth?.body && depth.body.length > 0 && (
        <div className="space-y-4">
          {depth.body.map((paragraph, index) => (
            <p key={index} className="text-[15px] leading-relaxed text-foreground/90">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {depth?.terms && depth.terms.length > 0 && (
        <dl className="rounded-xl border border-gray-200 dark:border-border divide-y divide-gray-200 dark:divide-border overflow-hidden">
          {depth.terms.map((entry) => (
            <div key={entry.term} className="p-4">
              <dt className="text-sm font-semibold text-foreground mb-1">{entry.term}</dt>
              <dd className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">
                {entry.meaning}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <section className="rounded-xl border border-gray-200 dark:border-border overflow-hidden">
        <CommentaryComponent
          book={book}
          chapter={chapter}
          source={commentaryId}
          preferences={preferences}
        />
      </section>

      <section>
        <HistoricalContext book={book} chapter={chapter} t={t} preferences={preferences} />
      </section>

      {showMedia && (
        <section>
          <GeoImages book={book} chapter={chapter} variant="strip" />
        </section>
      )}
    </div>
  );
}
