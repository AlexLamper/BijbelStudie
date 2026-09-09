"use client"

import Link from "next/link"
import { ArrowRight, Clock, PenLine } from "lucide-react"
import { curatedStudies, BADGE_STYLES } from "../../../lib/data/curated-studies"
import { useDashboardData, readHref } from "../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../lib/dailyVerseStore"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, ProgressTreeScene, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
/** Every card in this variant: same radius, same hairline, same surface. */
const CARD = "rounded-3xl border border-gray-200 bg-white dark:border-border dark:bg-card"

/**
 * Versie 4 - "Kaarten".
 *
 * The phone version drawn first and then let out to a tablet width: one column
 * of large rounded cards, each with a single job and a single tap target,
 * nothing that needs a hover to be understood. Where the workbench packs four
 * figures into a row of tiles, this gives each one a card and lets the thumb do
 * the scrolling.
 */
export default function DashboardKaarten() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")

  return (
    <div className="min-h-full bg-gray-50 dark:bg-background">
      <div className="mx-auto w-full max-w-[34rem] px-4 pb-24 pt-5 sm:px-6">
        <VariantSwitcher className="justify-center" />

        {/* --- Who and when ------------------------------------ */}
        <header className="mt-6 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            {d.greeting ? (
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{d.greeting}</h1>
            ) : (
              <SkeletonBlock className="h-7 w-56" />
            )}
            {d.dateLabel ? (
              <p className="mt-1 text-sm text-muted-foreground">{d.dateLabel}</p>
            ) : (
              <SkeletonBlock className="mt-2 h-3.5 w-36" />
            )}
          </div>
          <ProgressTreeDisc size={56} still />
        </header>

        <div className="mt-4 empty:hidden">
          <BillingNotices />
        </div>

        <div className="mt-5 space-y-4">
          {/* --- The one card that is a button ------------------ */}
          {d.loading ? (
            <SkeletonBlock className="h-44 w-full rounded-3xl" />
          ) : (
            <Link
              href={nextHref}
              className="press content-in block rounded-3xl p-6 no-underline transition-colors hover:bg-[#0F766E]"
              style={{ backgroundColor: TEAL }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                {d.lastRead ? "Verder waar je was" : "Begin vandaag"}
              </p>
              <p className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-white">
                {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
              </p>
              <p className="mt-1.5 text-sm text-white/80">
                {d.lastRead
                  ? versionAbbreviation(d.lastRead.version) || "Lees verder waar je gebleven was."
                  : "Lees dag voor dag door de Bijbel."}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white">
                {d.lastRead ? "Doorgaan" : "Begin met lezen"}
                <ArrowRight size={15} />
              </span>
            </Link>
          )}

          {/* --- The verse, in its own frame -------------------- */}
          <div className="[&>div]:rounded-3xl">
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </div>

          {/* --- The tree, as a wide banner --------------------- */}
          <section className={`overflow-hidden ${CARD}`} aria-labelledby="kaarten-voortgang">
            <div className="relative h-40">
              <ProgressTreeScene />
            </div>
            <div className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="kaarten-voortgang" className={EYEBROW}>Jouw voortgang</h2>
                <Link href="/profiel/boom" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Bekijk je boom
                </Link>
              </div>
              {tree.loading ? (
                <div className="mt-3 space-y-2.5">
                  <SkeletonBlock className="h-5 w-44" />
                  <SkeletonBlock className="h-2 w-full rounded-full" />
                  <SkeletonBlock className="h-3 w-32" />
                </div>
              ) : (
                <div className="content-in mt-2">
                  <p className="text-lg font-semibold text-foreground">
                    {tree.hasTree && tree.stageName ? `${tree.stageName} · niveau ${tree.level}` : `Niveau ${tree.level}`}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${Math.min(100, tree.progressPercentage)}%`, backgroundColor: TEAL }}
                    />
                  </div>
                  <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                    {tree.wilting
                      ? `${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} niet gelezen`
                      : `Nog ${tree.remainingXp} XP tot niveau ${tree.level + 1}`}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* --- The week, at thumb size ------------------------ */}
          <section className={`p-5 ${CARD}`} aria-labelledby="kaarten-week">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="kaarten-week" className={EYEBROW}>Deze week</h2>
              {!d.loading && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {d.streak} {dayWord(d.streak)} op rij
                </span>
              )}
            </div>
            <ol className="mt-4 flex justify-between gap-1.5" aria-label="Deze week">
              {d.weekDays.map((day, i) => {
                const read = day.count > 0
                return (
                  <li key={i} className="flex flex-1 flex-col items-center gap-2">
                    <span
                      aria-hidden
                      className={`flex h-11 w-full max-w-[44px] items-center justify-center rounded-2xl text-sm font-bold tabular-nums ${
                        read
                          ? "text-white"
                          : day.isToday
                            ? "border-2 border-dashed border-[#0D9488] text-[#0D9488] dark:border-teal-400 dark:text-teal-400"
                            : "bg-gray-100 text-gray-400 dark:bg-secondary dark:text-muted-foreground"
                      } ${d.statsLoading ? "skeleton-pulse" : ""}`}
                      style={read ? { backgroundColor: TEAL } : undefined}
                    >
                      {d.statsLoading ? "" : read ? day.count : "–"}
                    </span>
                    <span className={`text-[11px] font-medium ${day.isToday ? TEAL_TEXT : "text-muted-foreground"}`}>
                      {day.label}
                      <span className="sr-only">{read ? `, ${day.count} keer gelezen` : ", niet gelezen"}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>

          {/* --- Notes: a card that is also the write button ---- */}
          <section className={`p-5 ${CARD}`} aria-labelledby="kaarten-notities">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="kaarten-notities" className={EYEBROW}>
                Notities{!d.loading && d.notesCount > 0 ? <span className="tabular-nums"> · {d.notesCount}</span> : null}
              </h2>
              <Link href="/notities" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Alle notities
              </Link>
            </div>
            {d.loading ? (
              <div className="mt-4 space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="space-y-2">
                    <SkeletonBlock className="h-3 w-2/5" />
                    <SkeletonBlock className="h-3.5 w-full" />
                  </div>
                ))}
              </div>
            ) : d.recentNotes.length === 0 ? (
              <Link
                href={nextHref}
                className="press mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 px-4 py-4 no-underline dark:border-border"
              >
                <PenLine size={16} style={{ color: TEAL }} aria-hidden />
                <span className="text-sm text-muted-foreground">Schrijf je eerste notitie tijdens het lezen</span>
              </Link>
            ) : (
              <ul className="stagger-in mt-3 space-y-3">
                {d.recentNotes.map(note => (
                  <li key={note._id}>
                    <Link
                      href={readHref(note.book, note.chapter)}
                      className="press block rounded-2xl bg-gray-50 p-4 no-underline dark:bg-secondary/40"
                    >
                      <p className={`text-xs font-semibold ${TEAL_TEXT}`}>
                        {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{note.noteText}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --- Studies, as a shelf you swipe ------------------ */}
          <section aria-labelledby="kaarten-studies">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 id="kaarten-studies" className={EYEBROW}>Aanbevolen studies</h2>
              <Link href="/studies" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Bekijk alle
              </Link>
            </div>
            <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
              {curatedStudies.slice(0, 5).map(study => {
                const badge = BADGE_STYLES[study.type]
                return (
                  <li key={study.id} className="w-[15rem] flex-shrink-0 snap-start">
                    <Link href={`/studies/${study.id}`} className={`press flex h-full flex-col p-5 no-underline ${CARD}`}>
                      <span
                        className="self-start rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: badge.bg, color: badge.color }}
                      >
                        {study.type}
                      </span>
                      <span className="mt-3 text-base font-semibold leading-snug text-foreground">{study.title}</span>
                      <span className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {study.description}
                      </span>
                      <span className="mt-4 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                        <Clock size={11} aria-hidden /> {study.durationLabel}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
