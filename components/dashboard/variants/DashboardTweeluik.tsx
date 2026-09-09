"use client"

import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { curatedStudies, BADGE_STYLES } from "../../../lib/data/curated-studies"
import { CHAPTER_COUNTS } from "../../../lib/data/bible-chapter-counts"
import { useDashboardData, readHref, ALL_BOOKS, TOTAL_CHAPTERS } from "../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../lib/dailyVerseStore"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"

/**
 * Versie 10 - "Tweeluik".
 *
 * Two panels. The left one is the reader: who they are, what level, the week,
 * the running totals - it never scrolls away, it is sticky from lg up and
 * simply sits at the top of the page below that. The right one is the work:
 * what to read, the verse, the notes, the studies, and it is the only thing
 * that scrolls.
 *
 * A mail-client shape rather than a page shape, for the reader who wants their
 * standing figures always in view while they browse.
 */
export default function DashboardTweeluik() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)

  const recentBooks = ALL_BOOKS.map(book => ({ book, read: d.bookReadCount(book), total: CHAPTER_COUNTS[book] ?? 1 }))
    .filter(entry => entry.read > 0)
    .sort((a, b) => b.read / b.total - a.read / a.total)
    .slice(0, 4)

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto grid w-full max-w-[1300px] grid-cols-1 gap-6 px-4 pb-16 pt-5 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 xl:px-10">
        {/* --- Left panel: the reader ---------------------- */}
        <aside className="lg:sticky lg:top-5 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card">
            <div className="flex items-center gap-4">
              <ProgressTreeDisc size={64} still />
              <div className="min-w-0 flex-1">
                {d.greeting ? (
                  <p className="truncate text-base font-semibold leading-tight text-foreground">{d.greeting}</p>
                ) : (
                  <SkeletonBlock className="h-4 w-36" />
                )}
                {d.dateLabel ? (
                  <p className="mt-1 text-xs text-muted-foreground">{d.dateLabel}</p>
                ) : (
                  <SkeletonBlock className="mt-2 h-3 w-28" />
                )}
              </div>
            </div>

            {/* Level and the XP still to go */}
            <div className="mt-5">
              <div className="flex items-baseline justify-between text-xs tabular-nums">
                <span className="font-semibold text-foreground">Niveau {level}</span>
                <span className="text-muted-foreground">{xpInto} / {xpFor} XP</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: d.loading && tree.loading ? "0%" : `${pct}%`, backgroundColor: TEAL }}
                />
              </div>
              {tree.loading ? (
                <SkeletonBlock className="mt-2 h-3 w-40" />
              ) : (
                <p className="content-in mt-2 text-xs tabular-nums text-muted-foreground">
                  {tree.wilting
                    ? `${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} niet gelezen`
                    : `Nog ${tree.remainingXp} XP tot niveau ${level + 1}`}
                  {tree.hasTree && tree.stageName ? ` · ${tree.stageName}` : ""}
                </p>
              )}
              <Link href="/profiel/boom" className={`mt-2 inline-block text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Bekijk je boom →
              </Link>
            </div>

            {/* The week */}
            <div className="mt-6 border-t border-gray-100 pt-4 dark:border-border/70">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className={EYEBROW}>Deze week</h2>
                {!d.loading && (
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {d.streak} {dayWord(d.streak)} op rij
                  </span>
                )}
              </div>
              <ol className="mt-3 flex gap-1.5" aria-label="Deze week">
                {d.weekDays.map((day, i) => {
                  const read = day.count > 0
                  return (
                    <li key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <span
                        aria-hidden
                        className={`block h-7 w-full rounded-md ${
                          read
                            ? ""
                            : day.isToday
                              ? "border-2 border-dashed border-[#0D9488] dark:border-teal-400"
                              : "bg-gray-100 dark:bg-secondary"
                        } ${d.statsLoading ? "skeleton-pulse" : ""}`}
                        style={read ? { backgroundColor: day.isToday ? TEAL : "rgba(13,148,136,0.5)" } : undefined}
                      />
                      <span className={`text-[10px] font-medium ${day.isToday ? TEAL_TEXT : "text-muted-foreground"}`}>
                        {day.label}
                        <span className="sr-only">{read ? `, ${day.count} keer gelezen` : ", niet gelezen"}</span>
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>

            {/* The standing totals */}
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 dark:border-border/70">
              <Total label="Hoofdstukken" loading={d.loading} value={`${d.chaptersRead}`} sub={`van ${TOTAL_CHAPTERS}`} />
              <Total label="Boeken" loading={d.loading} value={`${d.booksWithProgress}`} sub="van 66 geopend" />
              <Total label="Notities" loading={d.loading} value={`${d.notesCount}`} sub={d.notesCount === 1 ? "notitie" : "notities"} />
              <Total label="Lessen" loading={d.loading} value={`${d.studyCounts?.lessonsCompleted ?? 0}`} sub="afgerond" />
            </dl>

            {/* Where you were last */}
            {(d.loading || recentBooks.length > 0) && (
              <div className="mt-6 border-t border-gray-100 pt-4 dark:border-border/70">
                <h2 className={EYEBROW}>Onderweg in</h2>
                {d.loading ? (
                  <div className="mt-3 space-y-2.5">
                    {[1, 2, 3].map(i => (
                      <SkeletonBlock key={i} className="h-3.5 w-full" />
                    ))}
                  </div>
                ) : (
                  <ul className="mt-2.5 space-y-2">
                    {recentBooks.map(entry => (
                      <li key={entry.book}>
                        <Link href={readHref(entry.book, 1)} className="group flex items-center gap-2 no-underline">
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground group-hover:underline">
                            {entry.book}
                          </span>
                          <span className="h-1.5 w-14 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${Math.min(100, (entry.read / entry.total) * 100)}%`, backgroundColor: TEAL }}
                            />
                          </span>
                          <span className="w-11 flex-shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                            {entry.read}/{entry.total}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <VariantSwitcher className="mt-4 justify-center" />
        </aside>

        {/* --- Right panel: the work ----------------------- */}
        <div className="min-w-0">
          <div className="mb-4 empty:hidden">
            <BillingNotices />
          </div>

          {/* Continue reading */}
          {d.loading ? (
            <SkeletonBlock className="h-36 w-full rounded-2xl" />
          ) : (
            <section
              className="content-in flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-teal-100 bg-[#F0FDFA] p-6 dark:border-teal-900/40 dark:bg-teal-950/30"
              aria-labelledby="tweeluik-verder"
            >
              <div className="min-w-0">
                <h2 id="tweeluik-verder" className={`${EYEBROW} ${TEAL_TEXT}`}>
                  {d.lastRead ? "Verder waar je was" : "Begin vandaag"}
                </h2>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
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
            </section>
          )}

          {/* The verse */}
          <div className="mt-5 [&>div]:rounded-2xl">
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </div>

          {/* Notes */}
          <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-border dark:bg-card" aria-labelledby="tweeluik-notities">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="tweeluik-notities" className="text-base font-semibold text-foreground">Recente notities</h2>
              <Link href="/notities" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Alle notities
              </Link>
            </div>
            {d.loading ? (
              <div className="mt-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <SkeletonBlock className="h-3 w-1/4" />
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

          {/* Studies */}
          <section className="mt-5" aria-labelledby="tweeluik-studies">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="tweeluik-studies" className="text-base font-semibold text-foreground">Aanbevolen studies</h2>
              <Link href="/studies" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Bekijk alle
              </Link>
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {curatedStudies.slice(0, 4).map(study => {
                const badge = BADGE_STYLES[study.type]
                return (
                  <li key={study.id}>
                    <Link
                      href={`/studies/${study.id}`}
                      className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 no-underline transition-colors hover:bg-gray-50 dark:border-border dark:bg-card dark:hover:bg-secondary/40"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {study.type}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                          <Clock size={10} aria-hidden /> {study.durationLabel}
                        </span>
                      </span>
                      <span className="mt-2.5 text-[15px] font-semibold leading-snug text-foreground">{study.title}</span>
                      <span className="mt-1 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {study.description}
                      </span>
                      <span className={`mt-3 flex items-center gap-1 text-xs font-semibold ${TEAL_TEXT}`}>
                        Bekijk studie
                        <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
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

/* --- Pieces ------------------------------------------------- */

function Total({ label, loading, value, sub }: { label: string; loading: boolean; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      {loading ? (
        <dd className="mt-1 space-y-1">
          <SkeletonBlock className="h-5 w-10" />
          <SkeletonBlock className="h-2.5 w-16" />
        </dd>
      ) : (
        <dd className="content-in">
          <span className="block text-lg font-semibold leading-none tabular-nums text-foreground">{value}</span>
          <span className="mt-1 block truncate text-[10px] tabular-nums text-muted-foreground">{sub}</span>
        </dd>
      )}
    </div>
  )
}
