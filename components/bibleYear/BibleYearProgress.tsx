'use client'

import { useState } from 'react'
import type {
  BibleYearCatalogueEntry,
  BibleYearEnrollmentDTO,
  BibleYearTrackEntry,
} from '../../lib/bibleYear/types'
import { formatDutchDate, formatPercent, planLabel, trackLabel } from '../../lib/bibleYear/display'
import { Card } from '../kit/primitives'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { PrimaryButton, ProgressBar } from './parts'

const BIBLE_CHAPTERS = 1189

export type BibleYearProgressProps = {
  enrollment: BibleYearEnrollmentDTO
  catalogue?: BibleYearCatalogueEntry[]
  tracks?: BibleYearTrackEntry[]
  /** "Stoppen met dit leesplan", after the confirm dialog. Omit to hide it. */
  onStop?: () => void | Promise<unknown>
  pending?: boolean
  className?: string
}

/** The plan at a glance: share read, chapters, plan and order, start and end. */
export function BibleYearProgress({
  enrollment,
  catalogue,
  tracks,
  onStop,
  pending = false,
  className = '',
}: BibleYearProgressProps) {
  const [confirmStop, setConfirmStop] = useState(false)

  return (
    <Card className={`px-[21px] py-[19px] max-md:px-4 ${className}`}>
      <h2 className="text-[16px] font-bold text-ink">Je voortgang</h2>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[25px] font-bold tabular-nums tracking-[-0.5px] text-ink">
          {formatPercent(enrollment.percentBible)}
        </span>
        <span className="text-[13px] text-ink-muted">van de Bijbel</span>
      </div>
      <div className="mt-2">
        <ProgressBar percent={enrollment.percentBible} label="Deel van de Bijbel gelezen" />
      </div>
      <p className="mt-2 text-[12.5px] text-ink-faint">
        {enrollment.chaptersRead} van {BIBLE_CHAPTERS} hoofdstukken
      </p>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[13.5px]">
        <dt className="text-ink-muted">Leesplan</dt>
        <dd className="font-semibold text-ink">
          {planLabel(enrollment.planKey, catalogue)} &middot; {trackLabel(enrollment.track, tracks)}
        </dd>
        <dt className="text-ink-muted">Begonnen</dt>
        <dd className="font-semibold text-ink">{formatDutchDate(enrollment.startDate)}</dd>
        {enrollment.status === 'active' && (
          <>
            <dt className="text-ink-muted">Klaar op</dt>
            <dd className="font-semibold text-ink">{formatDutchDate(enrollment.expectedEndDate)}</dd>
          </>
        )}
      </dl>

      {onStop && enrollment.status === 'active' && (
        <>
          <button
            type="button"
            onClick={() => setConfirmStop(true)}
            disabled={pending}
            className="mt-5 text-[13px] font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
          >
            Stoppen met dit leesplan
          </button>
          <ConfirmDialog
            open={confirmStop}
            onCancel={() => setConfirmStop(false)}
            onConfirm={async () => {
              await onStop()
              setConfirmStop(false)
            }}
            pending={pending}
            title="Stoppen met dit leesplan"
            description="Je leesplan stopt. Wat je gelezen hebt blijft bewaard, ook in je voortgang. Je kunt later altijd opnieuw beginnen."
            confirmLabel="Stoppen"
            pendingLabel="Bezig…"
          />
        </>
      )}
    </Card>
  )
}

/** The finish: the whole Bible read, and the way to go round again. */
export function BibleYearComplete({
  enrollment,
  onRestart,
  className = '',
}: {
  enrollment: BibleYearEnrollmentDTO
  onRestart: () => void
  className?: string
}) {
  return (
    <Card className={`px-[21px] py-[22px] max-md:px-4 ${className}`}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal-dark dark:text-teal-400">
        Bijbel in een jaar
      </p>
      <h2 className="mt-1 text-[22px] font-bold tracking-[-0.4px] text-ink">Je hebt de hele Bijbel gelezen</h2>
      <p className="mt-2 text-[14.5px] leading-[1.7] text-ink-body">
        Van Genesis tot Openbaring, {enrollment.chaptersRead} hoofdstukken
        {enrollment.completedAt ? `, afgerond op ${formatDutchDate(enrollment.completedAt.slice(0, 10))}` : ''}.
        Wil je nog een keer? Kies opnieuw een duur en een volgorde.
      </p>
      <div className="mt-4">
        <ProgressBar percent={100} label="Deel van de Bijbel gelezen" />
      </div>
      <PrimaryButton onClick={onRestart} className="mt-5">
        Opnieuw beginnen
      </PrimaryButton>
    </Card>
  )
}

export default BibleYearProgress
