'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  GraduationCap,
  ListChecks,
  Play,
  Search,
  Sparkles,
  Target,
  Users,
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
  { label: 'Alles',       value: 'Alle',      hint: 'Alle studies bij elkaar' },
  { label: 'Bijbelboek',  value: 'Boek',      hint: 'Een heel bijbelboek, hoofdstuk voor hoofdstuk' },
  { label: 'Persoon',     value: 'Persoon',   hint: 'Het leven van een bijbelse figuur' },
  { label: 'Gedeelte',    value: 'Gedeelte',  hint: 'Eén gebeurtenis of gedeelte uitgediept' },
  { label: 'Onderwerp',   value: 'Onderwerp', hint: 'Een thema dwars door de Schrift heen' },
]

const TYPE_LABEL: Record<StudyType, string> = {
  Boek: 'Bijbelboek',
  Persoon: 'Persoon',
  Gedeelte: 'Gedeelte',
  Onderwerp: 'Onderwerp',
}

/** The three steps every guided study follows, shown once at the top. */
const HOW_IT_WORKS: { icon: typeof Compass; title: string; body: string }[] = [
  {
    icon: Compass,
    title: '1 · Kies een studie',
    body: 'Filter op bijbelboek, persoon, gedeelte of thema, of zoek op een trefwoord. Elke kaart laat zien wat je gaat leren en hoe lang het duurt.',
  },
  {
    icon: GraduationCap,
    title: '2 · Volg korte lessen',
    body: 'Elke les leidt je in vijf stappen door het gedeelte: lezen, verdiepen met uitleg en grondtekst, reflecteren en een korte toets.',
  },
  {
    icon: Target,
    title: '3 · Houd je voortgang bij',
    body: 'Je plek wordt automatisch bewaard. Ga verder waar je was, op elk apparaat, in je eigen tempo.',
  },
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
}

/** Which books a study walks through, for the line under the title. */
function scopeLine(study: CuratedStudy): string {
  const books = [...new Set(study.lessons.map(lesson => lesson.book))]
  if (books.length === 1) return books[0]
  if (books.length === 2) return `${books[0]} en ${books[1]}`
  return `${books[0]}, ${books[1]} en ${books.length - 2} meer`
}

/**
 * "Wat je leert", per card.
 *
 * Uses the authored `outcomes` when a study has them; only one study did at the
 * time of writing, so the fallback is the lesson arc itself - the titles are
 * written as a sequence ("Het lege graf" -> "Mijn Heer en mijn God" -> ...) and
 * reading the first few tells you exactly what the study covers.
 */
function learningPreview(study: CuratedStudy): { label: string; items: string[]; total: number } {
  if (study.outcomes && study.outcomes.length > 0) {
    return { label: 'Wat je leert', items: study.outcomes, total: study.outcomes.length }
  }
  return {
    label: 'Lessen in het kort',
    items: study.lessons.map(lesson => lesson.title),
    total: study.lessons.length,
  }
}

/**
 * One study in the catalogue.
 *
 * No cover image. The banners were decorative SVGs that carried no information
 * about the study and took the top third of every card. What is left is what
 * someone actually chooses on: what kind of study it is, what it is called, what
 * you will learn, which books it walks through, and how long it takes.
 */
function StudyCard({ study, status }: { study: CuratedStudy; status: Status }) {
  const minutes = estimateStudyMinutes(study)
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
  const started = status.done > 0 || status.resumeDay != null
  const learn = learningPreview(study)
  const shown = learn.items.slice(0, 4)

  return (
    <Link
      href={`/studies/${study.id}`}
      data-track="study_card"
      className="lift group no-underline flex flex-col rounded-2xl border bg-white dark:bg-card p-5 transition-colors border-gray-200 dark:border-border hover:border-teal-400 dark:hover:border-teal-700"
    >
      {/* Type and state. The one row that is the same on every card, so the
          eye can compare them without reading. */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: 'rgba(13,148,136,0.10)', color: '#0F766E' }}
        >
          {TYPE_LABEL[study.type]}
        </span>
        {status.completed ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEAL }}>
            <CheckCircle2 size={12} /> Voltooid
          </span>
        ) : started ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEAL }}>
            <Play size={10} /> Bezig
          </span>
        ) : null}
      </div>

      <h3 className="font-bold text-base text-gray-900 dark:text-foreground leading-snug mb-1.5 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
        {study.title}
      </h3>
      <p className="text-[13px] text-gray-500 dark:text-muted-foreground leading-relaxed line-clamp-2">
        {study.description}
      </p>

      {/* What you'll learn - the reason this redesign exists. Either the
          authored outcomes, or the lesson arc as a stand-in. */}
      <div className="mt-4 rounded-xl border border-gray-100 dark:border-border/60 bg-gray-50/70 dark:bg-secondary/30 p-3">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mb-2">
          {learn.label === 'Wat je leert' ? <Target size={12} /> : <ListChecks size={12} />}
          {learn.label}
        </p>
        <ul className="space-y-1.5">
          {shown.map((item, index) => (
            <li key={index} className="flex gap-2 text-[12.5px] leading-snug text-foreground/80">
              <span
                className="mt-1.5 h-1 w-1 flex-none rounded-full"
                style={{ backgroundColor: TEAL }}
              />
              <span className="min-w-0 line-clamp-1">{item}</span>
            </li>
          ))}
        </ul>
        {learn.total > shown.length && (
          <p className="mt-1.5 text-[11px] text-gray-400 dark:text-muted-foreground">
            + {learn.total - shown.length} meer
          </p>
        )}
      </div>

      {/* Everything below is pinned to the bottom so the CTA lines up across
          the grid however tall the text above turned out. */}
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-gray-400 dark:text-muted-foreground">
          <span className="inline-flex items-center gap-1 min-w-0">
            <BookOpen size={12} className="flex-none" />
            <span className="truncate">{scopeLine(study)}</span>
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <ListChecks size={12} /> {study.lessons.length} lessen
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> ± {minutes} min
          </span>
        </div>

        {started && !status.completed && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-foreground">
                Les {status.resumeDay ?? status.done + 1} van {status.total}
              </span>
              <span className="text-gray-400 dark:text-muted-foreground tabular-nums">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
            </div>
          </div>
        )}

        {/* teal-600 is #0D9488 exactly, so the hover fill matches the brand
            colour used inline everywhere else without an arbitrary value. */}
        <span className="mt-3 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-semibold border border-teal-600 text-teal-700 dark:text-teal-400 transition-colors group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600">
          {status.completed ? 'Opnieuw bekijken' : started ? 'Verder gaan' : 'Bekijk studie'}
          <ArrowRight size={13} />
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

  const activeHint = FILTERS.find(entry => entry.value === filter)?.hint ?? ''

  return (
    <div className="h-full overflow-y-auto">
      <JsonLd data={STUDIES_GRAPH} />

      <div className="px-5 sm:px-8 xl:px-10 py-8 max-w-[1400px] mx-auto">

        {/* Hero. The h1 carries the phrase people search for; the search box
            lives inside it because "how do I find a study" is the first
            question someone has on this page. */}
        <header className="rounded-2xl border border-teal-200/60 dark:border-teal-900/40 bg-gradient-to-br from-teal-50/80 via-white to-white dark:from-teal-950/25 dark:via-card dark:to-card p-6 sm:p-8">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-2" style={{ color: TEAL }}>
            <Sparkles size={13} /> Bijbelstudie
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground mb-2">
            Begeleide bijbelstudies
          </h1>
          <p className="text-gray-600 dark:text-muted-foreground text-sm sm:text-[15px] max-w-2xl leading-relaxed">
            Kies een bijbelboek, een persoon, een gedeelte of een thema. Elke studie is opgedeeld in
            korte lessen die je stap voor stap door de tekst leiden - lezen, verdiepen, reflecteren
            en toetsen.
          </p>

          <div className="relative mt-5 max-w-xl">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Zoek op boek, persoon, gedeelte of thema"
              aria-label="Zoek een studie"
              className="w-full h-12 pl-11 pr-3 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
            />
          </div>
        </header>

        {/* How guided studies work + the pointer to studying together. */}
        <section className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-4"
              >
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg mb-2.5"
                  style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
                >
                  <Icon size={15} style={{ color: TEAL }} />
                </span>
                <p className="text-[13px] font-bold text-foreground mb-1">{title}</p>
                <p className="text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/groepen"
            data-track="sidebar_groepen"
            className="no-underline mt-3 flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-4 transition-colors hover:border-teal-300 dark:hover:border-teal-700"
          >
            <span
              className="h-9 w-9 flex-none rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
            >
              <Users size={16} style={{ color: TEAL }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-foreground">Samen studeren?</span>
              <span className="block text-[12.5px] text-gray-500 dark:text-muted-foreground">
                Maak een studiegroep aan en lees hetzelfde gedeelte met je groep, met een wekelijkse
                opdracht en gedeelde notities.
              </span>
            </span>
            <ArrowRight size={15} className="flex-none opacity-40" style={{ color: TEAL }} />
          </Link>
        </section>

        {/* Resume strip. Only rendered when there is something to resume, so it
            never occupies space with an empty state. */}
        {inProgress.length > 0 && (
          <section className="mt-8">
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

        {/* Filter toolbar. The category buttons carry a one-line explanation of
            what that kind of study is, shown for whichever is active. */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
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
                  className={`h-9 px-3.5 rounded-lg text-[13px] font-medium transition-colors border ${
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

          <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-gray-400 dark:text-muted-foreground">
            <p>{activeHint}</p>
            <p className="flex-none tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'studie' : 'studies'}
            </p>
          </div>
        </section>

        {/* Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
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
