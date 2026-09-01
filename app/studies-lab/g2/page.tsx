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
import { CARD_GRID, ResumeStrip, SHELL, StudyCard } from '../_shared/ui'

/**
 * Versie G2 — Band.
 *
 * De aanbevolen start is geen kaart maar een band over de volle breedte van het
 * scherm: teal vlak, grote titel, één knop. Daaronder liggen de startsporen als
 * één brede rij, en de boekenkast is een strip chips — geen kaartenraster meer.
 *
 * In het detailscherm blijft die sporenrij als schakelrail bovenaan staan: je
 * springt van spoor naar spoor zonder eerst terug te gaan. Het traject voelt
 * daardoor als één doorlopende beweging in plaats van heen-en-weer.
 */

type View = { kind: 'track'; key: string } | { kind: 'category'; key: Category }

/** Trekt een blok buiten de shell-padding zodat het echt schermbreed is. */
const BLEED = '-mx-5 sm:-mx-8 xl:-mx-10'

function switcherClass(active: boolean): string {
  return `flex-none h-9 px-4 rounded-full text-[13px] font-medium transition-colors border ${
    active
      ? 'text-white border-transparent'
      : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
  }`
}

export default function StudiesLabG2Page() {
  const { statusFor, inProgress } = useStudyProgress()
  const [view, setView] = useState<View | null>(null)

  const entryById = useMemo(() => {
    const map = new Map<string, Entry>()
    for (const entry of ENTRIES) map.set(entry.study.id, entry)
    return map
  }, [])

  // ---- Detailscherm: sporenrail blijft staan. ----------------------------
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
          <ArrowLeft size={15} /> Terug naar het begin
        </button>

        {/* Schakelrail: van spoor naar spoor zonder terug. */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {TRACKS.map(item => (
            <button
              key={item.key}
              onClick={() => setView({ kind: 'track', key: item.key })}
              aria-pressed={view.kind === 'track' && view.key === item.key}
              className={switcherClass(view.kind === 'track' && view.key === item.key)}
              style={
                view.kind === 'track' && view.key === item.key
                  ? { backgroundColor: TEAL }
                  : undefined
              }
            >
              {item.label}
            </button>
          ))}
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => (
            <button
              key={key}
              onClick={() => setView({ kind: 'category', key })}
              aria-pressed={view.kind === 'category' && view.key === key}
              className={switcherClass(view.kind === 'category' && view.key === key)}
              style={
                view.kind === 'category' && view.key === key ? { backgroundColor: TEAL } : undefined
              }
            >
              {CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        <h1 className="mt-5 text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
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

  // ---- Landing: band, sporenrij, categoriestrip. -------------------------
  return (
    <div className="w-full pb-6">
      {/* Band over de volle breedte: één aanbeveling, verder niets. */}
      <section
        className="px-5 sm:px-8 xl:px-10 py-10 sm:py-14"
        style={{ backgroundColor: TEAL }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
          Aanbevolen om mee te beginnen
        </p>
        <h1 className="mt-2 text-2xl sm:text-4xl font-bold text-white">{HERO_STUDY.title}</h1>
        <p className="mt-3 max-w-[70ch] text-sm sm:text-base leading-relaxed text-white/85">
          {HERO_WHY}
        </p>
        <p className="mt-2 text-[12px] text-white/70 tabular-nums">
          {HERO_STUDY.lessons.length} {HERO_STUDY.lessons.length === 1 ? 'les' : 'lessen'} · één
          hoofdstuk per keer
        </p>
        <Link
          href={`/studies/${HERO_STUDY.id}`}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold no-underline transition-opacity hover:opacity-90"
          style={{ color: TEAL }}
        >
          Begin
          <ArrowRight size={16} />
        </Link>
      </section>

      <div className={SHELL}>
        {/* De band eet de bovenpadding op; de strip hangt er direct onder. */}
        <ResumeStrip rows={inProgress} />

        {TRACKS.length > 0 && (
          <section>
            <h2 className="text-[13px] font-bold text-foreground mb-2.5">Of kies een startspoor</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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

        {/* De boekenkast als strip, niet als raster: hij is de terugval. */}
        <section className={`mt-8 border-t border-gray-200 dark:border-border pt-5 ${BLEED} px-5 sm:px-8 xl:px-10`}>
          <h2 className="text-[13px] font-bold text-foreground">Of blader zelf</h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => (
              <button
                key={key}
                onClick={() => setView({ kind: 'category', key })}
                className="h-9 px-4 rounded-full border border-gray-200 dark:border-border bg-white dark:bg-card text-[13px] font-medium text-gray-600 dark:text-muted-foreground transition-colors hover:bg-gray-50 dark:hover:bg-secondary"
              >
                {CATEGORY_LABELS[key]}{' '}
                <span className="tabular-nums font-semibold" style={{ color: TEAL }}>
                  {COUNTS[key]}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
