'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Search } from 'lucide-react'
import { type CuratedStudy } from '../../../lib/data/curated-studies'
import { BOOK_STUDY_ENTRIES, THEME_STUDIES } from '../../../lib/bookStudies'

const TEAL = '#0D9488'
const COMPLETED_KEY = 'bijbelstudie_completed_studies'

/**
 * Versie B — Cursusgids.
 *
 * Voortgang eerst, dan een enkele verticale lijst met rijke rijen. Leest als
 * een cursuscatalogus: minimale visuele ruis, alles wat je nodig hebt om te
 * kiezen op één regel per studie.
 */
type Group = 'alles' | 'oude-testament' | 'nieuwe-testament' | 'themas'

const GROUPS: { value: Group; label: string }[] = [
  { value: 'alles', label: 'Alles' },
  { value: 'oude-testament', label: 'Oude Testament' },
  { value: 'nieuwe-testament', label: 'Nieuwe Testament' },
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
  study: CuratedStudy
  /** "Wet", "Evangelie", "Thema" — wat voor soort studie dit is, in één woord. */
  kind: string
  group: Exclude<Group, 'alles'>
  /** Geschatte totale duur: som van lesson.estimatedMinutes ?? 12. */
  minutes: number
  haystack: string
}

function totalMinutes(study: CuratedStudy): number {
  return study.lessons.reduce((sum, lesson) => sum + (lesson.estimatedMinutes ?? 12), 0)
}

const ITEMS: Item[] = [
  ...BOOK_STUDY_ENTRIES.map(({ book, study }) => ({
    study,
    kind: book.genre,
    group: (book.testament === 'oude-testament' ? 'oude-testament' : 'nieuwe-testament') as
      | 'oude-testament'
      | 'nieuwe-testament',
    minutes: totalMinutes(study),
    haystack: `${study.title} ${book.name} ${book.genre} ${study.description}`.toLowerCase(),
  })),
  ...THEME_STUDIES.map(study => ({
    study,
    kind: study.type === 'Persoon' ? 'Persoon' : study.type === 'Gedeelte' ? 'Gedeelte' : 'Thema',
    group: 'themas' as const,
    minutes: totalMinutes(study),
    haystack: `${study.title} ${study.description} ${study.lessons
      .map(lesson => lesson.book)
      .join(' ')}`.toLowerCase(),
  })),
]

const COUNTS: Record<Group, number> = {
  alles: ITEMS.length,
  'oude-testament': ITEMS.filter(item => item.group === 'oude-testament').length,
  'nieuwe-testament': ITEMS.filter(item => item.group === 'nieuwe-testament').length,
  themas: ITEMS.filter(item => item.group === 'themas').length,
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  return `${hours} uur`
}

/** Grote voortgangskaart bovenaan: één klik om verder te gaan waar je was. */
function ResumeCard({ item, status }: { item: Item; status: Status }) {
  const { study } = item
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
  const lesson = status.resumeDay ?? status.done + 1

  return (
    <Link
      href={`/studies/${study.id}`}
      data-track="study_resume_card"
      className="no-underline group flex flex-col justify-between gap-4 rounded-2xl border bg-white dark:bg-card p-5 transition-colors hover:border-teal-400"
      style={{ borderColor: 'rgba(13,148,136,0.30)' }}
    >
      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
          {item.kind}
        </span>
        <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-foreground leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
          {study.title}
        </h3>
        <p className="mt-1 text-[13px] text-gray-500 dark:text-muted-foreground line-clamp-2">
          {study.description}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-[12px] font-medium text-gray-600 dark:text-muted-foreground tabular-nums">
          <span>
            Les {lesson} van {status.total}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: TEAL }}
          />
        </div>
        <span
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold"
          style={{ color: TEAL }}
        >
          Verdergaan
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

/** Eén rijke rij in de cursusgids. */
function StudyRow({ item, status }: { item: Item; status: Status }) {
  const { study } = item
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0

  return (
    <Link
      href={`/studies/${study.id}`}
      data-track="study_card"
      className="group no-underline flex items-center gap-4 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card px-4 py-3.5 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[15px] text-gray-900 dark:text-foreground leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors truncate">
            {study.title}
          </h3>
          {status.completed ? (
            <span
              className="flex-none inline-flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: TEAL }}
            >
              <Check size={13} />
              Voltooid
            </span>
          ) : !status.started ? (
            <span className="flex-none rounded-full border border-gray-200 dark:border-border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
              Nieuw
            </span>
          ) : null}
        </div>

        <p className="mt-0.5 text-[13px] text-gray-500 dark:text-muted-foreground truncate">
          {study.description}
        </p>

        <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-gray-400 dark:text-muted-foreground tabular-nums">
          <span className="font-semibold uppercase tracking-wider">{item.kind}</span>
          <span aria-hidden>·</span>
          <span>
            {study.lessons.length} {study.lessons.length === 1 ? 'les' : 'lessen'}
          </span>
          <span aria-hidden>·</span>
          <span>± {formatDuration(item.minutes)}</span>
        </div>

        {status.started && !status.completed && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: TEAL }}
              />
            </div>
            <span
              className="flex-none text-[11px] font-semibold tabular-nums"
              style={{ color: TEAL }}
            >
              {pct}%
            </span>
          </div>
        )}
      </div>

      <ArrowRight
        size={16}
        className="flex-none opacity-30 group-hover:opacity-100 transition-opacity"
        style={{ color: TEAL }}
      />
    </Link>
  )
}

export default function StudiesLabBPage() {
  const [group, setGroup] = useState<Group>('alles')
  const [query, setQuery] = useState('')
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

  const statusFor = useMemo(() => {
    return (study: CuratedStudy): Status => {
      const enrollment = enrollments[study.id]
      const done = enrollment?.lessonsCompleted ?? 0
      return {
        completed: completedIds.includes(study.id) || !!enrollment?.completedAt,
        done,
        total: study.lessons.length,
        resumeDay: enrollment?.currentLessonDay ?? null,
        started: done > 0 || enrollment?.currentLessonDay != null,
      }
    }
  }, [enrollments, completedIds])

  const inProgress = useMemo(
    () =>
      ITEMS.map(item => ({ item, status: statusFor(item.study) })).filter(
        entry => entry.status.started && !entry.status.completed,
      ),
    [statusFor],
  )

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return ITEMS.filter(
      item =>
        (group === 'alles' || item.group === group) &&
        (!needle || item.haystack.includes(needle)),
    )
  }, [group, query])

  const nothingFound = rows.length === 0

  return (
    <div className="px-5 sm:px-8 xl:px-10 py-6 max-w-[1200px] mx-auto">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
          Cursusgids
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500 dark:text-muted-foreground">
          Ga verder waar je gebleven was, of kies een nieuwe studie uit de lijst.
        </p>
      </header>

      {/* Voortgang eerst: grote kaarten met voortgangsbalk en hervat-knop. */}
      <section className="mt-5">
        <h2 className="text-[13px] font-bold text-foreground mb-2.5">Verder waar je was</h2>
        {inProgress.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inProgress.map(({ item, status }) => (
              <ResumeCard key={item.study.id} item={item} status={status} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-gray-500 dark:text-muted-foreground">
            Je bent nog nergens aan begonnen. Kies hieronder een studie en zet vandaag de eerste
            stap.
          </p>
        )}
      </section>

      {/* Cursusgids: linker filterrail (sticky) + één verticale lijst. */}
      <div className="mt-8 flex flex-col md:flex-row md:items-start gap-5">
        <aside className="md:w-56 md:flex-none md:sticky md:top-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none"
            />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Zoek een boek of thema"
              aria-label="Zoek een studie"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter studies"
            className="mt-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible"
          >
            {GROUPS.map(entry => {
              const active = entry.value === group
              return (
                <button
                  key={entry.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGroup(entry.value)}
                  data-track={`study_filter_${entry.value}`}
                  className={`flex-none md:w-full flex items-center justify-between gap-2 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors border ${
                    active
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
                  }`}
                  style={active ? { backgroundColor: TEAL } : undefined}
                >
                  <span>{entry.label}</span>
                  <span className="text-xs opacity-60 tabular-nums">{COUNTS[entry.value]}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {nothingFound ? (
            <p className="text-sm text-gray-500 dark:text-muted-foreground">
              Niets gevonden voor &ldquo;{query.trim()}&rdquo;. Probeer de naam van een bijbelboek.
            </p>
          ) : (
            <>
              <p className="mb-2.5 text-[12px] text-gray-400 dark:text-muted-foreground tabular-nums">
                {rows.length} {rows.length === 1 ? 'studie' : 'studies'}
              </p>
              <div className="flex flex-col gap-2">
                {rows.map(item => (
                  <StudyRow key={item.study.id} item={item} status={statusFor(item.study)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
