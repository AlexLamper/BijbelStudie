'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock, Search } from 'lucide-react'
import type { CuratedStudy } from '../../lib/data/curated-studies'
import { CATALOGUE_ENTRIES } from '../../lib/bookStudies'
import { SectionHeading } from '../../components/scene/pieces'
import { EYEBROW, PANEL, TEAL_ON_DARK } from '../../components/scene/tokens'
import StudyArtwork from './StudyArtwork'

const COMPLETED_KEY = 'bijbelstudie_completed_studies'

// ---------------------------------------------------------------------------
// This page is the desktop counterpart of the mobile app's "Studies" screen
// (bijbelstudie-app · features/studies/present/studies_screen.dart). Same
// elements, same order, same wording: a heading, the Ontdek/Mijn studies/Voltooid
// tabs, a featured carousel, a topic grid, a kind-filter pill row, then the
// list. Only the surface changes - it is now the shared immersive scene, so
// every colour here is a literal white or black rather than a theme token,
// which would flip with the reader's light/dark setting while the landscape
// behind it does not.
// ---------------------------------------------------------------------------

type Category = 'ot' | 'nt' | 'personen' | 'themas'

const CATEGORY_LABELS: Record<Category, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  personen: 'Personen',
  themas: "Thema's",
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

/** The heading over the list, per tab. A list of records is never unlabelled. */
const TAB_TITLES: Record<Tab, string> = {
  discover: 'Alle studies',
  mine: 'Mijn studies',
  completed: 'Voltooid',
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

/** The featured carousel: the hand-authored studies, the ones with a written
 * intro that a large card can actually fill. */
const FEATURED: Entry[] = ENTRIES.filter(
  entry => entry.study.type !== 'Boek' || (entry.study.about?.length ?? 0) > 0,
).slice(0, 8)

// The catalogue only ever holds the four authored kinds plus the generated
// book studies, which is exactly what lib/studyArt.ts draws from.
const artKind = (study: CuratedStudy) => study.type

/**
 * One study, as a row on the landscape.
 *
 * A ledger line rather than a card: hairline-divided rows read as a list of
 * records, and seventy-seven boxes on a picture read as a page that lost its
 * picture. The artwork is composed at the ratio of the box it lands in - the
 * old 96x64 thumbnail `object-cover`-cropped a 16:6 drawing by about a third.
 */
function StudyRow({ entry, status }: { entry: Entry; status: Status }) {
  const action = status.completed ? 'Opnieuw' : status.started ? 'Verder' : 'Start'
  return (
    <li className="min-w-0 list-none border-b border-white/10">
      <Link
        href={`/studies/${entry.study.id}`}
        data-track="study_card"
        className="group -mx-2 flex items-center gap-4 rounded-lg px-2 py-3.5 no-underline outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white"
      >
        <StudyArtwork
          id={entry.study.id}
          kind={artKind(entry.study)}
          ratio={1.6}
          quiet
          className="h-[70px] w-28 flex-none rounded-lg"
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-snug text-white">
            {entry.study.title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] tabular-nums text-white/60">
            <span>
              {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'}
            </span>
            <span className="inline-flex items-center gap-1">
              {/* The clock names the number as a duration; it is not decoration. */}
              <Clock size={11} aria-hidden /> ±{entry.avgMinutes} min
            </span>
          </span>

          {status.completed ? (
            <span className="mt-1.5 block text-[11.5px] font-semibold" style={{ color: TEAL_ON_DARK }}>
              Voltooid
            </span>
          ) : status.started ? (
            <span className="mt-2 block max-w-[240px]">
              <span className="block h-1 overflow-hidden rounded-full bg-white/15">
                <span
                  className="block h-full rounded-full transition-all"
                  style={{ width: `${status.pct}%`, backgroundColor: TEAL_ON_DARK }}
                />
              </span>
              <span className="mt-1 block text-[11px] tabular-nums text-white/60">
                les {status.resumeDay ?? status.done + 1} van {status.total}
              </span>
            </span>
          ) : (
            <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
              {entry.kind}
            </span>
          )}
        </span>

        <span className="flex flex-none items-center gap-1.5 text-[13px] font-semibold text-white/80 transition-colors group-hover:text-white">
          {action}
          <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  )
}

/**
 * Everything on /studies that answers to a click.
 *
 * The page itself is a server component: it renders the scene, the JSON-LD and
 * the heading, and hands that heading in here as `children` so the copy a
 * crawler reads is in the served HTML rather than produced by hydration.
 */
export default function StudiesBrowser({ children }: { children: React.ReactNode }) {
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

  const showFurniture = searchResults === null && tab === 'discover'
  const filtersOn = category !== null || kind !== null
  const clearFilters = () => {
    setCategory(null)
    setKind(null)
  }

  const sectionTitle = category ? CATEGORY_LABELS[category] : TAB_TITLES[tab]
  const sectionEyebrow = filtersOn ? 'Gefilterd' : tab === 'discover' ? 'De hele Bijbel' : 'Jouw studies'

  return (
    <>
      {/* -- Layer 1: the sky ------------------------------------------ */}
      {/* Deliberately NOT a full screen tall, unlike the sky on /studies/[id].
          A detail page holds one decision and can spend a screen framing it; a
          catalogue's job is to show studies, and a `min-h-[100vh-3.5rem]` block
          with `pb-32` under it meant a reader had to scroll before the first
          study existed. The heading, the search and the tabs now cost what they
          measure, so on a 1280x720 laptop the topic grid and the top of the
          featured row are already on screen. The scene classes stay: the parallax
          is what makes this a sky, not the height. */}
      <section
        id="studies-hero"
        aria-labelledby="studies-titel"
        className="flex flex-col justify-center pb-6 pt-5 sm:pt-7"
      >
        <div className="scene-sky w-full max-w-[46rem]">
          {children}

          {/* The search sits with the heading rather than in a toolbar: it is
              the fastest way through seventy-seven studies and the reader who
              already knows what they want should not have to scroll to it. */}
          <div className="relative mt-6 w-full max-w-[26rem]">
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50"
            />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Zoek een bijbelboek, persoon of thema"
              aria-label="Zoek een studie"
              className="h-11 w-full rounded-full border border-white/25 bg-black/40 pl-10 pr-4 text-sm text-white placeholder:text-white/50 outline-none backdrop-blur-md transition-colors focus-visible:border-white/50 focus-visible:ring-2 focus-visible:ring-white"
            />
          </div>

          {searchResults === null && (
            <div className="mt-4 flex flex-wrap gap-2">
              {TABS.map(item => {
                const active = item.value === tab
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTab(item.value)}
                    data-track={`study_tab_${item.value}`}
                    aria-pressed={active}
                    className={`press rounded-full border px-4 py-1.5 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${
                      active
                        ? 'border-transparent bg-white text-gray-900'
                        : 'border-white/25 text-white/75 hover:border-white/45 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {searchResults !== null ? (
        /* A search replaces the page: the reader already told you what they
           want, so the browsing aids are noise. */
        <section aria-labelledby="studies-zoek" className="pb-24 pt-2">
          <SectionHeading
            id="studies-zoek"
            eyebrow="Zoekresultaten"
            title={`${searchResults.length} ${searchResults.length === 1 ? 'studie' : 'studies'} gevonden`}
            rule
          />
          {searchResults.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Niets gevonden voor &ldquo;{query.trim()}&rdquo;. Probeer de naam van een bijbelboek,
              een persoon of een thema.
            </p>
          ) : (
            <ul className="m-0 mt-1 grid grid-cols-1 gap-x-10 p-0 xl:grid-cols-2">
              {searchResults.map(entry => (
                <StudyRow key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {/* -- Layer 2: the horizon ---------------------------------- */}
          {showFurniture && (
            <section aria-labelledby="studies-onderdelen" className="scene-horizon">
              <h2 id="studies-onderdelen" className={EYEBROW}>
                Waar wil je lezen?
              </h2>
              <div className="stagger-in mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => {
                  const active = category === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(active ? null : key)}
                      data-track={`study_topic_${key}`}
                      aria-pressed={active}
                      className={`press px-5 py-3.5 text-left shadow-lg shadow-black/20 outline-none transition-colors hover:bg-black/55 focus-visible:ring-2 focus-visible:ring-white ${PANEL}`}
                      /* Inline rather than a second `bg-*` class: two Tailwind
                         utilities for the same property have equal specificity,
                         so which one won would depend on stylesheet order. */
                      style={
                        active
                          ? { backgroundColor: 'rgba(0,0,0,0.62)', borderColor: TEAL_ON_DARK }
                          : undefined
                      }
                    >
                      <span className={`${EYEBROW} block text-white/70`}>{CATEGORY_LABELS[key]}</span>
                      <span className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-2xl font-semibold tabular-nums text-white xl:text-3xl">
                          {COUNTS[key]}
                        </span>
                        <span className="text-xs text-white/75">studies</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* -- Layer 3: the desk ------------------------------------- */}
          <div className={showFurniture ? 'pb-24 pt-6' : 'pb-24 pt-4'}>
            {showFurniture && FEATURED.length > 0 && (
              <section aria-labelledby="studies-uitgelicht" className="pb-8">
                <SectionHeading
                  id="studies-uitgelicht"
                  title="Uitgelicht"
                  subtitle="Studies met een geschreven inleiding, om mee te beginnen."
                  rule
                />
                <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
                  {FEATURED.map(entry => (
                    <Link
                      key={entry.study.id}
                      href={`/studies/${entry.study.id}`}
                      data-track="study_featured_card"
                      className={`press group flex w-[280px] flex-none flex-col overflow-hidden no-underline outline-none transition-colors hover:bg-black/55 focus-visible:ring-2 focus-visible:ring-white ${PANEL}`}
                    >
                      <StudyArtwork
                        id={entry.study.id}
                        kind={artKind(entry.study)}
                        ratio={16 / 9}
                        className="aspect-[16/9] w-full"
                      />
                      <span className="block p-4">
                        <span className="block truncate text-[15px] font-semibold text-white">
                          {entry.study.title}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-white/70">
                          {entry.study.description}
                        </span>
                        <span className="mt-2.5 flex items-center gap-2.5 text-[11px] tabular-nums text-white/55">
                          <span>
                            {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={10} aria-hidden /> ±{entry.avgMinutes} min
                          </span>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {showFurniture && (
              <div className="flex flex-wrap gap-2 pb-6">
                {KINDS.map(item => {
                  const active = item.value === kind
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setKind(item.value)}
                      data-track={`study_kind_${item.value ?? 'all'}`}
                      aria-pressed={active}
                      className={`press rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${
                        active
                          ? 'border-white/45 bg-white/15 text-white'
                          : 'border-white/20 text-white/65 hover:border-white/40 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )}

            <section aria-labelledby="studies-lijst">
              <SectionHeading
                id="studies-lijst"
                eyebrow={sectionEyebrow}
                title={sectionTitle}
                rule
                action={
                  filtersOn ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-md text-xs font-semibold no-underline outline-none transition-opacity hover:underline focus-visible:ring-2 focus-visible:ring-white"
                      style={{ color: TEAL_ON_DARK }}
                    >
                      Alles bekijken
                    </button>
                  ) : undefined
                }
              />

              {listEntries.length === 0 ? (
                <p className="mt-4 text-sm leading-relaxed text-white/70">
                  {tab === 'mine'
                    ? 'Nog geen studie begonnen. Kies er een bij Ontdek en begin.'
                    : tab === 'completed'
                      ? 'Nog niets afgerond. Zodra je alle lessen van een studie afrondt, staat die hier.'
                      : 'Geen studie past bij deze filters.'}
                </p>
              ) : (
                <ul className="m-0 mt-1 grid grid-cols-1 gap-x-10 p-0 xl:grid-cols-2">
                  {listEntries.map(entry => (
                    <StudyRow key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
