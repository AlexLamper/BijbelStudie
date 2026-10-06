'use client';

import React, { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, ChevronDown, ChevronRight, Lock } from 'lucide-react';

import { track, trackNow } from '../../../lib/analytics';
import { FREE_CROSS_REFS } from '../../../lib/entitlements';
import { gateCrossRefs } from '../../../lib/proContent';
import { openProOffer } from '../../../lib/proOffer';
import { cn } from '../../../lib/utils';
import { copyGuardProps, isCopyRestricted } from '../../../lib/bibleCopyPolicy';
import type { CrossRefTarget } from '../../../hooks/useCrossRefs';
import { useIsPro } from '../../../hooks/useIsPro';
import { useVersePreviews } from '../../../hooks/useVersePreviews';
import { useCrossRefCopy } from './copy';

/**
 * Where a cross-reference list is being shown. Mirrors the analytics enum in
 * `lib/analyticsSchema.ts`, which already accepts every value here - a surface
 * this union does not name would be dropped by the allowlist, so the two move
 * together. `study_flow` is the Verwijzingen panel in the lesson's Verdieping
 * step and the verse panel inside `/studie`'s own reader.
 */
export type CrossRefSurface = 'verse_panel' | 'materials_tab' | 'study_flow';

/** Everything `/lezen` needs to move the reader and to offer the way back. */
export type CrossRefNavigateTarget = {
  /** The target book, spelled as the current translation spells it. */
  book: string;
  chapter: number;
  verse: number;
  /** `Jesaja 1:18` - what the reader clicked. */
  label: string;
  /** `Psalmen 51:3` - where they came from, for the back chip. */
  fromLabel: string;
  /** The verse they came from, so "back" lands on the line, not the chapter. */
  fromVerse: number;
  href: string;
  /** Which list this was followed from, for the matching `back` event. */
  surface: CrossRefSurface;
};

/** How many rows before "Toon alle …" (CROSS_LINKS_PLAN.md §4.2). */
const DEFAULT_VISIBLE = 5;
/** A range shows at most this many verses; a longer one ends in an ellipsis. */
const MAX_RANGE_VERSES = 5;
/** Characters of preview in a collapsed row. */
const SNIPPET_CHARS = 160;

/** `text-[#0D9488] dark:text-[#2DD4BF]`, exactly as `VerseMarkers.tsx` sets it. */
const LINK = 'text-[#0D9488] dark:text-[#2DD4BF]';

function testament(bookIndex: number | null | undefined): 'ot' | 'nt' | null {
  if (!bookIndex || bookIndex < 1 || bookIndex > 66) return null;
  return bookIndex <= 39 ? 'ot' : 'nt';
}

/**
 * The `ot_nt` style pair the funnel accepts. Book, chapter and verse are never
 * sent: CROSS_LINKS_PLAN.md §6.2 refuses that cardinality by design, and
 * `lib/analyticsSchema.ts` would drop it anyway.
 */
export function testamentPair(
  from: number | null | undefined,
  to: number | null | undefined,
): string | null {
  const a = testament(from);
  const b = testament(to);
  return a && b ? `${a}_${b}` : null;
}

/**
 * The ranked list of references for one source verse.
 *
 * Rows are ordered by the source dataset's community votes, which is what
 * "Meest relevante eerst" promises. Preview text is fetched only for the rows
 * that are on screen, in the translation the reader has open - see
 * `hooks/useVersePreviews.ts` for why that is per chapter and not per verse.
 */
export default function CrossRefList({
  refs,
  version,
  surface,
  sourceLabel,
  sourceVerse,
  sourceBookIndex,
  onNavigate,
  goToText = true,
  initialCount = DEFAULT_VISIBLE,
  className,
}: {
  refs: CrossRefTarget[];
  version: string | null;
  surface: CrossRefSurface;
  /** `Psalmen 51:3` - the verse these references belong to. */
  sourceLabel: string;
  sourceVerse: number;
  sourceBookIndex: number | null;
  /**
   * Navigates in place. Without it the rows stay ordinary links, which is what
   * a surface that cannot move the reader (a new tab, the study flow) wants.
   */
  onNavigate?: (target: CrossRefNavigateTarget) => void;
  /**
   * Set false where a row must not be able to leave the page at all. The study
   * flow is preview-only (plan SS4.1 point 3): its one way out is the panel's
   * own `Openen in Lezen`, which opens a new tab and leaves the lesson standing.
   * A row-level `Ga naar tekst` there would be an in-window link and would put
   * the exit-guard dialog in front of a reader who only wanted to read a verse.
   */
  goToText?: boolean;
  initialCount?: number;
  className?: string;
}) {
  const c = useCrossRefCopy();
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  /**
   * Free readers see the first FREE_CROSS_REFS (the top-voted ones) and a
   * locked row for the rest; Pro sees everything. Every in-app surface (the
   * /lezen verse panel, the Verwijzingen tab, /studie's reader and Verdieping
   * step) renders through this list, so this is the one web gate. The public
   * SEO chapter pages render their own list and stay ungated.
   *
   * The app is gated server-side (/api/v1/crossrefs); the web reads the static
   * CC BY shards straight off the CDN at zero function cost, so here the gate
   * is the UI - see the route's doc comment for the trade-off.
   */
  const isPro = useIsPro();
  const { status: sessionStatus } = useSession();
  const gate = useMemo(() => gateCrossRefs(refs, { isPro }), [refs, isPro]);
  const shown = gate.items;

  const visible = showAll ? shown : shown.slice(0, initialCount);

  // Only the rows on screen ask for text. Expanding the list adds its chapters
  // to this array on the next render, and the hook picks them up from there.
  const chapters = useMemo(
    () => visible.map((target) => ({ book: target.bookName, chapter: target.ref.c })),
    [visible],
  );
  const previews = useVersePreviews(version, chapters);
  // The previews are this translation's own text, so a licensed translation's
  // copy rule applies here too: readable, not harvestable. One verse at a time
  // still leaves through the copy button in the reader beside this panel.
  const guard = copyGuardProps(isCopyRestricted(version));

  const rowKey = (target: CrossRefTarget, index: number) => `${target.label}#${index}`;

  const toggleRow = (target: CrossRefTarget, key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      next.add(key);
      const pair = testamentPair(sourceBookIndex, target.bookIndex);
      track('crossref_followed', {
        surface,
        action: 'preview',
        platform: 'web',
        ...(pair ? { testament: pair } : {}),
      });
      return next;
    });
  };

  const navigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    target: CrossRefTarget,
  ) => {
    // Middle-click, ctrl/cmd-click and "open in new tab" must keep working:
    // the href is real, and only a plain left click is taken over.
    if (!onNavigate) return;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    const pair = testamentPair(sourceBookIndex, target.bookIndex);
    trackNow('crossref_followed', {
      surface,
      action: 'navigate',
      platform: 'web',
      ...(pair ? { testament: pair } : {}),
    });
    onNavigate({
      book: target.bookName,
      chapter: target.ref.c,
      verse: target.ref.v,
      label: target.label,
      fromLabel: sourceLabel,
      fromVerse: sourceVerse,
      href: target.href,
      surface,
    });
  };

  if (refs.length === 0) {
    return <p className="py-2 text-[12.5px] text-ink-muted">{c('empty')}</p>;
  }

  return (
    <div className={className}>
      <ul className="m-0 list-none p-0">
        {visible.map((target, index) => {
          const key = rowKey(target, index);
          const open = expanded.has(key);
          const passage = target.inVersion
            ? previews.getPassage(
                target.bookName,
                target.ref.c,
                target.ref.v,
                target.ref.ev,
                target.ref.ec,
                MAX_RANGE_VERSES,
              )
            : { state: 'missing' as const, verses: [], truncated: false };
          const snippet = target.inVersion
            ? previews.getSnippet(
                target.bookName,
                target.ref.c,
                target.ref.v,
                target.ref.ev,
                target.ref.ec,
                SNIPPET_CHARS,
              )
            : { state: 'missing' as const, verses: [], truncated: false, text: null };

          return (
            <li key={key} className="border-b border-line-soft last:border-b-0">
              <button
                type="button"
                onClick={() => toggleRow(target, key)}
                aria-expanded={open}
                aria-label={open ? c('collapse_row', { ref: target.label }) : c('expand_row', { ref: target.label })}
                className="flex w-full items-start gap-2 py-[7px] text-left outline-none transition-colors hover:bg-[var(--teal-wash)]"
              >
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[12.5px] font-semibold', LINK)}>
                    {target.label}
                  </span>
                  {!open && (
                    <span
                      {...guard}
                      className={cn(
                        'mt-[2px] block text-[12.5px] leading-[1.55] text-ink-muted',
                        guard.className,
                      )}
                    >
                      {snippet.state === 'ready' && snippet.text}
                      {snippet.state === 'missing' && c('missing_verse')}
                      {(snippet.state === 'loading' || snippet.state === 'idle') && (
                        <span className="inline-block h-[10px] w-3/4 animate-pulse rounded bg-line-soft align-middle" />
                      )}
                    </span>
                  )}
                </span>
                {open ? (
                  <ChevronDown size={14} className="mt-[3px] flex-none text-ink-faint" aria-hidden />
                ) : (
                  <ChevronRight size={14} className="mt-[3px] flex-none text-ink-faint" aria-hidden />
                )}
              </button>

              {open && (
                <div className="pb-[10px] pt-[2px]">
                  {passage.state === 'ready' && (
                    <div
                      {...guard}
                      className={cn('text-[13px] leading-[1.7] text-ink-body', guard.className)}
                    >
                      {passage.verses.map((verse) => (
                        <p key={verse.n} className="mb-1 last:mb-0">
                          <sup className="mr-[5px] align-super font-sans text-[10.5px] font-semibold text-ink-faint">
                            {verse.n}
                          </sup>
                          {verse.text}
                        </p>
                      ))}
                      {/* A range longer than five verses stops here rather than
                          turning the panel into a second chapter. */}
                      {passage.truncated && <p className="text-ink-faint">…</p>}
                    </div>
                  )}
                  {passage.state === 'missing' && (
                    <p className="text-[12.5px] text-ink-muted">{c('missing_verse')}</p>
                  )}
                  {(passage.state === 'loading' || passage.state === 'idle') && (
                    <div className="space-y-1.5 py-1" aria-hidden>
                      <span className="block h-[10px] w-full animate-pulse rounded bg-line-soft" />
                      <span className="block h-[10px] w-2/3 animate-pulse rounded bg-line-soft" />
                    </div>
                  )}

                  {goToText && target.inVersion && (
                    <div className="mt-2 flex justify-end">
                      <a
                        href={target.href}
                        rel="nofollow"
                        onClick={(event) => navigate(event, target)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-btn border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold no-underline transition-colors hover:bg-line-soft',
                          LINK,
                        )}
                      >
                        {c('go_to_text')}
                        <ArrowRight size={13} aria-hidden />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {shown.length > initialCount && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-1 text-[12px] font-semibold text-ink-muted underline-offset-2 outline-none transition-colors hover:text-ink-body hover:underline"
        >
          {showAll ? c('show_less') : c('show_all', { n: shown.length })}
        </button>
      )}

      {/* Held back while the session loads, so a Pro reader never sees a lock
          flash before their full list appears. */}
      {gate.locked && sessionStatus !== 'loading' && (
        <LockedCrossRefs
          lockedCount={gate.lockedCount}
          total={gate.total}
          onOpen={() => {
            trackNow('paywall_cta_clicked', { surface: 'crossrefs', platform: 'web' });
            openProOffer({
              surface: 'crossrefs',
              reason: c('locked_reason', { n: gate.total, free: FREE_CROSS_REFS }),
            });
          }}
        />
      )}
    </div>
  );
}

/**
 * The row under a free reader's first FREE_CROSS_REFS references: how many more
 * there are, over two placeholder rows. The placeholders are grey bars, never
 * real labels or text - nothing withheld is in the DOM. The lock identifies
 * the row as a locked control, which is the only reason it is drawn.
 */
function LockedCrossRefs({
  lockedCount,
  total,
  onOpen,
}: {
  lockedCount: number;
  total: number;
  onOpen: () => void;
}) {
  const c = useCrossRefCopy();
  const label = lockedCount === 1 ? c('locked_one') : c('locked_other', { n: lockedCount });

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={c('locked_aria', { n: lockedCount, total })}
      className="mt-1 block w-full rounded-card border border-line-soft text-left outline-none transition-colors hover:bg-[var(--teal-wash)] focus-visible:ring-2 focus-visible:ring-[#0D9488]"
    >
      <span aria-hidden className="block select-none space-y-2 px-3 pt-2.5">
        {Array.from({ length: Math.min(2, lockedCount) }, (_, row) => (
          <span key={row} className="block blur-[1.5px]">
            <span className={cn('block h-[10px] rounded bg-line-soft', row === 0 ? 'w-1/4' : 'w-1/3')} />
            <span className="mt-1 block h-[9px] w-full rounded bg-line-soft" />
          </span>
        ))}
      </span>
      <span className={cn('flex items-center gap-1.5 px-3 pb-2.5 pt-2 text-[12.5px] font-semibold', LINK)}>
        <Lock size={13} aria-hidden className="flex-none" />
        {label}
      </span>
    </button>
  );
}
