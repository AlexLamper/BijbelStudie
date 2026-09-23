'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { loadOriginalChapter, VerseRow, type OriginalWord } from '../OriginalText';
import { cn } from '../../../lib/utils';

/**
 * The grondtekst of ONE verse, opened from that verse while reading.
 *
 * The whole-chapter grondtekst lives in the Verdieping step, which is too late
 * for comparing: by then the reader has left the text. Here it opens inline,
 * under the verse it belongs to, the same way the cross-references do - so the
 * translation and the Hebrew or Greek underneath it are on screen together.
 *
 * Pro only. The caller (PassageReader) never renders this for a free reader;
 * it raises the Pro offer instead.
 */
export default function OriginalVersePanel({
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
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ready'; words: OriginalWord[] | null; isHebrew: boolean }
  >({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    loadOriginalChapter(book, chapter).then((result) => {
      if (cancelled) return;
      setState(
        result.data
          ? { kind: 'ready', words: result.data[String(verse)] ?? null, isHebrew: result.isHebrew }
          : { kind: 'error', message: result.error ?? 'Kon de grondtekst niet laden.' },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [book, chapter, verse]);

  const language = state.kind === 'ready' ? (state.isHebrew ? 'Hebreeuws' : 'Grieks') : null;

  return (
    <section
      id={id}
      role="region"
      aria-label={`Grondtekst van vers ${verse}`}
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
          Grondtekst · {book} {chapter}:{verse}
          {language ? ` · ${language}` : ''}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Grondtekst sluiten"
          className="rounded-md p-1 text-ink-faint transition-colors hover:bg-[var(--teal-wash)] hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {state.kind === 'loading' && (
        <div className="flex gap-2 py-3" role="status" aria-label="Grondtekst laden">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="block h-14 w-16 animate-pulse rounded-lg bg-line-soft" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="py-2 text-[12.5px] leading-snug text-ink-muted">{state.message}</p>
      )}

      {state.kind === 'ready' && !state.words && (
        <p className="py-2 text-[12.5px] leading-snug text-ink-muted">
          Geen grondtekst gevonden voor vers {verse}. In enkele bijbelboeken nummert de grondtekst de
          verzen anders dan de vertaling; in de stap Verdieping staat het hele hoofdstuk.
        </p>
      )}

      {state.kind === 'ready' && state.words && (
        <>
          <VerseRow verseNum={verse} words={state.words} isHebrew={state.isHebrew} highlighted={false} />
          {/* CC BY 4.0 asks for the source wherever the text is shown. */}
          <p className="mt-1 text-[10.5px] leading-snug text-ink-faint">
            Bron: STEPBible ({state.isHebrew ? 'TAHOT' : 'TAGNT'}), Tyndale House Cambridge, CC BY 4.0.
            Tik op een Strong-nummer voor het lexicon.
          </p>
        </>
      )}
    </section>
  );
}
