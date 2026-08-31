'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { curatedStudies, type CuratedStudy } from '../../../lib/data/curated-studies'
import { BOOK_STUDY_ENTRIES, THEME_STUDIES } from '../../../lib/bookStudies'

const TEAL = '#0D9488'
const COMPLETED_KEY = 'bijbelstudie_completed_studies'

/**
 * Versie D - Traject.
 *
 * A, B en C gaven de lezer nog steeds een catalogus: een raster, een lijst of
 * een zoekbalk waarin je zelf je weg moet kiezen. De echte vraag van een nieuwe
 * lezer is niet "welke van de 77 studies wil ik" maar "waar begin ik?". Deze
 * pagina beantwoordt alleen die vraag: eerst verdergaan waar je was, dan een
 * enkele aanbevolen start, dan vier voorgekauwde routes, en pas onderaan -
 * dichtgeklapt - de volledige lijst voor wie precies weet wat hij zoekt.
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

/** Elke studie met het testament van het boek erachter (thema's = NT-kolom). */
interface Entry {
  study: CuratedStudy
  testament: 'oude-testament' | 'nieuwe-testament'
}

const ALL_ENTRIES: Entry[] = [
  ...BOOK_STUDY_ENTRIES.map(({ book, study }) => ({
    study,
    testament: (book.testament === 'oude-testament'
      ? 'oude-testament'
      : 'nieuwe-testament') as Entry['testament'],
  })),
  ...THEME_STUDIES.map(study => ({ study, testament: 'nieuwe-testament' as const })),
]

const OT_ENTRIES = BOOK_STUDY_ENTRIES.filter(e => e.book.testament === 'oude-testament')
const NT_ENTRIES = BOOK_STUDY_ENTRIES.filter(e => e.book.testament !== 'oude-testament')

/**
 * De aanbevolen start. Markus als hij bestaat, anders de eerste studie die er
 * is - de pagina mag nooit leeglopen omdat een id ontbreekt.
 */
const HERO_ENTRY =
  BOOK_STUDY_ENTRIES.find(e => e.study.id === 'boek-markus') ??
  BOOK_STUDY_ENTRIES.find(e => e.book.name.toLowerCase().includes('markus'))
const HERO_STUDY: CuratedStudy = HERO_ENTRY?.study ?? curatedStudies[0]
const HERO_WHY = HERO_ENTRY
  ? 'Het kortste evangelie: veel vaart, weinig omhaal, en meteen bij de kern - wie is Jezus, en wat vraagt hij van je?'
  : HERO_STUDY.description

/**
 * De startsporen. Elke matcher wordt eerst tegen de thema-studies gehouden (op
 * id of titel) en daarna tegen de bijbelboeken (op boeknaam). Een matcher die
 * niets vindt wordt gewoon overgeslagen, dubbele treffers vallen weg.
 */
interface Track {
  key: string
  label: string
  blurb: string
  matchers: string[]
}

const TRACKS: Track[] = [
  {
    key: 'beginners',
    label: 'Voor beginners',
    blurb: 'Korte, verhalende boeken om het ritme te pakken te krijgen.',
    matchers: ['markus', 'johannes', 'ruth', 'genesis', 'psalmen'],
  },
  {
    key: 'jezus',
    label: 'Het leven van Jezus',
    blurb: 'Van de evangelieverslagen naar de laatste week en de opstanding.',
    matchers: ['markus', 'johannes', 'bergrede', 'intocht', 'opstanding'],
  },
  {
    key: 'ot-verhalen',
    label: 'De grote verhalen van het OT',
    blurb: 'De mensen en gebeurtenissen waar de rest van de Bijbel op terugkijkt.',
    matchers: ['genesis', 'exodus', 'noach', 'abraham', 'mozes', 'david', 'daniël'],
  },
  {
    key: 'thema',
    label: 'Een thema volgen',
    blurb: 'Studies die één lijn door meerdere bijbelboeken heen trekken.',
    matchers: ['bergrede', 'psalmen', 'geloof-in-storm', 'opstanding', 'abraham'],
  },
]

function resolveTrack(matchers: string[]): CuratedStudy[] {
  const seen = new Set<string>()
  const out: CuratedStudy[] = []
  for (const raw of matchers) {
    const m = raw.toLowerCase()
    const theme = THEME_STUDIES.find(
      s => s.id === m || s.title.toLowerCase().includes(m),
    )
    const bookEntry = BOOK_STUDY_ENTRIES.find(e => e.book.name.toLowerCase().includes(m))
    const hit = theme ?? bookEntry?.study
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id)
      out.push(hit)
    }
  }
  return out
}

const RESOLVED_TRACKS = TRACKS.map(track => ({
  ...track,
  studies: resolveTrack(track.matchers),
})).filter(track => track.studies.length > 0)

export default function StudiesLabD() {
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})
  const [openTrack, setOpenTrack] = useState<string | null>(null)
  const [booksOpen, setBooksOpen] = useState(false)
  const [query, setQuery] = useState('')

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
      ALL_ENTRIES.map(entry => ({ study: entry.study, status: statusFor(entry.study) })).filter(
        row => row.status.started && !row.status.completed,
      ),
    [statusFor],
  )

  const booksExpanded = booksOpen || query.trim().length > 0

  const filteredBooks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const match = (entry: (typeof BOOK_STUDY_ENTRIES)[number]) =>
      !needle ||
      entry.book.name.toLowerCase().includes(needle) ||
      entry.study.title.toLowerCase().includes(needle)
    return {
      ot: OT_ENTRIES.filter(match),
      nt: NT_ENTRIES.filter(match),
    }
  }, [query])

  return (
    <div className="px-5 sm:px-8 py-7 max-w-[880px] mx-auto">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
          Waar begin je?
        </h1>
        <p className="mt-1 text-[13px] text-gray-500 dark:text-muted-foreground">
          Je hoeft niet te kiezen uit een hele lijst. Volg gewoon de route hieronder, van boven
          naar beneden.
        </p>
      </header>

      {/* 1. Verder waar je was - alleen als er iets te hervatten valt. */}
      {inProgress.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[13px] font-bold text-foreground mb-2">Verder waar je was</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {inProgress.map(({ study, status }) => {
              const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
              return (
                <Link
                  key={study.id}
                  href={`/studies/${study.id}`}
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

      {/* 2. Start hier - één aanbeveling, groot. */}
      <section className="mt-6">
        <h2 className="text-[13px] font-bold text-foreground mb-2">Start hier</h2>
        <div
          className="rounded-2xl border p-5 sm:p-6 bg-white dark:bg-card"
          style={{ borderColor: 'rgba(13,148,136,0.35)' }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: TEAL }}
          >
            Aanbevolen om mee te beginnen
          </p>
          <h3 className="mt-1.5 text-lg sm:text-xl font-bold text-gray-900 dark:text-foreground">
            {HERO_STUDY.title}
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600 dark:text-muted-foreground">
            {HERO_WHY}
          </p>
          <p className="mt-2 text-[11.5px] text-gray-400 dark:text-muted-foreground tabular-nums">
            {HERO_STUDY.lessons.length}{' '}
            {HERO_STUDY.lessons.length === 1 ? 'les' : 'lessen'} · één hoofdstuk per keer
          </p>
          <Link
            href={`/studies/${HERO_STUDY.id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            Begin
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* 3. Startsporen - vier voorgekauwde routes. */}
      {RESOLVED_TRACKS.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[13px] font-bold text-foreground mb-2">Of kies een startspoor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RESOLVED_TRACKS.map(track => {
              const open = openTrack === track.key
              return (
                <div
                  key={track.key}
                  className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setOpenTrack(open ? null : track.key)}
                    aria-expanded={open}
                    className="w-full text-left px-4 py-3.5 flex items-start gap-2 transition-colors hover:bg-gray-50 dark:hover:bg-secondary"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-gray-900 dark:text-foreground">
                        {track.label}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-gray-500 dark:text-muted-foreground">
                        {track.blurb}
                      </span>
                      <span className="mt-1 block text-[11px] text-gray-400 dark:text-muted-foreground tabular-nums">
                        {track.studies.length} studies
                      </span>
                    </span>
                    {open ? (
                      <ChevronDown size={16} className="mt-0.5 flex-none text-gray-400" />
                    ) : (
                      <ChevronRight size={16} className="mt-0.5 flex-none text-gray-400" />
                    )}
                  </button>
                  {open && (
                    <ul className="border-t border-gray-100 dark:border-border divide-y divide-gray-100 dark:divide-border">
                      {track.studies.map((study, index) => {
                        const status = statusFor(study)
                        return (
                          <li key={study.id}>
                            <Link
                              href={`/studies/${study.id}`}
                              className="no-underline flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-secondary"
                            >
                              <span
                                className="text-[11px] font-semibold tabular-nums w-5 flex-none"
                                style={{ color: TEAL }}
                              >
                                {index + 1}
                              </span>
                              <span className="min-w-0 flex-1 text-[13px] text-gray-800 dark:text-foreground truncate">
                                {study.title}
                              </span>
                              {status.completed ? (
                                <CheckCircle2
                                  size={14}
                                  className="flex-none"
                                  style={{ color: TEAL }}
                                />
                              ) : (
                                <span className="text-[11px] text-gray-400 dark:text-muted-foreground tabular-nums flex-none">
                                  {study.lessons.length} lessen
                                </span>
                              )}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 4. Alle bijbelboeken - dichtgeklapt, opent bij zoeken. */}
      <section className="mt-6 mb-4">
        <div className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3">
            <button
              onClick={() => setBooksOpen(o => !o)}
              aria-expanded={booksExpanded}
              className="flex items-center gap-2 text-[13px] font-bold text-foreground"
            >
              {booksExpanded ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
              Alle bijbelboeken (66)
            </button>
            <div className="relative ml-auto w-40 sm:w-56">
              <Search
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none"
              />
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Zoek een boek"
                aria-label="Zoek een bijbelboek"
                className="w-full h-9 pl-8 pr-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-[13px] text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
              />
            </div>
          </div>

          {booksExpanded && (
            <div className="border-t border-gray-100 dark:border-border px-4 py-4">
              {filteredBooks.ot.length === 0 && filteredBooks.nt.length === 0 ? (
                <p className="text-[13px] text-gray-500 dark:text-muted-foreground">
                  Niets gevonden voor &ldquo;{query.trim()}&rdquo;.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {(
                    [
                      ['Oude Testament', filteredBooks.ot],
                      ['Nieuwe Testament', filteredBooks.nt],
                    ] as const
                  ).map(([title, list]) =>
                    list.length === 0 ? null : (
                      <div key={title}>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mb-1.5">
                          {title}
                        </h3>
                        <ul className="divide-y divide-gray-100 dark:divide-border">
                          {list.map(({ book, study }) => {
                            const status = statusFor(study)
                            return (
                              <li key={study.id}>
                                <Link
                                  href={`/studies/${study.id}`}
                                  className="no-underline flex items-center gap-2 py-2 text-[13px] text-gray-800 dark:text-foreground transition-colors hover:text-teal-700 dark:hover:text-teal-400"
                                >
                                  <span className="min-w-0 flex-1 truncate">{book.name}</span>
                                  {status.completed ? (
                                    <CheckCircle2
                                      size={13}
                                      className="flex-none"
                                      style={{ color: TEAL }}
                                    />
                                  ) : (
                                    <span className="text-[11px] text-gray-400 dark:text-muted-foreground tabular-nums flex-none">
                                      {study.lessons.length}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
