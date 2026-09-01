'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import {
  BY_CATEGORY,
  CATEGORY_LABELS,
  COUNTS,
  ENTRIES,
  HERO_STUDY,
  HERO_WHY,
  TEAL,
  TRACKS,
  summarize,
  useStudyProgress,
  type Category,
  type Entry,
} from '../_shared/lab'
import { ResumeCard, StudyCard } from '../_shared/ui'

/**
 * Versie G — Traject in kaarten.
 *
 * Het skelet van D (verder waar je was → één aanbevolen start → startsporen)
 * maar elk startspoor is een grote tapkaart uit E: je tikt hem aan en hij wordt
 * het hele scherm, in plaats van een accordeon die de pagina langer maakt. In
 * dat detailscherm staat de zin in gewone taal uit F, zodat je weet wat je
 * gekozen hebt voordat je gaat lezen.
 *
 * Kern: één beslissing per scherm, maar met D's inhoud en F's toon.
 */

type View = { kind: 'track'; key: string } | { kind: 'category'; key: Category }

const BIG_CARD =
  'group text-left flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5 min-h-[140px] transition-colors hover:border-teal-400 dark:hover:border-teal-700'

export default function StudiesLabGPage() {
  const { statusFor, inProgress } = useStudyProgress()
  const [view, setView] = useState<View | null>(null)

  const entryById = useMemo(() => {
    const map = new Map<string, Entry>()
    for (const entry of ENTRIES) map.set(entry.study.id, entry)
    return map
  }, [])

  // ---- Detailscherm: één spoor of één categorie vult de pagina. -----------
  if (view !== null) {
    const track = view.kind === 'track' ? TRACKS.find(t => t.key === view.key) : undefined
    const rows: Entry[] =
      view.kind === 'track'
        ? (track?.studies ?? [])
            .map(study => entryById.get(study.id))
            .filter((entry): entry is Entry => Boolean(entry))
        : BY_CATEGORY(view.key)

    const title = view.kind === 'track' ? (track?.label ?? '') : CATEGORY_LABELS[view.key]
    const blurb =
      view.kind === 'track' ? track?.blurb : 'Op volgorde van de canon, zoals ze in de Bijbel staan.'

    return (
      <div className="px-5 sm:px-8 py-6 max-w-[900px] mx-auto">
        <button
          onClick={() => setView(null)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 dark:text-muted-foreground hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft size={15} /> Terug
        </button>

        <h1 className="mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
          {title}
        </h1>
        {blurb && (
          <p className="mt-1 text-[13px] text-gray-500 dark:text-muted-foreground">{blurb}</p>
        )}
        <p className="mt-2 text-[13px] text-gray-600 dark:text-muted-foreground">
          {summarize(rows, 'alles', null)}
        </p>

        <ol className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0">
          {rows.map((entry, index) => (
            <li key={entry.study.id} className="relative">
              {view.kind === 'track' && (
                <span
                  className="absolute -left-0.5 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white tabular-nums"
                  style={{ backgroundColor: TEAL }}
                >
                  {index + 1}
                </span>
              )}
              <StudyCard entry={entry} status={statusFor(entry.study)} />
            </li>
          ))}
        </ol>
      </div>
    )
  }

  // ---- Landing: traject van boven naar beneden, in kaarten. --------------
  return (
    <div className="px-5 sm:px-8 py-7 max-w-[900px] mx-auto">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
          Waar begin je?
        </h1>
        <p className="mt-1 text-[13px] text-gray-500 dark:text-muted-foreground">
          Van boven naar beneden. Eén keuze per keer — nooit een scherm vol titels.
        </p>
      </header>

      {inProgress.length > 0 && (
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {inProgress.map(row => (
            <ResumeCard key={row.entry.study.id} entry={row.entry} status={row.status} />
          ))}
        </section>
      )}

      {/* Eén aanbeveling, groot — het hart van versie D. */}
      <section className="mt-6">
        <div
          className="rounded-2xl border p-5 sm:p-6 bg-white dark:bg-card"
          style={{ borderColor: 'rgba(13,148,136,0.35)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEAL }}>
            Aanbevolen om mee te beginnen
          </p>
          <h2 className="mt-1.5 text-lg sm:text-xl font-bold text-gray-900 dark:text-foreground">
            {HERO_STUDY.title}
          </h2>
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
      </section>

      {/* De startsporen van D, maar als tapkaarten van E. */}
      {TRACKS.length > 0 && (
        <section className="mt-7">
          <h2 className="text-[13px] font-bold text-foreground mb-2.5">Of kies een startspoor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TRACKS.map(track => (
              <button
                key={track.key}
                onClick={() => setView({ kind: 'track', key: track.key })}
                className={BIG_CARD}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-base font-bold text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {track.label}
                  </span>
                  <span
                    className="flex-none text-xl font-bold tabular-nums"
                    style={{ color: TEAL }}
                  >
                    {track.studies.length}
                  </span>
                </span>
                <span className="text-[13px] text-gray-500 dark:text-muted-foreground leading-relaxed">
                  {track.blurb}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Weet je precies wat je zoekt: de boekenkast, ook als kaarten. */}
      <section className="mt-7 mb-4">
        <h2 className="text-[13px] font-bold text-foreground mb-2.5">Of blader zelf</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => (
            <button
              key={key}
              onClick={() => setView({ kind: 'category', key })}
              className="group text-left rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-4 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
            >
              <span className="block text-[14px] font-semibold text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                {CATEGORY_LABELS[key]}
              </span>
              <span
                className="mt-1 block text-[12px] font-semibold tabular-nums"
                style={{ color: TEAL }}
              >
                {COUNTS[key]} studies
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
