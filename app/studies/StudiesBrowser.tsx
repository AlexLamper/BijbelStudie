'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import type { CuratedStudy } from '../../lib/data/curated-studies'
import { CATALOGUE_ENTRIES, isBookStudyId } from '../../lib/bookStudies'
import { Card, Chip, SectionHeading, StudyCard, ListRow } from '../../components/kit/primitives'
import StudyArtwork from './StudyArtwork'

const COMPLETED_KEY = 'bijbelstudie_completed_studies'

// ---------------------------------------------------------------------------
// The study catalogue (design_handoff_web/PAGES.md §2): one column at full
// width - a 440 px search field, the kind filters as pills, the study you are
// in, a sideways-scrolling row of featured cards, and then every study as a
// list row, ten at a time, down the page.
//
// The data layer below is the one this screen already had: the same
// localStorage key, the same two endpoints, the same `statusFor`. Nothing was
// added and nothing was removed; only what they render changed.
//
// TWO CONTROLS THE DESIGN HAS NO ROW FOR were folded into what it does have:
// the Ontdek/Mijn studies/Voltooid tabs and the OT/NT/Personen/Thema's segment
// row. Neither hid anything the reader cannot still reach - the list shows
// every study with its own state on it (a progress bar and "Verder", or
// "Herhalen" when it is finished), started studies sort to the top, and the
// kind pills are the same filter the segments were. Say the word and the tabs
// can come back as a second row.
// ---------------------------------------------------------------------------

/** The kind pill row, in the design's order. `null` is everything. */
const KINDS: { value: CuratedStudy['type'] | null; label: string }[] = [
  { value: null, label: 'Voor jou' },
  { value: 'Boek', label: 'Bijbelboeken' },
  { value: 'Persoon', label: 'Personen' },
  { value: 'Onderwerp', label: "Thema's" },
  { value: 'Gedeelte', label: 'Gedeelten' },
]

interface Enrollment {
  studyId: string
  currentLessonDay: number
  lessonsCompleted: number
  lessonsTotal: number
  completedAt: string | null
}

interface Status {
  completed: boolean
  done: number
  total: number
  resumeDay: number | null
  started: boolean
  pct: number
}

/** A catalogue row: the study plus the facts the list needs. */
interface Entry {
  study: CuratedStudy
  /** "Wet", "Evangelie", "Persoon" - what kind of thing this is, in one word. */
  kind: string
  lessonCount: number
  avgMinutes: number
  /** Everything a search should match, lowercased once at module load. */
  haystack: string
}

const ENTRIES: Entry[] = CATALOGUE_ENTRIES.map(
  ({ study, book, kind, lessonCount, avgMinutes }) => ({
    study,
    kind,
    lessonCount,
    avgMinutes,
    haystack: (book
      ? `${study.title} ${book.name} ${book.genre} ${study.description}`
      : `${study.title} ${study.description} ${study.lessons.map(lesson => lesson.book).join(' ')}`
    ).toLowerCase(),
  }),
)

/**
 * How many studies "Uitgelicht" puts in its carousel.
 *
 * One row that scrolls sideways, so the count costs no height: ten openings
 * into the catalogue at the height of a single card.
 *
 * This is the only place the number is written down: the carousel renders the
 * whole array and the heading counts the same array, so what you see and what
 * the label claims cannot drift apart - not even if the catalogue ever holds
 * fewer studies than the cap.
 */
const FEATURED_COUNT = 10

/** How many rows "Alle studies" shows at first, and adds per "Meer tonen". */
const LIST_PAGE_SIZE = 10

/**
 * The featured cards: the HAND-AUTHORED studies, in catalogue order.
 *
 * The rule used to be "has a written intro", which sounded curated and was not:
 * `generateBookStudy` gives every one of the sixty-six generated book studies an
 * `about` from the book's own summary, so the filter passed on all seventy-seven
 * entries and the row was simply the first few of the Old Testament. At four
 * cards that read as a sampler; at eight it read as "the start of Genesis".
 *
 * `isBookStudyId` is the one honest test for "somebody wrote this on purpose" -
 * it is the same check app/studies/[id]/page.tsx uses to decide indexability.
 *
 * Should there ever be fewer hand-authored studies than the cap, the row is
 * topped up with book studies so the carousel still carries a full set.
 */
const FEATURED: Entry[] = (() => {
  const authored = ENTRIES.filter(entry => !isBookStudyId(entry.study.id))
  const books = ENTRIES.filter(entry => isBookStudyId(entry.study.id))
  return [...authored, ...books].slice(0, FEATURED_COUNT)
})()

export default function StudiesBrowser() {
  const [kind, setKind] = useState<CuratedStudy['type'] | null>(null)
  const [query, setQuery] = useState('')
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE)

  // A new filter or search starts the list from its first page again.
  const changeKind = (value: CuratedStudy['type'] | null) => {
    setKind(value)
    setVisibleCount(LIST_PAGE_SIZE)
  }
  const changeQuery = (value: string) => {
    setQuery(value)
    setVisibleCount(LIST_PAGE_SIZE)
  }

  /* The "Uitgelicht" carousel: the arrows scroll it by most of a viewport and
     disable themselves at either end. */
  const browsing = query.trim() === ''
  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateCarouselEdges = useCallback(() => {
    const el = carouselRef.current
    if (!el) return
    setCanScrollPrev(el.scrollLeft > 4)
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  const scrollCarousel = (direction: 1 | -1) => {
    const el = carouselRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    updateCarouselEdges()
    const observer = new ResizeObserver(updateCarouselEdges)
    observer.observe(el)
    return () => observer.disconnect()
    // The carousel unmounts during a search; re-attach when it comes back.
  }, [updateCarouselEdges, browsing])

  useEffect(() => {
    try {
      setCompletedIds(JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]'))
    } catch {
      /* noop */
    }

    let cancelled = false

    void (async () => {
      try {
        const response = await fetch('/api/v1/study-progress')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const fromServer: string[] = data.completedStudies ?? []
        setCompletedIds(current => [...new Set([...current, ...fromServer])])
      } catch {
        /* offline: the local list stands */
      }
    })()

    void (async () => {
      try {
        const response = await fetch('/api/v1/study-enrollments')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const list: Enrollment[] = data.enrollments ?? []
        const map: Record<string, Enrollment> = {}
        for (const entry of list) map[entry.studyId] = entry
        setEnrollments(map)
      } catch {
        /* anonymous visitors simply see no progress */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const statusFor = useMemo(() => {
    return (study: CuratedStudy): Status => {
      const enrollment = enrollments[study.id]
      const done = enrollment?.lessonsCompleted ?? 0
      const total = study.lessons.length
      return {
        completed: completedIds.includes(study.id) || !!enrollment?.completedAt,
        done,
        total,
        resumeDay: enrollment?.currentLessonDay ?? null,
        started: done > 0 || enrollment?.currentLessonDay != null,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      }
    }
  }, [enrollments, completedIds])

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return null
    return ENTRIES.filter(entry => entry.haystack.includes(needle))
  }, [query])

  /** The full list, narrowed by the kind pills, with what you are in on top. */
  const listEntries = useMemo(() => {
    const filtered = ENTRIES.filter(entry => !kind || entry.study.type === kind)
    const rank = (entry: Entry) => {
      const status = statusFor(entry.study)
      if (status.started && !status.completed) return 0
      if (status.completed) return 2
      return 1
    }
    return [...filtered].sort((a, b) => rank(a) - rank(b))
  }, [kind, statusFor])

  const startedCount = useMemo(
    () => ENTRIES.filter(entry => {
      const status = statusFor(entry.study)
      return status.started && !status.completed
    }).length,
    [statusFor],
  )

  /** The study to carry on with: the first active enrolment the API returned. */
  const resume = useMemo(() => {
    for (const enrollment of Object.values(enrollments)) {
      if (enrollment.completedAt) continue
      const entry = ENTRIES.find(item => item.study.id === enrollment.studyId)
      if (entry) return { entry, enrollment }
    }
    return null
  }, [enrollments])

  const rows = searchResults ?? listEntries
  const visibleRows = rows.slice(0, visibleCount)

  return (
    <div className="flex flex-col gap-[13px]">
      {/* The search is a real field here, not the bar's grey plate: this is the
          fastest way through seventy-seven studies. */}
      <div className="flex h-[46px] w-full max-w-[440px] flex-none items-center gap-[10px] rounded-[12px] border border-line-strong bg-white px-[15px] shadow-field">
        <Search size={18} strokeWidth={1.9} className="flex-none text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={event => changeQuery(event.target.value)}
          placeholder="Bijbelboek, persoon of thema"
          aria-label="Zoek een studie"
          className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted"
        />
        <span className="flex-none rounded-[5px] border border-line px-[5px] py-[2px] font-mono text-[10.5px] font-semibold text-ink-faint">
          ⌘K
        </span>
      </div>

      {searchResults === null && (
        <div className="flex flex-none flex-wrap gap-[9px]">
          {KINDS.map(item => (
            <Chip
              key={item.label}
              label={item.label}
              active={item.value === kind}
              onClick={() => changeKind(item.value)}
            />
          ))}
        </div>
      )}

      {searchResults === null && resume && (
        // A compact resume card, as wide as a comfortable title line and no
        // wider: stretched across a wide screen the button drifts far from
        // the study it continues.
        <Card className="flex w-full max-w-[560px] flex-none items-center gap-[15px] px-[18px] py-[14px]">
          {/* The ring is the progress, bent around the thumbnail. */}
          <div
            className="flex h-12 w-12 flex-none items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--teal) 0 ${statusFor(resume.entry.study).pct}%, var(--line) ${statusFor(resume.entry.study).pct}% 100%)`,
            }}
          >
            <StudyArtwork
              id={resume.entry.study.id}
              kind={resume.entry.study.type}
              ratio={1}
              quiet
              className="h-[37px] w-[37px] rounded-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
              Verder waar je was
            </div>
            <div className="mt-[3px] truncate text-[17px] font-bold text-ink">
              {resume.entry.study.title} · les {resume.enrollment.currentLessonDay}
            </div>
          </div>
          <Link
            href={`/studie/${resume.entry.study.id}`}
            data-track="study_resume"
            className="inline-flex h-10 flex-none items-center rounded-btn bg-teal px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
          >
            Verder
          </Link>
        </Card>
      )}

      {searchResults === null && FEATURED.length > 0 && (
        <>
          {/* "Nieuw deze maand" in the design. Nothing in the catalogue records
              when a study was published, so the block keeps its shape and its
              honest name: the studies with a written introduction. */}
          <div className="flex flex-none items-center gap-3">
            <SectionHeading
              title="Uitgelicht"
              action={{ label: `Alle ${FEATURED.length}`, href: '/bijbelboeken' }}
              className="min-w-0 flex-1"
            />
            {/* Arrows only where there is a mouse to need them; on touch the
                row is swiped. */}
            <div className="hidden flex-none items-center gap-[6px] sm:flex">
              <button
                type="button"
                onClick={() => scrollCarousel(-1)}
                disabled={!canScrollPrev}
                aria-label="Vorige uitgelichte studies"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink-body transition-colors hover:border-line-strong disabled:cursor-default disabled:opacity-40 disabled:hover:border-line"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(1)}
                disabled={!canScrollNext}
                aria-label="Volgende uitgelichte studies"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink-body transition-colors hover:border-line-strong disabled:cursor-default disabled:opacity-40 disabled:hover:border-line"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {/* One row at image height 88, as the design measures the card, that
              scrolls sideways with snap points. Each card has a fixed width so
              the row reads as a shelf rather than a squeezed grid. */}
          <div
            ref={carouselRef}
            onScroll={updateCarouselEdges}
            className="flex flex-none snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FEATURED.map(entry => (
              <div key={entry.study.id} className="grid w-[210px] flex-none snap-start sm:w-[232px]">
                <StudyCard
                  href={`/studies/${entry.study.id}`}
                  title={entry.study.title}
                  meta={`${entry.lessonCount} ${entry.lessonCount === 1 ? 'les' : 'lessen'} · ±${entry.avgMinutes} min`}
                  imageHeight={88}
                  art={
                    <StudyArtwork
                      id={entry.study.id}
                      kind={entry.study.type}
                      ratio={3.2}
                      quiet
                      className="h-full w-full"
                    />
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeading
        title={searchResults === null ? 'Alle studies' : `${searchResults.length} ${searchResults.length === 1 ? 'studie' : 'studies'} gevonden`}
        meta={
          searchResults === null
            ? `${ENTRIES.length} studies${startedCount > 0 ? ` · ${startedCount} begonnen` : ''}`
            : undefined
        }
        action={searchResults === null ? { label: 'Per bijbelboek', href: '/bijbelboeken' } : undefined}
        className="flex-none"
      />

      {/* The list grows with the page and the page scrolls; it is paged
          client-side in steps of ten so the first screen stays light. */}
      <Card className="flex-none overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-[18px] py-6 text-[13.5px] leading-relaxed text-ink-muted">
            {searchResults
              ? `Niets gevonden voor "${query.trim()}". Probeer de naam van een bijbelboek, een persoon of een thema.`
              : 'Geen studie past bij dit filter.'}
          </p>
        ) : (
          <div>
            {visibleRows.map((entry, index) => {
              const status = statusFor(entry.study)
              const action = status.completed ? 'Herhalen' : status.started ? 'Verder' : 'Start'
              return (
                <Link
                  key={entry.study.id}
                  href={`/studies/${entry.study.id}`}
                  data-track="study_card"
                  className="block no-underline transition-colors hover:bg-line-soft"
                >
                  <ListRow
                    first={index === 0}
                    art={
                      <StudyArtwork
                        id={entry.study.id}
                        kind={entry.study.type}
                        ratio={1}
                        quiet
                        className="h-full w-full"
                      />
                    }
                    title={entry.study.title}
                    meta={`${entry.kind} · ${entry.lessonCount} ${entry.lessonCount === 1 ? 'les' : 'lessen'}${
                      status.started ? '' : ` · ±${entry.avgMinutes} min`
                    }`}
                    progress={status.started ? (status.completed ? 100 : status.pct) : undefined}
                    action={<span className="text-[13px] font-semibold text-teal">{action}</span>}
                  />
                </Link>
              )
            })}
          </div>
        )}
      </Card>

      {rows.length > visibleRows.length && (
        <div className="flex flex-none flex-col items-center gap-[6px] pt-1">
          <button
            type="button"
            onClick={() => setVisibleCount(count => count + LIST_PAGE_SIZE)}
            className="inline-flex h-10 items-center rounded-btn border border-line bg-white px-5 text-[14px] font-semibold text-teal transition-colors hover:border-line-strong"
          >
            Meer tonen
          </button>
          <span className="text-[12px] text-ink-faint">
            {visibleRows.length} van {rows.length} getoond
          </span>
        </div>
      )}
    </div>
  )
}
