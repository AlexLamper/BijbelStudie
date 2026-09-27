'use client'

import type { BibleYearStateResponse } from '../../lib/bibleYear/types'
import { Skeleton } from '../kit/primitives'
import BibleYearTodayCard from './BibleYearTodayCard'
import { useBibleYear } from './useBibleYear'

/**
 * Self-fetching "Vandaag" card for pages that only want the card (the
 * dashboard). Renders nothing for a guest or when no plan is running, unless
 * `fallback` is given - e.g. a small "Begin met Bijbel in een jaar" teaser.
 */
export default function BibleYearTodayContainer({
  initial,
  variant = 'compact',
  fallback = null,
  skeleton = true,
  className = '',
}: {
  /** Already-fetched GET /api/v1/bible-year state; skips the first request. */
  initial?: BibleYearStateResponse | null
  variant?: 'full' | 'compact'
  /** Shown when signed out or without an active plan. */
  fallback?: React.ReactNode
  /**
   * Show a skeleton while fetching. The dashboard turns it off: it only
   * fetches when the seed failed, so whether a plan runs is unknown, and a
   * skeleton that then collapses to nothing is a second layout jump.
   */
  skeleton?: boolean
  className?: string
}) {
  const bibleYear = useBibleYear({ initial })
  const { status, data } = bibleYear

  if (status === 'loading') return skeleton ? <Skeleton className={`h-[180px] rounded-card ${className}`} /> : null
  if (status !== 'ready' || !data?.today || data.enrollment?.status !== 'active') return <>{fallback}</>

  return (
    <BibleYearTodayCard
      today={data.today}
      variant={variant}
      startDate={data.enrollment.startDate}
      onMarkRefs={bibleYear.markRefs}
      onMarkDay={bibleYear.markDay}
      onShift={bibleYear.shift}
      pending={bibleYear.pending}
      error={bibleYear.error}
      className={className}
    />
  )
}
