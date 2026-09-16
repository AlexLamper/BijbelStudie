'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Check } from 'lucide-react'
import type { CuratedStudy } from '../../lib/data/curated-studies'
import { CATALOGUE_ENTRIES } from '../../lib/bookStudies'
import { Card, Chip } from '../../components/kit/primitives'
import StudyArtwork from './StudyArtwork'
import ChapterStudyPicker from '../../components/study/ChapterStudyPicker'

const COMPLETED_KEY = 'bijbelstudie_completed_studies'

// ---------------------------------------------------------------------------
// The study catalogue, laid out after the reader's own mock for this screen:
// a filter rail on the left (Oude/Nieuwe Testament by genre, plus Personen /
// Thema's / Gedeelten), a search field and a coarse type-pill row on top, a
// "Je bent bezig met" row of the studies in progress, and the filtered list
// as a grid of banner cards - a genre label and title baked into the banner,
// a lesson count and an action word below it.
//
// The data layer is the one this screen already had: the same localStorage
// key, the same two endpoints, the same `statusFor`. Nothing about progress
// tracking changed, only what narrows and renders it.
// ---------------------------------------------------------------------------

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
  /** "Wet", "Geschiedenis", "Persoon" - the genre label the mock bakes into the banner. */
  kind: string
  category: 'ot' | 'nt' | 'personen' | 'themas'
  lessonCount: number
  avgMinutes: number
  haystack: string
}

const ENTRIES: Entry[] = CATALOGUE_ENTRIES.map(
  ({ study, book, kind, category, lessonCount, avgMinutes }) => ({
    study,
    kind,
    category,
    lessonCount,
    avgMinutes,
    haystack: (book
      ? `${study.title} ${book.name} ${book.genre} ${study.description}`
      : `${study.title} ${study.description} ${study.lessons.map(lesson => lesson.book).join(' ')}`
    ).toLowerCase(),
  }),
)

/**
 * The filter rail's rows, in the mock's order and grouping.
 *
 * The rail is coarser than the raw `kind` field in two places: the mock's
 * "Profeten" is Grote profeten + Kleine profeten together, and its NT
 * "Evangeliën" is the four gospels plus Handelingen (a history book, but not
 * one anybody browses on its own). `match` is the one place either merge is
 * written down.
 */
interface RailGroup {
  heading: string
  items: { id: string; label: string; match: (entry: Entry) => boolean }[]
}

const RAIL: RailGroup[] = [
  {
    heading: 'Oude testament',
    items: [
      { id: 'wet', label: 'Wet', match: e => e.category === 'ot' && e.kind === 'Wet' },
      { id: 'ot-geschiedenis', label: 'Geschiedenis', match: e => e.category === 'ot' && e.kind === 'Geschiedenis' },
      { id: 'poezie', label: 'Poëzie en wijsheid', match: e => e.kind === 'Poëzie en wijsheid' },
      { id: 'profeten', label: 'Profeten', match: e => e.kind === 'Grote profeten' || e.kind === 'Kleine profeten' },
    ],
  },
  {
    heading: 'Nieuwe testament',
    items: [
      {
        id: 'evangelien',
        label: 'Evangeliën',
        match: e => e.category === 'nt' && (e.kind === 'Evangelie' || e.kind === 'Geschiedenis'),
      },
      { id: 'brieven', label: 'Brieven', match: e => e.kind === 'Brief' },
      { id: 'openbaring', label: 'Openbaring', match: e => e.category === 'nt' && e.kind === 'Apocalyptiek' },
    ],
  },
  {
    heading: 'Anders ingedeeld',
    items: [
      { id: 'personen', label: 'Personen', match: e => e.category === 'personen' },
      { id: 'themas', label: "Thema's", match: e => e.category === 'themas' && e.kind === 'Thema' },
      { id: 'gedeelten', label: 'Gedeelten', match: e => e.kind === 'Gedeelte' },
    ],
  },
]

/** The top pill row: a coarse type filter, independent of the rail below it. */
const TYPE_PILLS: { value: CuratedStudy['type'] | null; label: string }[] = [
  { value: null, label: 'Alles' },
  { value: 'Boek', label: 'Bijbelboeken' },
  { value: 'Persoon', label: 'Personen' },
  { value: 'Onderwerp', label: "Thema's" },
]

const LIST_PAGE_SIZE = 16

export default function StudiesBrowser() {
  const [typeFilter, setTypeFilter] = useState<CuratedStudy['type'] | null>(null)
  const [railId, setRailId] = useState<string | null>(null)
  const [sort, setSort] = useState<'canoniek' | 'alfabetisch'>('canoniek')
  const [query, setQuery] = useState('')
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE)
  const [showAllBezig, setShowAllBezig] = useState(false)

  const changeTypeFilter = (value: CuratedStudy['type'] | null) => {
    setTypeFilter(value)
    setVisibleCount(LIST_PAGE_SIZE)
  }
  const changeRail = (id: string | null) => {
    setRailId(current => (current === id ? null : id))
    setVisibleCount(LIST_PAGE_SIZE)
  }
  const changeQuery = (value: string) => {
    setQuery(value)
    setVisibleCount(LIST_PAGE_SIZE)
  }

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

  const railCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const group of RAIL) {
      for (const item of group.items) counts[item.id] = ENTRIES.filter(item.match).length
    }
    return counts
  }, [])

  const activeRailItem = useMemo(
    () => RAIL.flatMap(group => group.items).find(item => item.id === railId) ?? null,
    [railId],
  )

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return null
    return ENTRIES.filter(entry => entry.haystack.includes(needle))
  }, [query])

  const listEntries = useMemo(() => {
    let filtered = ENTRIES.filter(entry => !typeFilter || entry.study.type === typeFilter)
    if (activeRailItem) filtered = filtered.filter(activeRailItem.match)
    if (sort === 'alfabetisch') {
      return [...filtered].sort((a, b) => a.study.title.localeCompare(b.study.title, 'nl'))
    }
    return filtered
  }, [typeFilter, activeRailItem, sort])

  const startedCount = useMemo(
    () => ENTRIES.filter(entry => {
      const status = statusFor(entry.study)
      return status.started && !status.completed
    }).length,
    [statusFor],
  )
  const completedCount = useMemo(
    () => ENTRIES.filter(entry => statusFor(entry.study).completed).length,
    [statusFor],
  )

  /** Every study in progress, most recently resumed first isn't tracked - catalogue order stands in. */
  const bezigMet = useMemo(
    () => ENTRIES.filter(entry => {
      const status = statusFor(entry.study)
      return status.started && !status.completed
    }),
    [statusFor],
  )
  const bezigVisible = showAllBezig ? bezigMet : bezigMet.slice(0, 3)

  const rows = searchResults ?? listEntries
  const visibleRows = rows.slice(0, visibleCount)

  const listTitle = searchResults
    ? `${searchResults.length} ${searchResults.length === 1 ? 'studie' : 'studies'} gevonden`
    : activeRailItem?.label ?? 'Alle studies'
  const listMeta = searchResults
    ? undefined
    : `${rows.length} ${rows.length === 1 ? 'studie' : 'studies'} · ${rows.reduce((sum, entry) => sum + entry.lessonCount, 0)} lessen`

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
      {/* The filter rail: Oude/Nieuwe testament by genre, plus the studies
          that are not a bible book at all. Collapses above the grid on small
          screens rather than hiding - every row is still one tap away. */}
      <aside className="flex-none md:w-[200px]">
        <nav className="flex flex-col gap-5 md:sticky md:top-0">
          {RAIL.map(group => (
            <div key={group.heading}>
              <div className="px-[2px] text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-faint">
                {group.heading}
              </div>
              <div className="mt-2 flex flex-col gap-[2px]">
                {group.items.map(item => {
                  const active = railId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => changeRail(item.id)}
                      className={[
                        'flex items-center justify-between rounded-btn px-[10px] py-[7px] text-left text-[13.5px] transition-colors',
                        active
                          ? 'bg-[var(--teal-wash)] font-semibold text-teal dark:text-teal-400'
                          : 'text-ink-body hover:bg-line-soft',
                      ].join(' ')}
                    >
                      <span className="truncate">{item.label}</span>
                      <span className="flex-none text-[12px] text-ink-faint">{railCounts[item.id]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {/* Lives inside the sticky nav, not after it: this rail is pinned in
              place for most of the page's scroll (the aside stretches to the
              height of the card grid beside it), so a sibling paragraph placed
              after </nav> would scroll into and stay trapped behind the pinned
              rail - a positioned element always paints over static content -
              instead of merely passing by it. As the rail's own last row it
              scrolls and stays visible together with the filters. */}
          <p className="hidden text-[12px] leading-relaxed text-ink-faint md:block">
            {startedCount} {startedCount === 1 ? 'studie' : 'studies'} begonnen, {completedCount} afgerond van de {ENTRIES.length}.
          </p>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
        {/* Search on the left, the coarse type pills on the right - the same
            row the mock puts them in. */}
        <div className="flex flex-none flex-wrap items-center gap-3">
          <div className="search-field flex h-[46px] w-full max-w-[440px] flex-1 items-center gap-[10px] rounded-[12px] border border-line-strong bg-surface px-[15px] shadow-field">
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
          {/* One chapter, without starting a whole study. */}
          <ChapterStudyPicker />
          <div className="flex flex-none flex-wrap gap-[9px]">
            {TYPE_PILLS.map(item => (
              <Chip
                key={item.label}
                label={item.label}
                active={item.value === typeFilter}
                onClick={() => changeTypeFilter(item.value)}
              />
            ))}
          </div>
        </div>

        {searchResults === null && bezigMet.length > 0 && (
          <div className="flex flex-none flex-col gap-[10px]">
            <div className="flex items-baseline gap-3">
              <span className="text-[13px] font-semibold text-ink">Je bent bezig met</span>
              <span className="text-[12.5px] text-ink-faint">
                {bezigMet.length} {bezigMet.length === 1 ? 'studie' : 'studies'}
              </span>
              <div className="flex-1" />
              {bezigMet.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllBezig(v => !v)}
                  className="text-[13px] font-semibold text-teal no-underline hover:text-teal-dark dark:text-teal-400"
                >
                  {showAllBezig ? 'Minder' : `Alle ${bezigMet.length}`}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {bezigVisible.map(entry => {
                const status = statusFor(entry.study)
                const subtitle = status.resumeDay != null
                  ? `les ${status.resumeDay} van ${entry.lessonCount}`
                  : `${status.done} van ${entry.lessonCount} lessen`
                return (
                  <Link
                    key={entry.study.id}
                    href={`/studie/${entry.study.id}`}
                    data-track="study_resume"
                    className="flex min-w-[240px] flex-1 items-center gap-[13px] rounded-card border border-line bg-surface px-[15px] py-[13px] no-underline transition-colors hover:border-line-strong sm:flex-none sm:basis-[280px]"
                  >
                    <div
                      className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[11px] font-bold text-teal-dark dark:text-teal-400"
                      style={{
                        background: `conic-gradient(var(--teal) 0 ${status.pct}%, var(--line) ${status.pct}% 100%)`,
                      }}
                    >
                      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface">
                        {status.pct}%
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-ink">{entry.study.title}</div>
                      <div className="mt-[2px] truncate text-[12px] text-ink-faint">{subtitle}</div>
                    </div>
                    <span className="flex-none text-[13px] font-semibold text-teal dark:text-teal-400">Verder ›</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-none flex-wrap items-baseline gap-3">
          <h2 className="text-[16px] font-bold text-ink">{listTitle}</h2>
          {listMeta && <span className="text-[12.5px] text-ink-faint">{listMeta}</span>}
          <div className="flex-1" />
          {searchResults === null && (
            <select
              value={sort}
              onChange={event => setSort(event.target.value as 'canoniek' | 'alfabetisch')}
              aria-label="Sorteer studies"
              className="rounded-btn border border-line bg-surface px-3 py-[7px] text-[13px] font-medium text-ink-body outline-none"
            >
              <option value="canoniek">Canonieke volgorde</option>
              <option value="alfabetisch">Alfabetisch</option>
            </select>
          )}
        </div>

        {rows.length === 0 ? (
          <Card className="flex-none">
            <p className="px-[18px] py-6 text-[13.5px] leading-relaxed text-ink-muted">
              {searchResults
                ? `Niets gevonden voor "${query.trim()}". Probeer de naam van een bijbelboek, een persoon of een thema.`
                : 'Geen studie past bij dit filter.'}
            </p>
          </Card>
        ) : (
          <div className="grid flex-none grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleRows.map(entry => (
              <CatalogueCard key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
            ))}
          </div>
        )}

        {rows.length > visibleRows.length && (
          <div className="flex flex-none flex-col items-center gap-[6px] pt-1">
            <button
              type="button"
              onClick={() => setVisibleCount(count => count + LIST_PAGE_SIZE)}
              className="inline-flex h-10 items-center rounded-btn border border-line bg-surface px-5 text-[14px] font-semibold text-teal transition-colors dark:text-teal-400 hover:border-line-strong"
            >
              Meer tonen
            </button>
            <span className="text-[12px] text-ink-faint">
              {visibleRows.length} van {rows.length} getoond
            </span>
          </div>
        )}

        <p className="mt-2 text-[12px] leading-relaxed text-ink-faint md:hidden">
          {startedCount} {startedCount === 1 ? 'studie' : 'studies'} begonnen, {completedCount} afgerond van de {ENTRIES.length}.
        </p>
      </div>
    </div>
  )
}

/**
 * One study in the grid: the genre label and title baked into the banner
 * itself (as the mock draws it), a lesson-count meta line, and the action
 * word beside a progress bar.
 */
function CatalogueCard({ entry, status }: { entry: Entry; status: Status }) {
  const action = status.completed ? 'Herhalen' : status.started ? 'Verder' : 'Start'
  const lessons = `${entry.lessonCount} ${entry.lessonCount === 1 ? 'les' : 'lessen'}`
  const metaRight = status.completed
    ? 'Volledig gelezen'
    : status.resumeDay != null
      ? `les ${status.resumeDay} van ${entry.lessonCount}`
      : `${lessons} · ±${entry.avgMinutes} min`

  return (
    <Link
      href={`/studies/${entry.study.id}`}
      data-track="study_card"
      className="flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface no-underline transition-colors hover:border-line-strong"
    >
      <div className="relative h-[112px] flex-none overflow-hidden">
        <StudyArtwork
          id={entry.study.id}
          kind={entry.study.type}
          ratio={2.1}
          className="h-full w-full"
        />
        {status.completed ? (
          <span className="absolute right-[10px] top-[10px] inline-flex items-center gap-1 rounded-full bg-[var(--success-fill)] px-[8px] py-[3px] text-[10.5px] font-semibold text-white">
            <Check size={11} strokeWidth={2.5} /> Afgerond
          </span>
        ) : status.started ? (
          <span className="absolute right-[10px] top-[10px] rounded-full bg-white/92 px-[8px] py-[3px] text-[10.5px] font-bold text-ink">
            {status.pct}%
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-[9px]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-white/85">{entry.kind}</div>
          <div className="mt-[1px] truncate text-[15px] font-bold text-white">{entry.study.title}</div>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-3 px-[14px] py-[11px]">
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-faint">{metaRight}</span>
        <span className="flex-none text-[13px] font-semibold text-teal dark:text-teal-400">{action} ›</span>
      </div>
    </Link>
  )
}
