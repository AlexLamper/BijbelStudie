'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Search } from 'lucide-react'
import { curatedStudies, type CuratedStudy } from '../../../lib/data/curated-studies'
import { BOOK_STUDY_ENTRIES, THEME_STUDIES } from '../../../lib/bookStudies'

// Secret admin-only redesign sandbox — Versie C, "Commandobalk".
// Fast, minimal, power-user: one command-palette bar filters the whole
// catalogue as you type, facet chips narrow it, results are a dense table.
// Renders inside the lab layout's <div className="flex-1 min-h-0 overflow-y-auto">.

const TEAL = '#0D9488'
const COMPLETED_KEY = 'bijbelstudie_completed_studies'

type Group = 'oude-testament' | 'nieuwe-testament' | 'themas'

const GROUP_TABS: { value: Group | 'alles'; label: string }[] = [
  { value: 'alles', label: 'Alles' },
  { value: 'oude-testament', label: 'OT' },
  { value: 'nieuwe-testament', label: 'NT' },
  { value: 'themas', label: "Thema's" },
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
}

interface Item {
  id: string
  title: string
  book: string | null
  genre: string
  group: Group
  lessons: number
  haystack: string
}

const ITEMS: Item[] = [
  ...BOOK_STUDY_ENTRIES.map(({ book, study }): Item => ({
    id: study.id,
    title: study.title,
    book: book.name,
    genre: book.genre,
    group: book.testament === 'oude-testament' ? 'oude-testament' : 'nieuwe-testament',
    lessons: study.lessons.length,
    haystack: `${study.title} ${book.name} ${book.genre} ${study.description}`.toLowerCase(),
  })),
  ...THEME_STUDIES.map((study: CuratedStudy): Item => ({
    id: study.id,
    title: study.title,
    book: null,
    genre: study.type === 'Persoon' ? 'Persoon' : study.type === 'Gedeelte' ? 'Gedeelte' : 'Thema',
    group: 'themas',
    lessons: study.lessons.length,
    haystack: `${study.title} ${study.description} ${study.lessons
      .map(lesson => lesson.book)
      .join(' ')}`.toLowerCase(),
  })),
]

const STUDY_BY_ID: Record<string, CuratedStudy> = (() => {
  const map: Record<string, CuratedStudy> = {}
  for (const { study } of BOOK_STUDY_ENTRIES) map[study.id] = study
  for (const study of curatedStudies) map[study.id] = study
  return map
})()

function matchesText(item: Item, needle: string): boolean {
  return !needle || item.haystack.includes(needle)
}

export default function StudiesLabCPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<Group | 'alles'>('alles')
  const [genre, setGenre] = useState<string | null>(null)
  const [active, setActive] = useState(0)

  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]')
      setCompletedIds(stored)
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
        const map: Record<string, Enrollment> = {}
        for (const entry of data.enrollments ?? []) map[entry.studyId] = entry
        setEnrollments(map)
      } catch {
        /* anonymous visitors simply see no progress */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const statusFor = useMemo(() => {
    return (id: string): Status => {
      const study = STUDY_BY_ID[id]
      const total = study?.lessons.length ?? 0
      const enrollment = enrollments[id]
      const done = enrollment?.lessonsCompleted ?? 0
      return {
        completed: completedIds.includes(id) || !!enrollment?.completedAt,
        done,
        total,
        resumeDay: enrollment?.currentLessonDay ?? null,
        started: done > 0 || enrollment?.currentLessonDay != null,
      }
    }
  }, [enrollments, completedIds])

  const needle = query.trim().toLowerCase()

  // Testament tab counts reflect the current text query only.
  const groupCounts = useMemo(() => {
    const counts: Record<Group | 'alles', number> = {
      alles: 0,
      'oude-testament': 0,
      'nieuwe-testament': 0,
      themas: 0,
    }
    for (const item of ITEMS) {
      if (!matchesText(item, needle)) continue
      counts.alles += 1
      counts[item.group] += 1
    }
    return counts
  }, [needle])

  // Genre chips + counts, scoped to the active testament tab and text query.
  const genreFacets = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of ITEMS) {
      if (group !== 'alles' && item.group !== group) continue
      if (!matchesText(item, needle)) continue
      counts.set(item.genre, (counts.get(item.genre) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [group, needle])

  const results = useMemo(() => {
    return ITEMS.filter(item => {
      if (group !== 'alles' && item.group !== group) return false
      if (genre && item.genre !== genre) return false
      return matchesText(item, needle)
    })
  }, [group, genre, needle])

  const resume = useMemo(
    () =>
      ITEMS.map(item => ({ item, status: statusFor(item.id) }))
        .filter(entry => entry.status.started && !entry.status.completed)
        .slice(0, 12),
    [statusFor],
  )

  // Keep active row valid and in view; reset when the filter set changes.
  useEffect(() => {
    setActive(0)
  }, [needle, group, genre])

  const resultsRef = useRef<Item[]>(results)
  resultsRef.current = results
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement !== inputRef.current) {
        event.preventDefault()
        inputRef.current?.focus()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive(current => Math.min(current + 1, Math.max(resultsRef.current.length - 1, 0)))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive(current => Math.max(current - 1, 0))
      } else if (event.key === 'Enter') {
        const item = resultsRef.current[activeRef.current]
        if (item) router.push(`/studies/${item.id}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const row = document.querySelector<HTMLElement>(`[data-row="${active}"]`)
    row?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-5">
      {/* Commandobalk. One field, autofocused, filters everything live. */}
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Zoek in alle studies — titel, bijbelboek, genre, omschrijving"
          aria-label="Zoek in alle studies"
          className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-16 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:border-border dark:bg-card dark:text-foreground"
          style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.40)' }}
        />
        <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-400 dark:border-border dark:text-muted-foreground">
          /
        </kbd>
      </div>

      {/* Facetten: eerst het testament, dan het genre. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {GROUP_TABS.map(tab => {
          const isActive = tab.value === group
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setGroup(tab.value)
                setGenre(null)
              }}
              aria-pressed={isActive}
              className={`h-8 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'border-transparent text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-secondary'
              }`}
              style={isActive ? { backgroundColor: TEAL } : undefined}
            >
              {tab.label}
              <span className="ml-1.5 text-[11px] tabular-nums opacity-60">
                {groupCounts[tab.value]}
              </span>
            </button>
          )
        })}

        <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-border" aria-hidden />

        {genreFacets.map(([name, count]) => {
          const isActive = genre === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => setGenre(isActive ? null : name)}
              aria-pressed={isActive}
              className={`h-8 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors ${
                isActive
                  ? 'border-transparent text-white'
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-secondary'
              }`}
              style={isActive ? { backgroundColor: TEAL } : undefined}
            >
              {name}
              <span className="ml-1 text-[11px] tabular-nums opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Verder waar je was — één beknopte regel met chips, geen kaarten. */}
      {resume.length > 0 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="flex-none text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
            Verder
          </span>
          {resume.map(({ item, status }) => {
            const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
            return (
              <Link
                key={item.id}
                href={`/studies/${item.id}`}
                className="flex-none rounded-lg border px-2.5 py-1 text-[12px] font-medium text-gray-700 no-underline transition-colors hover:border-teal-400 dark:text-foreground"
                style={{ borderColor: 'rgba(13,148,136,0.35)' }}
              >
                {item.title}
                <span className="ml-1.5 tabular-nums" style={{ color: TEAL }}>
                  {pct}%
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Resultaten: dichte, tabelvormige rijen. */}
      <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-gray-400 dark:text-muted-foreground">
        <span className="tabular-nums">{results.length} studies</span>
        <span className="hidden sm:inline">
          Pijltjes om te bladeren, Enter om te openen, / om te zoeken
        </span>
      </div>

      {results.length === 0 ? (
        <p className="mt-8 px-1 text-sm text-gray-500 dark:text-muted-foreground">
          Niets gevonden{needle ? ` voor “${query.trim()}”` : ''}. Pas de zoekterm of de
          facetten aan.
        </p>
      ) : (
        <div className="mt-1.5 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-border dark:border-border">
          {results.map((item, index) => {
            const status = statusFor(item.id)
            const pct =
              status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
            const isActive = index === active
            return (
              <Link
                key={item.id}
                href={`/studies/${item.id}`}
                data-row={index}
                onMouseEnter={() => setActive(index)}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-l-2 px-3 py-2 no-underline transition-colors sm:grid-cols-[minmax(0,1fr)_8rem_5.5rem_3.5rem]"
                style={{
                  borderLeftColor: isActive ? TEAL : 'transparent',
                  backgroundColor: isActive ? 'rgba(13,148,136,0.09)' : undefined,
                }}
              >
                <span className="min-w-0 truncate text-[13.5px] font-medium text-gray-900 dark:text-foreground">
                  {item.title}
                  {item.book && item.book !== item.title && (
                    <span className="ml-1.5 text-[12px] font-normal text-gray-400 dark:text-muted-foreground">
                      {item.book}
                    </span>
                  )}
                </span>

                <span className="hidden text-[11.5px] uppercase tracking-wider text-gray-400 dark:text-muted-foreground sm:block sm:truncate">
                  {item.genre}
                </span>

                <span className="hidden text-right text-[12px] tabular-nums text-gray-400 dark:text-muted-foreground sm:block">
                  {item.lessons} {item.lessons === 1 ? 'les' : 'lessen'}
                </span>

                <span className="flex items-center justify-end text-[11.5px] font-semibold tabular-nums">
                  {status.completed ? (
                    <CheckCircle2 size={14} style={{ color: TEAL }} />
                  ) : status.started ? (
                    <span style={{ color: TEAL }}>{pct}%</span>
                  ) : (
                    <span className="text-gray-300 dark:text-muted-foreground" aria-hidden>
                      –
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
