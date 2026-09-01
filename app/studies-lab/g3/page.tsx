'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
 * Versie G3 — Split.
 *
 * Dezelfde inhoud als G, maar niets vervangt het scherm. Links staat een vaste
 * rail met de startsporen en de boekenkast, rechts het paneel. Je klikt door de
 * sporen heen zonder ooit terug te moeten; het beginpunt (de aanbevolen start)
 * is gewoon het eerste item in de rail en blijft één klik weg.
 *
 * Onder lg valt de rail om in een horizontale chipstrip boven het paneel, zodat
 * het op een telefoon nog steeds één ding per scherm is.
 */

type Selection = { kind: 'start' } | { kind: 'track'; key: string } | { kind: 'category'; key: Category }

function sameSelection(a: Selection, b: Selection): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'start') return true
  return a.key === (b as { key: string }).key
}

export default function StudiesLabG3Page() {
  const { statusFor, inProgress } = useStudyProgress()
  const [selection, setSelection] = useState<Selection>({ kind: 'start' })

  const entryById = useMemo(() => {
    const map = new Map<string, Entry>()
    for (const entry of ENTRIES) map.set(entry.study.id, entry)
    return map
  }, [])

  const railItems: { selection: Selection; label: string; count?: number }[] = [
    { selection: { kind: 'start' }, label: 'Start hier' },
    ...TRACKS.map(track => ({
      selection: { kind: 'track' as const, key: track.key },
      label: track.label,
      count: track.studies.length,
    })),
    ...(Object.keys(CATEGORY_LABELS) as Category[]).map(key => ({
      selection: { kind: 'category' as const, key },
      label: CATEGORY_LABELS[key],
      count: COUNTS[key],
    })),
  ]

  const track = selection.kind === 'track' ? TRACKS.find(t => t.key === selection.key) : undefined
  const rows: Entry[] =
    selection.kind === 'track'
      ? (track?.studies ?? [])
          .map(study => entryById.get(study.id))
          .filter((entry): entry is Entry => Boolean(entry))
      : selection.kind === 'category'
        ? BY_CATEGORY(selection.key)
        : []

  return (
    <div className={SHELL}>
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground">
          Waar begin je?
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
          Kies links een route. Het paneel ernaast verandert mee — je hoeft nooit terug.
        </p>
      </header>

      {inProgress.length > 0 && (
        <div className="mt-5">
          <ResumeStrip rows={inProgress} />
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
        {/* Rail — onder lg een horizontale strip. */}
        <nav className="min-w-0">
          <ul className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 list-none p-0 m-0">
            {railItems.map(item => {
              const active = sameSelection(item.selection, selection)
              return (
                <li key={`${item.selection.kind}-${'key' in item.selection ? item.selection.key : 'start'}`} className="flex-none lg:w-full">
                  <button
                    onClick={() => setSelection(item.selection)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full text-left h-9 lg:h-auto px-4 lg:px-3.5 lg:py-2.5 rounded-full lg:rounded-lg text-[13px] font-medium transition-colors border lg:border-0 lg:flex lg:items-center lg:justify-between gap-2 whitespace-nowrap lg:whitespace-normal ${
                      active
                        ? 'text-white border-transparent'
                        : 'bg-white dark:bg-card lg:bg-transparent lg:dark:bg-transparent border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
                    }`}
                    style={active ? { backgroundColor: TEAL } : undefined}
                  >
                    <span>{item.label}</span>
                    {item.count != null && (
                      <span
                        className="hidden lg:inline flex-none text-[12px] font-semibold tabular-nums"
                        style={{ color: active ? 'rgba(255,255,255,0.8)' : TEAL }}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Paneel. */}
        <div className="min-w-0">
          {selection.kind === 'start' ? (
            <div
              className="rounded-2xl border p-6 sm:p-10 bg-white dark:bg-card"
              style={{ borderColor: 'rgba(13,148,136,0.35)' }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: TEAL }}
              >
                Aanbevolen om mee te beginnen
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground">
                {HERO_STUDY.title}
              </h2>
              <p className="mt-3 max-w-[70ch] text-sm sm:text-[15px] leading-relaxed text-gray-600 dark:text-muted-foreground">
                {HERO_WHY}
              </p>
              <p className="mt-2 text-[12px] text-gray-400 dark:text-muted-foreground tabular-nums">
                {HERO_STUDY.lessons.length} {HERO_STUDY.lessons.length === 1 ? 'les' : 'lessen'} ·
                één hoofdstuk per keer
              </p>
              <Link
                href={`/studies/${HERO_STUDY.id}`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                Begin
                <ArrowRight size={16} />
              </Link>

              <p className="mt-6 border-t border-gray-100 dark:border-border pt-4 text-[13px] text-gray-500 dark:text-muted-foreground">
                Liever iets anders? Kies links een startspoor, of blader door de boekenkast.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
                {selection.kind === 'track'
                  ? (track?.label ?? '')
                  : CATEGORY_LABELS[selection.key]}
              </h2>
              <p className="mt-1 text-[13px] text-gray-500 dark:text-muted-foreground">
                {selection.kind === 'track'
                  ? track?.blurb
                  : 'Op volgorde van de canon, zoals ze in de Bijbel staan.'}
              </p>
              <p className="mt-2 text-[13px] text-gray-600 dark:text-muted-foreground">
                {summarize(rows)}
              </p>

              <ol className={`mt-5 list-none p-0 ${CARD_GRID}`}>
                {rows.map((entry, index) => (
                  <li key={entry.study.id} className="relative">
                    {selection.kind === 'track' && (
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
