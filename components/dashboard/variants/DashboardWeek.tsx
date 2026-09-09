"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { useDashboardData, readHref, isToday, TOTAL_CHAPTERS } from "../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../lib/dailyVerseStore"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
const CARD = "rounded-xl border border-gray-200 bg-white dark:border-border dark:bg-card"

/**
 * Versie 5 - "Week".
 *
 * The seven days are the page, not a tile on it. A calendar row runs full
 * width with a column per day and the date on each; today's column is the tall
 * one and carries the day's work, the six behind it only say whether they were
 * read. For a reader whose question is "am I keeping this up?" rather than
 * "how far have I come?".
 *
 * The dates are computed after mount, in the reader's own timezone, to match
 * the seven days `/api/user/weekly-stats` returns (six days ago through today)
 * without the server and the client disagreeing about what day it is.
 */
export default function DashboardWeek() {
  const d = useDashboardData()
  const tree = useTreeSummary()
  const [dates, setDates] = useState<number[]>([])
  const [monthLabel, setMonthLabel] = useState("")

  useEffect(() => {
    const now = new Date()
    setDates(
      Array.from({ length: 7 }, (_, i) => {
        const day = new Date(now)
        day.setDate(now.getDate() - (6 - i))
        return day.getDate()
      }),
    )
    const label = now.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })
    setMonthLabel(label.charAt(0).toUpperCase() + label.slice(1))
  }, [])

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")
  const todayNote = d.recentNotes.find(n => isToday(n.createdAt))

  const tasks = [
    { key: "lezen", label: "Gelezen", done: d.readToday },
    { key: "notitie", label: "Notitie geschreven", done: d.noteToday },
    { key: "reeks", label: "Reeks geteld", done: d.streakToday },
  ]

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-5 sm:px-6 xl:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {monthLabel ? (
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{monthLabel}</h1>
            ) : (
              <SkeletonBlock className="h-6 w-44" />
            )}
            {d.greeting ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{d.greeting}</p>
            ) : (
              <SkeletonBlock className="mt-1.5 h-3.5 w-48" />
            )}
          </div>
          <VariantSwitcher />
        </div>

        <div className="mt-4 empty:hidden">
          <BillingNotices />
        </div>

        {/* --- The week as a calendar row ---------------------- */}
        <section className="mt-6" aria-labelledby="week-kalender">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="week-kalender" className={EYEBROW}>Afgelopen zeven dagen</h2>
            {!d.statsLoading && (
              <p className="text-xs tabular-nums text-muted-foreground">
                {d.weekTotal === 0 ? "Nog geen activiteit" : `${d.weekTotal}× gelezen`}
                {d.streak > 0 ? ` · ${d.streak} ${dayWord(d.streak)} op rij` : ""}
              </p>
            )}
          </div>

          <ol className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Afgelopen zeven dagen">
            {d.weekDays.map((day, i) => {
              const read = day.count > 0
              return (
                <li
                  key={i}
                  className={`flex flex-col items-center rounded-xl border px-1 py-3 sm:py-4 ${
                    day.isToday
                      ? "border-[#0D9488] bg-[#F0FDFA] dark:border-teal-500 dark:bg-teal-950/40"
                      : "border-gray-200 bg-white dark:border-border dark:bg-card"
                  }`}
                  aria-current={day.isToday ? "date" : undefined}
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${day.isToday ? TEAL_TEXT : "text-muted-foreground"}`}>
                    {day.label}
                  </span>
                  <span className="mt-1 text-lg font-semibold tabular-nums text-foreground sm:text-xl">
                    {dates[i] ?? "–"}
                  </span>
                  <span className="mt-2.5 flex h-6 items-center">
                    {d.statsLoading ? (
                      <SkeletonBlock className="h-6 w-6 rounded-full" />
                    ) : read ? (
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: TEAL }}
                        title={`${day.count}× gelezen`}
                      >
                        <Check size={13} strokeWidth={3} aria-hidden />
                        <span className="sr-only">{day.count} keer gelezen</span>
                      </span>
                    ) : (
                      <span
                        aria-hidden
                        className={`h-6 w-6 rounded-full border-2 ${
                          day.isToday ? "border-dashed border-[#0D9488] dark:border-teal-400" : "border-gray-200 dark:border-border"
                        }`}
                      />
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>

        {/* --- Today, and the rest ----------------------------- */}
        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            {/* Today's work */}
            <section className={`p-6 ${CARD}`} aria-labelledby="week-vandaag">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="week-vandaag" className="text-base font-semibold text-foreground">Vandaag</h2>
                {d.dateLabel && <p className="text-xs text-muted-foreground">{d.dateLabel}</p>}
              </div>

              {d.loading ? (
                <div className="mt-5 space-y-3">
                  <SkeletonBlock className="h-3 w-32" />
                  <SkeletonBlock className="h-7 w-56" />
                  <SkeletonBlock className="mt-4 h-11 w-40 rounded-xl" />
                </div>
              ) : (
                <div className="content-in mt-5 flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className={EYEBROW}>{d.lastRead ? "Verder waar je was" : "Begin vandaag"}</p>
                    <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
                      {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {d.lastRead
                        ? `Hoofdstuk ${d.lastRead.chapter}${versionAbbreviation(d.lastRead.version) ? ` · ${versionAbbreviation(d.lastRead.version)}` : ""}`
                        : "Lees dag voor dag door de Bijbel."}
                    </p>
                  </div>
                  <Link
                    href={nextHref}
                    className="press inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
                    style={{ backgroundColor: TEAL }}
                  >
                    {d.lastRead ? "Verder lezen" : "Begin met lezen"}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-4 dark:border-border/70">
                {tasks.map(task => (
                  <li key={task.key} className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className={`flex h-4 w-4 items-center justify-center rounded-full ${
                        task.done ? "text-white" : "border-2 border-gray-300 dark:border-gray-600"
                      } ${d.loading || d.statsLoading ? "skeleton-pulse" : ""}`}
                      style={task.done ? { backgroundColor: TEAL } : undefined}
                    >
                      {task.done && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span className={task.done ? "text-muted-foreground line-through" : "text-foreground"}>
                      {task.label}
                    </span>
                  </li>
                ))}
              </ul>
              {todayNote && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Notitie van vandaag bij{" "}
                  <Link href={readHref(todayNote.book, todayNote.chapter)} className={`font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                    {todayNote.book} {todayNote.chapter}
                  </Link>
                </p>
              )}
            </section>

            {/* The four running totals, as a strip */}
            <section className={`grid grid-cols-2 divide-x divide-y divide-gray-200 overflow-hidden sm:grid-cols-4 sm:divide-y-0 dark:divide-border ${CARD}`}>
              <Figure label="Reeks" loading={d.loading} value={d.streak} unit={dayWord(d.streak)} />
              <Figure label="Langste reeks" loading={tree.loading} value={tree.longestStreak} unit={dayWord(tree.longestStreak)} />
              <Figure label="Hoofdstukken" loading={d.loading} value={d.chaptersRead} unit={`van ${TOTAL_CHAPTERS}`} />
              <Figure label="Notities" loading={d.loading} value={d.notesCount} unit={d.notesCount === 1 ? "notitie" : "notities"} />
            </section>

            {/* Recent notes */}
            <section className={`p-6 ${CARD}`} aria-labelledby="week-notities">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="week-notities" className="text-base font-semibold text-foreground">Recente notities</h2>
                <Link href="/notities" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Alle notities
                </Link>
              </div>
              {d.loading ? (
                <div className="mt-4 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-2">
                      <SkeletonBlock className="h-3 w-1/3" />
                      <SkeletonBlock className="h-3.5 w-full" />
                    </div>
                  ))}
                </div>
              ) : d.recentNotes.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nog geen notities.{" "}
                  <Link href={nextHref} className={`font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                    Schrijf er een tijdens het lezen
                  </Link>
                </p>
              ) : (
                <ul className="stagger-in mt-2 divide-y divide-gray-100 dark:divide-border/70">
                  {d.recentNotes.map(note => (
                    <li key={note._id}>
                      <Link href={readHref(note.book, note.chapter)} className="group block py-3 no-underline">
                        <p className={`text-xs font-semibold ${TEAL_TEXT}`}>
                          {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground">
                          {note.noteText}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* --- Right rail ----------------------------------- */}
          <aside className="space-y-5">
            <div className="[&>div]:rounded-xl">
              <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
            </div>

            <section className={`flex items-center gap-4 p-5 ${CARD}`} aria-labelledby="week-voortgang">
              <ProgressTreeDisc size={68} still />
              <div className="min-w-0 flex-1">
                <h2 id="week-voortgang" className={EYEBROW}>Jouw voortgang</h2>
                {tree.loading ? (
                  <div className="mt-2 space-y-2">
                    <SkeletonBlock className="h-4 w-36" />
                    <SkeletonBlock className="h-3 w-28" />
                  </div>
                ) : (
                  <div className="content-in">
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {tree.hasTree && tree.stageName ? `${tree.stageName} · niveau ${tree.level}` : `Niveau ${tree.level}`}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {tree.wilting
                        ? `${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} niet gelezen`
                        : `Nog ${tree.remainingXp} XP tot niveau ${tree.level + 1}`}
                    </p>
                  </div>
                )}
                <Link href="/profiel/boom" className={`mt-2 inline-block text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Bekijk je boom →
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

/* --- Pieces ------------------------------------------------- */

function Figure({
  label,
  loading,
  value,
  unit,
}: {
  label: string
  loading: boolean
  value: number
  unit: string
}) {
  return (
    <div className="p-5">
      <p className={EYEBROW}>{label}</p>
      {loading ? (
        <>
          <SkeletonBlock className="mt-2 h-7 w-14" />
          <SkeletonBlock className="mt-2 h-3 w-20" />
        </>
      ) : (
        <div className="content-in">
          <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums text-foreground">{value}</p>
          <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">{unit}</p>
        </div>
      )}
    </div>
  )
}
