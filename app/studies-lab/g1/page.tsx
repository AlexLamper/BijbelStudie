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
import { CARD_GRID, ResumeCard, SHELL, StudyCard } from '../_shared/ui'

/**
 * Versie G1 — Kolommen.
 *
 * G op volle breedte, met de indeling van het dashboard: links de beslissing
 * (één aanbevolen start, daaronder de startsporen als tapkaarten), rechts een
 * smalle rail met waar je gebleven was en de boekenkast. Op een breed scherm
 * zie je alles in één blik zonder te scrollen; onder xl valt de rail gewoon
 * onder de hoofdkolom.
 *
 * Verschil met G2/G3: het traject blijft één verticale lezing, de rail is
 * secundair. Een spoor openen vervangt het hele scherm.
 */

type View = { kind: 'track'; key: string } | { kind: 'category'; key: Category }

export default function StudiesLabG1Page() {
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
      <div className={SHELL}>
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
          {summarize(rows)}
        </p>

        <ol className={`mt-5 list-none p-0 ${CARD_GRID}`}>
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

  // ---- Landing: hoofdkolom + rail. ---------------------------------------
  return (
    <div className={SHELL}>
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground">
          Waar begin je?
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
          Van boven naar beneden. Eén keuze per keer — nooit een scherm vol titels.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Hoofdkolom: de beslissing. */}
        <div className="min-w-0">
          <div
            className="rounded-2xl border p-6 sm:p-8 bg-white dark:bg-card"
            style={{ borderColor: 'rgba(13,148,136,0.35)' }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: TEAL }}
            >
              Aanbevolen om mee te beginnen
            </p>
            <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
              {HERO_STUDY.title}
            </h2>
            <p className="mt-2 max-w-[70ch] text-sm sm:text-[14.5px] leading-relaxed text-gray-600 dark:text-muted-foreground">
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

          {TRACKS.length > 0 && (
            <section className="mt-7">
              <h2 className="text-[13px] font-bold text-foreground mb-2.5">
                Of kies een startspoor
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
                {TRACKS.map(track => (
                  <button
                    key={track.key}
                    onClick={() => setView({ kind: 'track', key: track.key })}
                    className="group text-left flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5 min-h-[150px] transition-colors hover:border-teal-400 dark:hover:border-teal-700"
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
        </div>

        {/* Rail: voortgang en de boekenkast. */}
        <aside className="min-w-0 flex flex-col gap-5">
          {inProgress.length > 0 && (
            <section className="flex flex-col gap-3">
              {inProgress.map(row => (
                <ResumeCard key={row.entry.study.id} entry={row.entry} status={row.status} />
              ))}
            </section>
          )}

          <section className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-4">
            <h2 className="text-[13px] font-bold text-foreground">Of blader zelf</h2>
            <ul className="mt-2 divide-y divide-gray-100 dark:divide-border">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => (
                <li key={key}>
                  <button
                    onClick={() => setView({ kind: 'category', key })}
                    className="group w-full flex items-center justify-between gap-2 py-2.5 text-left"
                  >
                    <span className="text-[13.5px] text-gray-800 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                      {CATEGORY_LABELS[key]}
                    </span>
                    <span
                      className="flex-none text-[12px] font-semibold tabular-nums"
                      style={{ color: TEAL }}
                    >
                      {COUNTS[key]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
