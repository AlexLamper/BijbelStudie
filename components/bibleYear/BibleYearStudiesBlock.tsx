'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useSession } from 'next-auth/react'
import {
  BIBLE_YEAR_PATH,
  behindLabel,
  dayOfPlanLabel,
  formatPercent,
} from '../../lib/bibleYear/display'
import { TEAL } from './parts'
import { useBibleYear } from './useBibleYear'

/**
 * The "Bijbel in een jaar" row under the /studies catalogue. Not started, a
 * guest, or still loading: one plain row into the plan page (which holds the
 * 1-jaar and 2-jaar options), so the server-rendered HTML already carries the
 * link. Started: a compact "Vandaag" row into the same page. Deliberately
 * modest - the rail beside the catalogue links it too; it is not the front
 * of /studies.
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

  // Not started (or finished): one normal-sized row into the plan page, where
  // the 1-jaar and 2-jaar options live - never two big option cards here.
  return (
    <Link
      href={BIBLE_YEAR_PATH}
      data-track="bible_year_option"
      className="flex flex-none items-center gap-3 rounded-card border border-line bg-surface px-[15px] py-[13px] no-underline transition-colors hover:border-line-strong"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-ink">Bijbel in een jaar</div>
        <div className="mt-[2px] truncate text-[12px] text-ink-faint">
          {enrollment?.status === 'completed'
            ? 'Je hebt de hele Bijbel gelezen'
            : 'Leesplan voor de hele Bijbel, in een of twee jaar'}
        </div>
      </div>
      <span className="flex-none text-[13px] font-semibold text-teal-dark dark:text-teal-400">Bekijk ›</span>
    </Link>
  )
}
