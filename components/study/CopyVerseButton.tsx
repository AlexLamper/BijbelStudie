'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { cn } from '../../lib/utils';
import { formatVerseForCopy } from '../../lib/bibleCopyPolicy';

/**
 * Copies one verse - the words, its reference and the translation's attribution
 * line - onto the clipboard.
 *
 * It exists for every translation, not only the restricted ones. On a
 * public-domain text it is a convenience (the reference and the citation come
 * along, which a cursor drag does not give you). On a licensed one it is the
 * *only* way out, because the scripture column there is not selectable: see
 * lib/bibleCopyPolicy.ts. Which means it has to be plainly present rather than
 * hidden behind a menu, and it has to keep working when clipboard permission is
 * refused - hence the "Niet gelukt" state instead of a silent no-op.
 *
 * The glyph identifies the control (there is no word for "copy" that fits in
 * the hover cluster), which is the only use of an icon the design system
 * allows.
 */
export default function CopyVerseButton({
  verse,
  text,
  reference,
  attribution,
  className,
  iconClassName,
}: {
  /** Verse number, for the label only. */
  verse: number | string;
  text: string;
  /** e.g. `Genesis 1:1` - what the citation under the words will say. */
  reference: string;
  /** The translation's required notice, when it has one. Travels with the text. */
  attribution?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flash = (next: 'done' | 'failed') => {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2000);
  };

  const copy = async () => {
    const payload = formatVerseForCopy({ text, reference, attribution });
    try {
      await navigator.clipboard.writeText(payload);
      flash('done');
    } catch {
      flash('failed');
    }
  };

  const label =
    state === 'done'
      ? `Vers ${verse} gekopieerd`
      : state === 'failed'
        ? `Vers ${verse} kopiëren is niet gelukt`
        : `Vers ${verse} kopiëren`;

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={label}
      title={state === 'failed' ? 'Kopiëren is niet gelukt' : label}
      className={cn(
        'inline-flex items-center justify-center rounded-md border p-1.5 shadow-field transition-colors',
        state === 'done'
          ? 'border-teal bg-teal-dark text-white'
          : 'border-line bg-surface text-gray-500 hover:border-teal-dark hover:bg-teal-dark hover:text-white dark:text-muted-foreground dark:hover:text-white',
        className,
      )}
    >
      {state === 'done' ? (
        <Check className={cn('h-3.5 w-3.5', iconClassName)} aria-hidden />
      ) : (
        <Copy className={cn('h-3.5 w-3.5', iconClassName)} aria-hidden />
      )}
      <span className="sr-only" role="status">
        {state === 'done' ? 'Gekopieerd' : state === 'failed' ? 'Kopiëren is niet gelukt' : ''}
      </span>
    </button>
  );
}
