'use client';

import React, { useState } from 'react';
import { ChevronRight, Images, Landmark, Languages, Send, StickyNote } from 'lucide-react';

import CommentaryComponent from '../CommentaryComponent';
import GeoImages from '../GeoImages';
import OriginalText from '../OriginalText';
import { ChapterNotes } from '../ChapterNotes';
import BookContextDialog from './BookContextDialog';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

import { FOCUS_RING, INK, INK_FAINT, INK_MUTED, RULE } from './lesson-layout';

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
    // Chapter first, and the rest of the book when this chapter is still
    // blank - so the line has to be true of both.
    blurb: 'Wat jij eerder in dit bijbelboek hebt opgeschreven',
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
 * The authored `terms` are not rendered either. As a "Kernwoorden" list at the
 * head of the grondtekst panel they sat in front of the very thing that explains
 * those words properly, one word at a time, with the Hebrew or Greek attached.
 *
 * The commentary source is resolved server-side: an explicit study choice, then
 * the reader's own reading-preference, then Matthew Henry (see lib/studyFlow
 * resolveCommentaryId).
 *
 * WHY THIS STEP IS STILL A HALF AND NOT A 64ch COLUMN WITH A 252px MARGIN.
 * Ontwerp B's shape is already here in substance - a reading column with what
 * supports it standing beside rather than underneath - but the proportions have
 * to stay 50/50, because the AI dock's `half` layout pins itself to
 * `left-1/2 right-0` of this box and lands exactly on the divider, replacing the
 * supporting column. Narrowing the right column to a margin would leave the dock
 * covering the commentary it is talking about. The layout gave way; the
 * behaviour did not.
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
      <div
        className={`relative min-w-0 border-b lg:min-h-0 lg:flex-1 lg:border-b-0 lg:border-r ${RULE}`}
      >
        <div className="lg:h-full lg:min-h-0">
          <CommentaryComponent
            book={book}
            chapter={chapter}
            source={commentaryId}
            preferences={preferences}
            height={1}
          />
        </div>

        {/* Fade at the bottom, so it is obvious the column continues. The
            gradient is the window's own ground rather than `from-background`,
            which is a theme token and would end in the wrong black. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[88px] lg:block"
          style={{ background: 'var(--les-fade)' }}
        />
      </div>

      {/* Right: everything that supports the reading. A 2% lift rather than the
          `bg-black/25` it used to carry: the divider already says where the
          commentary stops, and a darker rectangle beside a lighter one made the
          step two colours instead of one surface with two halves. */}
      <aside className="flex min-w-0 flex-col lg:min-h-0 lg:w-[344px] lg:flex-none">
        {/* The book's background, as a row rather than a button that looked like
            a form field. It answers "who wrote this, when, and why", so it says
            that instead of "Algemene info". */}
        <button
          type="button"
          onClick={() => setContextOpen(true)}
          data-track="study_book_context"
          className={`group flex flex-none items-center gap-3 border-b px-[18px] py-[13px] text-left ${RULE} transition-colors hover:bg-les-card ${FOCUS_RING}`}
        >
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-[var(--teal-wash)]">
            <Landmark size={15} className="text-les-accent" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[13.5px] font-bold ${INK}`}>
              Achtergrond bij {book}
            </span>
            <span className={`block text-[11.5px] truncate ${INK_FAINT}`}>
              Wie het schreef, wanneer en waarom
            </span>
          </span>
          <ChevronRight
            size={15}
            className={`flex-none ${INK_FAINT} transition-transform duration-200 group-hover:translate-x-0.5`}
          />
        </button>

        {/* Underlined tabs, not pills in a tray. The active one carries the
            brand colour and the bar; the row below spells out what it shows. */}
        <div className={`flex-none border-b ${RULE}`}>
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
                    'relative inline-flex h-11 min-w-0 items-center justify-center gap-1.5 px-3 text-[12.5px] font-semibold transition-colors sm:px-4',
                    FOCUS_RING,
                    isActive ? 'text-les-accent' : `${INK_FAINT} hover:text-les-ink`,
                  ].join(' ')}
                >
                  <Icon size={14} className="flex-none" />
                  <span className="truncate">{label}</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-teal transition-opacity"
                    style={{ opacity: isActive ? 1 : 0 }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <p className={`flex-none border-b px-[18px] py-[9px] text-[12px] ${INK_FAINT} ${RULE}`}>
          {active.blurb}
        </p>

        <div className="px-[18px] py-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {panel === 'media' &&
            (showMedia ? (
              <GeoImages book={book} chapter={chapter} variant="panel" fallbackToBook />
            ) : (
              <p className={`text-[12.5px] ${INK_MUTED}`}>
                Bij dit gedeelte hoort geen plaats of kaart.
              </p>
            ))}

          {/* No "Kernwoorden" block above this any more. It repeated, in Dutch
              prose, what the grondtekst below already shows word by word - a
              glossary in front of the dictionary it was glossing. */}
          {panel === 'original' && <OriginalText book={book} chapter={chapter} embedded />}

          {panel === 'notes' && <ChapterNotes book={book} chapter={chapter} bare />}
        </div>

        {/* The one step where a question is likely enough to earn its own box.
            It hands off to the same assistant the header opens, so the answer
            lands in the conversation that travels with the lesson. */}
        {onAskAi && (
          <div className={`flex-none border-t px-[18px] py-3 ${RULE}`}>
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
                className={`h-[42px] min-w-0 flex-1 rounded-btn border border-les-card-line bg-les-input px-3 text-[13.5px] text-les-ink placeholder:text-les-faint ${FOCUS_RING}`}
              />
              <button
                type="button"
                onClick={ask}
                disabled={!question.trim()}
                aria-label="Vraag versturen"
                className={`press inline-flex h-[42px] w-[42px] flex-none items-center justify-center rounded-btn bg-teal text-white transition-opacity hover:opacity-90 disabled:opacity-40 ${FOCUS_RING}`}
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
