'use client';

import React, { useState } from 'react';
import { ChevronRight, Images, Landmark, Languages, Send, StickyNote } from 'lucide-react';

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

type PanelKey = 'media' | 'original' | 'notes';

/**
 * The supporting panels, each with a line saying what it actually is.
 *
 * The previous version was three unlabelled pills - "Beeld", "Grondtekst",
 * "Notities" - and nothing on screen explained what any of them would show, so
 * the right half read as a widget tray. The one-line description under the tab
 * bar is doing the real work here.
 */
const PANELS: { key: PanelKey; label: string; icon: typeof Images; blurb: string }[] = [
  {
    key: 'media',
    label: 'Beeld',
    icon: Images,
    blurb: 'Kaarten en foto van de plaatsen in dit gedeelte',
  },
  {
    key: 'original',
    label: 'Grondtekst',
    icon: Languages,
    blurb: 'Het Hebreeuws of Grieks, woord voor woord',
  },
  {
    key: 'notes',
    label: 'Notities',
    icon: StickyNote,
    blurb: 'Wat jij eerder bij dit hoofdstuk hebt opgeschreven',
  },
];

/**
 * Step 3. Commentary on the left, everything that supports it on the right.
 *
 * The left half is the commentary and nothing else - no step heading, no
 * authored preamble. Anything stacked above it pushed the actual explanation
 * below the fold and turned one column into three scrolling boxes; the step rail
 * at the top of the screen already says which step this is.
 *
 * The right half USED to open on a "Toelichting" panel of authored prose. It was
 * a second commentary next to the commentary, saying less, and it was the first
 * thing the reader landed on. It is gone. What is left are the three things the
 * commentary cannot give you - the place, the original language, and your own
 * notes - each labelled with what it is rather than with a one-word noun.
 *
 * The authored `terms` survive as "Kernwoorden" at the head of the grondtekst
 * panel, which is where a word-meaning list belongs.
 *
 * The commentary source is resolved server-side: an explicit study choice, then
 * the reader's own reading-preference, then Matthew Henry (see lib/studyFlow
 * resolveCommentaryId).
 */
export default function StepDepth({
  book,
  chapter,
  commentaryId,
  depth,
  preferences,
  panel: panelProp,
  onPanelChange,
  onAskAi,
}: {
  book: string;
  chapter: number;
  commentaryId: string;
  depth?: DepthContentProps | null;
  preferences?: ReadingPreferences;
  /**
   * Which panel is open, owned by the flow shell and persisted with the lesson.
   *
   * This step remounts on every navigation away and back, so keeping it in local
   * state meant a reader who opened the grondtekst and stepped back to the
   * passage returned to the photos.
   */
  panel?: string | null;
  onPanelChange?: (panel: string) => void;
  onAskAi?: (question: string) => void;
}) {
  const showMedia = depth?.showMedia !== false;
  const terms = depth?.terms ?? [];

  const panel: PanelKey = PANELS.some((entry) => entry.key === panelProp)
    ? (panelProp as PanelKey)
    : 'media';
  const setPanel = (next: PanelKey) => onPanelChange?.(next);

  const [contextOpen, setContextOpen] = useState(false);
  const [question, setQuestion] = useState('');

  const active = PANELS.find((entry) => entry.key === panel) ?? PANELS[0];

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
        {/* The book's background, as a row rather than a button that looked like
            a form field. It answers "who wrote this, when, and why", so it says
            that instead of "Algemene info". */}
        <button
          type="button"
          onClick={() => setContextOpen(true)}
          data-track="study_book_context"
          className="group flex-none flex items-center gap-3 px-4 sm:px-5 py-3 text-left border-b border-gray-200 dark:border-border bg-white dark:bg-card transition-colors hover:bg-gray-50 dark:hover:bg-secondary"
        >
          <span
            className="h-8 w-8 flex-none rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
          >
            <Landmark size={15} style={{ color: TEAL }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-foreground truncate">
              Achtergrond bij {book}
            </span>
            <span className="block text-[11.5px] text-gray-500 dark:text-muted-foreground truncate">
              Wie het schreef, wanneer en waarom
            </span>
          </span>
          <ChevronRight
            size={15}
            className="flex-none text-gray-400 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>

        {/* Underlined tabs, not pills in a tray. The active one carries the
            brand colour and the bar; the row below spells out what it shows. */}
        <div className="flex-none border-b border-gray-200 dark:border-border bg-white dark:bg-card">
          <div className="flex px-2 sm:px-3">
            {PANELS.map(({ key, label, icon: Icon }) => {
              const isActive = panel === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPanel(key)}
                  aria-pressed={isActive}
                  className={[
                    'relative inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 h-11 text-[12.5px] font-semibold transition-colors min-w-0',
                    isActive ? '' : 'text-gray-500 dark:text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                  style={isActive ? { color: TEAL } : undefined}
                >
                  <Icon size={14} className="flex-none" />
                  <span className="truncate">{label}</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full transition-opacity"
                    style={{ backgroundColor: TEAL, opacity: isActive ? 1 : 0 }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <p className="flex-none px-4 sm:px-5 py-2 text-[11.5px] text-gray-500 dark:text-muted-foreground border-b border-gray-200 dark:border-border">
          {active.blurb}
        </p>

        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto px-4 sm:px-5 py-4">
          {panel === 'media' &&
            (showMedia ? (
              <GeoImages book={book} chapter={chapter} variant="panel" fallbackToBook />
            ) : (
              <p className="text-[12.5px] text-gray-500 dark:text-muted-foreground">
                Bij dit gedeelte hoort geen plaats of kaart.
              </p>
            ))}

          {panel === 'original' && (
            <div className="space-y-4">
              {/* Authored word meanings, where a word list belongs. */}
              {terms.length > 0 && (
                <section className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card overflow-hidden">
                  <h3
                    className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 dark:border-border"
                    style={{ color: TEAL }}
                  >
                    Kernwoorden in dit gedeelte
                  </h3>
                  <dl className="divide-y divide-gray-100 dark:divide-border">
                    {terms.map((entry) => (
                      <div key={entry.term} className="px-3.5 py-2.5">
                        <dt className="text-[13px] font-semibold text-foreground mb-0.5">
                          {entry.term}
                        </dt>
                        <dd className="text-[12.5px] text-gray-600 dark:text-muted-foreground leading-relaxed">
                          {entry.meaning}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <OriginalText book={book} chapter={chapter} embedded />
            </div>
          )}

          {/* `bare`: this column already has a heading, a description line and
              padding. The standard notes panel brings its own header bar and
              wraps every note in a card, so nesting it here drew three borders
              around two lines of text. */}
          {panel === 'notes' && <ChapterNotes book={book} chapter={chapter} bare />}
        </div>

        {/* The one step where a question is likely enough to earn its own box.
            It hands off to the same assistant the header opens, so the answer
            lands in the conversation that travels with the lesson. */}
        {onAskAi && (
          <div className="flex-none border-t border-gray-200 dark:border-border p-3 bg-white dark:bg-card">
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
                aria-label="Vraag het de AI-assistent"
                placeholder={`Vraag iets over ${book} ${chapter}...`}
                className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
              />
              <button
                type="button"
                onClick={ask}
                disabled={!question.trim()}
                aria-label="Vraag versturen"
                className="press h-10 w-10 flex-none inline-flex items-center justify-center rounded-lg text-white disabled:opacity-40"
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
