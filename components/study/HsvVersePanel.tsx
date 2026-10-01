'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { cn } from '../../lib/utils';
import { HSV_ATTRIBUTION, HSV_NAME, HSV_NOTICE } from '../../lib/hsvQuota';

/**
 * One verse in the Herziene Statenvertaling, opened from that verse while
 * reading - the same inline shape as the grondtekst and cross-reference panels.
 *
 * The HSV is not a translation this product may serve: it is a translation this
 * product may *quote*, fifty verses of it, free of charge, with the source
 * named (lib/hsvQuota.ts). So there is a panel here and no entry in the
 * translation picker, and the panel never opens on a verse that is not on the
 * list - the control that opens it is only drawn for those fifty.
 *
 * Two rules this component carries:
 *
 *   - The source line is rendered with the text, always, never collapsed behind
 *     an "i" and never reworded. It is the condition the quotation rests on.
 *   - The text is not selectable, not copyable and not draggable. We are allowed
 *     to show these verses to a reader; we are not allowed to hand them out. A
 *     determined reader can still read the response in dev tools - this is the
 *     product saying what it is for, not a DRM claim.
 */
export default function HsvVersePanel({
  id,
  book,
  chapter,
  verse,
  onClose,
  className,
}: {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  onClose: () => void;
  className?: string;
}) {
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; text: string }
  >({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    // `no-store` on both ends: the response carries licensed text, so it has no
    // business in the browser's disk cache either.
    fetch(`/api/v1/bibles/hsv/${encodeURIComponent(book)}/${chapter}`, { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) {
          return { error: 'Log in om de HSV-weergave van dit vers te zien.' };
        }
        if (!response.ok) return { error: 'Kon de HSV-tekst niet laden.' };
        const data = await response.json();
        const match = (data?.verses ?? []).find(
          (row: { verse: number }) => Number(row.verse) === verse,
        );
        return match?.text
          ? { text: String(match.text) }
          : { error: 'Dit vers staat niet in de HSV-selectie.' };
      })
      .catch(() => ({ error: 'Kon de HSV-tekst niet laden.' }))
      .then((result) => {
        if (cancelled) return;
        setState(
          'text' in result && result.text
            ? { kind: 'ready', text: result.text }
            : { kind: 'error', message: (result as { error: string }).error },
        );
      });

    return () => {
      cancelled = true;
    };
  }, [book, chapter, verse]);

  const block = (event: React.SyntheticEvent) => event.preventDefault();

  return (
    <section
      id={id}
      role="region"
      aria-label={`${HSV_NAME} van vers ${verse}`}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onClose();
      }}
      className={cn(
        'mb-1 mt-2 rounded-card border border-line bg-surface px-3 py-2.5 font-sans',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-bold uppercase tracking-[1.1px] text-ink-muted">
          HSV · {book} {chapter}:{verse}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="HSV sluiten"
          className="rounded-md p-1 text-ink-faint transition-colors hover:bg-[var(--teal-wash)] hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {state.kind === 'loading' && (
        <div className="space-y-1.5 py-2" role="status" aria-label="HSV laden">
          <span className="block h-3 w-full animate-pulse rounded bg-line-soft" />
          <span className="block h-3 w-4/5 animate-pulse rounded bg-line-soft" />
        </div>
      )}

      {state.kind === 'error' && (
        <p className="py-2 text-[12.5px] leading-snug text-ink-muted">{state.message}</p>
      )}

      {state.kind === 'ready' && (
        <p
          onCopy={block}
          onCut={block}
          onDragStart={block}
          onContextMenu={block}
          className="select-none py-1 text-[14px] leading-relaxed text-ink-body"
          style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          {state.text}
        </p>
      )}

      {/* Required wherever the words are shown, in the publisher's own wording. */}
      <p className="mt-1 text-[10.5px] leading-snug text-ink-faint">
        {HSV_NAME}. {HSV_ATTRIBUTION}. {HSV_NOTICE}
      </p>
    </section>
  );
}
