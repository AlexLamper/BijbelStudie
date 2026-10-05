"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { BookOpen, ChartNoAxesColumn } from "lucide-react"
import {
  NT_BOOKS,
  OT_BOOKS,
  useDashboardData,
} from "../../hooks/useDashboardData"
import type { DashboardResume } from "../../lib/resumeTypes"
import ResumeCard, { ResumeCardSkeleton } from "../../components/dashboard/ResumeCard"
import BillingNotices from "../../components/pricing/BillingNotices"
import DailyVerseCard from "../../components/dashboard/DailyVerseCard"
import DashboardFeedbackSlot from "../../components/feedback/DashboardFeedbackSlot"
import { FriendsDashboardSection } from "../../components/friends/FriendsDashboardSection"
import { useTreeSummary } from "../../components/dashboard/ProgressTree"
import GrowthAnnouncementCard from "../../components/dashboard/GrowthAnnouncementCard"
import TreeCard from "../../components/dashboard/TreeCard"
import AppShell from "../../components/shell/AppShell"
import StreakPill from "../../components/kit/StreakPill"
import {
  Card,
  HeatGrid,
  HeatLegend,
  WeekBars,
} from "../../components/kit/primitives"

/**
 * The dashboard (design_handoff_web/PAGES.md §1).
 *
 * Two columns: the work at `flex-1` and a 320 px rail, 20 px apart. The work
 * column is the verse, the one thing to carry on with (ResumeCard) and the
 * friends block; the rail is the tree, the week and the 66 books.
 *
 * Every number on this screen comes from the hooks that were already here -
 * `useDashboardData` and `useTreeSummary` are untouched. The one addition is
 * `useDashboardResume` below: the server-built `DashboardResume`, so "Verder
 * waar je was" names the running lesson or the last chapter.
 *
 * THE READING HEATMAP is the one derived value RULES.md §3 asks for: a 0-4 step
 * per book, computed here from `bookReadRatio`, which the hook already returns.
 * Read-only, no model change.
 */

/** The five-step ramp, from the ratio of a book that has been read. */
function heatStep(ratio: number): number {
  if (ratio <= 0) return 0
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 1) return 3
  return 4
}

/**
 * The resume card's data, from GET /api/v1/dashboard/resume.
 *
 * That route replaces this page's former /api/v1/study-enrollments call: the
 * same single indexed enrolment read, and the server builds the whole
 * `DashboardResume` (lib/dashboardResume.ts) - the exact object the app gets
 * inside GET /api/v1/dashboard - so lesson, step and schedule are resolved once,
 * on the server, with the lesson's real step list. A guest gets a 401 before
 * any query and the card shows its start prompt.
 */
function useDashboardResume() {
  const [resume, setResume] = useState<DashboardResume | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/dashboard/resume")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return
        setResume((data?.resume as DashboardResume | undefined) ?? null)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { resume, loading }
}

/**
 * The one line a guest sees at the top of the otherwise-generic dashboard:
 * everything below it is already the empty state a brand new account would
 * see (hooks/useDashboardData.ts fails closed with no session), this just
 * says why and offers the two doors GuestGate used to.
 */
function GuestBanner() {
  return (
    <Card className="flex flex-none flex-wrap items-center justify-between gap-x-6 gap-y-3 border-teal/30 bg-teal-faint px-6 py-4 max-md:px-5">
      <p className="min-w-[min(100%,260px)] flex-1 text-[13.5px] leading-[1.6] text-ink-body">
        Dit is een voorbeelddashboard. Maak een gratis account om je leesstreak, voortgang en
        tekst van de dag te bewaren.
      </p>
      <div className="flex flex-none items-center gap-3">
        <Link
          href="/registreren?next=%2Fdashboard"
          data-track="guest_gate_register"
          className="inline-flex h-9 items-center rounded-btn bg-teal px-4 text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
        >
          Gratis account maken
        </Link>
        <Link
          href="/inloggen?next=%2Fdashboard"
          data-track="guest_gate_signin"
          className="text-[13px] font-semibold text-ink-body no-underline transition-colors hover:text-teal dark:hover:text-teal-400"
        >
          Ik heb al een account
        </Link>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const { status } = useSession()
  const isGuest = status !== "authenticated"
  const d = useDashboardData()
  const tree = useTreeSummary()
  const { resume, loading: resumeLoading } = useDashboardResume()

  const level = d.level?.level ?? tree.level
  const pct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)
  const remainingXp = d.level ? Math.max(0, d.level.xpForNextLevel - d.level.xpIntoLevel) : tree.remainingXp

  const todayIndex = Math.max(0, d.weekDays.findIndex(day => day.isToday))

  const otLevels = OT_BOOKS.map(b => heatStep(d.bookReadRatio(b)))
  const ntLevels = NT_BOOKS.map(b => heatStep(d.bookReadRatio(b)))

  return (
    <AppShell title="Dashboard">
      <div className="flex min-h-full gap-5 max-md:flex-col">
        {/* ── The work ─────────────────────────────────────────────── */}
        {/* Below md the page stacks: this column first at its own height, the
            rail under it, everything 20 px apart. */}
        <div className="flex min-w-0 flex-1 flex-col gap-[18px] max-md:flex-none max-md:gap-5">
          {isGuest && <GuestBanner />}

          {/* A flex gap is not created for a `display:none` child, so on the
              usual screen - where there is no billing notice - the verse still
              starts flush with the rail beside it. */}
          <div className="empty:hidden">
            <BillingNotices />
          </div>

          <DailyVerseCard verse={d.verse} loading={d.verseLoading} />

          {/* Once, for accounts from before growth v2: right under the verse
              card, whose landscape is the reader's own tree. Renders nothing
              for everyone else. */}
          <GrowthAnnouncementCard />

          {/* At most one feedback card: an unseen answer, a finished-study
              rating or a welcome-back question. Usually nothing. */}
          <DashboardFeedbackSlot />

          {/* Verder waar je was: the original minimal one-row card (eyebrow,
              title, slim bar, one teal button), fed by the server's resume. */}
          {resumeLoading ? <ResumeCardSkeleton /> : <ResumeCard resume={resume} />}

          {/* Bij je vrienden: the two newest posts in the kring, or the
              invitation. The same block the app's Start tab carries, so the
              kring is in the same place on both. */}
          <FriendsDashboardSection />
        </div>

        {/* ── The rail ─────────────────────────────────────────────── */}
        <aside className="flex w-[320px] flex-none flex-col gap-4 max-md:w-full">
          {/* Je boom (design 41b): one low row - the tree in a ring with the
              level on it, three lines of text, a chevron. The card is the link;
              the progress is the ring, so there is no bar and no "Bekijken →".
              components/dashboard/TreeCard.tsx owns the lay-out. */}
          <TreeCard level={level} pct={pct} remainingXp={remainingXp} />

          {/* Deze week */}
          <Card className="flex-none p-[18px]">
            <div className="flex items-center gap-[9px]">
              <ChartNoAxesColumn size={16} className="text-teal" />
              <span className="flex-1 text-[15px] font-bold text-ink">Deze week</span>
              <span className="text-[12.5px] text-ink-faint tabular-nums">
                {d.weekTotal}× gelezen
              </span>
            </div>
            <div className="mt-[15px]">
              <WeekBars
                values={d.weekDays.map(day => day.count)}
                labels={d.weekDays.map(day => day.label)}
                todayIndex={todayIndex}
              />
            </div>
            {/* The streak, under the week it is made of: a flame and the days
                in a row, so the number says what it counts. Hidden at 0 -
                there is no reeks to name yet. */}
            {d.streak > 0 && (
              <div className="mt-[15px] border-t border-line-soft pt-[13px]">
                <StreakPill streak={d.streak} withLabel />
              </div>
            )}
          </Card>

          {/* Bijbelboeken - `flex-none` so the card stops at its content
              instead of stretching to the foot of the rail. */}
          <Card className="flex-none p-[18px]">
            <Link href="/profiel/bijbel" className="group flex items-center gap-[11px] no-underline">
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-btn bg-teal-tint">
                <BookOpen size={19} strokeWidth={1.8} className="text-teal" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-ink">Bijbelboeken</div>
                <div className="mt-[2px] text-[12.5px] text-ink-muted tabular-nums">
                  {d.booksWithProgress} van 66 boeken geopend
                </div>
              </div>
              <span className="flex-none whitespace-nowrap text-[13px] font-semibold text-teal dark:text-teal-400 group-hover:text-teal-dark dark:group-hover:text-teal-300">
                Bekijken →
              </span>
            </Link>

            <div className="mt-[14px]">
              <HeatLegend />
            </div>

            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.9px] text-ink-faint">
              Oude Testament <span className="font-normal">({OT_BOOKS.length} boeken)</span>
            </div>
            <div className="mt-2">
              <HeatGrid levels={otLevels} columns={12} titles={OT_BOOKS as string[]} />
            </div>

            <div className="mt-[14px] text-[11px] font-semibold uppercase tracking-[0.9px] text-ink-faint">
              Nieuwe Testament <span className="font-normal">({NT_BOOKS.length} boeken)</span>
            </div>
            <div className="mt-2">
              <HeatGrid levels={ntLevels} columns={12} titles={NT_BOOKS as string[]} />
            </div>
          </Card>
        </aside>
      </div>
    </AppShell>
  )
}
