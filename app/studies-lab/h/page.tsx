'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Clock } from 'lucide-react'
import {
  BY_CATEGORY,
  CATEGORY_LABELS,
  COUNTS,
  ENTRIES,
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
import { Chip, CompactRow, ResumeStrip, StudyCard } from '../_shared/ui'

/**
 * Versie H — Twee vragen, één antwoord.
 *
 * F vroeg naar tijd en doel en gaf een lijst terug; D gaf één duidelijke start
 * maar altijd dezelfde. Deze versie plakt ze op elkaar: je beantwoordt de twee
 * vragen van F, en het antwoord is D's "start hier"-kaart — één aanbeveling,
 * groot, met een zin waarom juist die. De rest van de treffers staat er compact
 * onder, en de categoriekaarten van E liggen dichtgeklapt onderaan als je
 * liever zelf bladert.
 *
 * Kern: de flow van F, maar hij eindigt in een beslissing in plaats van in een
 * lijst.
 */

/**
 * De aanbeveling binnen een selectie. Studies uit het beginnersspoor gaan voor
 * — die zijn met de hand gekozen — en anders de kortste, want een korte studie
 * is de minst riskante eerste keuze.
 */
const BEGINNER_IDS = new Set(
  (TRACKS.find(track => track.key === 'beginners')?.studies ?? []).map(study => study.id),
)

function pickHero(rows: Entry[]): Entry | null {
  if (rows.length === 0) return null
  const preferred = rows.filter(entry => BEGINNER_IDS.has(entry.study.id))
  const pool = preferred.length > 0 ? preferred : rows
  return [...pool].sort((a, b) => a.totalMinutes - b.totalMinutes)[0]
}

function heroWhy(entry: Entry, time: TimeKey, intent: Intent | null): string {
  const parts: string[] = []
  if (BEGINNER_IDS.has(entry.study.id)) parts.push('een goede eerste studie')
  parts.push(`${entry.lessonCount} ${entry.lessonCount === 1 ? 'les' : 'lessen'}`)
  parts.push(`±${entry.avgMinutes} minuten per keer`)
  if (time === 'kort') parts.push('af te ronden in een paar zittingen')
  if (intent === 'boek') parts.push('één bijbelboek van begin tot eind')
  if (intent === 'persoon') parts.push('rond één persoon')
  if (intent === 'thema') parts.push('één lijn door meerdere boeken')
  if (intent === 'vraag') parts.push('blijft bij één gedeelte')
  return `${parts.join(' · ')}.`
}

export default function StudiesLabHPage() {
  const { statusFor, inProgress } = useStudyProgress()
  const [time, setTime] = useState<TimeKey>('alles')
  const [intent, setIntent] = useState<Intent | null>(null)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [openCategory, setOpenCategory] = useState<Category | null>(null)

  const filtered = useMemo(
    () =>
      ENTRIES.filter(
        entry => inBucket(entry.totalMinutes, time) && (!intent || entry.intent === intent),
      ).sort((a, b) => a.study.title.localeCompare(b.study.title, 'nl')),
    [time, intent],
  )

  const hero = useMemo(() => pickHero(filtered), [filtered])
  const rest = useMemo(
    () => filtered.filter(entry => entry.study.id !== hero?.study.id),
    [filtered, hero],
  )

  return (
    <div className="px-5 sm:px-8 py-6 max-w-[900px] mx-auto">
      <ResumeStrip rows={inProgress} />

      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
          Twee vragen en je bent begonnen
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500 dark:text-muted-foreground">
          Zeg wat er nu speelt. Wij kiezen er één uit, jij hoeft alleen nog te beginnen.
        </p>
      </header>

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

      {/* Het antwoord: één studie, groot — de "start hier"-kaart van D. */}
      {hero ? (
        <section className="mt-7">
          <div
            className="rounded-2xl border p-5 sm:p-6 bg-white dark:bg-card"
            style={{ borderColor: 'rgba(13,148,136,0.35)' }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: TEAL }}
            >
              Dit past bij je antwoord
            </p>
            <h2 className="mt-1.5 text-lg sm:text-xl font-bold text-gray-900 dark:text-foreground">
              {hero.study.title}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600 dark:text-muted-foreground">
              {hero.study.description}
            </p>
            <p className="mt-2 text-[11.5px] text-gray-400 dark:text-muted-foreground tabular-nums">
              {heroWhy(hero, time, intent)}
            </p>
            <Link
              href={`/studies/${hero.study.id}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Begin
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      ) : (
        <p className="mt-7 text-[13px] text-gray-600 dark:text-muted-foreground">
          {summarize(filtered, time, intent)}
        </p>
      )}

      {rest.length > 0 && (
        <section className="mt-6">
          <p className="text-[13px] text-gray-600 dark:text-muted-foreground">
            {summarize(filtered, time, intent)}
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rest.map(entry => (
              <CompactRow key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
            ))}
          </div>
        </section>
      )}

      {/* Terugval: de categoriekaarten van E, dichtgeklapt. */}
      <section className="mt-8 border-t border-gray-200 dark:border-border pt-4 mb-4">
        <button
          type="button"
          aria-expanded={browseOpen}
          onClick={() => setBrowseOpen(open => !open)}
          className="flex w-full items-center justify-between text-[13px] font-bold text-gray-900 dark:text-foreground"
        >
          <span>Of blader zelf door de categorieën</span>
          <ChevronDown
            size={16}
            className={`transition-transform ${browseOpen ? 'rotate-180' : ''}`}
            style={{ color: TEAL }}
          />
        </button>

        {browseOpen && (
          <>
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => {
                const active = openCategory === key
                return (
                  <button
                    key={key}
                    onClick={() => setOpenCategory(active ? null : key)}
                    aria-pressed={active}
                    className="group text-left rounded-xl border bg-white dark:bg-card p-4 transition-colors hover:border-teal-400"
                    style={{
                      borderColor: active ? TEAL : undefined,
                    }}
                  >
                    <span className="block text-[14px] font-semibold text-gray-900 dark:text-foreground">
                      {CATEGORY_LABELS[key]}
                    </span>
                    <span
                      className="mt-1 block text-[12px] font-semibold tabular-nums"
                      style={{ color: TEAL }}
                    >
                      {COUNTS[key]} studies
                    </span>
                  </button>
                )
              })}
            </div>

            {openCategory && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {BY_CATEGORY(openCategory).map(entry => (
                  <StudyCard key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
