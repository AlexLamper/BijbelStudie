'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ListChecks,
  Play,
  Search,
  Sparkles,
} from 'lucide-react'
import { curatedStudies, type StudyType, type CuratedStudy } from '../../lib/data/curated-studies'
import { estimateStudyMinutes } from '../../lib/studyFlow'
import { JsonLd } from '../../components/seo/JsonLd'
import { absoluteUrl } from '../../lib/seo/constants'
import {
  graph,
  webPageNode,
  itemListNode,
  courseNode,
} from '../../lib/seo/structuredData'

const TEAL = '#0D9488'
const COMPLETED_KEY = 'bijbelstudie_completed_studies'

/**
 * Each curated study is a Course, opened from its own detail page. The `anchor`
 * keeps the @id values distinct; duplicates would collapse into one node.
 */
const STUDIES_GRAPH = (() => {
  const url = absoluteUrl('/studies')
  return graph(
    webPageNode({
      path: '/studies',
      name: 'Begeleide bijbelstudies',
      description:
        'Begeleide bijbelstudies over bijbelboeken, personen, thema\'s en gedeelten. Stap voor stap door de Schrift, gratis te volgen.',
      type: 'CollectionPage',
    }),
    itemListNode({
      pageUrl: url,
      name: 'Begeleide bijbelstudies',
      items: curatedStudies.map(study => ({
        name: study.title,
        path: `/studies/${study.id}`,
        description: study.description,
      })),
    }),
    ...curatedStudies.map(study =>
      courseNode({
        name: study.title,
        description: study.description,
        path: `/studies/${study.id}`,
        lessonCount: study.lessons.length,
        // Not the card banner: that is a 320x120 decorative SVG, well under the
        // size Google expects from a Course image. /og renders a real 1200x630
        // PNG carrying this study's title.
        image: `/og?${new URLSearchParams({ title: study.title, subtitle: study.description }).toString()}`,
        anchor: study.id,
      })
    )
  )
})()

/**
 * The catalogue's own words for each category.
 *
 * "Boek", "Persoon" and the rest are the data's labels, not a reader's question.
 * Someone arriving here is thinking "ik wil Daniël bestuderen", so each filter
 * says what you would actually get.
 */
const FILTERS: { label: string; value: StudyType | 'Alle'; hint: string }[] = [
  { label: 'Alles',       value: 'Alle',      hint: 'Elke studie' },
  { label: 'Bijbelboek',  value: 'Boek',      hint: 'Een heel bijbelboek, hoofdstuk voor hoofdstuk' },
  { label: 'Persoon',     value: 'Persoon',   hint: 'Het leven van een bijbelse figuur' },
  { label: 'Gedeelte',    value: 'Gedeelte',  hint: 'Eén gebeurtenis of gedeelte uitgediept' },
  { label: 'Onderwerp',   value: 'Onderwerp', hint: 'Een thema door de Schrift heen' },
]

const TYPE_LABEL: Record<StudyType, string> = {
  Boek: 'Bijbelboek',
  Persoon: 'Persoon',
  Gedeelte: 'Gedeelte',
  Onderwerp: 'Onderwerp',
}

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
}

/** Which books a study walks through, for the line under the title. */
function scopeLine(study: CuratedStudy): string {
  const books = [...new Set(study.lessons.map(lesson => lesson.book))]
  if (books.length === 1) return books[0]
  if (books.length === 2) return `${books[0]} en ${books[1]}`
  return `${books[0]}, ${books[1]} en ${books.length - 2} meer`
}

function StudyCard({ study, status }: { study: CuratedStudy; status: Status }) {
  const minutes = estimateStudyMinutes(study)
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
  const started = status.done > 0 || status.resumeDay != null

  return (
    <Link
      href={`/studies/${study.id}`}
      className="lift group no-underline flex flex-col rounded-2xl border bg-white dark:bg-card overflow-hidden transition-colors border-gray-200 dark:border-border hover:border-teal-300 dark:hover:border-teal-700"
    >
      {/* Cover */}
      <div className="relative h-24 flex-none overflow-hidden bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={study.image}
          alt=""
          aria-hidden
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span
          className="absolute top-2.5 left-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(13,148,136,0.92)' }}
        >
          {TYPE_LABEL[study.type]}
        </span>
        {status.completed && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-teal-700">
            <CheckCircle2 size={10} /> Voltooid
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-bold text-[15px] text-gray-900 dark:text-foreground leading-snug mb-1 group-hover:text-teal-600 transition-colors">
          {study.title}
        </h3>
        <p className="text-[11px] font-medium mb-2" style={{ color: TEAL }}>
          {scopeLine(study)}
        </p>
        <p className="text-[13px] text-gray-500 dark:text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {study.description}
        </p>

        <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500 dark:text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ListChecks size={12} /> {study.lessons.length} lessen
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> ± {minutes} min
          </span>
        </div>

        {/* Progress only once there is progress: an empty bar on every card
            makes a catalogue look like a to-do list. */}
        {started && !status.completed && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold" style={{ color: TEAL }}>
                Les {status.resumeDay ?? status.done + 1} van {status.total}
              </span>
              <span className="text-gray-400 dark:text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
            </div>
          </div>
        )}

        <span
          className="mt-3.5 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-semibold text-white transition-opacity group-hover:opacity-90"
          style={{ backgroundColor: TEAL }}
        >
          {status.completed ? (
            <>Opnieuw bekijken <ArrowRight size={13} /></>
          ) : started ? (
            <><Play size={12} /> Verder gaan</>
          ) : (
            <>Bekijk studie <ArrowRight size={13} /></>
          )}
        </span>
      </div>
    </Link>
  )
}

export default function StudiesPage() {
  const [filter, setFilter] = useState<StudyType | 'Alle'>('Alle')
  const [query, setQuery] = useState('')
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})

  useEffect(() => {
    // localStorage first so the badges paint immediately, then the server -
    // which is the real record and knows about other devices.
    try {
      const stored = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]')
      setCompletedIds(stored)
    } catch { /* noop */ }

    let cancelled = false

    void (async () => {
      try {
        const response = await fetch('/api/v1/study-progress')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const fromServer: string[] = data.completedStudies ?? []
        setCompletedIds(current => [...new Set([...current, ...fromServer])])
      } catch { /* offline: the local list stands */ }
    })()

    void (async () => {
      try {
        const response = await fetch('/api/v1/study-enrollments')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const map: Record<string, Enrollment> = {}
        for (const entry of data.enrollments ?? []) map[entry.studyId] = entry
        setEnrollments(map)
      } catch { /* anonymous visitors simply see no progress */ }
    })()

    return () => { cancelled = true }
  }, [])

  const statusFor = useMemo(() => {
    return (study: CuratedStudy): Status => {
      const enrollment = enrollments[study.id]
      return {
        completed: completedIds.includes(study.id) || !!enrollment?.completedAt,
        done: enrollment?.lessonsCompleted ?? 0,
        total: study.lessons.length,
        resumeDay: enrollment?.currentLessonDay ?? null,
      }
    }
  }, [enrollments, completedIds])

  const inProgress = useMemo(
    () =>
      curatedStudies.filter(study => {
        const status = statusFor(study)
        return !status.completed && (status.done > 0 || status.resumeDay != null)
      }),
    [statusFor],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    // Book studies first. They are the longest commitment and the thing people
    // arrive looking for ("ik wil Daniël bestuderen"); buried at the end of the
    // grid they read as an afterthought.
    const ordered = [...curatedStudies].sort(
      (a, b) => Number(b.type === 'Boek') - Number(a.type === 'Boek'),
    )
    return ordered.filter(study => {
      if (filter !== 'Alle' && study.type !== filter) return false
      if (!needle) return true
      const haystack = [
        study.title,
        study.description,
        ...study.lessons.map(lesson => `${lesson.title} ${lesson.book}`),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [filter, query])

  return (
    <div className="h-full overflow-y-auto">
      <JsonLd data={STUDIES_GRAPH} />

      <div className="px-5 sm:px-8 xl:px-10 py-8 max-w-[1400px] mx-auto">

        {/* Header. The h1 carries the phrase people actually search for -
            "Studies" alone told Google nothing about the page. */}
        <header className="mb-7">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: TEAL }}>
            <Sparkles size={13} /> Bijbelstudie
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground mb-2">
            Begeleide bijbelstudies
          </h1>
          <p className="text-gray-500 dark:text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Kies een bijbelboek, een persoon of een thema. Elke studie is opgedeeld in korte lessen
            die je in vijf stappen door het gedeelte leiden: lezen, verdiepen, reflecteren en toetsen.
          </p>
        </header>

        {/* Resume strip. Only rendered when there is something to resume, so it
            never occupies space with an empty state. */}
        {inProgress.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-foreground mb-2.5">Verder waar je was</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {inProgress.map(study => {
                const status = statusFor(study)
                const pct = Math.round((status.done / status.total) * 100)
                return (
                  <Link
                    key={study.id}
                    href={`/studies/${study.id}`}
                    className="no-underline group flex items-center gap-3 rounded-xl border p-3 bg-white dark:bg-card transition-colors hover:border-teal-300 dark:hover:border-teal-700"
                    style={{ borderColor: 'rgba(13,148,136,0.30)' }}
                  >
                    <span
                      className="h-10 w-10 flex-none rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
                    >
                      <Play size={15} style={{ color: TEAL }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground truncate">
                        {study.title}
                      </span>
                      <span className="block text-[11px] text-gray-500 dark:text-muted-foreground">
                        Les {status.resumeDay ?? status.done + 1} van {status.total} &middot; {pct}% klaar
                      </span>
                      <span className="mt-1.5 block h-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
                      </span>
                    </span>
                    <ArrowRight size={15} className="flex-none opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: TEAL }} />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Search + filter */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
          <div className="relative lg:w-72 flex-none">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Zoek op boek, persoon of thema"
              aria-label="Zoek een studie"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map(entry => {
              const active = filter === entry.value
              const count =
                entry.value === 'Alle'
                  ? curatedStudies.length
                  : curatedStudies.filter(study => study.type === entry.value).length
              return (
                <button
                  key={entry.value}
                  onClick={() => setFilter(entry.value)}
                  title={entry.hint}
                  aria-pressed={active}
                  className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors border ${
                    active
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
                  }`}
                  style={active ? { backgroundColor: TEAL } : undefined}
                >
                  {entry.label}
                  <span className="ml-1.5 text-xs opacity-60">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map(study => (
            <StudyCard key={study.id} study={study} status={statusFor(study)} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="content-in flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={32} className="mb-3 text-gray-300" />
            <p className="text-gray-500 dark:text-muted-foreground">
              Geen studie gevonden{query ? ` voor "${query}"` : ''}.
            </p>
            {(query || filter !== 'Alle') && (
              <button
                onClick={() => { setQuery(''); setFilter('Alle') }}
                className="mt-3 text-sm font-semibold"
                style={{ color: TEAL }}
              >
                Alles tonen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
