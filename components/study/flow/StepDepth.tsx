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
import { SCENE_BG, TEAL, TEAL_DEEP, TEAL_ON_DARK } from '../../scene/tokens';

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
        className={`lg:w-1/2 lg:flex-none min-w-0 lg:min-h-0 relative border-b lg:border-b-0 lg:border-r ${RULE}`}
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
          className="hidden lg:block pointer-events-none absolute bottom-0 left-0 right-0 h-14"
          style={{ backgroundImage: `linear-gradient(to top, ${SCENE_BG}, rgba(11,18,32,0))` }}
        />
      </div>

      {/* Right: everything that supports the reading. */}
      <aside className="lg:w-1/2 lg:flex-none min-w-0 lg:min-h-0 flex flex-col bg-black/25">
        {/* The book's background, as a row rather than a button that looked like
            a form field. It answers "who wrote this, when, and why", so it says
            that instead of "Algemene info". */}
        <button
          type="button"
          onClick={() => setContextOpen(true)}
          data-track="study_book_context"
          className={`group flex-none flex items-center gap-3 px-4 sm:px-5 py-3 text-left border-b ${RULE} transition-colors hover:bg-white/10 ${FOCUS_RING}`}
        >
          <span
            className="h-8 w-8 flex-none rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(45,212,191,0.14)' }}
          >
            <Landmark size={15} style={{ color: TEAL_ON_DARK }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-[13px] font-semibold truncate ${INK}`}>
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
                    'relative inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 h-11 text-[12.5px] font-semibold transition-colors min-w-0',
                    FOCUS_RING,
                    isActive ? '' : `${INK_FAINT} hover:text-white`,
                  ].join(' ')}
                  style={isActive ? { color: TEAL_ON_DARK } : undefined}
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

        <p className={`flex-none px-4 sm:px-5 py-2 text-[11.5px] ${INK_FAINT} border-b ${RULE}`}>
          {active.blurb}
        </p>

        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto px-4 sm:px-5 py-4">
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
          <div className={`flex-none border-t ${RULE} p-3`}>
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
                className={`flex-1 min-w-0 h-10 px-3 rounded-lg border border-white/20 bg-black/40 text-sm text-white placeholder:text-white/45 ${FOCUS_RING}`}
              />
              <button
                type="button"
                onClick={ask}
                disabled={!question.trim()}
                aria-label="Vraag versturen"
                className="press h-10 w-10 flex-none inline-flex items-center justify-center rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ backgroundColor: TEAL_DEEP }}
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
