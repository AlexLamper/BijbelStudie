'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useSession } from 'next-auth/react'
import {
  BIBLE_YEAR_PATH,
  behindLabel,
  DEFAULT_CATALOGUE,
  dayOfPlanLabel,
  formatPercent,
} from '../../lib/bibleYear/display'
import { TEAL } from './parts'
import { useBibleYear } from './useBibleYear'

/**
 * The "Bijbel in een jaar" block at the top of /studies. Not started, a guest,
 * or still loading: two option cards, 1 jaar and 2 jaar, into the plan page -
 * so the server-rendered HTML already carries the real links. Started: a
 * compact "Vandaag" row into the same page.
 *
 * A guest never fetches: the state is only requested once the session (from
 * the /studies layout's SessionProvider) says the visitor is signed in.
 */
export default function BibleYearStudiesBlock() {
  const { status: sessionStatus } = useSession()
  const { data } = useBibleYear({ enabled: sessionStatus === 'authenticated' })

  const enrollment = data?.enrollment ?? null
  const today = data?.today ?? null

  if (enrollment?.status === 'active' && today) {
    const behind = behindLabel(today.behindDays)
    const subtitle = today.todayDone
      ? null
      : behind ?? today.portions.map(portion => portion.label).join(' · ')
    const pct = Math.max(0, Math.min(100, today.percentBible))
    return (
      <Link
        href={BIBLE_YEAR_PATH}
        data-track="bible_year_today"
        className="flex flex-none items-center gap-[13px] rounded-card border border-line bg-surface px-[15px] py-[13px] no-underline transition-colors hover:border-line-strong"
      >
        <div
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[11px] font-bold text-teal-dark dark:text-teal-400"
          style={{ background: `conic-gradient(${TEAL} 0 ${pct}%, var(--line) ${pct}% 100%)` }}
        >
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface">
            {formatPercent(today.percentBible)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-ink">
            Bijbel in een jaar &middot; {today.dayNumber > 0 ? dayOfPlanLabel(today.dayNumber, today.totalDays) : 'begint binnenkort'}
          </div>
          <div className="mt-[2px] flex items-center gap-1 truncate text-[12px] text-ink-faint">
            {today.todayDone ? (
              <>
                <Check size={13} strokeWidth={2.6} aria-hidden style={{ color: TEAL }} />
                <span>Vandaag gelezen</span>
              </>
            ) : (
              <span className="truncate">{subtitle}</span>
            )}
          </div>
        </div>
        <span className="flex-none text-[13px] font-semibold text-teal-dark dark:text-teal-400">
          {today.todayDone ? 'Bekijk' : 'Lezen'} ›
        </span>
      </Link>
    )
  }

  const plans = data?.catalogue?.length ? data.catalogue : DEFAULT_CATALOGUE

  return (
    <div className="flex flex-none flex-col gap-[10px]">
      <div className="flex items-baseline gap-3">
        <span className="text-[13px] font-semibold text-ink">Bijbel in een jaar</span>
        <span className="text-[12.5px] text-ink-faint">
          {enrollment?.status === 'completed' ? 'Je hebt de hele Bijbel gelezen' : 'De hele Bijbel, elke dag een stuk'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plans.map(plan => (
          <Link
            key={plan.planKey}
            href={`${BIBLE_YEAR_PATH}?plan=${plan.planKey}`}
            data-track="bible_year_option"
            className="flex items-center gap-3 rounded-card border border-line bg-surface px-[15px] py-[13px] no-underline transition-colors hover:border-line-strong"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-ink">De Bijbel in {plan.label}</div>
              <div className="mt-[2px] text-[12px] text-ink-faint">
                {plan.totalDays} dagen &middot; ongeveer {plan.minutesPerDay} min per dag
              </div>
            </div>
            <span className="flex-none text-[13px] font-semibold text-teal-dark dark:text-teal-400">Start ›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
