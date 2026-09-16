'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { BIBLE_BOOKS, type BibleBook } from '../../lib/content/bibleBooks';
import { chapterStudyPath, findBook } from '../../lib/chapterStudyRef';

/** `slug` -> chapters, for the read and studied marks. */
type ChapterMarks = Map<string, Set<number>>;

function addMark(marks: ChapterMarks, bookName: string, chapter: unknown) {
  const book = findBook(bookName);
  if (!book || typeof chapter !== 'number') return;
  const set = marks.get(book.slug) ?? new Set<number>();
  set.add(chapter);
  marks.set(book.slug, set);
}

/**
 * What the reader has read and studied, from endpoints that already exist:
 * /api/user/reading-progress (readChapters) and /api/v1/study-progress (every
 * studied passage). A guest gets 401 from both and simply sees no marks.
 */
function useChapterMarks(enabled: boolean) {
  const [read, setRead] = useState<ChapterMarks>(new Map());
  const [studied, setStudied] = useState<ChapterMarks>(new Map());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch('/api/user/reading-progress');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { readChapters?: Record<string, number[]> };
        const marks: ChapterMarks = new Map();
        for (const [bookName, chapters] of Object.entries(data.readChapters ?? {})) {
          for (const chapter of chapters ?? []) addMark(marks, bookName, chapter);
        }
        if (!cancelled) setRead(marks);
      } catch {
        /* no marks */
      }
    })();

    void (async () => {
      try {
        const res = await fetch('/api/v1/study-progress');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { entries?: { book: string; chapter: number }[] };
        const marks: ChapterMarks = new Map();
        for (const entry of data.entries ?? []) addMark(marks, entry.book, entry.chapter);
        if (!cancelled) setStudied(marks);
      } catch {
        /* no marks */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { read, studied };
}

const TESTAMENTS: { id: BibleBook['testament']; label: string }[] = [
  { id: 'oude-testament', label: 'Oude Testament' },
  { id: 'nieuwe-testament', label: 'Nieuwe Testament' },
];

/**
 * "Kies een hoofdstuk": book, then chapter, then straight into the
 * single-chapter study. For someone who wants to study Romeinen 8 today
 * without starting a sixteen-lesson study first.
 */
export default function ChapterStudyPicker({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [book, setBook] = useState<BibleBook | null>(null);
  const { read, studied } = useChapterMarks(open);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setBook(null);
  }, []);

  const byTestament = useMemo(
    () =>
      TESTAMENTS.map((testament) => ({
        ...testament,
        books: BIBLE_BOOKS.filter((candidate) => candidate.testament === testament.id),
      })),
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-track="chapter_study_picker_open"
        className={
          triggerClassName ??
          'inline-flex h-[46px] items-center rounded-[12px] border border-line-strong bg-surface px-4 text-[13.5px] font-semibold text-ink-body shadow-field transition-colors hover:bg-line-soft'
        }
      >
        Kies een hoofdstuk
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl bg-surface max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-ink">
              {book ? book.name : 'Kies een hoofdstuk'}
            </DialogTitle>
            <DialogDescription className="text-ink-muted">
              {book
                ? 'Bestudeer één hoofdstuk, zonder een hele studie te starten.'
                : 'Kies eerst een bijbelboek.'}
            </DialogDescription>
          </DialogHeader>

          {book ? (
            <div>
              <button
                type="button"
                onClick={() => setBook(null)}
                className="mb-3 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-ink-muted hover:text-ink"
              >
                <ArrowLeft size={14} aria-hidden /> Alle boeken
              </button>
              <ol className="m-0 grid list-none grid-cols-6 gap-2 p-0 sm:grid-cols-8">
                {Array.from({ length: book.chapters }, (_, index) => index + 1).map((chapter) => {
                  const isStudied = studied.get(book.slug)?.has(chapter) ?? false;
                  const isRead = read.get(book.slug)?.has(chapter) ?? false;
                  const state = isStudied ? ', bestudeerd' : isRead ? ', gelezen' : '';
                  return (
                    <li key={chapter}>
                      <button
                        type="button"
                        data-track="chapter_study_picker_choose"
                        aria-label={`${book.name} ${chapter}${state}`}
                        onClick={() => {
                          onOpenChange(false);
                          router.push(chapterStudyPath(book.slug, chapter));
                        }}
                        className={[
                          'relative flex h-10 w-full items-center justify-center rounded-lg border text-[13px] font-semibold tabular-nums transition-colors',
                          isStudied
                            ? 'border-transparent text-white hover:opacity-90'
                            : isRead
                              ? 'border-[#0D9488] text-teal-dark hover:bg-line-soft dark:text-teal-400'
                              : 'border-line text-ink-body hover:bg-line-soft',
                        ].join(' ')}
                        style={isStudied ? { backgroundColor: '#0D9488' } : undefined}
                      >
                        {isStudied ? <Check size={14} aria-hidden strokeWidth={3} /> : chapter}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-faint">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-[#0D9488]" aria-hidden /> Gelezen
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded" style={{ backgroundColor: '#0D9488' }} aria-hidden />{' '}
                  Bestudeerd
                </span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {byTestament.map((testament) => (
                <section key={testament.id}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-faint">
                    {testament.label}
                  </h3>
                  <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-3">
                    {testament.books.map((candidate) => {
                      const studiedCount = studied.get(candidate.slug)?.size ?? 0;
                      return (
                        <li key={candidate.slug}>
                          <button
                            type="button"
                            onClick={() => setBook(candidate)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-left text-[13.5px] text-ink-body transition-colors hover:bg-line-soft"
                          >
                            <span className="truncate">{candidate.name}</span>
                            <span className="flex-none text-[11.5px] text-ink-faint tabular-nums">
                              {studiedCount > 0 ? `${studiedCount}/${candidate.chapters}` : candidate.chapters}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
