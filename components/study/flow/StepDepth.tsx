'use client';

import React, { useState } from 'react';
import { BookText, Images, Info, Languages, Send, Sparkles, StickyNote } from 'lucide-react';

import CommentaryComponent from '../CommentaryComponent';
import GeoImages from '../GeoImages';
import OriginalText from '../OriginalText';
import { ChapterNotes } from '../ChapterNotes';
import BookContextDialog from './BookContextDialog';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

const TEAL = '#0D9488';

export interface DepthContentProps {
  body?: string[];
  terms?: { term: string; meaning: string }[];
  showMedia?: boolean;
}

type PanelKey = 'notes-authored' | 'media' | 'original' | 'notes';

/**
 * Step 3. Commentary on the left, everything that supports it on the right.
 *
 * The left half is the commentary and nothing else - no step heading, no
 * authored preamble. Anything stacked above it pushed the actual explanation
 * below the fold and turned one column into three scrolling boxes; the step rail
 * at the top of the screen already says which step this is.
 *
 * The authored framing and term list are not gone, they are a panel on the
 * right, next to the imagery, grondtekst and notes rather than in front of the
 * commentary. The commentary source is resolved server-side: an explicit study
 * choice, then the reader's own reading-preference, then Matthew Henry (see
 * lib/studyFlow resolveCommentaryId).
 */
export default function StepDepth({
  book,
  chapter,
  commentaryId,
  depth,
  preferences,
  onAskAi,
}: {
  book: string;
  chapter: number;
  commentaryId: string;
  depth?: DepthContentProps | null;
  preferences?: ReadingPreferences;
  onAskAi?: (question: string) => void;
}) {
  const hasAuthored =
    (depth?.body?.length ?? 0) > 0 || (depth?.terms?.length ?? 0) > 0;
  const showMedia = depth?.showMedia !== false;

  const panels: { key: PanelKey; label: string; icon: typeof Images }[] = [
    ...(hasAuthored
      ? [{ key: 'notes-authored' as PanelKey, label: 'Toelichting', icon: BookText }]
      : []),
    { key: 'media', label: 'Beeld', icon: Images },
    { key: 'original', label: 'Grondtekst', icon: Languages },
    { key: 'notes', label: 'Notities', icon: StickyNote },
  ];

  const [panel, setPanel] = useState<PanelKey>(panels[0].key);
  const [contextOpen, setContextOpen] = useState(false);
  const [question, setQuestion] = useState('');

  function ask() {
    const trimmed = question.trim();
    if (!trimmed || !onAskAi) return;
    onAskAi(trimmed);
    setQuestion('');
  }

  return (
    /* Below lg this is one ordinary scrolling column: two half-height panes on
       a phone would give each of them about 200px, which is worse than either. */
    <div className="h-full overflow-y-auto lg:overflow-hidden lg:flex lg:flex-row lg:min-h-0">
      {/* Left: the commentary, edge to edge. */}
      <div className="lg:w-1/2 lg:flex-none min-w-0 lg:min-h-0 relative border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-border">
        <div className="lg:h-full lg:min-h-0">
          <CommentaryComponent
            book={book}
            chapter={chapter}
            source={commentaryId}
            preferences={preferences}
            height={1}
          />
        </div>

        {/* Fade at the bottom, so it is obvious the column continues. */}
        <div
          aria-hidden
          className="hidden lg:block pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white dark:from-background to-transparent"
        />
      </div>

      {/* Right: everything that supports the reading. */}
      <aside className="lg:w-1/2 lg:flex-none min-w-0 lg:min-h-0 flex flex-col bg-gray-50/60 dark:bg-card/40">
        <div className="flex-none px-4 sm:px-5 pt-4 pb-3 space-y-2.5">
          <button
            type="button"
            onClick={() => setContextOpen(true)}
            className="w-full inline-flex items-center justify-between gap-2 h-10 px-3 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-secondary transition-colors"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <Info size={14} className="flex-none" style={{ color: TEAL }} />
              <span className="text-[13px] font-semibold text-foreground truncate">
                Context van {book}
              </span>
            </span>
            <span className="text-[11px] text-gray-400 dark:text-muted-foreground flex-none">
              Algemene info
            </span>
          </button>

          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-secondary">
            {panels.map(({ key, label, icon: Icon }) => {
              const active = panel === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPanel(key)}
                  aria-pressed={active}
                  className={[
                    'flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-semibold transition-colors min-w-0',
                    active
                      ? 'bg-white dark:bg-card shadow-sm'
                      : 'text-gray-500 dark:text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                  style={active ? { color: TEAL } : undefined}
                >
                  <Icon size={13} className="flex-none" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto px-4 sm:px-5 pb-4">
          {panel === 'notes-authored' && (
            <div className="space-y-4">
              {depth?.body && depth.body.length > 0 && (
                <div className="space-y-3">
                  {depth.body.map((paragraph, index) => (
                    <p key={index} className="text-[14px] leading-relaxed text-foreground/90">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {depth?.terms && depth.terms.length > 0 && (
                <dl className="rounded-xl border border-gray-200 dark:border-border divide-y divide-gray-200 dark:divide-border overflow-hidden bg-white dark:bg-card">
                  {depth.terms.map((entry) => (
                    <div key={entry.term} className="p-3.5">
                      <dt className="text-[13px] font-semibold text-foreground mb-0.5">
                        {entry.term}
                      </dt>
                      <dd className="text-[13px] text-gray-600 dark:text-muted-foreground leading-relaxed">
                        {entry.meaning}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {panel === 'media' &&
            (showMedia ? (
              <GeoImages book={book} chapter={chapter} variant="panel" fallbackToBook />
            ) : (
              <p className="text-[12px] text-gray-400 dark:text-muted-foreground italic">
                Deze les toont geen afbeeldingen.
              </p>
            ))}

          {panel === 'original' && (
            <OriginalText book={book} chapter={chapter} embedded />
          )}

          {panel === 'notes' && (
            <div className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-3">
              <ChapterNotes book={book} chapter={chapter} />
            </div>
          )}
        </div>

        {/* The one step where a question is likely enough to earn its own box.
            It hands off to the same assistant the header opens, so the answer
            lands in the conversation that travels with the lesson. */}
        {onAskAi && (
          <div className="flex-none border-t border-gray-200 dark:border-border p-3 sm:p-4 bg-white dark:bg-card">
            <label
              htmlFor="depth-ai"
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: TEAL }}
            >
              <Sparkles size={12} /> Vraag het de AI-assistent
            </label>
            <div className="flex gap-2">
              <input
                id="depth-ai"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    ask();
                  }
                }}
                placeholder={`Wat betekent dit in ${book} ${chapter}?`}
                className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
              />
              <button
                type="button"
                onClick={ask}
                disabled={!question.trim()}
                aria-label="Vraag versturen"
                className="h-10 w-10 flex-none inline-flex items-center justify-center rounded-lg text-white disabled:opacity-40"
                style={{ backgroundColor: TEAL }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
      </aside>

      <BookContextDialog
        book={book}
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        preferences={preferences}
      />
    </div>
  );
}
