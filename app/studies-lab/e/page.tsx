'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Search } from 'lucide-react'
import { curatedStudies, type CuratedStudy } from '../../../lib/data/curated-studies'
import { BOOK_STUDY_ENTRIES, THEME_STUDIES } from '../../../lib/bookStudies'

const TEAL = '#0D9488'
const COMPLETED_KEY = 'bijbelstudie_completed_studies'

/**
 * Versie E - Grote categoriekaarten.
 *
 * De landing toont zes grote kaarten en verder niets. Je tikt er een aan en
 * die kaart wordt het hele scherm: een terugknop, de titel, een zoekveld dat
 * alleen in die categorie zoekt, en een rustige lijst studies. Nooit een muur
 * vol titels; steeds maar een keuze tegelijk.
 */

type BaseCategory = 'ot' | 'nt' | 'personen' | 'themas'
type Category = BaseCategory | 'mijn' | 'populair'

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

/** Een catalogusregel: de studie plus de woorden eronder. */
interface Item {
  study: CuratedStudy
  /** "Wet", "Evangelie", "Persoon" - in een woord wat voor ding dit is. */
  kind: string
  category: BaseCategory
  /** Alles waar een zoekopdracht op mag matchen, eenmalig lowercased. */
  haystack: string
}

const ITEMS: Item[] = [
  ...BOOK_STUDY_ENTRIES.map(({ book, study }) => ({
    study,
    kind: book.genre,
    category: (book.testament === 'oude-testament' ? 'ot' : 'nt') as BaseCategory,
    haystack: `${study.title} ${book.name} ${book.genre} ${study.description}`.toLowerCase(),
  })),
  ...THEME_STUDIES.map(study => ({
    study,
    kind: study.type === 'Persoon' ? 'Persoon' : study.type === 'Gedeelte' ? 'Gedeelte' : 'Thema',
    category: (study.type === 'Persoon' ? 'personen' : 'themas') as BaseCategory,
    haystack: `${study.title} ${study.description} ${study.lessons
      .map(lesson => lesson.book)
      .join(' ')}`.toLowerCase(),
  })),
]

const COUNTS: Record<BaseCategory, number> = {
  ot: ITEMS.filter(item => item.category === 'ot').length,
  nt: ITEMS.filter(item => item.category === 'nt').length,
  personen: ITEMS.filter(item => item.category === 'personen').length,
  themas: ITEMS.filter(item => item.category === 'themas').length,
}

/**
 * Een korte, met de hand gekozen lijst om mee te beginnen. We halen hem uit de
 * hand-geschreven studies zodat we echte id's hebben; lukt het matchen niet,
 * dan vallen we terug op de eerste zes.
 */
const POPULAR: CuratedStudy[] = (() => {
  const names = ['Genesis', 'Psalmen', 'Johannes', 'Romeinen', 'Efeze', 'Jakobus']
  const picked = names
    .map(name => curatedStudies.find(study => study.title.toLowerCase().includes(name.toLowerCase())))
    .filter((study): study is CuratedStudy => Boolean(study))
  return picked.length > 0 ? picked : curatedStudies.slice(0, 6)
})()

const CATEGORY_TITLES: Record<Category, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  personen: 'Personen',
  themas: "Thema's",
  mijn: 'Mijn studies',
  populair: 'Populair',
}

const GRID = 'grid grid-cols-1 md:grid-cols-2 gap-3'

/**
 * Een studie in de lijst. Titel, in een woord wat voor studie het is, het
 * aantal lessen, en - als je bezig bent - een balkje met "les x van y".
 */
function StudyRow({
  id,
  title,
  kind,
  lessonCount,
  status,
}: {
  id: string
  title: string
  kind: string
  lessonCount: number
  status: Status
}) {
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0

  return (
    <Link
      href={`/studies/${id}`}
      data-track="studies_lab_e_row"
      className="group no-underline flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card px-4 py-3.5 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-[15px] text-gray-900 dark:text-foreground leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
          {title}
        </h3>
        {status.completed ? (
          <span
            className="mt-0.5 flex-none inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: TEAL }}
          >
            <CheckCircle2 size={14} /> Afgerond
          </span>
        ) : status.started ? (
          <span
            className="mt-0.5 flex-none text-xs font-semibold tabular-nums"
            style={{ color: TEAL }}
          >
            {pct}%
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-muted-foreground tabular-nums">
        <span className="font-semibold uppercase tracking-wider">{kind}</span>
        <span aria-hidden>·</span>
        <span>
          {lessonCount} {lessonCount === 1 ? 'les' : 'lessen'}
        </span>
      </div>

      {status.started && !status.completed && (
        <div className="mt-0.5">
          <div className="h-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: TEAL }}
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-muted-foreground tabular-nums">
            Les {status.resumeDay ?? status.done + 1} van {status.total}
          </p>
        </div>
      )}
    </Link>
  )
}

export default function StudiesLabEPage() {
  const [active, setActive] = useState<Category | null>(null)
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

  const allWithStatus = useMemo(
    () => ITEMS.map(item => ({ item, status: statusFor(item.study) })),
    [statusFor],
  )
  const inProgress = useMemo(
    () => allWithStatus.filter(entry => entry.status.started && !entry.status.completed),
    [allWithStatus],
  )
  const completed = useMemo(
    () => allWithStatus.filter(entry => entry.status.completed),
    [allWithStatus],
  )

  const openCategory = (category: Category) => {
    setActive(category)
    setQuery('')
  }
  const goBack = () => {
    setActive(null)
    setQuery('')
  }

  // ---- Landing: zes grote kaarten en verder niets. -------------------------
  if (active === null) {
    const cards: { key: Category; label: string; description: string; count: number }[] = [
      {
        key: 'ot',
        label: 'Oude Testament',
        description: 'De 39 boeken van Genesis tot Maleachi.',
        count: COUNTS.ot,
      },
      {
        key: 'nt',
        label: 'Nieuwe Testament',
        description: 'De 27 boeken van het Nieuwe Testament.',
        count: COUNTS.nt,
      },
      {
        key: 'personen',
        label: 'Personen',
        description: 'Studies rond mensen uit de Bijbel.',
        count: COUNTS.personen,
      },
      {
        key: 'themas',
        label: "Thema's",
        description: 'Studies rond een onderwerp of een gedeelte.',
        count: COUNTS.themas,
      },
      {
        key: 'mijn',
        label: 'Mijn studies',
        description: 'Waar je mee bezig bent en wat je hebt afgerond.',
        count: inProgress.length + completed.length,
      },
      {
        key: 'populair',
        label: 'Populair',
        description: 'Veelgekozen studies om mee te beginnen.',
        count: POPULAR.length,
      },
    ]

    return (
      <div className="px-5 sm:px-8 xl:px-10 py-8 max-w-[1100px] mx-auto">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground">
            Bijbelstudies
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-muted-foreground">
            Kies een categorie. Een stap tegelijk, nooit een scherm vol titels.
          </p>
        </header>

        {inProgress.length > 0 &&
          (() => {
            const { item, status } = inProgress[0]
            const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
            return (
              <Link
                href={`/studies/${item.study.id}`}
                data-track="studies_lab_e_resume"
                className="no-underline group mt-6 flex items-center gap-4 rounded-2xl border p-4 bg-white dark:bg-card transition-colors hover:border-teal-400"
                style={{ borderColor: 'rgba(13,148,136,0.30)' }}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: TEAL }}
                  >
                    Verder waar je was
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-foreground truncate">
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
              </Link>
            )
          })()}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <button
              key={card.key}
              onClick={() => openCategory(card.key)}
              data-track={`studies_lab_e_cat_${card.key}`}
              className="group text-left flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-6 min-h-[150px] transition-colors hover:border-teal-400 dark:hover:border-teal-700"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-lg font-bold text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                  {card.label}
                </span>
                <span
                  className="flex-none text-2xl font-bold tabular-nums"
                  style={{ color: TEAL }}
                >
                  {card.count}
                </span>
              </div>
              <span className="text-[13px] text-gray-500 dark:text-muted-foreground leading-relaxed">
                {card.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---- Detail: de gekozen categorie vult het hele scherm. -----------------
  const needle = query.trim().toLowerCase()
  const title = CATEGORY_TITLES[active]

  let listNode

  if (active === 'mijn') {
    const ip = inProgress.filter(entry => !needle || entry.item.haystack.includes(needle))
    const cp = completed.filter(entry => !needle || entry.item.haystack.includes(needle))

    if (ip.length === 0 && cp.length === 0) {
      listNode = (
        <p className="text-sm text-gray-500 dark:text-muted-foreground">
          {needle
            ? `Niets gevonden voor “${query.trim()}”.`
            : 'Je bent nog niet aan een studie begonnen.'}
        </p>
      )
    } else {
      listNode = (
        <div className="space-y-7">
          {ip.length > 0 && (
            <section>
              <h2 className="text-[13px] font-bold text-foreground mb-2.5">Mee bezig</h2>
              <div className={GRID}>
                {ip.map(({ item, status }) => (
                  <StudyRow
                    key={item.study.id}
                    id={item.study.id}
                    title={item.study.title}
                    kind={item.kind}
                    lessonCount={item.study.lessons.length}
                    status={status}
                  />
                ))}
              </div>
            </section>
          )}
          {cp.length > 0 && (
            <section>
              <h2 className="text-[13px] font-bold text-foreground mb-2.5">Afgerond</h2>
              <div className={GRID}>
                {cp.map(({ item, status }) => (
                  <StudyRow
                    key={item.study.id}
                    id={item.study.id}
                    title={item.study.title}
                    kind={item.kind}
                    lessonCount={item.study.lessons.length}
                    status={status}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )
    }
  } else if (active === 'populair') {
    const rows = POPULAR.filter(
      study => !needle || `${study.title} ${study.description}`.toLowerCase().includes(needle),
    )
    listNode =
      rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-muted-foreground">
          Niets gevonden voor &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <div className={GRID}>
          {rows.map(study => (
            <StudyRow
              key={study.id}
              id={study.id}
              title={study.title}
              kind="Studie"
              lessonCount={study.lessons.length}
              status={statusFor(study)}
            />
          ))}
        </div>
      )
  } else {
    const rows = ITEMS.filter(
      item => item.category === active && (!needle || item.haystack.includes(needle)),
    )
    listNode =
      rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-muted-foreground">
          Niets gevonden voor &ldquo;{query.trim()}&rdquo;. Probeer de naam van een bijbelboek.
        </p>
      ) : (
        <div className={GRID}>
          {rows.map(item => (
            <StudyRow
              key={item.study.id}
              id={item.study.id}
              title={item.study.title}
              kind={item.kind}
              lessonCount={item.study.lessons.length}
              status={statusFor(item.study)}
            />
          ))}
        </div>
      )
  }

  return (
    <div className="px-5 sm:px-8 xl:px-10 py-6 max-w-[1100px] mx-auto">
      <button
        onClick={goBack}
        data-track="studies_lab_e_back"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 dark:text-muted-foreground hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
      >
        <ArrowLeft size={15} /> Alle categorieën
      </button>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">{title}</h1>

        <div className="relative w-full sm:w-72 flex-none">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={`Zoek in ${title.toLowerCase()}`}
            aria-label={`Zoek in ${title}`}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
            style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
          />
        </div>
      </div>

      <div className="mt-5">{listNode}</div>
    </div>
  )
}
