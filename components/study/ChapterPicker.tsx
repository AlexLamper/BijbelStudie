'use client'

import { useEffect, useMemo, useState, type PointerEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  ListChecks,
} from 'lucide-react'
import type { BibleBook } from '../../lib/content/bibleBooks'
import {
  bestStudyForRange,
  chapterCountLabel,
  openingChapter,
  parseOutlineRange,
  passageHref,
  passageLabel,
  studiesForBook,
  type PassageSelection,
} from './passageSelection'

const TEAL = '#0D9488'
/**
 * #0D9488 is 3.7:1 on white and far too dark on the dark card, so teal that
 * has to be *read* uses the class pair rather than the inline brand colour.
 * teal-700 is #0F766E; the fills stay inline on TEAL.
 */
const TEAL_TYPE = 'text-teal-700 dark:text-teal-400'

/**
 * A study a curated one covers well enough to be offered instead of plain
 * reading. Below this the study is still mentioned, but as a side note: a
 * person study touching eight of Genesis' fifty chapters is not an answer to
 * "ik wil Genesis lezen".
 */
const REPLACEMENT_COVERAGE = 0.6

interface Quick {
  key: string
  label: string
  detail: string
  start: number
  end: number
}

interface ChapterPickerProps {
  book: BibleBook
  /** Chapters of this book already marked read, ascending. */
  read: number[]
  onBack: () => void
  /** Called as the reader leaves for the passage, so it can be remembered. */
  onStart: (selection: PassageSelection) => void
}

/**
 * Step two of the browser: one book, opened.
 *
 * The book grid is replaced rather than expanded in place. An accordion under
 * a tile pushes forty other books around and leaves the chapter grid competing
 * with them for attention; swapping the panel means the reader is looking at
 * exactly one thing, and it behaves the same on a phone as on a desktop.
 */
export default function ChapterPicker({ book, read, onBack, onStart }: ChapterPickerProps) {
  const readSet = useMemo(() => new Set(read), [read])

  // Opening on the first unread chapter means the panel is never in a dead
  // state: there is always something the button can do, and for someone who is
  // part-way through a book it is already the right thing. It is a seed value
  // only - the parent keys this component on the book, so switching books
  // remounts it rather than leaving a stale selection behind.
  const firstUnread = useMemo(() => {
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      if (!readSet.has(chapter)) return chapter
    }
    return 1
  }, [book.chapters, readSet])

  const [anchor, setAnchor] = useState(firstUnread)
  const [head, setHead] = useState(firstUnread)
  const [dragging, setDragging] = useState(false)
  /** Set by "tot en met": the next tap closes a range. The touch equivalent of shift. */
  const [extendArmed, setExtendArmed] = useState(false)

  const start = Math.min(anchor, head)
  const end = Math.max(anchor, head)
  const size = end - start + 1
  const selection: PassageSelection = { slug: book.slug, start, end }

  // A drag can end anywhere, including outside the grid or off the window, so
  // the release is listened for on the document rather than on the cells.
  useEffect(() => {
    if (!dragging) return
    const stop = () => setDragging(false)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [dragging])

  function select(from: number, to: number) {
    setAnchor(from)
    setHead(to)
    setExtendArmed(false)
  }

  function handleClick(chapter: number, shiftKey: boolean) {
    // Shift and "tot en met" both mean the same thing: keep the anchor, move
    // the far end. Anything else starts a new one-chapter selection.
    if (shiftKey || extendArmed) {
      setHead(chapter)
      setExtendArmed(false)
      return
    }
    select(chapter, chapter)
  }

  function handlePointerDown(chapter: number, event: PointerEvent) {
    if (event.shiftKey || extendArmed) return
    // Touch is left alone: making the grid draggable on a phone means taking
    // over the vertical gesture, and Psalmen is 150 cells of scrolling. Touch
    // users get "tot en met" instead, which is a real button rather than a
    // gesture nobody discovers.
    if (event.pointerType === 'touch') return
    setAnchor(chapter)
    setHead(chapter)
    setDragging(true)
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging) return
    const element = document.elementFromPoint(event.clientX, event.clientY)
    const cell = element?.closest('[data-chapter]')
    const chapter = cell ? Number(cell.getAttribute('data-chapter')) : NaN
    if (Number.isFinite(chapter) && chapter >= 1 && chapter <= book.chapters) {
      setHead(chapter)
    }
  }

  /**
   * One-tap ranges. The outline sections are authored per book in
   * lib/content/bibleBooks ("5-7 De Bergrede"), which makes them a far better
   * suggestion than any arithmetic split of the chapter count would be.
   */
  const quickRanges = useMemo<Quick[]>(() => {
    const whole: Quick = {
      key: 'whole',
      label: 'Heel boek',
      detail: chapterCountLabel(book.chapters),
      start: 1,
      end: book.chapters,
    }
    const sections = book.outline
      .map((section, index) => {
        const range = parseOutlineRange(section.range, book.chapters)
        if (!range) return null
        return {
          key: `outline-${index}`,
          label: section.title,
          detail: passageLabel(book, range.start, range.end),
          start: range.start,
          end: range.end,
        }
      })
      .filter((entry): entry is Quick => entry !== null)
    return [whole, ...sections]
  }, [book])

  const bookStudies = studiesForBook(book.slug)
  const match = bestStudyForRange(book.slug, start, end)
  const studyReplacesReading = match !== null && match.coverage >= REPLACEMENT_COVERAGE

  const readInSelection = read.filter(chapter => chapter >= start && chapter <= end).length
  const href = passageHref(book, selection, read)
  /** Named in the line under the button, so it matches where the link goes. */
  const opensAt = openingChapter(selection, read)

  // No `overflow-hidden` on the card below, however much the rounded corners
  // want it: `overflow: hidden` makes an element its own scroll container, and
  // the summary bar sticks to nothing inside one. The bar rounds its own
  // corners instead.
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-border">
        <button
          onClick={onBack}
          data-track="study_book_back"
          className={`inline-flex items-center gap-1.5 text-[13px] font-semibold mb-3 transition-opacity hover:opacity-70 ${TEAL_TYPE}`}
        >
          <ArrowLeft size={14} /> Alle boeken
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
          {book.name}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-gray-400 dark:text-muted-foreground">
          <span>{book.genre}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{chapterCountLabel(book.chapters)}</span>
          {read.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className={`tabular-nums font-semibold ${TEAL_TYPE}`}>
                {read.length} gelezen
              </span>
            </>
          )}
        </p>
        <p className="mt-2.5 text-[13px] leading-relaxed text-gray-600 dark:text-muted-foreground max-w-2xl">
          {book.theme}
        </p>
      </div>

      {/* The brief's rule: a curated study that already walks this book beats
          dropping someone into raw text, so it is named before the chapter
          grid is even reached. */}
      {bookStudies.length > 0 && (
        <div
          className="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-border"
          style={{ backgroundColor: 'rgba(13,148,136,0.05)' }}
        >
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
            <GraduationCap size={14} style={{ color: TEAL }} />
            Er {bookStudies.length === 1 ? 'is een begeleide studie' : 'zijn begeleide studies'} voor {book.name}
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {bookStudies.slice(0, 3).map(({ study }) => (
              <Link
                key={study.id}
                href={`/studies/${study.id}`}
                data-track="study_book_study"
                className="no-underline group flex items-center gap-2 rounded-lg border bg-white dark:bg-card px-3 py-2 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
                style={{ borderColor: 'rgba(13,148,136,0.28)' }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground truncate">
                    {study.title}
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-muted-foreground">
                    <ListChecks size={10} className="inline-block mr-1 -mt-0.5" />
                    {study.lessons.length} lessen
                  </span>
                </span>
                <ArrowRight
                  size={14}
                  className="flex-none opacity-40 group-hover:opacity-100 transition-opacity"
                  style={{ color: TEAL }}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick ranges */}
      <div className="px-4 sm:px-5 pt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground mb-2">
          Gedeelten
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {quickRanges.map(quick => {
            const active = quick.start === start && quick.end === end
            return (
              <button
                key={quick.key}
                onClick={() => select(quick.start, quick.end)}
                data-track={quick.key === 'whole' ? 'study_whole_book' : 'study_section_pick'}
                aria-pressed={active}
                className={`text-left rounded-lg border px-2.5 py-1.5 transition-colors ${
                  active
                    ? 'border-transparent text-white'
                    : 'bg-white dark:bg-card border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-secondary'
                }`}
                style={active ? { backgroundColor: TEAL } : undefined}
              >
                <span className="block text-[12.5px] font-semibold leading-tight">
                  {quick.label}
                </span>
                <span
                  className={`block text-[10.5px] tabular-nums ${
                    active ? 'opacity-80' : 'text-gray-400 dark:text-muted-foreground'
                  }`}
                >
                  {quick.detail}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chapter grid */}
      <div className="px-4 sm:px-5 pt-4 pb-4">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground">
            Hoofdstukken
          </h3>
          <p className="text-[11px] text-gray-400 dark:text-muted-foreground text-right">
            Klik een hoofdstuk. Sleep of shift-klik voor een reeks.
          </p>
        </div>

        <div
          onPointerMove={handlePointerMove}
          className="grid gap-1 select-none grid-cols-6 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12"
        >
          {Array.from({ length: book.chapters }, (_, index) => index + 1).map(chapter => {
            const selected = chapter >= start && chapter <= end
            const alreadyRead = readSet.has(chapter)
            return (
              <button
                key={chapter}
                type="button"
                data-chapter={chapter}
                data-track="study_chapter_pick"
                aria-pressed={selected}
                aria-label={`Hoofdstuk ${chapter}${alreadyRead ? ', gelezen' : ''}`}
                onPointerDown={event => handlePointerDown(chapter, event)}
                onClick={event => handleClick(chapter, event.shiftKey)}
                className={`h-9 rounded-md text-[12.5px] font-semibold tabular-nums border transition-colors ${
                  selected
                    ? 'border-transparent text-white'
                    : alreadyRead
                      ? `border-transparent ${TEAL_TYPE}`
                      : 'border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
                }`}
                style={
                  selected
                    ? { backgroundColor: TEAL }
                    : alreadyRead
                      ? { backgroundColor: 'rgba(13,148,136,0.12)' }
                      : undefined
                }
              >
                {chapter}
              </button>
            )
          })}
        </div>

        {read.length > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-muted-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: 'rgba(13,148,136,0.12)' }}
              aria-hidden
            />
            Hoofdstukken die je al gelezen hebt
          </p>
        )}
      </div>

      {/* Selection summary. Sticky inside the panel so it stays reachable
          while scrolling a long book - Psalmen is 150 cells. */}
      <div className="sticky bottom-0 rounded-b-2xl border-t border-gray-100 dark:border-border bg-white/95 dark:bg-card/95 backdrop-blur px-4 sm:px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-foreground truncate">
              {passageLabel(book, start, end)}
            </p>
            <p className="text-[11.5px] text-gray-500 dark:text-muted-foreground tabular-nums">
              {chapterCountLabel(size)}
              {readInSelection > 0 && ` · ${readInSelection} al gelezen`}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExtendArmed(value => !value)}
              data-track="study_range_extend"
              aria-pressed={extendArmed}
              className={`h-9 px-3 rounded-lg text-[12.5px] font-semibold border transition-colors ${
                extendArmed
                  ? 'border-transparent text-white'
                  : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
              }`}
              style={extendArmed ? { backgroundColor: TEAL } : undefined}
            >
              {extendArmed ? 'Kies het eind' : 'Tot en met…'}
            </button>

            {studyReplacesReading && match ? (
              <Link
                href={`/studies/${match.study.id}`}
                data-track="study_matched_study"
                className="no-underline inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                <GraduationCap size={14} /> Volg de studie
              </Link>
            ) : (
              <Link
                href={href}
                onClick={() => onStart(selection)}
                data-track="study_passage_start"
                className="no-underline inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                <BookOpen size={14} />
                {size === 1 ? 'Lees dit hoofdstuk' : 'Begin met lezen'}
              </Link>
            )}
          </div>
        </div>

        {/* Honest about where the button goes. There is no generated study
            behind a self-picked passage; it opens in the reader, which is where
            the commentary, achtergrond and notes panels live. Saying so beats
            letting someone expect a lesson flow and land on a chapter. */}
        <p className="mt-2 text-[11px] leading-relaxed text-gray-400 dark:text-muted-foreground">
          {studyReplacesReading && match ? (
            <>
              <Check size={11} className="inline-block mr-1 -mt-0.5" style={{ color: TEAL }} />
              {match.study.title} behandelt {match.overlap === size ? 'dit hele gedeelte' : `${match.overlap} van deze ${size} hoofdstukken`} in {match.study.lessons.length} lessen.{' '}
              <Link
                href={href}
                onClick={() => onStart(selection)}
                data-track="study_passage_start"
                className={`font-semibold underline ${TEAL_TYPE}`}
              >
                Liever zelf lezen
              </Link>
            </>
          ) : (
            <>
              Je opent {book.name} {opensAt} in de lezer, met commentaar, achtergrond en je
              aantekeningen ernaast. Je voortgang loopt per hoofdstuk mee.
              {match && (
                <>
                  {' '}
                  <Link
                    href={`/studies/${match.study.id}`}
                    data-track="study_related_study"
                    className={`font-semibold underline ${TEAL_TYPE}`}
                  >
                    {match.study.title}
                  </Link>{' '}
                  raakt dit gedeelte ook.
                </>
              )}
            </>
          )}
        </p>
      </div>
    </section>
  )
}
