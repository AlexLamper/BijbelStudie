'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Images, Landmark, Languages, Link2, Send, StickyNote } from 'lucide-react';

import CommentaryComponent from '../CommentaryComponent';
import GeoImages from '../GeoImages';
import OriginalText from '../OriginalText';
import { ChapterNotes } from '../ChapterNotes';
import CrossRefAttribution from '../crossrefs/CrossRefAttribution';
import CrossRefList from '../crossrefs/CrossRefList';
import { useCrossRefCopy } from '../crossrefs/copy';
import BookContextDialog from './BookContextDialog';
import { track } from '../../../lib/analytics';
import { toBookIndex } from '../../../lib/readChaptersCanon';
import { useCrossRefs } from '../../../hooks/useCrossRefs';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

import { FOCUS_RING, INK, INK_FAINT, INK_MUTED, RULE } from './lesson-layout';

export interface DepthContentProps {
  body?: string[];
  terms?: { term: string; meaning: string }[];
  showMedia?: boolean;
}

type PanelKey = 'media' | 'original' | 'crossrefs' | 'notes';

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
    key: 'crossrefs',
    label: 'Verwijzingen',
    // Link2 IDENTIFIES the panel, the way the three icons beside it do. It is
    // the same glyph the control on a verse carries, and the only icon this
    // feature is allowed (CLAUDE.md: no decorative icons).
    icon: Link2,
    blurb: 'Andere bijbelteksten die over hetzelfde spreken.',
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
  version,
  verseStart,
  verseEnd,
  commentaryId,
  depth,
  preferences,
  panel: panelProp,
  onPanelChange,
  onAskAi,
}: {
  book: string;
  chapter: number;
  /** The translation the lesson is being read in; cross-ref previews quote it. */
  version?: string | null;
  /** The lesson's own verse range. The Verwijzingen panel is cut down to it. */
  verseStart?: number | null;
  verseEnd?: number | null;
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
            brand colour and the bar; the row below spells out what it shows.

            A fourth tab no longer fits the 344 px column, so the row scrolls
            sideways rather than truncating four labels into stubs - the clipped
            edge is the affordance, and the scrollbar itself is hidden because a
            5 px rail would sit on the underline. A sideways drag that starts
            here is already not a page turn: StudyFlowShell reads an overflow-x
            box as a sideways region. */}
        <div className={`flex-none border-b ${RULE}`}>
          <div className="flex overflow-x-auto px-2 sm:px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PANELS.map(({ key, label, icon: Icon }) => {
              const isActive = panel === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPanel(key)}
                  aria-pressed={isActive}
                  className={[
                    'relative inline-flex h-11 flex-none items-center justify-center gap-1.5 px-2.5 text-[12.5px] font-semibold transition-colors sm:px-3',
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

        <div className="px-[18px] py-4 max-md:px-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
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

          {panel === 'crossrefs' && (
            <CrossRefPassagePanel
              book={book}
              chapter={chapter}
              version={version ?? null}
              verseStart={verseStart ?? null}
              verseEnd={verseEnd ?? null}
            />
          )}

          {panel === 'notes' && <ChapterNotes book={book} chapter={chapter} bare />}
        </div>

        {/* The one step where a question is likely enough to earn its own box.
            It hands off to the same assistant the header opens, so the answer
            lands in the conversation that travels with the lesson. */}
        {onAskAi && (
          <div className={`flex-none border-t px-[18px] py-3 ${RULE} max-md:px-4 max-md:pb-6`}>
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
                className={`h-[42px] min-w-0 flex-1 rounded-btn border border-les-card-line bg-les-input px-3 text-[13.5px] max-md:text-[16px] text-les-ink placeholder:text-les-faint ${FOCUS_RING}`}
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

/** References shown per verse before "Toon alle …". Lower than the reader's 8:
 *  this panel shows every verse of the gedeelte at once in a 344 px column. */
const REFS_PER_VERSE = 5;

/**
 * The lesson's cross-references: the passage it reads, verse by verse, and
 * what else in the Bible says the same thing.
 *
 * TWO THINGS MAKE THIS DIFFERENT FROM THE READER'S PANEL (CROSS_LINKS_PLAN.md
 * §4.1 point 3).
 *
 * It is cut down to the LESSON'S VERSE RANGE. The shard is per chapter and the
 * hook hands back the whole of it, but a lesson on Johannes 3:16-18 has no
 * business listing the references of verse 30: the step is about the gedeelte,
 * and the rest of the chapter is a different lesson.
 *
 * And it is PREVIEW ONLY. Nothing here moves the reader, because this is an
 * immersive window rather than a reader - there is no second pane to land in
 * and no way back that is not "leave the lesson". So `onNavigate` is
 * deliberately not passed, which leaves every row an ordinary `rel="nofollow"`
 * link, and the way through to the real reader is one explicit
 * "Openen in Lezen" per verse, in a NEW TAB so the lesson stays open behind it.
 * `StudyExitGuard` lets a `target="_blank"` link past untouched.
 */
function CrossRefPassagePanel({
  book,
  chapter,
  version,
  verseStart,
  verseEnd,
}: {
  book: string;
  chapter: number;
  version: string | null;
  verseStart: number | null;
  verseEnd: number | null;
}) {
  const c = useCrossRefCopy();
  /**
   * No `books` list: the lesson never loaded the translation's own book index,
   * so targets carry their canonical Dutch names - which `/api/bible/chapter`
   * resolves for every version through `getBookNameVariants`.
   */
  const { verses, loading, error, numberingMayDiffer } = useCrossRefs({
    version,
    book,
    chapter,
  });
  const sourceBookIndex = useMemo(() => toBookIndex(book), [book]);

  // The panel is only mounted while its tab is open, so this is the moment the
  // reader actually asked for references.
  useEffect(() => {
    track('crossref_opened', { surface: 'study_flow', platform: 'web' });
  }, []);

  const inRange = useMemo(() => {
    if (verseStart == null) return verses;
    const last = verseEnd ?? verseStart;
    return verses.filter((group) => group.verse >= verseStart && group.verse <= last);
  }, [verses, verseStart, verseEnd]);

  const lezenHref = (verse: number) => {
    const params = new URLSearchParams({
      book,
      chapter: String(chapter),
      vers: String(verse),
    });
    // The translation rides along, so the new tab opens in the one the lesson
    // is being read in rather than whatever /lezen last remembered.
    if (version) params.set('version', version);
    return `/lezen?${params.toString()}`;
  };

  return (
    // The lesson turns its page on a sideways drag; a drag that starts inside
    // this list is someone reading it. See StudyFlowShell#startsInSidewaysRegion.
    <div data-no-page-swipe>
      {numberingMayDiffer && (
        <p className={`mb-2 text-[11.5px] leading-snug ${INK_MUTED}`}>
          {c('numbering_fallback')}
        </p>
      )}

      {loading && (
        <div className="space-y-4" role="status" aria-label={c('loading')}>
          {[0, 1, 2].map((row) => (
            <div key={row} className="space-y-1.5">
              <span className="skeleton-pulse block h-[11px] w-16 rounded bg-les-card" />
              <span className="skeleton-pulse block h-[10px] w-full rounded bg-les-card" />
              <span className="skeleton-pulse block h-[10px] w-4/5 rounded bg-les-card" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && <p className={`text-[12.5px] ${INK_MUTED}`}>{c('error')}</p>}

      {!loading && !error && inRange.length === 0 && (
        <p className={`text-[12.5px] ${INK_MUTED}`}>{c('passage_empty')}</p>
      )}

      {!loading && !error && inRange.length > 0 && (
        <div className="content-in">
          {inRange.map((group) => (
            <section
              key={group.verse}
              className={`mb-3 border-t pt-2 first:border-t-0 first:pt-0 ${RULE}`}
            >
              <span
                className={`text-[11px] font-bold uppercase tracking-[1.2px] ${INK_FAINT}`}
              >
                {c('verse_heading', { n: group.verse })}
              </span>

              <CrossRefList
                refs={group.refs}
                version={version}
                surface="study_flow"
                sourceLabel={`${book} ${chapter}:${group.verse}`}
                sourceVerse={group.verse}
                sourceBookIndex={sourceBookIndex}
                initialCount={REFS_PER_VERSE}
                goToText={false}
              />

              <div className="mt-1.5 flex justify-end">
                <a
                  href={lezenHref(group.verse)}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  title={`${c('open_in_lezen')} (nieuw tabblad)`}
                  onClick={() =>
                    track('crossref_followed', {
                      surface: 'study_flow',
                      action: 'open_in_lezen',
                      platform: 'web',
                    })
                  }
                  className={`rounded-btn text-[12px] font-semibold text-[#0D9488] no-underline transition-colors hover:underline dark:text-[#2DD4BF] ${FOCUS_RING}`}
                >
                  {c('open_in_lezen')}
                </a>
              </div>
            </section>
          ))}

          <CrossRefAttribution version={version} form="short" className="mt-4" />
        </div>
      )}
    </div>
  );
}
