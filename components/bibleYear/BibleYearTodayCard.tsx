'use client'

import { useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown } from 'lucide-react'
import type {
  BibleYearPortionState,
  BibleYearSchedule,
  BibleYearToday,
} from '../../lib/bibleYear/types'
import {
  aheadLabel,
  behindLabel,
  chapterName,
  dayOfPlanLabel,
  formatDutchDate,
  formatPercent,
  minutesLabel,
  refReaderHref,
  shiftedEndDate,
  STRAND_LABEL,
} from '../../lib/bibleYear/display'
import { Card } from '../kit/primitives'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ERROR_TEXT, PrimaryButton, ProgressBar, SecondaryButton, TEAL, TickBox } from './parts'

type Refs = { code: string; chapter: number }[]
type Callback<A extends unknown[]> = (...args: A) => void | Promise<unknown>

export type BibleYearTodayCardProps = {
  today: BibleYearToday
  /** 'full' on the plan page; 'compact' for the dashboard (tighter, with a link to the page). */
  variant?: 'full' | 'compact'
  /** Enrollment start date, for the "begint op" line when dayNumber is 0. */
  startDate?: string
  /** When given, backlog days list their chapters as reader links. */
  schedule?: BibleYearSchedule | null
  /** Tick one chapter, or "Gelezen" on a whole portion. */
  onMarkRefs?: Callback<[refs: Refs, read: boolean]>
  /** "Gelezen" on a backlog day. */
  onMarkDay?: Callback<[day: number, read: boolean]>
  /** "Schema verschuiven", after the confirm dialog. */
  onShift?: Callback<[]>
  pending?: boolean
  error?: string | null
  /** Show "Naar je leesplan" at the foot. Defaults to true for 'compact'. */
  showPageLink?: boolean
  className?: string
}

/**
 * The "Vandaag" card of Bijbel in een jaar: today's portions with a tick box
 * and a reader link per chapter, "Gelezen" per portion, the share of the Bible
 * read, and - gently, never in red - how far behind the reader is with the two
 * ways back: "Bijlezen" (the backlog, oldest first) and "Schema verschuiven".
 *
 * Presentational: it holds only open/closed state. The data and the callbacks
 * come from the caller; BibleYearTodayContainer wires them to the API.
 */
export default function BibleYearTodayCard({
  today,
  variant = 'full',
  startDate,
  schedule,
  onMarkRefs,
  onMarkDay,
  onShift,
  pending = false,
  error,
  showPageLink,
  className = '',
}: BibleYearTodayCardProps) {
  const compact = variant === 'compact'
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [confirmShift, setConfirmShift] = useState(false)
  const backlogId = useId()

  const notStarted = today.dayNumber <= 0
  const behind = behindLabel(today.behindDays)
  const ahead = aheadLabel(today.aheadDays)
  const scheduleDays = useMemo(
    () => new Map((schedule?.days ?? []).map(day => [day.day, day])),
    [schedule],
  )
  const linkToPage = showPageLink ?? compact

  const heading = notStarted
    ? startDate
      ? `Je begint op ${formatDutchDate(startDate, { weekday: true })}`
      : 'Je leesplan begint binnenkort'
    : dayOfPlanLabel(today.dayNumber, today.totalDays)

  return (
    <Card className={`flex flex-col ${compact ? 'px-4 py-4' : 'px-[21px] py-[19px] max-md:px-4'} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal-dark dark:text-teal-400">
            {compact ? 'Bijbel in een jaar' : 'Vandaag'}
          </p>
          <h2 className={`mt-1 font-bold tracking-[-0.3px] text-ink ${compact ? 'text-[17px]' : 'text-[20px]'}`}>
            {heading}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-muted">
            {today.todayDone ? (
              <>
                <Check size={15} strokeWidth={2.6} aria-hidden style={{ color: TEAL }} />
                <span className="font-semibold text-teal-dark dark:text-teal-400">Vandaag gelezen</span>
              </>
            ) : notStarted ? (
              today.portions.length > 0 ? 'Je mag alvast beginnen: vooruit lezen telt mee.' : null
            ) : (
              minutesLabel(today.minutesEstimate)
            )}
          </p>
        </div>
        <div className="flex-none text-right">
          <div className="text-[18px] font-bold tabular-nums text-ink">{formatPercent(today.percentBible)}</div>
          <div className="text-[11.5px] text-ink-faint">van de Bijbel</div>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar percent={today.percentBible} label="Deel van de Bijbel gelezen" />
      </div>

      {today.portions.length > 0 && (
        <ul className={`flex flex-col ${compact ? 'mt-3 gap-2' : 'mt-4 gap-3'}`}>
          {today.portions.map((portion, index) => (
            <PortionRow
              key={`${portion.strand}-${index}`}
              portion={portion}
              compact={compact}
              pending={pending}
              onMarkRefs={onMarkRefs}
            />
          ))}
        </ul>
      )}

      {(behind || ahead) && (
        <div className="mt-4 rounded-[12px] bg-line-soft px-[14px] py-3 dark:bg-white/5">
          {behind ? (
            <>
              <p className="text-[13.5px] text-ink-body">
                {behind}. Geen probleem: lees de gemiste dagen bij, of schuif je schema op.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <SecondaryButton
                  onClick={() => setBacklogOpen(open => !open)}
                  aria-expanded={backlogOpen}
                  aria-controls={backlogId}
                >
                  Bijlezen
                  <ChevronDown
                    size={15}
                    strokeWidth={2.2}
                    aria-hidden
                    className={`transition-transform ${backlogOpen ? 'rotate-180' : ''}`}
                  />
                </SecondaryButton>
                {onShift && (
                  <SecondaryButton onClick={() => setConfirmShift(true)} disabled={pending}>
                    Schema verschuiven
                  </SecondaryButton>
                )}
              </div>
              {backlogOpen && (
                <ul id={backlogId} className="mt-3 flex flex-col divide-y divide-line">
                  {today.backlogDays.length === 0 && (
                    <li className="py-2 text-[13px] text-ink-muted">Alles is bijgelezen.</li>
                  )}
                  {today.backlogDays.map(day => {
                    const refs = scheduleDays.get(day.day)?.portions.flatMap(portion => portion.refs) ?? []
                    return (
                      <li key={day.day} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-ink-faint">Dag {day.day}</div>
                          <div className="text-[13.5px] font-semibold text-ink">{day.label}</div>
                          {refs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              {refs.map(ref => (
                                <Link
                                  key={`${ref.code}-${ref.chapter}`}
                                  href={refReaderHref(ref)}
                                  className="text-[12.5px] font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400"
                                >
                                  {chapterName(ref.book, ref.chapter)}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                        {onMarkDay && (
                          <SecondaryButton onClick={() => void onMarkDay(day.day, true)} disabled={pending}>
                            Gelezen
                          </SecondaryButton>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="text-[13.5px] text-ink-body">{ahead}. Mooi, dat telt allemaal mee.</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className={`mt-3 text-[13px] ${ERROR_TEXT}`}>
          {error}
        </p>
      )}

      {linkToPage && (
        <Link
          href={today.href}
          className="mt-4 self-start text-[13px] font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400"
        >
          Naar je leesplan ›
        </Link>
      )}

      {onShift && (
        <ConfirmDialog
          open={confirmShift}
          onCancel={() => setConfirmShift(false)}
          onConfirm={async () => {
            await onShift()
            setConfirmShift(false)
          }}
          pending={pending}
          title="Schema verschuiven"
          description={
            <>
              Je schema schuift {today.behindDays === 1 ? '1 dag' : `${today.behindDays} dagen`} op, zodat je vandaag
              verder leest waar je gebleven bent. Je bent dan klaar op{' '}
              <strong className="font-semibold text-ink">{formatDutchDate(shiftedEndDate(today))}</strong>.
            </>
          }
          confirmLabel="Verschuiven"
          pendingLabel="Bezig…"
        />
      )}
    </Card>
  )
}

function PortionRow({
  portion,
  compact,
  pending,
  onMarkRefs,
}: {
  portion: BibleYearPortionState
  compact: boolean
  pending: boolean
  onMarkRefs?: Callback<[refs: Refs, read: boolean]>
}) {
  const strand = portion.strand === 'all' ? null : STRAND_LABEL[portion.strand]
  const unread = portion.refs.filter(ref => !ref.read)

  return (
    <li className={`rounded-[12px] border border-line ${compact ? 'px-3 py-2.5' : 'px-[14px] py-3'}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {strand && <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-faint">{strand}</div>}
          <div className="truncate text-[14.5px] font-bold text-ink">{portion.label}</div>
        </div>
        {portion.done ? (
          <span className="inline-flex flex-none items-center gap-1 text-[12.5px] font-semibold text-teal-dark dark:text-teal-400">
            <Check size={14} strokeWidth={2.6} aria-hidden /> Gelezen
          </span>
        ) : onMarkRefs ? (
          <PrimaryButton
            onClick={() => void onMarkRefs(unread.map(({ code, chapter }) => ({ code, chapter })), true)}
            disabled={pending}
            className="min-h-9 px-[14px] text-[13px]"
          >
            Gelezen
          </PrimaryButton>
        ) : null}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5">
        {portion.refs.map(ref => {
          const name = chapterName(ref.book, ref.chapter)
          return (
            <li key={`${ref.code}-${ref.chapter}`} className="flex items-center gap-1.5">
              {onMarkRefs && (
                <TickBox
                  checked={ref.read}
                  onChange={next => void onMarkRefs([{ code: ref.code, chapter: ref.chapter }], next)}
                  label={`${name} gelezen`}
                />
              )}
              <Link
                href={refReaderHref(ref)}
                className={`text-[13.5px] font-semibold no-underline hover:underline ${
                  ref.read ? 'text-ink-muted' : 'text-teal-dark dark:text-teal-400'
                }`}
              >
                {name}
              </Link>
            </li>
          )
        })}
      </ul>
    </li>
  )
}
