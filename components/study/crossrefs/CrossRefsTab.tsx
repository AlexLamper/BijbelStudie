'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { track } from '../../../lib/analytics';
import { useCrossRefs } from '../../../hooks/useCrossRefs';
import { toBookIndex } from '../../../lib/readChaptersCanon';
import CrossRefAttribution from './CrossRefAttribution';
import CrossRefList, { type CrossRefNavigateTarget } from './CrossRefList';
import { useCrossRefCopy } from './copy';

/**
 * The whole chapter's cross-references, grouped per verse, in the materials
 * pane.
 *
 * This is the SECOND path to the feature and the only reliable one on a touch
 * device, where the verse's hover cluster is not really reachable
 * (CROSS_LINKS_PLAN.md §4.1 point 2). Clicking a verse heading scrolls the
 * reader beside it to that verse, so the two panes stay in step.
 *
 * WHY THE GROUPS WAIT TO BE SEEN. A chapter can carry a couple of hundred
 * references pointing at a hundred different chapters, and each preview is a
 * chapter request. Only the groups that have actually scrolled into view are
 * mounted, so opening the tab costs a handful of (CDN-cached) requests rather
 * than a hundred - the same "visible rows only" rule the verse panel follows.
 */

/** References shown per verse before "Toon alle …". Lower than the panel's 8:
 *  the tab shows every verse at once, so the column has to stay scannable. */
const PER_VERSE = 5;

export default function CrossRefsTab({
  book,
  chapter,
  version,
  books,
  onFocusVerse,
  onNavigate,
}: {
  book: string;
  chapter: number;
  version: string | null;
  /** The translation's own book list, for target labels in its own spelling. */
  books?: readonly string[];
  /** Scrolls the reader pane to that verse. */
  onFocusVerse?: (verse: number) => void;
  onNavigate?: (target: CrossRefNavigateTarget) => void;
}) {
  const c = useCrossRefCopy();
  const { verses, loading, error, numberingMayDiffer } = useCrossRefs({
    version,
    book,
    chapter,
    books,
  });

  const sourceBookIndex = useMemo(() => toBookIndex(book), [book]);

  useEffect(() => {
    track('crossref_opened', { surface: 'materials_tab', platform: 'web' });
  }, []);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());

  // A new chapter starts over; otherwise a verse number from the previous one
  // would count as already seen.
  useEffect(() => {
    setSeen(new Set());
  }, [book, chapter, version]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || verses.length === 0) return;

    if (typeof IntersectionObserver === 'undefined') {
      setSeen(new Set(verses.map((group) => group.verse)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const arrived: number[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const value = Number((entry.target as HTMLElement).dataset.crossrefVerse);
          if (Number.isInteger(value)) arrived.push(value);
        }
        if (arrived.length === 0) return;
        setSeen((current) => {
          const next = new Set(current);
          for (const value of arrived) next.add(value);
          return next;
        });
      },
      // A screen early, so a group is ready by the time it is read.
      { root, rootMargin: '300px 0px' },
    );

    root.querySelectorAll('[data-crossref-verse]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [verses]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* The same header bar the commentary and grondtekst tabs draw. */}
      <div className="flex flex-none items-center gap-[10px] border-b border-line-soft px-5 py-[11px] dark:border-border max-md:px-4 max-md:py-2">
        <span className="flex-1 text-[12px] font-semibold uppercase tracking-[1.2px] text-ink-muted dark:text-muted-foreground">
          {c('panel_title', { ref: `${book} ${chapter}` })}
        </span>
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-28 pt-[14px] max-md:px-4">
        <p className="mb-2 text-[13px] leading-relaxed text-ink-muted dark:text-muted-foreground">
          {c('tab_intro')}
        </p>

        {numberingMayDiffer && (
          <p className="mb-2 text-[12px] leading-snug text-ink-muted">{c('numbering_fallback')}</p>
        )}

        {loading && (
          <div className="space-y-4 py-2" role="status" aria-label={c('loading')}>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="space-y-1.5">
                <span className="block h-[11px] w-16 animate-pulse rounded bg-line-soft" />
                <span className="block h-[10px] w-full animate-pulse rounded bg-line-soft" />
                <span className="block h-[10px] w-4/5 animate-pulse rounded bg-line-soft" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && <p className="text-[13px] text-ink-muted">{c('error')}</p>}

        {!loading && !error && verses.length === 0 && (
          <p className="text-[13px] text-ink-muted">{c('chapter_empty')}</p>
        )}

        {!loading && !error && verses.length > 0 && (
          <div className="content-in">
            {verses.map((group) => (
              <section
                key={group.verse}
                data-crossref-verse={group.verse}
                className="mb-3 border-t border-line-soft pt-2 first:border-t-0 first:pt-0"
              >
                {onFocusVerse ? (
                  <button
                    type="button"
                    onClick={() => onFocusVerse(group.verse)}
                    title={c('jump_to_verse', { n: group.verse })}
                    className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-muted underline-offset-2 outline-none transition-colors hover:text-[#0D9488] hover:underline dark:hover:text-[#2DD4BF]"
                  >
                    {c('verse_heading', { n: group.verse })}
                  </button>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-ink-muted">
                    {c('verse_heading', { n: group.verse })}
                  </span>
                )}

                {seen.has(group.verse) ? (
                  <CrossRefList
                    refs={group.refs}
                    version={version}
                    surface="materials_tab"
                    sourceLabel={`${book} ${chapter}:${group.verse}`}
                    sourceVerse={group.verse}
                    sourceBookIndex={sourceBookIndex}
                    onNavigate={onNavigate}
                    initialCount={PER_VERSE}
                  />
                ) : (
                  // Placeholder of roughly the right height, so the scrollbar
                  // does not jump as groups mount.
                  <div
                    aria-hidden
                    style={{ height: Math.min(group.refs.length, PER_VERSE) * 44 }}
                  />
                )}
              </section>
            ))}

            <CrossRefAttribution version={version} form="long" className="mt-5" />
          </div>
        )}
      </div>
    </div>
  );
}
