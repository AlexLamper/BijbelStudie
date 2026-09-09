"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { CHAPTER_COUNTS } from "../../../lib/data/bible-chapter-counts"
import { useDashboardData, readHref, ALL_BOOKS, TOTAL_CHAPTERS } from "../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../lib/dailyVerseStore"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
const CARD = "rounded-xl border border-gray-200 bg-white dark:border-border dark:bg-card"

/**
 * Versie 8 - "Paneel".
 *
 * An instrument panel. A dark slate band across the top carries four readings
 * as dials - level, reeks, week and how much of the Bible is behind you - at a
 * size you can take in from across the desk, and the light half underneath
 * holds the detail. The band is slate in both themes on purpose: a dial only
 * reads as a dial against a dark face, and flipping it with the theme would
 * cost it that.
 */
export default function DashboardPaneel() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const level = d.level?.level ?? tree.level
  const xpPct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)
  const biblePct = TOTAL_CHAPTERS ? (d.chaptersRead / TOTAL_CHAPTERS) * 100 : 0
  // A seven day week is the dial's full scale, so the streak reads as "how
  // much of a week am I holding" rather than as an unbounded number.
  const streakPct = Math.min(100, (d.streak / 7) * 100)
  const weekPct = Math.min(100, (d.weekDays.filter(day => day.count > 0).length / 7) * 100)
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")

  // The books with the most ground covered, so the panel shows work in
  // progress rather than the whole canon.
  const inProgress = ALL_BOOKS.map(book => ({
    book,
    read: d.bookReadCount(book),
    total: CHAPTER_COUNTS[book] ?? 1,
    ratio: d.bookReadRatio(book),
  }))
    .filter(entry => entry.read > 0)
    .sort((a, b) => b.ratio - a.ratio || b.read - a.read)
    .slice(0, 6)

  return (
    <div className="min-h-full bg-gray-50 dark:bg-background">
      {/* --- The dark band ---------------------------------- */}
      <div className="bg-slate-900 px-4 pb-7 pt-5 sm:px-6 xl:px-10">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              {d.greeting ? (
                <h1 className="truncate text-lg font-semibold tracking-tight text-white">{d.greeting}</h1>
              ) : (
                <SkeletonBlock className="h-6 w-48 bg-white/10 dark:bg-white/10" />
              )}
              {d.dateLabel ? (
                <p className="mt-0.5 text-xs tabular-nums text-slate-400">{d.dateLabel}</p>
              ) : (
                <SkeletonBlock className="mt-1.5 h-3 w-32 bg-white/10 dark:bg-white/10" />
              )}
            </div>
            {/* The switcher sits on the dark face, so its light-mode greys are
                restated here rather than in the shared component. */}
            <VariantSwitcher className="[&_a:hover]:text-white [&_a]:text-slate-400 [&_a[aria-current=page]]:text-teal-400 [&>span]:text-slate-500" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
            <Dial
              label="Niveau"
              loading={d.loading && tree.loading}
              pct={xpPct}
              reading={String(level)}
              caption={
                tree.loading
                  ? "—"
                  : tree.wilting
                    ? `${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} stil`
                    : `Nog ${tree.remainingXp} XP`
              }
            />
            <Dial
              label="Reeks"
              loading={d.loading}
              pct={streakPct}
              reading={String(d.streak)}
              caption={d.streakToday ? "Vandaag geteld" : d.streak > 0 ? "Nog niet vandaag" : "Begin vandaag"}
            />
            <Dial
              label="Deze week"
              loading={d.statsLoading}
              pct={weekPct}
              reading={`${d.weekDays.filter(day => day.count > 0).length}/7`}
              caption={d.weekTotal === 0 ? "Geen activiteit" : `${d.weekTotal}× gelezen`}
              small
            />
            <Dial
              label="Bijbel"
              loading={d.loading}
              pct={biblePct}
              reading={`${biblePct.toFixed(1)}%`}
              caption={`${d.chaptersRead} van ${TOTAL_CHAPTERS}`}
              small
            />
          </div>
        </div>
      </div>

      {/* --- The light half --------------------------------- */}
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-5 sm:px-6 xl:px-10">
        <div className="mb-4 empty:hidden">
          <BillingNotices />
        </div>

        {/* Continue reading, as a wide control strip */}
        <section className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 ${CARD}`} aria-labelledby="paneel-verder">
          <div className="min-w-0">
            <h2 id="paneel-verder" className={EYEBROW}>{d.lastRead ? "Verder waar je was" : "Begin vandaag"}</h2>
            {d.loading ? (
              <SkeletonBlock className="mt-2 h-6 w-52" />
            ) : (
              <p className="content-in mt-1 text-xl font-semibold tracking-tight text-foreground">
                {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
                {d.lastRead && versionAbbreviation(d.lastRead.version) && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {versionAbbreviation(d.lastRead.version)}
                  </span>
                )}
              </p>
            )}
          </div>
          <Link
            href={nextHref}
            className="press inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
            style={{ backgroundColor: TEAL }}
          >
            {d.lastRead ? "Verder lezen" : "Begin met lezen"}
            <ArrowRight size={14} />
          </Link>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Books in progress, as horizontal gauges */}
          <section className={`p-5 lg:col-span-2 ${CARD}`} aria-labelledby="paneel-boeken">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="paneel-boeken" className={EYEBROW}>Boeken onderweg</h2>
              {!d.loading && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {d.booksWithProgress} geopend · {d.booksCompleted} uitgelezen
                </p>
              )}
            </div>

            {d.loading ? (
              <div className="mt-4 space-y-3.5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonBlock className="h-3 w-24 flex-shrink-0" />
                    <SkeletonBlock className="h-2 flex-1 rounded-full" />
                    <SkeletonBlock className="h-3 w-12 flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : inProgress.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Nog geen hoofdstuk gelezen.{" "}
                <Link href={nextHref} className={`font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Begin bij Genesis 1
                </Link>
              </p>
            ) : (
              <ul className="stagger-in mt-4 space-y-3">
                {inProgress.map(entry => (
                  <li key={entry.book}>
                    <Link href={readHref(entry.book, 1)} className="group flex items-center gap-3 no-underline">
                      <span className="w-28 flex-shrink-0 truncate text-sm font-medium text-foreground group-hover:underline">
                        {entry.book}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
                        <span
                          className="block h-full rounded-full transition-[width] duration-700 ease-out"
                          style={{
                            width: `${Math.min(100, entry.ratio * 100)}%`,
                            backgroundColor: entry.ratio >= 1 ? TEAL : "rgba(13,148,136,0.6)",
                          }}
                        />
                      </span>
                      <span className="w-14 flex-shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {entry.read}/{entry.total}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* The week, as a bar readout under the gauges */}
            <div className="mt-6 border-t border-gray-100 pt-4 dark:border-border/70">
              <h3 className={EYEBROW}>Leesmomenten per dag</h3>
              <div className="mt-3 flex h-16 items-end gap-2">
                {d.weekDays.map((day, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${day.label}: ${day.count}×`}>
                    <span
                      className={`w-full rounded-t-[3px] ${d.statsLoading ? "skeleton-pulse bg-gray-100 dark:bg-secondary" : ""}`}
                      style={
                        d.statsLoading
                          ? { height: "40%" }
                          : {
                              height: day.count > 0 ? `${Math.max(day.heightPct, 16)}%` : "8%",
                              backgroundColor:
                                day.count > 0
                                  ? day.isToday
                                    ? TEAL
                                    : "rgba(13,148,136,0.45)"
                                  : "rgba(148,163,184,0.35)",
                            }
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex gap-2">
                {d.weekDays.map((day, i) => (
                  <span
                    key={i}
                    className={`flex-1 text-center text-[10px] font-medium ${day.isToday ? TEAL_TEXT : "text-muted-foreground"}`}
                  >
                    {day.label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Right column */}
          <div className="space-y-5">
            <div className="[&>div]:rounded-xl">
              <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
            </div>

            <section className={`p-5 ${CARD}`} aria-labelledby="paneel-notities">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="paneel-notities" className={EYEBROW}>
                  Notities{!d.loading && d.notesCount > 0 ? <span className="tabular-nums"> · {d.notesCount}</span> : null}
                </h2>
                <Link href="/notities" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Alle
                </Link>
              </div>
              {d.loading ? (
                <div className="mt-4 space-y-3.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-1.5">
                      <SkeletonBlock className="h-3 w-2/5" />
                      <SkeletonBlock className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : d.recentNotes.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nog geen notities.</p>
              ) : (
                <ul className="stagger-in mt-2 divide-y divide-gray-100 dark:divide-border/70">
                  {d.recentNotes.map(note => (
                    <li key={note._id}>
                      <Link href={readHref(note.book, note.chapter)} className="group block py-2.5 no-underline">
                        <p className={`text-xs font-semibold ${TEAL_TEXT}`}>
                          {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground group-hover:text-foreground">
                          {note.noteText}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --- Pieces ------------------------------------------------- */

/**
 * One dial: a 270° arc on a slate face with the reading in the middle.
 *
 * The arc is drawn with a stroke-dasharray on a rotated circle rather than an
 * arc path, so the sweep animates from a single number and the geometry can
 * never drift out of the viewBox.
 */
function Dial({
  label,
  loading,
  pct,
  reading,
  caption,
  small = false,
}: {
  label: string
  loading: boolean
  pct: number
  reading: string
  caption: string
  small?: boolean
}) {
  const size = 108
  const stroke = 9
  const radius = size / 2 - stroke / 2
  const circumference = 2 * Math.PI * radius
  /** Three quarters of the ring is the scale; the last quarter is the gap at the bottom. */
  const sweep = 0.75
  const value = Math.max(0, Math.min(100, pct)) / 100

  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="relative mt-2" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[135deg]" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.25)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * sweep} ${circumference}`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={TEAL}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * sweep * (loading ? 0 : value)} ${circumference}`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {loading ? (
            <SkeletonBlock className="h-7 w-12 bg-white/10 dark:bg-white/10" />
          ) : (
            <span className={`font-semibold tabular-nums text-white ${small ? "text-xl" : "text-3xl"}`}>{reading}</span>
          )}
        </div>
      </div>
      <p className="mt-1.5 h-4 text-center text-[11px] tabular-nums text-slate-400">{loading ? "" : caption}</p>
    </div>
  )
}
