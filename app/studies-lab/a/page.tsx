'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Search } from 'lucide-react'
import { type CuratedStudy } from '../../../lib/data/curated-studies'
import { BOOK_STUDY_ENTRIES, THEME_STUDIES } from '../../../lib/bookStudies'

const TEAL = '#0D9488'
const COMPLETED_KEY = 'bijbelstudie_completed_studies'

/**
 * Versie A — Boekenplank.
 *
 * De Bijbel als fysieke plank: elk boek een smalle rug, de ruggen in de
 * volgorde waarin ze in de Schrift staan, gegroepeerd per genre. Het doel is
 * plaatsgeheugen — je onthoudt niet alleen dát Habakuk bestaat, maar waar hij
 * staat: rechts op de plank met de kleine profeten, vlak voor Zefanja.
 */

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

/** De tien planken, in leesvolgorde van de Schrift. */
type ShelfId =
  | 'wet'
  | 'geschiedenis-ot'
  | 'poezie'
  | 'grote-profeten'
  | 'kleine-profeten'
  | 'evangelien'
  | 'handelingen'
  | 'brieven-paulus'
  | 'algemene-brieven'
  | 'openbaring'

interface Shelf {
  id: ShelfId
  label: string
  /** Rustige tint voor de band en de linkerrand van elke rug. */
  band: string
  text: string
}

const SHELVES: Shelf[] = [
  { id: 'wet', label: 'Wet', band: 'rgba(180,83,9,0.14)', text: '#b45309' },
  { id: 'geschiedenis-ot', label: 'Geschiedenis', band: 'rgba(120,53,15,0.14)', text: '#78350f' },
  { id: 'poezie', label: 'Poëzie en wijsheid', band: 'rgba(109,40,217,0.14)', text: '#6d28d9' },
  { id: 'grote-profeten', label: 'Grote profeten', band: 'rgba(30,64,175,0.14)', text: '#1e40af' },
  { id: 'kleine-profeten', label: 'Kleine profeten', band: 'rgba(2,132,199,0.14)', text: '#0369a1' },
  { id: 'evangelien', label: 'Evangeliën', band: 'rgba(13,148,136,0.16)', text: '#0f766e' },
  { id: 'handelingen', label: 'Handelingen', band: 'rgba(4,120,87,0.14)', text: '#047857' },
  { id: 'brieven-paulus', label: 'Brieven van Paulus', band: 'rgba(190,24,93,0.14)', text: '#be185d' },
  { id: 'algemene-brieven', label: 'Algemene brieven', band: 'rgba(157,23,77,0.14)', text: '#9d174d' },
  { id: 'openbaring', label: 'Openbaring', band: 'rgba(153,27,27,0.16)', text: '#991b1b' },
]

const SHELF_BY_ID = new Map(SHELVES.map(shelf => [shelf.id, shelf]))

/** De brieven die aan Paulus worden toegeschreven; de rest is een algemene brief. */
const PAULINE = new Set([
  'Romeinen',
  '1 Corinthiërs',
  '2 Corinthiërs',
  'Galaten',
  'Efeziërs',
  'Filippenzen',
  'Colossenzen',
  '1 Thessalonicenzen',
  '2 Thessalonicenzen',
  '1 Timotheüs',
  '2 Timotheüs',
  'Titus',
  'Filémon',
])

function shelfFor(book: { name: string; genre: string; testament: string }): ShelfId {
  if (book.testament === 'oude-testament') {
    switch (book.genre) {
      case 'Wet':
        return 'wet'
      case 'Geschiedenis':
        return 'geschiedenis-ot'
      case 'Poëzie en wijsheid':
        return 'poezie'
      case 'Kleine profeten':
        return 'kleine-profeten'
      // Grote profeten plus Klaagliederen/Daniël, die als 'Apocalyptiek' staan.
      default:
        return 'grote-profeten'
    }
  }
  if (book.genre === 'Evangelie') return 'evangelien'
  if (book.name === 'Handelingen') return 'handelingen'
  if (book.genre === 'Apocalyptiek') return 'openbaring'
  return PAULINE.has(book.name) ? 'brieven-paulus' : 'algemene-brieven'
}

/** Eén rug op de plank: een bijbelboek, met alles waarop gezocht mag worden. */
interface Spine {
  study: CuratedStudy
  bookName: string
  genre: string
  shelf: ShelfId
  haystack: string
}

const SPINES: Spine[] = BOOK_STUDY_ENTRIES.map(({ book, study }) => ({
  study,
  bookName: book.name,
  genre: book.genre,
  shelf: shelfFor(book),
  haystack: `${study.title} ${book.name} ${book.genre} ${study.description}`.toLowerCase(),
}))

interface ThemeItem {
  study: CuratedStudy
  kind: string
  haystack: string
}

const THEMES: ThemeItem[] = THEME_STUDIES.map(study => ({
  study,
  kind: study.type === 'Persoon' ? 'Persoon' : study.type === 'Gedeelte' ? 'Gedeelte' : 'Thema',
  haystack: `${study.title} ${study.description} ${study.lessons
    .map(lesson => lesson.book)
    .join(' ')}`.toLowerCase(),
}))

function SpineTile({
  study,
  bookName,
  shelf,
  status,
}: {
  study: CuratedStudy
  bookName: string
  shelf: Shelf
  status: Status
}) {
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0

  return (
    <Link
      href={`/studies/${study.id}`}
      data-track="study_spine"
      title={`${bookName} — ${study.lessons.length} ${
        study.lessons.length === 1 ? 'les' : 'lessen'
      }`}
      className="group no-underline flex w-[104px] flex-col justify-between overflow-hidden rounded-md border border-l-4 border-gray-200 dark:border-border bg-white dark:bg-card px-2.5 py-2 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
      style={{ borderLeftColor: shelf.text, minHeight: 108 }}
    >
      <span className="flex items-start justify-between gap-1">
        <span className="text-[12.5px] font-semibold leading-tight text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
          {bookName}
        </span>
        {status.completed ? (
          <Check size={13} className="mt-0.5 flex-none" style={{ color: TEAL }} />
        ) : status.started ? (
          <span
            className="mt-0.5 flex-none text-[9.5px] font-bold tabular-nums"
            style={{ color: TEAL }}
          >
            {pct}%
          </span>
        ) : null}
      </span>

      <span className="mt-1 flex flex-col gap-1">
        <span className="text-[9.5px] uppercase tracking-wider text-gray-400 dark:text-muted-foreground tabular-nums">
          {study.lessons.length} {study.lessons.length === 1 ? 'les' : 'lessen'}
        </span>
        {status.started && !status.completed && (
          <span className="block h-0.5 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
            <span
              className="block h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: TEAL }}
            />
          </span>
        )}
      </span>
    </Link>
  )
}

export default function StudiesLabVersionA() {
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
        /* offline: de lokale lijst blijft staan */
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
        /* anonieme bezoekers zien simpelweg geen voortgang */
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
      [...SPINES.map(spine => spine.study), ...THEMES.map(theme => theme.study)]
        .map(study => ({ study, status: statusFor(study) }))
        .filter(entry => entry.status.started && !entry.status.completed),
    [statusFor],
  )

  const needle = query.trim().toLowerCase()

  const shelves = useMemo(() => {
    return SHELVES.map(shelf => ({
      shelf,
      spines: SPINES.filter(
        spine => spine.shelf === shelf.id && (!needle || spine.haystack.includes(needle)),
      ),
    })).filter(entry => entry.spines.length > 0)
  }, [needle])

  const themes = useMemo(
    () => THEMES.filter(theme => !needle || theme.haystack.includes(needle)),
    [needle],
  )

  const bookCount = shelves.reduce((sum, entry) => sum + entry.spines.length, 0)
  const nothingFound = bookCount === 0 && themes.length === 0

  return (
    <div className="px-5 sm:px-8 xl:px-10 py-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
            De boekenplank
          </h1>
          <p className="mt-0.5 text-[13px] text-gray-500 dark:text-muted-foreground">
            Alle 66 boeken op hun eigen plek, in de volgorde van de Schrift. Kies een rug om die
            studie te openen.
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

      {/* Verder waar je was — voor wie terugkomt om door te gaan, niet te bladeren. */}
      {inProgress.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[13px] font-bold text-foreground mb-2">Verder waar je was</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {inProgress.map(({ study, status }) => {
              const pct = Math.round((status.done / status.total) * 100)
              return (
                <Link
                  key={study.id}
                  href={`/studies/${study.id}`}
                  data-track="study_resume_card"
                  className="no-underline group flex items-center gap-3 rounded-xl border p-3 bg-white dark:bg-card transition-colors hover:border-teal-400"
                  style={{ borderColor: 'rgba(13,148,136,0.30)' }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">
                      {study.title}
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

      {/* Plankindex: sprong naar een plank, en tegelijk de kaart van waar alles staat. */}
      {!nothingFound && (
        <nav className="mt-5 flex flex-wrap gap-1.5">
          {shelves.map(({ shelf, spines }) => (
            <a
              key={shelf.id}
              href={`#plank-${shelf.id}`}
              className="no-underline inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-medium text-gray-600 dark:text-muted-foreground transition-colors hover:text-foreground"
              style={{ backgroundColor: shelf.band }}
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: shelf.text }}
              />
              {shelf.label}
              <span className="tabular-nums opacity-60">{spines.length}</span>
            </a>
          ))}
        </nav>
      )}

      {nothingFound ? (
        <p className="mt-8 text-sm text-gray-500 dark:text-muted-foreground">
          Niets gevonden voor &ldquo;{query.trim()}&rdquo;. Probeer de naam van een bijbelboek.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {shelves.map(({ shelf, spines }) => (
            <section
              key={shelf.id}
              id={`plank-${shelf.id}`}
              className="scroll-mt-4 rounded-xl border border-gray-200 dark:border-border bg-gray-50/60 dark:bg-card/40 p-3"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-4 w-1.5 rounded-full"
                  style={{ backgroundColor: shelf.text }}
                />
                <h2
                  className="text-[12px] font-bold uppercase tracking-wider"
                  style={{ color: shelf.text }}
                >
                  {shelf.label}
                </h2>
                <span className="text-[11px] font-medium text-gray-400 dark:text-muted-foreground tabular-nums">
                  {spines.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {spines.map(spine => (
                  <SpineTile
                    key={spine.study.id}
                    study={spine.study}
                    bookName={spine.bookName}
                    shelf={shelf}
                    status={statusFor(spine.study)}
                  />
                ))}
              </div>
            </section>
          ))}

          {themes.length > 0 && (
            <section
              id="plank-themas"
              className="scroll-mt-4 rounded-xl border border-gray-200 dark:border-border bg-gray-50/60 dark:bg-card/40 p-3"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-4 w-1.5 rounded-full"
                  style={{ backgroundColor: TEAL }}
                />
                <h2
                  className="text-[12px] font-bold uppercase tracking-wider"
                  style={{ color: TEAL }}
                >
                  Thema&apos;s
                </h2>
                <span className="text-[11px] font-medium text-gray-400 dark:text-muted-foreground tabular-nums">
                  {themes.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {themes.map(({ study, kind }) => {
                  const status = statusFor(study)
                  const pct =
                    status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
                  return (
                    <Link
                      key={study.id}
                      href={`/studies/${study.id}`}
                      data-track="study_theme"
                      className="group no-underline flex flex-col gap-1.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card px-3 py-2.5 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[13.5px] font-semibold leading-snug text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                          {study.title}
                        </span>
                        {status.completed ? (
                          <Check size={14} className="mt-0.5 flex-none" style={{ color: TEAL }} />
                        ) : status.started ? (
                          <span
                            className="mt-0.5 flex-none text-[10.5px] font-semibold tabular-nums"
                            style={{ color: TEAL }}
                          >
                            {pct}%
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[12px] text-gray-500 dark:text-muted-foreground line-clamp-2">
                        {study.description}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10.5px] text-gray-400 dark:text-muted-foreground tabular-nums">
                        <span className="font-semibold uppercase tracking-wider">{kind}</span>
                        <span aria-hidden>·</span>
                        <span>
                          {study.lessons.length} {study.lessons.length === 1 ? 'les' : 'lessen'}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
