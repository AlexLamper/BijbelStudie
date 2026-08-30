'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Search } from 'lucide-react'
import { curatedStudies, type CuratedStudy } from '../../lib/data/curated-studies'
import { estimateStudyMinutes, formatStudyMinutes } from '../../lib/studyFlow'
import { BOOK_STUDY_ENTRIES, THEME_STUDIES } from '../../lib/bookStudies'
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
 * Only the hand-authored studies are described here.
 *
 * The sixty-six generated book studies are not thin duplicates of each other,
 * but they ARE near-duplicates of /bijbelboeken/[slug], which is the indexable
 * surface for a book's own content. Listing both would split the same subject
 * across two URLs and let Google pick; the study pages are marked non-indexable
 * instead, so they are deliberately absent from this graph and the sitemap.
 */
const STUDIES_GRAPH = (() => {
  const url = absoluteUrl('/studies')
  return graph(
    webPageNode({
      path: '/studies',
      name: 'Bijbelstudies',
      description:
        'Bijbelstudies over elk bijbelboek, plus studies over personen, thema\'s en gedeelten. Stap voor stap door de Schrift, gratis te volgen.',
      type: 'CollectionPage',
    }),
    itemListNode({
      pageUrl: url,
      name: 'Bijbelstudies',
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
 * One catalogue, four views of it.
 *
 * There is no longer a "begeleide studies" mode beside a "bijbelboeken" mode.
 * Every book IS a study - same flow, same lesson list, same detail page - so
 * splitting them was a distinction the reader had to decode before they could
 * start. What is left is a way to narrow sixty-six books down, plus the themed
 * studies that are not a book at all.
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

/** A catalogue row: the study, plus the words underneath it. */
interface Item {
  study: CuratedStudy
  /** "Wet", "Evangelie", "Thema" - what kind of thing this is, in one word. */
  kind: string
  group: Exclude<Group, 'alles'>
  /** Everything a search should match, lowercased once at module load. */
  haystack: string
}

const ITEMS: Item[] = [
  ...BOOK_STUDY_ENTRIES.map(({ book, study }) => ({
    study,
    kind: book.genre,
    group: (book.testament === 'oude-testament' ? 'oude-testament' : 'nieuwe-testament') as
      | 'oude-testament'
      | 'nieuwe-testament',
    haystack: `${study.title} ${book.name} ${book.genre} ${study.description}`.toLowerCase(),
  })),
  ...THEME_STUDIES.map(study => ({
    study,
    kind: study.type === 'Persoon' ? 'Persoon' : study.type === 'Gedeelte' ? 'Gedeelte' : 'Thema',
    group: 'themas' as const,
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

const SECTION_TITLES: Record<Exclude<Group, 'alles'>, string> = {
  'oude-testament': 'Oude Testament',
  'nieuwe-testament': 'Nieuwe Testament',
  themas: "Thema's",
}

/**
 * One study in the catalogue.
 *
 * Four lines, the same four on every card, so sixty-six of them can be scanned
 * rather than read: what kind of book it is, what it is called, what it is
 * about, and what it costs you in lessons and time. Anything else - the banner
 * art, the type badge, a call-to-action button repeating the link the whole card
 * already is - was texture between the reader and their choice.
 */
function StudyCard({ item, status }: { item: Item; status: Status }) {
  const { study } = item
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0

  return (
    <Link
      href={`/studies/${study.id}`}
      data-track="study_card"
      className="lift group no-underline flex flex-col rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-3.5 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
          {item.kind}
        </span>
        {status.completed ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: TEAL }}
          >
            <CheckCircle2 size={12} /> Voltooid
          </span>
        ) : status.started ? (
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: TEAL }}>
            {pct}%
          </span>
        ) : null}
      </div>

      <h3 className="mt-1 font-bold text-[15px] text-gray-900 dark:text-foreground leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
        {study.title}
      </h3>
      <p className="mt-1 text-[12.5px] text-gray-500 dark:text-muted-foreground leading-relaxed line-clamp-2">
        {study.description}
      </p>

      {/* Pinned to the bottom so the numbers line up across the grid however
          long the description turned out. */}
      <div className="mt-auto pt-3 text-[11.5px] text-gray-400 dark:text-muted-foreground tabular-nums">
        {study.lessons.length} {study.lessons.length === 1 ? 'les' : 'lessen'} · ±{' '}
        {formatStudyMinutes(estimateStudyMinutes(study))}
      </div>

      {status.started && !status.completed && (
        <div className="mt-2 h-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: TEAL }}
          />
        </div>
      )}
    </Link>
  )
}

export default function StudiesPage() {
  const [group, setGroup] = useState<Group>('alles')
  const [query, setQuery] = useState('')
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})

  useEffect(() => {
    // localStorage first so the badges paint immediately, then the server -
    // which is the real record and knows about other devices.
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

  /** Studies with progress, newest section of the page: carry on beats browse. */
  const inProgress = useMemo(
    () =>
      ITEMS.map(item => ({ item, status: statusFor(item.study) })).filter(
        entry => entry.status.started && !entry.status.completed,
      ),
    [statusFor],
  )

  /** Sections to render, in reading order, after the filter and the search. */
  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const order: Exclude<Group, 'alles'>[] =
      group === 'alles' ? ['oude-testament', 'nieuwe-testament', 'themas'] : [group]

    return order
      .map(value => ({
        value,
        title: SECTION_TITLES[value],
        items: ITEMS.filter(
          item => item.group === value && (!needle || item.haystack.includes(needle)),
        ),
      }))
      .filter(section => section.items.length > 0)
  }, [group, query])

  const nothingFound = sections.length === 0

  return (
    <div className="h-full overflow-y-auto">
      <JsonLd data={STUDIES_GRAPH} />

      <div className="px-5 sm:px-8 xl:px-10 py-6 max-w-[1400px] mx-auto">
        {/* Header. One row on desktop: what this page is on the left, the way
            to find something on the right. It used to be a tinted hero panel
            with an eyebrow, a heading, a three-line paragraph and a full-width
            search field - about 240px of chrome before the first study. */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
              Bijbelstudies
            </h1>
            <p className="mt-0.5 text-[13px] text-gray-500 dark:text-muted-foreground">
              Kies een bijbelboek of een thema. Elke studie leidt je hoofdstuk voor hoofdstuk door
              de tekst.
            </p>
          </div>

          <div className="relative w-full sm:w-72 flex-none">
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
        </header>

        {/* Resume strip. A returning reader is here to carry on, not to browse,
            so it sits above the catalogue - and disappears entirely when there
            is nothing to resume rather than holding an empty state. */}
        {inProgress.length > 0 && (
          <section className="mt-5">
            <h2 className="text-[13px] font-bold text-foreground mb-2">Verder waar je was</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {inProgress.map(({ item, status }) => {
                const pct = Math.round((status.done / status.total) * 100)
                return (
                  <Link
                    key={item.study.id}
                    href={`/studies/${item.study.id}`}
                    data-track="study_resume_card"
                    className="no-underline group flex items-center gap-3 rounded-xl border p-3 bg-white dark:bg-card transition-colors hover:border-teal-400"
                    style={{ borderColor: 'rgba(13,148,136,0.30)' }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground truncate">
                        {item.study.title}
                      </span>
                      <span className="block text-[11px] text-gray-500 dark:text-muted-foreground tabular-nums">
                        Les {status.resumeDay ?? status.done + 1} van {status.total} · {pct}% klaar
                      </span>
                      <span className="mt-1.5 block h-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: TEAL }}
                        />
                      </span>
                    </span>
                    <ArrowRight
                      size={15}
                      className="flex-none opacity-40 group-hover:opacity-100 transition-opacity"
                      style={{ color: TEAL }}
                    />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Filters. Counts on the buttons, because "hoeveel zijn er" is the
            question the labels raise. */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {GROUPS.map(entry => {
            const active = entry.value === group
            return (
              <button
                key={entry.value}
                onClick={() => setGroup(entry.value)}
                aria-pressed={active}
                data-track={`study_filter_${entry.value}`}
                className={`h-9 px-3.5 rounded-lg text-[13px] font-medium transition-colors border ${
                  active
                    ? 'text-white border-transparent'
                    : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
                }`}
                style={active ? { backgroundColor: TEAL } : undefined}
              >
                {entry.label}
                <span className="ml-1.5 text-xs opacity-60 tabular-nums">
                  {COUNTS[entry.value]}
                </span>
              </button>
            )
          })}
        </div>

        {nothingFound ? (
          <p className="mt-8 text-sm text-gray-500 dark:text-muted-foreground">
            Niets gevonden voor &ldquo;{query.trim()}&rdquo;. Probeer de naam van een bijbelboek.
          </p>
        ) : (
          sections.map(section => (
            <section key={section.value} className="mt-6">
              {/* The heading is dropped when a filter already names the section:
                  repeating "Oude Testament" under a pressed button labelled
                  "Oude Testament" is a line that tells the reader nothing. */}
              {group === 'alles' && (
                <h2 className="text-[13px] font-bold text-foreground mb-2.5">
                  {section.title}
                  <span className="ml-1.5 font-medium text-gray-400 dark:text-muted-foreground tabular-nums">
                    {section.items.length}
                  </span>
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {section.items.map(item => (
                  <StudyCard key={item.study.id} item={item} status={statusFor(item.study)} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
