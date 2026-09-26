'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { BibleYearPlanKey, BibleYearSchedule } from '../../lib/bibleYear/types'
import { fetchBibleYearSchedule } from '../../lib/bibleYear/client'
import { BIBLE_YEAR_PATH } from '../../lib/bibleYear/display'
import { Card, Skeleton } from '../kit/primitives'
import BibleYearStart from './BibleYearStart'
import BibleYearTodayCard from './BibleYearTodayCard'
import BibleYearScheduleOverview from './BibleYearScheduleOverview'
import { BibleYearComplete, BibleYearProgress } from './BibleYearProgress'
import { SecondaryButton } from './parts'
import { useBibleYear } from './useBibleYear'

/**
 * The signed-in body of /studies/bijbel-in-een-jaar: the start flow when no
 * plan runs, today + progress + the coming days while one does, and the
 * finish with "Opnieuw beginnen" once the whole Bible is read.
 */
export default function BibleYearHome({ initialPlan }: { initialPlan?: BibleYearPlanKey }) {
  const bibleYear = useBibleYear()
  const { status, data, pending, error } = bibleYear
  const [restarting, setRestarting] = useState(false)
  const [schedule, setSchedule] = useState<BibleYearSchedule | null>(null)

  const enrollment = data?.enrollment ?? null
  const active = enrollment?.status === 'active' ? enrollment : null

  // The static schedule, for the backlog links and "Komende dagen". Keyed on
  // the plan's own version so a later schedule tweak never shows the wrong days.
  const scheduleKey = active ? `${active.planKey}:${active.track}:${active.scheduleVersion}` : null
  useEffect(() => {
    // A new plan (a restart, another track or schedule version) or none at
    // all: drop the old days first, so they never show under the new plan.
    setSchedule(null)
    if (!active) return
    let cancelled = false
    void fetchBibleYearSchedule(active.planKey, active.track, active.scheduleVersion).then(result => {
      if (!cancelled && result.ok) setSchedule(result.data)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleKey])

  if (status === 'loading') {
    return (
      <div role="status" aria-label="Leesplan laden" className="flex flex-col gap-4">
        <Skeleton className="h-[220px] rounded-card" />
        <Skeleton className="h-[120px] rounded-card" />
      </div>
    )
  }

  if (status === 'signedOut') {
    return (
      <Card className="px-[21px] py-[19px]">
        <p className="text-[14.5px] text-ink-body">Log opnieuw in om je leesplan te zien.</p>
        <Link
          href={`/inloggen?next=${encodeURIComponent(BIBLE_YEAR_PATH)}`}
          className="mt-3 inline-flex text-[14px] font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400"
        >
          Inloggen ›
        </Link>
      </Card>
    )
  }

  if (status === 'error' || !data) {
    return (
      <Card className="px-[21px] py-[19px]">
        <p className="text-[14.5px] text-ink-body">{error ?? 'Je leesplan kon niet worden geladen.'}</p>
        <SecondaryButton onClick={() => void bibleYear.refresh()} className="mt-3">
          Opnieuw proberen
        </SecondaryButton>
      </Card>
    )
  }

  if (enrollment?.status === 'completed' && !restarting) {
    return <BibleYearComplete enrollment={enrollment} onRestart={() => setRestarting(true)} />
  }

  if (!active || !data.today) {
    const again = enrollment?.status === 'completed'
    return (
      <div className="flex max-w-[640px] flex-col gap-4">
        {!again && (
          <p className="text-[14.5px] leading-[1.7] text-ink-body">
            Lees de hele Bijbel in een jaar of in twee jaar. Elke dag een stuk van ongeveer dezelfde lengte,
            en je ziet steeds hoe ver je bent.
          </p>
        )}
        <BibleYearStart
          catalogue={data.catalogue}
          tracks={data.tracks}
          initialPlan={initialPlan}
          pending={pending}
          error={error}
          heading={again ? 'Opnieuw beginnen' : 'Begin met Bijbel in een jaar'}
          onCancel={again ? () => setRestarting(false) : undefined}
          onSubmit={async body => {
            const ok = again ? await bibleYear.restart(body) : await bibleYear.start(body)
            if (ok) setRestarting(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex gap-5 max-lg:flex-col max-lg:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <BibleYearTodayCard
          today={data.today}
          variant="full"
          startDate={active.startDate}
          schedule={schedule}
          onMarkRefs={bibleYear.markRefs}
          onMarkDay={bibleYear.markDay}
          onShift={bibleYear.shift}
          pending={pending}
          error={error}
        />
        {schedule && (
          <BibleYearScheduleOverview
            schedule={schedule}
            fromDay={Math.max(0, data.today.dayNumber)}
            startDate={active.startDate}
            shiftDays={active.shiftDays}
          />
        )}
      </div>
      <div className="flex flex-col gap-4 lg:w-[326px] lg:flex-none">
        <BibleYearProgress
          enrollment={active}
          catalogue={data.catalogue}
          tracks={data.tracks}
          onStop={bibleYear.stop}
          pending={pending}
        />
      </div>
    </div>
  )
}
