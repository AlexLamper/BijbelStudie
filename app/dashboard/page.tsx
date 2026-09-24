"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowRight, BookOpen, ChartNoAxesColumn } from "lucide-react"
import { CHAPTER_COUNTS } from "../../lib/data/bible-chapter-counts"
import { curatedStudies } from "../../lib/data/curated-studies"
import { findAnyStudy } from "../../lib/bookStudies"
import {
  NT_BOOKS,
  OT_BOOKS,
  readHref,
  useDashboardData,
} from "../../hooks/useDashboardData"
import BillingNotices from "../../components/pricing/BillingNotices"
import DailyVerseCard from "../../components/dashboard/DailyVerseCard"
import DashboardFeedbackSlot from "../../components/feedback/DashboardFeedbackSlot"
import { useTreeSummary } from "../../components/dashboard/ProgressTree"
import GrowthAnnouncementCard from "../../components/dashboard/GrowthAnnouncementCard"
import AppShell from "../../components/shell/AppShell"
import StudyArtwork from "../studies/StudyArtwork"
import { completedStudyIds, splitRecommendations } from "../../lib/studyRecommendations"
import TreeAvatar from "../../components/kit/TreeAvatar"
import {
  Card,
  HeatGrid,
  HeatLegend,
  ProgressBar,
  SectionHeading,
  StudyCard,
  WeekBars,
} from "../../components/kit/primitives"

/**
 * The dashboard (design_handoff_web/PAGES.md §1).
 *
 * Two columns: the work at `flex-1` and a 320 px rail, 20 px apart. The work
 * column is the verse, the one thing to carry on with, and four recommended
 * studies; the rail is the tree, the week and the 66 books.
 *
 * Every number on this screen comes from the hooks that were already here -
 * `useDashboardData` and `useTreeSummary` are untouched. The one addition is
 * `useResumeStudy` below: a single indexed read of the user's enrolments, so
 * "Verder waar je was" can name the running study lesson.
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

/** A stable empty set, so the effect's initial state is not a new object a render. */
const EMPTY_IDS: Set<string> = new Set()

/** The fields of a serialised enrolment this page reads. */
interface EnrollmentSummary {
  studyId: string
  status: string
  currentLessonDay: number | null
  lessonsTotal: number
  lessonsCompleted: number
  completedAt: string | null
}

/**
 * The running study lesson for "Verder waar je was".
 *
 * One GET to /api/v1/study-enrollments: a single indexed find on
 * `{ userId, lastActivityAt }`, already sorted newest first, and a 401 before
 * any query for a guest. The first active, unfinished enrolment wins - the
 * same one /studie resumes.
 */
function useResumeStudy() {
  const [enrollment, setEnrollment] = useState<EnrollmentSummary | null>(null)
  const [completed, setCompleted] = useState<Set<string>>(EMPTY_IDS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/study-enrollments")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return
        const list: EnrollmentSummary[] = data?.enrollments ?? []
        const active = list.find(e => e.status === "active" && !e.completedAt && findAnyStudy(e.studyId))
        setEnrollment(active ?? null)
        // The same single response also says which studies are finished, so the
        // recommendation rows cost no extra request.
        setCompleted(completedStudyIds(list))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (!enrollment) return { resume: null, completed, loading }

  const study = findAnyStudy(enrollment.studyId)!
  const total = enrollment.lessonsTotal || study.lessons.length
  const day = enrollment.currentLessonDay ?? Math.min(total, enrollment.lessonsCompleted + 1)
  const lesson = study.lessons.find(l => l.day === day)
  // Generated book lessons are titled "6. Noach" or "Hoofdstuk 6"; the number
  // is already in "les 6", so keep only a name that says something.
  const rawTitle = lesson?.title.replace(/^\d+\.\s*/, "") ?? ""
  const lessonTitle = /^Hoofdstuk \d+$/.test(rawTitle) ? "" : rawTitle

  return {
    loading,
    completed,
    resume: {
      studyId: study.id,
      href: `/studie/${study.id}`,
      title: study.title,
      day,
      total,
      lessonTitle,
      pct: total > 0 ? Math.round((enrollment.lessonsCompleted / total) * 100) : 0,
    },
  }
}

/** The recommended-row cards; "Meer om te ontdekken" renders the very same card. */
function StudyCards({ studies }: { studies: typeof curatedStudies }) {
  return (
    <>
      {studies.map(study => (
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
    </>
  )
}

/**
 * The card grid: the design's 1 / 2 / 4 columns from md up; below md one
 * horizontally scrolling row of snap-aligned cards, so four studies do not
 * stack into a phone's worth of scrolling.
 */
const STUDY_GRID =
  "grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4 max-md:flex max-md:snap-x max-md:overflow-x-auto max-md:pb-1 max-md:[&>*]:w-[min(78%,280px)] max-md:[&>*]:flex-none max-md:[&>*]:snap-start"

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
  const { resume, completed, loading: resumeLoading } = useResumeStudy()
  // Hold the card until both sources have answered, so it never flips from the
  // last chapter to the study lesson a moment later.
  const continueLoading = !resume && (d.loading || resumeLoading)

  const level = d.level?.level ?? tree.level
  const pct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)
  const remainingXp = d.level ? Math.max(0, d.level.xpForNextLevel - d.level.xpIntoLevel) : tree.remainingXp
  // The step strip needs the tree's own state (its floor); until it has that,
  // or when the tree is off, the card keeps counting levels.
  const growthStrip = Boolean(tree.hasTree && tree.stageName && tree.stepLine)

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
  // "Meer om te ontdekken" is the next four from the same static list (no
  // request), never one already above and never the study the reader is in the
  // middle of. There is no popularity signal to rank by, so the title does not
  // claim one. A study this reader has already finished is in neither row: the
  // finished ids come from the enrolment response the resume card already made.
  const { recommended, more: moreStudies } = splitRecommendations({
    studies: curatedStudies,
    completed,
    resumeStudyId: resume?.studyId ?? null,
  })

  return (
    <AppShell title="Dashboard">
      <div className="flex min-h-full gap-5 max-md:flex-col">
        {/* ── The work ─────────────────────────────────────────────── */}
        {/* Below md the column is `display: contents`, so its children join the
            stacked page directly and "Meer om te ontdekken" can move under
            the rail with `order-last`. */}
        <div className="flex min-w-0 flex-1 flex-col gap-[18px] max-md:contents">
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

          {/* Verder waar je was.
              One row: the text block at `flex-1` (eyebrow, title, a slim bar
              with "les 6 van 50" beside it) and a single teal button on the
              right. The row wraps, so in a narrow work column the button drops
              under the text instead of squeezing the title.
              Three states, most specific first: a running study lesson (from
              the enrolment), else the last chapter read, else a start. */}
          {continueLoading ? (
            <Card className="flex flex-none flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5 max-md:px-5">
              <div className="min-w-[min(100%,240px)] flex-1" aria-busy="true">
                <div className="h-[11px] w-[130px] animate-pulse rounded bg-line-soft" />
                <div className="mt-[10px] h-[24px] w-[min(100%,300px)] animate-pulse rounded bg-line-soft" />
                <div className="mt-[14px] h-[6px] max-w-[340px] animate-pulse rounded-full bg-line-soft" />
              </div>
              <div className="h-12 w-[180px] flex-none animate-pulse rounded-btn bg-line-soft" />
            </Card>
          ) : (
            <Card className="flex flex-none flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5 max-md:px-5">
              <div className="min-w-[min(100%,240px)] flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[1.4px] text-teal dark:text-teal-400">
                  {resume || lastRead ? "Verder waar je was" : "Begin waar je wilt"}
                </div>
                <div className="mt-[6px] text-[22px] font-bold leading-[1.25] tracking-[-0.3px] text-ink [overflow-wrap:anywhere] max-md:text-[19px]">
                  {resume
                    ? `${resume.title} · les ${resume.day}${resume.lessonTitle ? ` - ${resume.lessonTitle}` : ""}`
                    : lastRead
                      ? `${lastRead.book} ${lastRead.chapter}`
                      : "Kies een hoofdstuk of een studie"}
                </div>

                {resume || lastRead ? (
                  <div className="mt-[14px] flex items-center gap-[14px]">
                    <ProgressBar
                      value={resume ? resume.pct : bookPct}
                      height={6}
                      className="max-w-[340px] flex-1"
                    />
                    <span className="flex-none whitespace-nowrap text-[13px] text-ink-muted tabular-nums">
                      {resume
                        ? `les ${resume.day} van ${resume.total}`
                        : `${bookRead} van ${bookChapters} hoofdstukken`}
                    </span>
                  </div>
                ) : (
                  <div className="mt-[6px] text-[13px] text-ink-muted">
                    Je laatst gelezen hoofdstuk verschijnt hier
                  </div>
                )}
              </div>

              <div className="flex flex-none flex-wrap items-center gap-x-5 gap-y-2 max-md:w-full">
                {/* The old card's second door to /studie stays wherever the card
                    is not already about a study. */}
                {!resume && (
                  <Link
                    href="/studie"
                    className="text-[14px] font-semibold text-ink-body no-underline transition-colors hover:text-teal dark:hover:text-teal-400"
                  >
                    Studie openen
                  </Link>
                )}
                <Link
                  href={resume ? resume.href : readingHref}
                  data-track={resume ? "study_resume" : undefined}
                  className="inline-flex h-12 items-center gap-[10px] rounded-[12px] bg-teal px-[22px] text-[15px] font-semibold text-white no-underline transition-colors hover:bg-teal-dark max-md:flex-1 max-md:justify-center"
                >
                  {resume
                    ? `Verder met les ${resume.day}`
                    : lastRead
                      ? "Verder lezen"
                      : "Beginnen met lezen"}
                  <ArrowRight size={17} strokeWidth={2.2} />
                </Link>
              </div>
            </Card>
          )}

          <SectionHeading
            title="Aanbevolen voor jou"
            action={{ label: "Alle studies", href: "/studies" }}
          />

          {/* The work column is the viewport less the 196 px sidebar, 56 px of
              body padding, the 320 px rail and its 20 px gap - about 590 px of
              fixed chrome. At xl (1280) that leaves ~690 px, ~160 px a card at
              four across, still room for a two-line title and the meta line;
              under xl four would crush them, so it stays at two. */}
          {/* Until the enrolments have answered, the finished studies are not
              known yet, so cards are held back rather than shown and then
              pulled away again. */}
          {resumeLoading ? (
            <div className={STUDY_GRID} aria-busy="true">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-[178px] animate-pulse rounded-card bg-line-soft" />
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <Card className="flex-none px-6 py-5 max-md:px-5">
              <div className="text-[15px] font-bold text-ink">Je hebt alle studies afgerond</div>
              <div className="mt-[6px] text-[13px] text-ink-muted">
                Mooi werk. Kies via{" "}
                <Link href="/studies" className="font-semibold text-teal no-underline hover:underline dark:text-teal-400">
                  alle studies
                </Link>{" "}
                een studie om opnieuw te doen, of lees verder in de Bijbel.
              </div>
            </Card>
          ) : (
            <div className={STUDY_GRID}>
              <StudyCards studies={recommended} />
            </div>
          )}

          {/* Always shown. From md up it follows the recommended row in the
              work column; below md it sits at the very bottom, under the rail. */}
          {moreStudies.length > 0 && (
            <section className="flex flex-col gap-[18px] max-md:order-last">
              <SectionHeading title="Meer om te ontdekken" />
              <div className={STUDY_GRID}>
                <StudyCards studies={moreStudies} />
              </div>
            </section>
          )}
        </div>

        {/* ── The rail ─────────────────────────────────────────────── */}
        <aside className="flex w-[320px] flex-none flex-col gap-4 max-md:w-full">
          {/* Je boom.
              PAGES.md §1 puts "Bekijken →" at the far right of the avatar row,
              but in a 320 px card that row leaves the title about 110 px. The
              bar and the link drop to a row of their own, which hands the
              title and the strip lines the full 205 px, and leaves the card the
              same height whether they take one line or two, because the 64 px
              disc sets it. The whole card is the link now: it has only ever
              had the one destination, and that is a larger target than four
              words.
              Growth v2 (plan §9.5): with a tree, the title is its phase and
              the lines count its steps - the level is on the disc. Without
              one (switched off, or not loaded) it is the level, as before. */}
          <Link href="/profiel/boom" className="group block flex-none no-underline">
            <Card className="p-[18px] transition-colors group-hover:border-line-strong">
              <div className="flex items-center gap-[15px]">
                <TreeAvatar size={64} ring={3} level={level} levelStyle="gold" />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold leading-[1.3] text-ink">
                    {growthStrip ? tree.stageName : `Niveau ${level}`}
                  </div>
                  <div className="mt-[3px] text-[12.5px] text-ink-faint">
                    {growthStrip ? tree.stepLine : `nog ${remainingXp} XP tot niveau ${level + 1}`}
                  </div>
                  {growthStrip && tree.unlockLine && (
                    <div className="mt-[2px] text-[12.5px] text-ink-faint">{tree.unlockLine}</div>
                  )}
                </div>
              </div>
              <div className="mt-[13px] flex items-center gap-3">
                <ProgressBar value={growthStrip ? tree.stepPercentage : pct} height={6} className="flex-1" />
                <span className="flex-none whitespace-nowrap text-[13px] font-semibold text-teal dark:text-teal-400 group-hover:text-teal-dark dark:group-hover:text-teal-300">
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
