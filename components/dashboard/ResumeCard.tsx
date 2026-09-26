"use client"

import Link from "next/link"
import { Card, ProgressBar } from "../kit/primitives"
import type { DashboardResume, ResumeItem, ResumeSchedule } from "../../lib/resumeTypes"

/**
 * "Verder waar je gebleven was" - the dashboard's one thing to carry on with.
 *
 * Renders the server's `DashboardResume` (lib/resumeTypes.ts, built by
 * lib/dashboardResume.ts) and nothing else: the app renders the very same
 * object, so the two cannot disagree about the lesson, the step or the
 * schedule. No logic here beyond wording.
 *
 * Layout: eyebrow, title, subtitle; for a study the step bar ("Stap 3 van 6 ·
 * Verdieping"), a thin lesson bar and the schedule chip; one full-width teal
 * button; a "Vandaag gedaan" line when today's lesson is finished; and the
 * other running studies as small rows under "Ook bezig met".
 */

const TEAL = "#0D9488"

/** What a guest (or a failed request) sees: the start prompt. */
const START: ResumeItem = {
  kind: "start",
  title: "Kies een studie of begin met lezen",
  subtitle: "Je laatste les of hoofdstuk verschijnt hier",
  studyId: null,
  lessonDay: null,
  step: null,
  progress: null,
  schedule: null,
  doneToday: false,
  nextLabel: null,
  cta: "Kies een studie",
  href: "/studies",
  imageUrl: null,
}

function scheduleText(schedule: ResumeSchedule): string {
  if (schedule.status === "op-schema" || schedule.lessons <= 0) return "Op schema"
  const noun = schedule.lessons === 1 ? "les" : "lessen"
  return schedule.status === "achter"
    ? `${schedule.lessons} ${noun} achter`
    : `${schedule.lessons} ${noun} vooruit`
}

/** Never red: behind is information, not a warning (DAILY_HABIT_PLAN.md §4). */
function ScheduleChip({ schedule }: { schedule: ResumeSchedule }) {
  const behind = schedule.status === "achter" && schedule.lessons > 0
  return (
    <span
      className={
        behind
          ? "inline-flex h-6 flex-none items-center rounded-full bg-slate-100 px-[10px] text-[12px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          : "inline-flex h-6 flex-none items-center rounded-full bg-teal-50 px-[10px] text-[12px] font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
      }
    >
      {scheduleText(schedule)}
    </span>
  )
}

/** One segment per step of this lesson (six, or five without a context step). */
function StepBar({ index, count, label }: { index: number; count: number; label: string }) {
  return (
    <div className="mt-[14px]">
      <div className="flex gap-[4px]" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={`h-[6px] flex-1 rounded-full ${i + 1 < index ? "" : i + 1 === index ? "opacity-45" : "bg-line"}`}
            style={i + 1 <= index ? { backgroundColor: TEAL } : undefined}
          />
        ))}
      </div>
      <div className="mt-[7px] text-[13px] text-ink-muted">
        Stap {index} van {count} · <span className="font-semibold text-ink-body">{label}</span>
      </div>
    </div>
  )
}

function OtherRow({ item }: { item: ResumeItem }) {
  const pct = item.progress && item.progress.total > 0 ? (item.progress.done / item.progress.total) * 100 : 0
  return (
    <li>
      <Link
        href={item.href}
        data-track="study_resume_other"
        className="group flex items-center gap-3 rounded-btn py-[9px] no-underline"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-ink transition-colors group-hover:text-teal dark:group-hover:text-teal-400">
            {item.title}
          </div>
          {item.subtitle && <div className="truncate text-[12.5px] text-ink-muted">{item.subtitle}</div>}
        </div>
        {item.progress && <ProgressBar value={pct} height={4} className="w-[72px] flex-none" />}
        <span className="flex-none text-[13px] font-semibold text-teal dark:text-teal-400" aria-hidden="true">
          →
        </span>
      </Link>
    </li>
  )
}

export function ResumeCardSkeleton() {
  return (
    <Card className="flex-none px-6 py-5 max-md:px-5">
      <div aria-busy="true">
        <div className="h-[11px] w-[170px] animate-pulse rounded bg-line-soft" />
        <div className="mt-[10px] h-[24px] w-[min(100%,320px)] animate-pulse rounded bg-line-soft" />
        <div className="mt-[8px] h-[14px] w-[min(100%,220px)] animate-pulse rounded bg-line-soft" />
        <div className="mt-[16px] h-[6px] animate-pulse rounded-full bg-line-soft" />
        <div className="mt-[18px] h-12 animate-pulse rounded-[12px] bg-line-soft" />
      </div>
    </Card>
  )
}

export default function ResumeCard({ resume }: { resume: DashboardResume | null }) {
  const item = resume?.primary ?? START
  const others = resume?.others ?? []
  const lessonPct =
    item.progress && item.progress.total > 0 ? (item.progress.done / item.progress.total) * 100 : 0

  return (
    <Card className="flex-none px-6 py-5 max-md:px-5">
      {/* Wraps rather than squeezes: at 360 px the eyebrow and the chip do not
          fit on one line, and the chip then drops under the eyebrow instead of
          folding it in two. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 text-[11px] font-semibold uppercase tracking-[1.4px] text-teal dark:text-teal-400">
          {item.kind === "start" ? "Begin waar je wilt" : "Verder waar je gebleven was"}
        </div>
        {item.schedule && !item.doneToday && <ScheduleChip schedule={item.schedule} />}
      </div>

      <div className="mt-[6px] text-[22px] font-bold leading-[1.25] tracking-[-0.3px] text-ink [overflow-wrap:anywhere] max-md:text-[19px]">
        {item.title}
      </div>
      {item.subtitle && (
        <div className="mt-[3px] text-[14px] text-ink-muted [overflow-wrap:anywhere]">{item.subtitle}</div>
      )}

      {item.doneToday ? (
        <div className="mt-[14px] text-[14px] text-ink-body">
          <span className="font-semibold" style={{ color: TEAL }}>
            Vandaag gedaan
          </span>
          {item.nextLabel && <span className="text-ink-muted"> · {item.nextLabel}</span>}
        </div>
      ) : (
        item.step && <StepBar index={item.step.index} count={item.step.count} label={item.step.label} />
      )}

      {item.kind !== "start" && item.progress && (
        <div className="mt-[12px] flex items-center gap-3">
          <ProgressBar value={lessonPct} height={4} className="flex-1" />
          <span className="flex-none whitespace-nowrap text-[12.5px] text-ink-faint tabular-nums">
            {item.kind === "study"
              ? `${item.progress.done} van ${item.progress.total} lessen`
              : `${item.progress.done} van ${item.progress.total} gelezen`}
          </span>
        </div>
      )}

      <Link
        href={item.href}
        data-track={item.kind === "study" ? "study_resume" : item.kind === "chapter" ? "reading_resume" : undefined}
        className="mt-[18px] flex h-12 w-full items-center justify-center rounded-[12px] px-[22px] text-[15px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
        style={{ backgroundColor: TEAL }}
      >
        {item.cta}
      </Link>

      {item.kind === "start" && (
        <div className="mt-[10px] text-center">
          <Link
            href="/lezen"
            className="text-[13.5px] font-semibold text-ink-body no-underline transition-colors hover:text-teal dark:hover:text-teal-400"
          >
            Of begin met lezen
          </Link>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-[18px] border-t border-line pt-[12px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.9px] text-ink-faint">Ook bezig met</div>
          <ul className="mt-[2px] divide-y divide-line">
            {others.map(other => (
              <OtherRow key={other.studyId ?? other.href} item={other} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
