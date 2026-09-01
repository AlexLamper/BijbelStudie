'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock, Search } from 'lucide-react'
import {
  CATEGORY_LABELS,
  COUNTS,
  ENTRIES,
  HERO_STUDY,
  HERO_WHY,
  INTENT_CHIPS,
  TEAL,
  TIME_CHIPS,
  TRACKS,
  inBucket,
  summarize,
  useStudyProgress,
  type Category,
  type Entry,
  type Intent,
  type TimeKey,
} from '../_shared/lab'
import { Chip, CompactRow, ResumeCard, StudyCard } from '../_shared/ui'

/**
 * Versie I — Drie deuren.
 *
 * De stapsgewijze schil van E, maar de eerste stap is niet de boekenkast. Het
 * zijn drie deuren die overeenkomen met de drie manieren waarop mensen hier
 * binnenkomen: "ik weet niet waar ik begin" (het traject van D), "ik heb nu
 * even tijd" (de tijd- en doelvragen van F), en "ik zoek iets specifieks" (de
 * catalogus). Achter elke deur staat precies één ding op het scherm.
 *
 * Kern: de drie versies naast elkaar in plaats van door elkaar — je kiest eerst
 * welk soort lezer je vandaag bent.
 */

type Door = 'traject' | 'tijd' | 'zoeken'

const DOORS: { key: Door; label: string; blurb: string; hint: string }[] = [
  {
    key: 'traject',
    label: 'Ik weet niet waar ik moet beginnen',
    blurb: 'Eén aanbevolen start en een handvol uitgezette routes.',
    hint: 'Wij kiezen',
  },
  {
    key: 'tijd',
    label: 'Ik heb nu even tijd',
    blurb: 'Zeg hoeveel tijd je hebt en wat je wilt doen; wij filteren.',
    hint: 'Twee vragen',
  },
  {
    key: 'zoeken',
    label: 'Ik zoek iets specifieks',
    blurb: 'De hele catalogus, per categorie of via de zoekbalk.',
    hint: 'Alles',
  },
]

export default function StudiesLabIPage() {
  const { statusFor, inProgress } = useStudyProgress()
  const [door, setDoor] = useState<Door | null>(null)
  const [track, setTrack] = useState<string | null>(null)
  const [time, setTime] = useState<TimeKey>('alles')
  const [intent, setIntent] = useState<Intent | null>(null)
  const [category, setCategory] = useState<Category>('nt')
  const [query, setQuery] = useState('')

  const entryById = useMemo(() => {
    const map = new Map<string, Entry>()
    for (const entry of ENTRIES) map.set(entry.study.id, entry)
    return map
  }, [])

  const timeRows = useMemo(
    () =>
      ENTRIES.filter(
        entry => inBucket(entry.totalMinutes, time) && (!intent || entry.intent === intent),
      ).sort((a, b) => a.study.title.localeCompare(b.study.title, 'nl')),
    [time, intent],
  )

  /** Zoeken slaat de categorie over: een treffer telt uit de hele catalogus. */
  const searchRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle) return ENTRIES.filter(entry => entry.haystack.includes(needle))
    return ENTRIES.filter(entry => entry.category === category)
  }, [query, category])

  const back = (to: Door | null) => {
    setDoor(to)
    setTrack(null)
    setQuery('')
  }

  // ---- Stap 1: drie deuren, verder niets. --------------------------------
  if (door === null) {
    return (
      <div className="px-5 sm:px-8 py-8 max-w-[900px] mx-auto">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground">
            Bijbelstudies
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-muted-foreground">
            Wat past bij hoe je hier vandaag binnenkomt?
          </p>
        </header>

        {inProgress.length > 0 && (
          <div className="mt-6">
            <ResumeCard entry={inProgress[0].entry} status={inProgress[0].status} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {DOORS.map(item => (
            <button
              key={item.key}
              onClick={() => setDoor(item.key)}
              className="group text-left flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-6 min-h-[170px] transition-colors hover:border-teal-400 dark:hover:border-teal-700"
            >
              <span>
                <span
                  className="block text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: TEAL }}
                >
                  {item.hint}
                </span>
                <span className="mt-1.5 block text-[17px] font-bold leading-snug text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                  {item.label}
                </span>
              </span>
              <span className="text-[13px] text-gray-500 dark:text-muted-foreground leading-relaxed">
                {item.blurb}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const backBar = (
    <button
      onClick={() => back(track ? door : null)}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 dark:text-muted-foreground hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
    >
      <ArrowLeft size={15} /> {track ? 'Alle startsporen' : 'Terug'}
    </button>
  )

  // ---- Deur 1: het traject van D. ----------------------------------------
  if (door === 'traject') {
    const activeTrack = track ? TRACKS.find(t => t.key === track) : null

    if (activeTrack) {
      const rows = activeTrack.studies
        .map(study => entryById.get(study.id))
        .filter((entry): entry is Entry => Boolean(entry))

      return (
        <div className="px-5 sm:px-8 py-6 max-w-[900px] mx-auto">
          {backBar}
          <h1 className="mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
            {activeTrack.label}
          </h1>
          <p className="mt-1 text-[13px] text-gray-500 dark:text-muted-foreground">
            {activeTrack.blurb}
          </p>
          <ol className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0">
            {rows.map((entry, index) => (
              <li key={entry.study.id} className="relative">
                <span
                  className="absolute -left-0.5 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white tabular-nums"
                  style={{ backgroundColor: TEAL }}
                >
                  {index + 1}
                </span>
                <StudyCard entry={entry} status={statusFor(entry.study)} />
              </li>
            ))}
          </ol>
        </div>
      )
    }

    return (
      <div className="px-5 sm:px-8 py-6 max-w-[900px] mx-auto">
        {backBar}

        <div
          className="mt-4 rounded-2xl border p-5 sm:p-6 bg-white dark:bg-card"
          style={{ borderColor: 'rgba(13,148,136,0.35)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEAL }}>
            Aanbevolen om mee te beginnen
          </p>
          <h1 className="mt-1.5 text-lg sm:text-xl font-bold text-gray-900 dark:text-foreground">
            {HERO_STUDY.title}
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600 dark:text-muted-foreground">
            {HERO_WHY}
          </p>
          <p className="mt-2 text-[11.5px] text-gray-400 dark:text-muted-foreground tabular-nums">
            {HERO_STUDY.lessons.length} {HERO_STUDY.lessons.length === 1 ? 'les' : 'lessen'} · één
            hoofdstuk per keer
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

        <h2 className="mt-7 text-[13px] font-bold text-foreground mb-2.5">Of kies een startspoor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRACKS.map(item => (
            <button
              key={item.key}
              onClick={() => setTrack(item.key)}
              className="group text-left flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5 min-h-[120px] transition-colors hover:border-teal-400 dark:hover:border-teal-700"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-base font-bold text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                  {item.label}
                </span>
                <span className="flex-none text-xl font-bold tabular-nums" style={{ color: TEAL }}>
                  {item.studies.length}
                </span>
              </span>
              <span className="text-[13px] text-gray-500 dark:text-muted-foreground leading-relaxed">
                {item.blurb}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---- Deur 2: de twee vragen van F. -------------------------------------
  if (door === 'tijd') {
    return (
      <div className="px-5 sm:px-8 py-6 max-w-[900px] mx-auto">
        {backBar}

        <h1 className="mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
          Wat past nu bij jou?
        </h1>

        <section className="mt-5">
          <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-gray-900 dark:text-foreground">
            <Clock size={14} style={{ color: TEAL }} />
            Hoeveel tijd heb je?
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {TIME_CHIPS.map(chip => (
              <Chip key={chip.key} active={time === chip.key} onClick={() => setTime(chip.key)}>
                {chip.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-[13px] font-bold text-gray-900 dark:text-foreground">
            Wat wil je doen?
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTENT_CHIPS.map(chip => {
              const active = intent === chip.key
              return (
                <Chip
                  key={chip.key}
                  active={active}
                  onClick={() => setIntent(active ? null : chip.key)}
                >
                  {chip.label}
                </Chip>
              )
            })}
          </div>
        </section>

        <p className="mt-6 text-[13px] text-gray-600 dark:text-muted-foreground">
          {summarize(timeRows, time, intent)}
        </p>

        {timeRows.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {timeRows.map(entry => (
              <CompactRow key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ---- Deur 3: de catalogus. ---------------------------------------------
  return (
    <div className="px-5 sm:px-8 py-6 max-w-[900px] mx-auto">
      {backBar}

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
          Alle studies
        </h1>
        <div className="relative w-full sm:w-72 flex-none">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Zoek een boek, persoon of thema"
            aria-label="Zoek een studie"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
            style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
          />
        </div>
      </div>

      {query.trim() === '' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => (
            <Chip key={key} active={category === key} onClick={() => setCategory(key)}>
              {CATEGORY_LABELS[key]} ({COUNTS[key]})
            </Chip>
          ))}
        </div>
      )}

      {searchRows.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500 dark:text-muted-foreground">
          Niets gevonden voor &ldquo;{query.trim()}&rdquo;. Probeer de naam van een bijbelboek.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {searchRows.map(entry => (
            <StudyCard key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
          ))}
        </div>
      )}
    </div>
  )
}
