'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Quote,
  ScrollText,
  Search,
  User,
} from 'lucide-react'
import { curatedStudies, type CuratedStudy } from '../../lib/data/curated-studies'
import { CATALOGUE_ENTRIES } from '../../lib/bookStudies'
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
        image: `/og?${new URLSearchParams({ title: study.title, subtitle: study.description }).toString()}`,
        anchor: study.id,
      })
    )
  )
})()

// ---------------------------------------------------------------------------
// This page is the desktop counterpart of the mobile app's "Studies" screen
// (bijbelstudie-app · features/studies/present/studies_screen.dart). Same
// elements, same order, same wording: a header, the Ontdek/Mijn studies/Voltooid
// tabs, a featured carousel, a topic grid, a kind-filter pill row, then the
// list. Only the scale changes - wider container, more columns, larger cards.
// ---------------------------------------------------------------------------

type Category = 'ot' | 'nt' | 'personen' | 'themas'

const CATEGORY_LABELS: Record<Category, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  personen: 'Personen',
  themas: "Thema's",
}

const CATEGORY_ICON: Record<Category, typeof BookOpen> = {
  ot: ScrollText,
  nt: BookOpen,
  personen: User,
  themas: Lightbulb,
}

/** The kind pill row. `null` is "Alle"; the rest are study `type` values. */
const KINDS: { value: CuratedStudy['type'] | null; label: string }[] = [
  { value: null, label: 'Alle' },
  { value: 'Boek', label: 'Bijbelboeken' },
  { value: 'Persoon', label: 'Personen' },
  { value: 'Gedeelte', label: 'Gedeelten' },
  { value: 'Onderwerp', label: "Thema's" },
]

type Tab = 'discover' | 'mine' | 'completed'

const TABS: { value: Tab; label: string }[] = [
  { value: 'discover', label: 'Ontdek' },
  { value: 'mine', label: 'Mijn studies' },
  { value: 'completed', label: 'Voltooid' },
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
  category: Category
  lessonCount: number
  avgMinutes: number
  /** Everything a search should match, lowercased once at module load. */
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

const COUNTS: Record<Category, number> = {
  ot: ENTRIES.filter(entry => entry.category === 'ot').length,
  nt: ENTRIES.filter(entry => entry.category === 'nt').length,
  personen: ENTRIES.filter(entry => entry.category === 'personen').length,
  themas: ENTRIES.filter(entry => entry.category === 'themas').length,
}

/** The featured carousel: the hand-authored studies, the ones with real art and
 * a written intro that a large card can actually fill. */
const FEATURED: Entry[] = ENTRIES.filter(
  entry => entry.study.type !== 'Boek' || (entry.study.about?.length ?? 0) > 0,
).slice(0, 8)

const BANNER_ICON = (type: CuratedStudy['type']) =>
  type === 'Persoon' ? User : type === 'Gedeelte' ? Quote : type === 'Boek' ? BookOpen : Lightbulb

/** A stable hue per study id. The catalogue only ships eight genre images shared
 * across sixty-six book studies, so a raw <img> makes the list look like the
 * same card printed over and over. Instead every study gets its own generated
 * panel: a deterministic two-stop gradient, the type icon, and the title's
 * initial - unique enough to tell apart at a glance, no art needed. */
function hueOf(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

// ---------------------------------------------------------------------------

/** The generated panel on every study card. `art` lets a study with genuine
 * hand-authored art (the featured ones) show it instead. */
function Banner({
  entry,
  className = '',
  art = false,
  showLetter = false,
}: {
  entry: Entry
  className?: string
  art?: boolean
  showLetter?: boolean
}) {
  const Icon = BANNER_ICON(entry.study.type)
  const hue = hueOf(entry.study.id)
  const authored = art && entry.study.type !== 'Boek' && entry.study.image

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 45% 32%), hsl(${(hue + 40) % 360} 55% 18%))`,
      }}
    >
      {authored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.study.image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {!authored && showLetter && (
        <span className="select-none text-2xl font-black text-white/90">
          {entry.study.title.trim().charAt(0).toUpperCase()}
        </span>
      )}
      {!authored && (
        <Icon className="absolute bottom-2 right-3 text-white/25" size={26} aria-hidden />
      )}
    </div>
  )
}

/** One study, as a row: banner thumbnail, title, the two facts that help a
 * reader choose (lessons, minutes), then progress or the kind, then the action.
 * The mobile `_StudyRow`, widened. */
function StudyRow({ entry, status }: { entry: Entry; status: Status }) {
  const action = status.completed ? 'Opnieuw' : status.started ? 'Verder' : 'Start'
  return (
    <Link
      href={`/studies/${entry.study.id}`}
      data-track="study_card"
      className="group no-underline flex items-stretch gap-3 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-3 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
    >
      <Banner entry={entry} showLetter className="h-16 w-16 flex-none rounded-lg" />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
          {entry.study.title}
        </h3>
        <p className="mt-0.5 text-[12px] text-gray-400 dark:text-muted-foreground tabular-nums">
          {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'} · ±{entry.avgMinutes} min
        </p>

        {status.completed ? (
          <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: TEAL }}>
            <CheckCircle2 size={13} /> Voltooid
          </p>
        ) : status.started ? (
          <div className="mt-1.5 max-w-[240px]">
            <div className="h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${status.pct}%`, backgroundColor: TEAL }}
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-muted-foreground tabular-nums">
              les {status.resumeDay ?? status.done + 1} van {status.total}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-[12px] font-medium" style={{ color: TEAL }}>
            {entry.kind}
          </p>
        )}
      </div>

      <div className="flex flex-none items-center">
        <span
          className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity group-hover:opacity-90"
          style={{ backgroundColor: TEAL }}
        >
          {action}
        </span>
      </div>
    </Link>
  )
}

/** eyebrow + title, with an optional "clear the filters" action on the right. */
function SectionHeader({
  eyebrow,
  title,
  onClear,
}: {
  eyebrow: string
  title: string
  onClear?: () => void
}) {
  return (
    <div className="mt-8 flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEAL }}>
          {eyebrow}
        </p>
        <h2 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-foreground">{title}</h2>
      </div>
      {onClear && (
        <button
          onClick={onClear}
          className="flex-none text-[13px] font-medium text-gray-500 dark:text-muted-foreground hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
        >
          Alles bekijken
        </button>
      )}
    </div>
  )
}

export default function StudiesPage() {
  const [tab, setTab] = useState<Tab>('discover')
  const [category, setCategory] = useState<Category | null>(null)
  const [kind, setKind] = useState<CuratedStudy['type'] | null>(null)
  const [query, setQuery] = useState('')
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})

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

  /** The list under the discovery furniture: the chosen tab, narrowed by the
   * topic grid and the kind pills. */
  const listEntries = useMemo(() => {
    return ENTRIES.filter(entry => {
      if (category && entry.category !== category) return false
      if (kind && entry.study.type !== kind) return false
      if (tab === 'discover') return true
      const status = statusFor(entry.study)
      if (tab === 'mine') return status.started && !status.completed
      return status.completed
    })
  }, [tab, category, kind, statusFor])

  const searchField = (
    <div className="relative w-full sm:w-72 flex-none">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none"
      />
      <input
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Zoek een bijbelboek, persoon of thema"
        aria-label="Zoek een studie"
        className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
        style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
      />
    </div>
  )

  const showFurniture = searchResults === null && tab === 'discover'
  const filtersOn = category !== null || kind !== null
  const clearFilters = () => {
    setCategory(null)
    setKind(null)
  }

  const sectionTitle = category ? CATEGORY_LABELS[category] : 'Alle studies'
  const sectionEyebrow = filtersOn ? 'Gefilterd' : 'De hele Bijbel'

  return (
    <div className="h-full overflow-y-auto">
      <JsonLd data={STUDIES_GRAPH} />

      <div className="w-full px-5 sm:px-8 xl:px-10 py-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-foreground">
            Studies
          </h1>
          {searchField}
        </header>

        {searchResults !== null ? (
          /* A search replaces the page: the reader already told you what they
             want, so the browsing aids are noise. */
          <section className="mt-6">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-muted-foreground">
                Niets gevonden voor &ldquo;{query.trim()}&rdquo;. Probeer de naam van een bijbelboek,
                een persoon of een thema.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {searchResults.map(entry => (
                  <StudyRow key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Tabs */}
            <div className="mt-5 flex flex-wrap gap-2">
              {TABS.map(item => {
                const active = item.value === tab
                return (
                  <button
                    key={item.value}
                    onClick={() => setTab(item.value)}
                    data-track={`study_tab_${item.value}`}
                    className="rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors"
                    style={
                      active
                        ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff' }
                        : { borderColor: 'rgb(229 231 235)', color: 'rgb(75 85 99)' }
                    }
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            {showFurniture && (
              <>
                {/* Featured carousel */}
                {FEATURED.length > 0 && (
                  <section className="mt-6">
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {FEATURED.map(entry => (
                        <Link
                          key={entry.study.id}
                          href={`/studies/${entry.study.id}`}
                          data-track="study_featured_card"
                          className="group no-underline flex w-[300px] flex-none flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card transition-colors hover:border-teal-400 dark:hover:border-teal-700"
                        >
                          <Banner entry={entry} art showLetter className="h-[104px] w-full" />
                          <div className="p-4">
                            <h3 className="truncate text-[15px] font-bold text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                              {entry.study.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-gray-500 dark:text-muted-foreground">
                              {entry.study.description}
                            </p>
                            <p className="mt-2 text-[11px] text-gray-400 dark:text-muted-foreground tabular-nums">
                              {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'} · ±
                              {entry.avgMinutes} min
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Topic grid */}
                <section className="mt-8">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-muted-foreground">
                    Waar wil je lezen?
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                    {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => {
                      const Icon = CATEGORY_ICON[key]
                      const active = category === key
                      return (
                        <button
                          key={key}
                          onClick={() => setCategory(active ? null : key)}
                          data-track={`study_topic_${key}`}
                          className="flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors"
                          style={{
                            borderColor: active ? TEAL : 'rgb(229 231 235)',
                            backgroundColor: active ? 'rgba(13,148,136,0.08)' : 'transparent',
                          }}
                        >
                          <Icon size={18} style={{ color: TEAL }} aria-hidden />
                          <span className="text-[14px] font-semibold text-gray-900 dark:text-foreground">
                            {CATEGORY_LABELS[key]}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-muted-foreground tabular-nums">
                            {COUNTS[key]} studies
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Kind pill row */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {KINDS.map(item => {
                    const active = item.value === kind
                    return (
                      <button
                        key={item.label}
                        onClick={() => setKind(item.value)}
                        data-track={`study_kind_${item.value ?? 'all'}`}
                        className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors"
                        style={{
                          borderColor: active ? TEAL : 'rgb(229 231 235)',
                          backgroundColor: active ? 'rgba(13,148,136,0.08)' : 'transparent',
                          color: active ? '#0f766e' : 'rgb(75 85 99)',
                        }}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {showFurniture && (
              <SectionHeader
                eyebrow={sectionEyebrow}
                title={sectionTitle}
                onClear={filtersOn ? clearFilters : undefined}
              />
            )}

            {/* The list */}
            <section className="mt-4 pb-16">
              {listEntries.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-muted-foreground">
                  {tab === 'mine'
                    ? 'Nog geen studie begonnen. Kies er een bij Ontdek en begin.'
                    : tab === 'completed'
                      ? 'Nog niets afgerond. Zodra je alle lessen van een studie afrondt, staat die hier.'
                      : 'Geen studie past bij deze filters.'}
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {listEntries.map(entry => (
                    <StudyRow key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
