"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, ChartNoAxesColumn } from "lucide-react"
import { CHAPTER_COUNTS } from "../../lib/data/bible-chapter-counts"
import { curatedStudies } from "../../lib/data/curated-studies"
import {
  NT_BOOKS,
  OT_BOOKS,
  readHref,
  useDashboardData,
} from "../../hooks/useDashboardData"
import BillingNotices from "../../components/pricing/BillingNotices"
import DailyVerseCard from "../../components/dashboard/DailyVerseCard"
import { useTreeSummary } from "../../components/dashboard/ProgressTree"
import AppShell from "../../components/shell/AppShell"
import StudyArtwork from "../studies/StudyArtwork"
import TreeAvatar from "../../components/kit/TreeAvatar"
import {
  Card,
  HeatGrid,
  HeatLegend,
  ProgressBar,
  SectionHeading,
  StudyCard,
  WeekBars,
  bannerGradient,
} from "../../components/kit/primitives"

/**
 * The dashboard (design_handoff_web/PAGES.md §1).
 *
 * Two columns: the work at `flex-1` and a 320 px rail, 20 px apart. The work
 * column is the verse, the one thing to carry on with, and four recommended
 * studies; the rail is the tree, the week and the 66 books.
 *
 * Every number on this screen comes from the hooks that were already here -
 * `useDashboardData` and `useTreeSummary` are untouched, and no fetch was
 * added. Where the design shows a value this page has no source for, the UI is
 * built and the value is left to the source (see "Verder waar je was" below).
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

export default function DashboardPage() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const level = d.level?.level ?? tree.level
  const pct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)
  const remainingXp = d.level ? Math.max(0, d.level.xpForNextLevel - d.level.xpIntoLevel) : tree.remainingXp

  const lastRead = d.lastRead
  const readingHref = lastRead
    ? readHref(lastRead.book, lastRead.chapter, lastRead.version)
    : "/lezen"
  const bookChapters = lastRead ? (CHAPTER_COUNTS[lastRead.book] ?? 1) : 0
  const bookRead = lastRead ? d.bookReadCount(lastRead.book) : 0
  const bookPct = lastRead ? Math.round(d.bookReadRatio(lastRead.book) * 100) : 0

  const todayIndex = Math.max(0, d.weekDays.findIndex(day => day.isToday))

  const otLevels = OT_BOOKS.map(b => heatStep(d.bookReadRatio(b)))
  const ntLevels = NT_BOOKS.map(b => heatStep(d.bookReadRatio(b)))

  // Four: one full row of four on a wide screen, a clean 2 x 2 below it.
  const recommended = curatedStudies.slice(0, 4)

  return (
    <AppShell title="Dashboard">
      <div className="flex min-h-full gap-5">
        {/* ── The work ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
          {/* A flex gap is not created for a `display:none` child, so on the
              usual screen - where there is no billing notice - the verse still
              starts flush with the rail beside it. */}
          <div className="empty:hidden">
            <BillingNotices />
          </div>

          <DailyVerseCard verse={d.verse} loading={d.verseLoading} />

          {/* Verder waar je was.
              The design writes this card around a running study lesson
              ("Genesis - les 6 van 50"). Nothing this page already fetches
              knows which study that is - the enrolment lives behind
              /api/v1/study-enrollments and RULES.md forbids adding a fetch - so
              the card is built on the value that IS here: the last chapter
              read. The second button still hands off to /studie, which resolves
              the newest active enrolment server-side. */}
          <Card className="flex flex-none overflow-hidden">
            <div
              className="w-[124px] flex-none"
              style={{ background: bannerGradient(lastRead?.book ?? "lezen") }}
            />
            <div className="min-w-0 flex-1 px-[22px] py-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal">
                {lastRead ? "Verder waar je was" : "Begin waar je wilt"}
              </div>
              <div className="mt-[5px] truncate text-[21px] font-bold tracking-[-0.3px] text-ink">
                {lastRead ? `${lastRead.book} ${lastRead.chapter}` : "Kies een hoofdstuk of een studie"}
              </div>
              <div className="mt-1 text-[13px] text-ink-faint">
                {lastRead
                  ? `${bookRead} van ${bookChapters} hoofdstukken in ${lastRead.book}`
                  : "Je laatst gelezen hoofdstuk verschijnt hier"}
              </div>

              {lastRead && (
                <div className="mt-[13px] flex max-w-[420px] items-center gap-3">
                  <ProgressBar value={bookPct} height={6} className="flex-1" />
                  <span className="text-[12px] font-semibold text-ink-muted tabular-nums">{bookPct} %</span>
                </div>
              )}

              <div className="mt-4 flex gap-[10px]">
                <Link
                  href={readingHref}
                  className="inline-flex h-[42px] items-center gap-2 rounded-btn bg-teal px-[18px] text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
                >
                  {lastRead ? "Verder lezen" : "Beginnen met lezen"}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/studie"
                  className="inline-flex h-[42px] items-center rounded-btn border border-line px-[18px] text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
                >
                  Studie openen
                </Link>
              </div>
            </div>
          </Card>

          <SectionHeading
            title="Aanbevolen voor jou"
            action={{ label: "Alle studies", href: "/studies" }}
          />

          {/* The work column is the viewport less the 196 px sidebar, 56 px of
              body padding, the 320 px rail and its 20 px gap - about 590 px of
              fixed chrome. At xl (1280) that leaves ~690 px, ~160 px a card at
              four across, still room for a two-line title and the meta line;
              under xl four would crush them, so it stays at two. */}
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
            {recommended.map(study => (
              <StudyCard
                key={study.id}
                href={`/studies/${study.id}`}
                title={study.title}
                meta={`${study.type} · ${study.lessons.length} lessen`}
                imageHeight={96}
                // The banner is the study's own drawn horizon, not a gradient
                // plate: `lib/studyArt.ts` already owns that picture and
                // /studies renders the same one, so the two agree.
                art={
                  <StudyArtwork
                    id={study.id}
                    kind={study.type}
                    ratio={2.8}
                    quiet
                    className="h-full w-full"
                  />
                }
              />
            ))}
          </div>
        </div>

        {/* ── The rail ─────────────────────────────────────────────── */}
        <aside className="flex w-[320px] flex-none flex-col gap-4">
          {/* Je boom.
              PAGES.md §1 puts "Bekijken →" at the far right of the avatar row,
              but in a 320 px card that row leaves the title about 110 px:
              "Jonge boom · niveau 5" needs ~170 px at Inter 700 · 15, so every
              stage name was being cut down to "Jonge boom · ….". The bar and
              the link drop to a row of their own, which hands the title the
              full 205 px - enough for the longest one there is, "Eeuwenoude
              boom · niveau 16" - and leaves the card the same height whether
              the title takes one line or two, because the 64 px disc sets it.
              The whole card is the link now: it has only ever had the one
              destination, and that is a larger target than four words. */}
          <Link href="/profiel/boom" className="group block flex-none no-underline">
            <Card className="p-[18px] transition-colors group-hover:border-line-strong">
              <div className="flex items-center gap-[15px]">
                <TreeAvatar size={64} ring={3} level={level} levelStyle="gold" />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold leading-[1.3] text-ink">
                    {tree.stageName ? `${tree.stageName} · niveau ${level}` : `Niveau ${level}`}
                  </div>
                  <div className="mt-[3px] text-[12.5px] text-ink-faint">
                    nog {remainingXp} XP tot niveau {level + 1}
                  </div>
                </div>
              </div>
              <div className="mt-[13px] flex items-center gap-3">
                <ProgressBar value={pct} height={6} className="flex-1" />
                <span className="flex-none whitespace-nowrap text-[13px] font-semibold text-teal group-hover:text-teal-dark">
                  Bekijken →
                </span>
              </div>
            </Card>
          </Link>

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
          </Card>

          {/* Bijbelboeken - `flex-none` so the card stops at its content
              instead of stretching to the foot of the rail. */}
          <Card className="flex-none p-[18px]">
            <div className="flex items-center gap-[11px]">
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-btn bg-teal-tint">
                <BookOpen size={19} strokeWidth={1.8} className="text-teal" />
              </span>
              <div>
                <div className="text-[15px] font-bold text-ink">Bijbelboeken</div>
                <div className="mt-[2px] text-[12.5px] text-ink-muted tabular-nums">
                  {d.booksWithProgress} van 66 boeken geopend
                </div>
              </div>
            </div>

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
