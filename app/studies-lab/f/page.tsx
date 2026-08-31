'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, Clock, Search } from 'lucide-react'
import { type CuratedStudy } from '../../../lib/data/curated-studies'
import { BOOK_STUDY_ENTRIES, THEME_STUDIES } from '../../../lib/bookStudies'

const TEAL = '#0D9488'
const COMPLETED_KEY = 'bijbelstudie_completed_studies'

/**
 * Versie F — Op doel & tijd.
 *
 * A, B, C en D laten de lezer nog steeds een boekenkast-indeling vertalen naar
 * hun eigen vraag: "is dit een thema of een persoon?", "Oude of Nieuwe
 * Testament?". Deze versie draait het om. De lezer zegt hoeveel tijd hij heeft
 * en wat hij wil doen; de lijst eronder wordt smaller en zet er een gewone zin
 * bij. Wie gewoon een register wil, klapt onderaan de A–Z-lijst open.
 */

type Intent = 'boek' | 'persoon' | 'thema' | 'vraag'
type TimeKey = 'alles' | 'kort' | 'gemiddeld' | 'uitgebreid'

const MINUTES_FALLBACK = 12

interface Entry {
  study: CuratedStudy
  intent: Intent
  /** Eén woord voor wat voor soort studie dit is. */
  kind: string
  lessonCount: number
  totalMinutes: number
  avgMinutes: number
}

function minutesOf(study: CuratedStudy): { total: number; avg: number } {
  const total = study.lessons.reduce(
    (sum, lesson) => sum + (lesson.estimatedMinutes ?? MINUTES_FALLBACK),
    0,
  )
  const count = study.lessons.length || 1
  return { total, avg: Math.round(total / count) }
}

const ENTRIES: Entry[] = [
  ...BOOK_STUDY_ENTRIES.map(({ book, study }) => {
    const m = minutesOf(study)
    return {
      study,
      intent: 'boek' as const,
      kind: book.genre,
      lessonCount: study.lessons.length,
      totalMinutes: m.total,
      avgMinutes: m.avg,
    }
  }),
  ...THEME_STUDIES.map(study => {
    const m = minutesOf(study)
    const intent: Intent =
      study.type === 'Persoon' ? 'persoon' : study.type === 'Gedeelte' ? 'vraag' : 'thema'
    const kind = intent === 'persoon' ? 'Persoon' : intent === 'vraag' ? 'Gedeelte' : 'Thema'
    return {
      study,
      intent,
      kind,
      lessonCount: study.lessons.length,
      totalMinutes: m.total,
      avgMinutes: m.avg,
    }
  }),
]

function inBucket(total: number, key: TimeKey): boolean {
  if (key === 'alles') return true
  if (key === 'kort') return total <= 80
  if (key === 'gemiddeld') return total > 80 && total <= 250
  return total > 250
}

const TIME_CHIPS: { key: TimeKey; label: string }[] = [
  { key: 'kort', label: '5 min' },
  { key: 'gemiddeld', label: '15 min' },
  { key: 'uitgebreid', label: '30+ min' },
  { key: 'alles', label: 'Maakt niet uit' },
]

const INTENT_CHIPS: { key: Intent; label: string }[] = [
  { key: 'boek', label: 'Een bijbelboek begrijpen' },
  { key: 'persoon', label: 'Een persoon leren kennen' },
  { key: 'thema', label: 'Een thema volgen' },
  { key: 'vraag', label: 'Bij een vraag blijven' },
]

const TIME_ADJ: Record<TimeKey, string> = {
  alles: '',
  kort: 'korte ',
  gemiddeld: 'middellange ',
  uitgebreid: 'uitgebreide ',
}

const INTENT_PHRASE: Record<Intent, string> = {
  boek: ' waarin je een bijbelboek leert begrijpen',
  persoon: ' waarin je een persoon leert kennen',
  thema: ' waarin je een thema volgt',
  vraag: ' die bij één vraag of gedeelte blijft',
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
}

function chipClass(active: boolean): string {
  return `h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors border ${
    active
      ? 'text-white border-transparent'
      : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
  }`
}

function ResultRow({ entry, status }: { entry: Entry; status: Status }) {
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
  return (
    <Link
      href={`/studies/${entry.study.id}`}
      data-track="study_card"
      className="group no-underline flex items-center gap-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card px-3.5 py-3 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold text-[13.5px] text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
            {entry.study.title}
          </span>
          {status.completed && (
            <Check size={14} className="flex-none" style={{ color: TEAL }} aria-label="Afgerond" />
          )}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-gray-400 dark:text-muted-foreground tabular-nums">
          <span className="font-semibold uppercase tracking-wider">{entry.kind}</span>
          <span aria-hidden>·</span>
          <span>
            {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'}
          </span>
          <span aria-hidden>·</span>
          <span>±{entry.avgMinutes} min per les</span>
          {status.started && !status.completed && (
            <>
              <span aria-hidden>·</span>
              <span style={{ color: TEAL }}>{pct}% klaar</span>
            </>
          )}
        </span>
      </span>
      <ArrowRight
        size={15}
        className="flex-none opacity-30 group-hover:opacity-100 transition-opacity"
        style={{ color: TEAL }}
      />
    </Link>
  )
}

export default function StudiesLabFPage() {
  const [time, setTime] = useState<TimeKey>('alles')
  const [intent, setIntent] = useState<Intent | null>(null)
  const [query, setQuery] = useState('')
  const [indexOpen, setIndexOpen] = useState(false)
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
      ENTRIES.map(entry => ({ entry, status: statusFor(entry.study) })).filter(
        row => row.status.started && !row.status.completed,
      ),
    [statusFor],
  )

  const filtered = useMemo(() => {
    return ENTRIES.filter(
      entry => inBucket(entry.totalMinutes, time) && (!intent || entry.intent === intent),
    ).sort((a, b) => a.study.title.localeCompare(b.study.title, 'nl'))
  }, [time, intent])

  const summary = useMemo(() => {
    const n = filtered.length
    if (n === 0) {
      return 'Geen studies die hierbij passen. Pas je keuze aan, of blader hieronder door de lijst.'
    }
    const noun = n === 1 ? 'studie' : 'studies'
    const phrase = intent ? INTENT_PHRASE[intent] : ''
    const avg = Math.round(filtered.reduce((sum, entry) => sum + entry.avgMinutes, 0) / n)
    return `${n} ${TIME_ADJ[time]}${noun}${phrase} — ±${avg} minuten per les.`
  }, [filtered, time, intent])

  const alpha = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...ENTRIES]
      .sort((a, b) => a.study.title.localeCompare(b.study.title, 'nl'))
      .filter(entry => !needle || entry.study.title.toLowerCase().includes(needle))
  }, [query])

  return (
    <div className="px-5 sm:px-8 xl:px-10 py-6 max-w-[900px] mx-auto">
      {/* Verder waar je was — compacte strip bovenaan voor wie terugkomt. */}
      {inProgress.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {inProgress.map(({ entry, status }) => {
            const pct =
              status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
            return (
              <Link
                key={entry.study.id}
                href={`/studies/${entry.study.id}`}
                data-track="study_resume_card"
                className="no-underline group flex flex-none items-center gap-2 rounded-full border px-3 py-1.5 bg-white dark:bg-card transition-colors hover:border-teal-400"
                style={{ borderColor: 'rgba(13,148,136,0.30)' }}
              >
                <span className="text-[12px] font-semibold text-gray-900 dark:text-foreground">
                  {entry.study.title}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-muted-foreground tabular-nums">
                  les {status.resumeDay ?? status.done + 1}/{status.total} · {pct}%
                </span>
                <ArrowRight size={13} className="flex-none" style={{ color: TEAL }} />
              </Link>
            )
          })}
        </div>
      )}

      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
          Wat past nu bij jou?
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500 dark:text-muted-foreground">
          Twee vragen, geen categorieën. Kies wat er nu speelt; de lijst eronder past zich aan.
        </p>
      </header>

      {/* Vraag 1 — tijd */}
      <section className="mt-5">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-gray-900 dark:text-foreground">
          <Clock size={14} style={{ color: TEAL }} />
          Hoeveel tijd heb je?
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIME_CHIPS.map(chip => {
            const active = time === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={active}
                onClick={() => setTime(chip.key)}
                className={chipClass(active)}
                style={active ? { backgroundColor: TEAL } : undefined}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Vraag 2 — doel */}
      <section className="mt-5">
        <h2 className="text-[13px] font-bold text-gray-900 dark:text-foreground">
          Wat wil je doen?
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTENT_CHIPS.map(chip => {
            const active = intent === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={active}
                onClick={() => setIntent(active ? null : chip.key)}
                className={chipClass(active)}
                style={active ? { backgroundColor: TEAL } : undefined}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Samenvatting in gewone taal + resultaten */}
      <p className="mt-6 text-[13px] text-gray-600 dark:text-muted-foreground">{summary}</p>

      {filtered.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map(entry => (
            <ResultRow key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
          ))}
        </div>
      )}

      {/* Altijd zichtbare terugval: het gewone register, dichtgeklapt. */}
      <section className="mt-8 border-t border-gray-200 dark:border-border pt-4">
        <button
          type="button"
          aria-expanded={indexOpen}
          onClick={() => setIndexOpen(open => !open)}
          className="flex w-full items-center justify-between text-[13px] font-bold text-gray-900 dark:text-foreground"
        >
          <span>Of blader door alle studies (A–Z)</span>
          <ChevronDown
            size={16}
            className={`transition-transform ${indexOpen ? 'rotate-180' : ''}`}
            style={{ color: TEAL }}
          />
        </button>

        {indexOpen && (
          <div className="mt-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none"
              />
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Zoek op titel"
                aria-label="Zoek een studie op titel"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
              />
            </div>

            {alpha.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-muted-foreground">
                Niets gevonden voor &ldquo;{query.trim()}&rdquo;.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100 dark:divide-border">
                {alpha.map(entry => {
                  const status = statusFor(entry.study)
                  return (
                    <li key={entry.study.id}>
                      <Link
                        href={`/studies/${entry.study.id}`}
                        className="no-underline group flex items-center justify-between gap-2 py-2"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="truncate text-[13px] text-gray-800 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                            {entry.study.title}
                          </span>
                          {status.completed && (
                            <Check
                              size={13}
                              className="flex-none"
                              style={{ color: TEAL }}
                              aria-label="Afgerond"
                            />
                          )}
                        </span>
                        <span className="flex-none text-[10.5px] text-gray-400 dark:text-muted-foreground uppercase tracking-wider">
                          {entry.kind}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
