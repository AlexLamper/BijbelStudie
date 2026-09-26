"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, ProgressBar } from "../kit/primitives"
import type { DashboardResume, ResumeItem } from "../../lib/resumeTypes"

/**
 * "Verder waar je was" - the dashboard's one thing to carry on with.
 *
 * Deliberately the original minimal card: one row, the text block at `flex-1`
 * (eyebrow, title, a slim bar with "les 6 van 50" beside it) and a single teal
 * button on the right. The row wraps, so in a narrow work column the button
 * drops under the text instead of squeezing the title. No step bar, schedule
 * chip, "Vandaag gedaan" line or list of other studies - the owner wants this
 * card simple.
 *
 * The data is the server's `DashboardResume.primary` (lib/dashboardResume.ts),
 * so web and app agree on which lesson or chapter it names; only the wording
 * below is local. Three states: a running study lesson, the last chapter read,
 * or a start.
 */

const TEAL = "#0D9488"

/** "Les 6 van 50 · Gerechtvaardigd door geloof" -> 6, 50, the lesson name. */
function parseLesson(item: ResumeItem): { day: number; total: number; name: string } | null {
  const m = item.subtitle?.match(/^Les (\d+) van (\d+)(?: · (.+))?$/)
  if (m) return { day: Number(m[1]), total: Number(m[2]), name: m[3] ?? "" }
  if (item.lessonDay && item.progress) return { day: item.lessonDay, total: item.progress.total, name: "" }
  return null
}

const CARD = "flex flex-none flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5 max-md:px-5"

export function ResumeCardSkeleton() {
  return (
    <Card className={CARD}>
      <div className="min-w-[min(100%,240px)] flex-1" aria-busy="true">
        <div className="h-[11px] w-[130px] animate-pulse rounded bg-line-soft" />
        <div className="mt-[10px] h-[24px] w-[min(100%,300px)] animate-pulse rounded bg-line-soft" />
        <div className="mt-[14px] h-[6px] max-w-[340px] animate-pulse rounded-full bg-line-soft" />
      </div>
      <div className="h-12 w-[180px] flex-none animate-pulse rounded-btn bg-line-soft" />
    </Card>
  )
}

export default function ResumeCard({ resume }: { resume: DashboardResume | null }) {
  const item = resume?.primary ?? null
  const study = item?.kind === "study" ? item : null
  const chapter = item?.kind === "chapter" ? item : null
  const lesson = study ? parseLesson(study) : null

  const title = study
    ? `${study.title}${lesson ? ` · les ${lesson.day}${lesson.name ? ` - ${lesson.name}` : ""}` : ""}`
    : chapter
      ? chapter.title
      : "Kies een hoofdstuk of een studie"

  const progress = (study ?? chapter)?.progress ?? null
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const progressText = study
    ? lesson
      ? `les ${lesson.day} van ${lesson.total}`
      : null
    : progress
      ? `${progress.done} van ${progress.total} hoofdstukken`
      : null

  const href = study ? study.href : chapter ? chapter.href : "/lezen"
  const cta = study
    ? lesson
      ? `Verder met les ${lesson.day}`
      : "Verder met de studie"
    : chapter
      ? "Verder lezen"
      : "Beginnen met lezen"

  return (
    <Card className={CARD}>
      <div className="min-w-[min(100%,240px)] flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[1.4px] text-teal dark:text-teal-400">
          {study || chapter ? "Verder waar je was" : "Begin waar je wilt"}
        </div>
        <div className="mt-[6px] text-[22px] font-bold leading-[1.25] tracking-[-0.3px] text-ink [overflow-wrap:anywhere] max-md:text-[19px]">
          {title}
        </div>

        {study || chapter ? (
          progressText && (
            <div className="mt-[14px] flex items-center gap-[14px]">
              <ProgressBar value={pct} height={6} className="max-w-[340px] flex-1" />
              <span className="flex-none whitespace-nowrap text-[13px] text-ink-muted tabular-nums">
                {progressText}
              </span>
            </div>
          )
        ) : (
          <div className="mt-[6px] text-[13px] text-ink-muted">Je laatst gelezen hoofdstuk verschijnt hier</div>
        )}
      </div>

      <div className="flex flex-none flex-wrap items-center gap-x-5 gap-y-2 max-md:w-full">
        {/* The second door to /studie stays wherever the card is not already
            about a study. */}
        {!study && (
          <Link
            href="/studie"
            className="text-[14px] font-semibold text-ink-body no-underline transition-colors hover:text-teal dark:hover:text-teal-400"
          >
            Studie openen
          </Link>
        )}
        <Link
          href={href}
          data-track={study ? "study_resume" : chapter ? "reading_resume" : undefined}
          className="inline-flex h-12 items-center gap-[10px] rounded-[12px] px-[22px] text-[15px] font-semibold text-white no-underline transition-opacity hover:opacity-90 max-md:flex-1 max-md:justify-center"
          style={{ backgroundColor: TEAL }}
        >
          {cta}
          <ArrowRight size={17} strokeWidth={2.2} />
        </Link>
      </div>
    </Card>
  )
}
