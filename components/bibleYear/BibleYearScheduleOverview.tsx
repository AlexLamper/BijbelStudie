'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { BibleYearSchedule } from '../../lib/bibleYear/types'
import {
  formatDutchDate,
  scheduleDayDate,
  scheduleDaySummary,
  upcomingDays,
} from '../../lib/bibleYear/display'
import { Card } from '../kit/primitives'

/** Collapsible list of the days after today, with their dates. */
export default function BibleYearScheduleOverview({
  schedule,
  fromDay,
  startDate,
  shiftDays,
  count = 14,
  defaultOpen = false,
  className = '',
}: {
  schedule: BibleYearSchedule
  /** Today's day number; the list starts the day after. */
  fromDay: number
  startDate: string
  shiftDays: number
  count?: number
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const listId = useId()
  const days = upcomingDays(schedule, fromDay, count)
  if (days.length === 0) return null

  return (
    <Card className={className}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center gap-3 px-[21px] py-[15px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] max-md:px-4"
      >
        <span className="flex-1 text-[15px] font-bold text-ink">Komende dagen</span>
        <ChevronDown
          size={18}
          strokeWidth={2.2}
          aria-hidden
          className={`flex-none text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ol id={listId} className="divide-y divide-line border-t border-line">
          {days.map(day => (
            <li key={day.day} className="flex items-baseline gap-3 px-[21px] py-2.5 max-md:px-4">
              <div className="w-[132px] flex-none max-sm:w-[104px]">
                <div className="text-[12px] font-semibold text-ink-faint">Dag {day.day}</div>
                <div className="text-[12px] text-ink-muted">
                  {formatDutchDate(scheduleDayDate(startDate, shiftDays, day.day), { weekday: true })}
                </div>
              </div>
              <div className="min-w-0 flex-1 text-[13.5px] text-ink-body">{scheduleDaySummary(day)}</div>
              <div className="flex-none text-[12px] tabular-nums text-ink-faint">{day.minutes} min</div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
