"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { curatedStudies, BADGE_STYLES } from "../../../lib/data/curated-studies"
import { CHAPTER_COUNTS } from "../../../lib/data/bible-chapter-counts"
import {
  useDashboardData,
  readHref,
  OT_BOOKS,
  NT_BOOKS,
  TOTAL_CHAPTERS,
  type LastRead,
} from "../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../lib/dailyVerseStore"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeScene, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em]"
/** The soft teal surface every "current" element in this variant sits on. */
const SOFT = "border border-teal-100 bg-[#F0FDFA] dark:border-teal-900/40 dark:bg-teal-950/30"
const CARD = "border border-gray-200 bg-white dark:border-border dark:bg-card"

/**
 * Versie 3 - "Reis".
 *
 * A path forward, in two zones. The hero band puts the tree beside the level,
 * the XP still to go and the streak as seven days walked; under it the 66
 * books are laid out as a road with the reader's position marked, and what
 * comes next is a numbered list of steps. Rounded-2xl throughout, soft teal
 * tints instead of hard borders, and the only motion is a bar that fills and
 * the road scrolling to where you are.
 */
export default function DashboardReis() {
  const d = useDashboardData()
  const tree = useTreeSummary()
  const [hoveredBook, setHoveredBook] = useState<string | null>(null)

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? 0)
  const steps = curatedStudies.slice(0, 3)

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-5 sm:px-6 xl:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {d.dateLabel ? (
            <p className="text-sm text-muted-foreground">{d.dateLabel}</p>
          ) : (
            <SkeletonBlock className="h-3.5 w-36" />
          )}
          <VariantSwitcher />
        </div>

        <div className="mt-4 empty:hidden">
          <BillingNotices />
        </div>

        {/* ── Zone 1: the hero band ─────────────────────── */}
        <section
          aria-labelledby="reis-titel"
          className="mt-5 overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-[#F0FDFA] via-white to-white dark:border-teal-900/40 dark:from-teal-950/40 dark:via-card dark:to-card"
        >
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(280px,42%)]">
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className={`${EYEBROW} ${TEAL_TEXT}`}>Jouw reis</p>
              {d.greeting ? (
                <h1 id="reis-titel" className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {d.greeting}
                </h1>
              ) : (
                <SkeletonBlock className="mt-2 h-8 w-64" />
              )}
              {tree.loading && d.loading ? (
                <SkeletonBlock className="mt-3 h-4 w-72" />
              ) : (
                <p className="content-in mt-2 text-sm text-muted-foreground">
                  {tree.hasTree && tree.stageName ? `${tree.stageName} · niveau ${level}` : `Niveau ${level}`}
                  {tree.wilting
                    ? ` · ${tree.daysSinceActive} dagen niet gelezen`
                    : ` · nog ${Math.max(0, xpFor - xpInto)} XP tot niveau ${level + 1}`}
                </p>
              )}

              {/* XP as the road between two levels */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between text-xs tabular-nums">
                  <span className="font-semibold text-foreground">Niveau {level}</span>
                  <span className="text-muted-foreground">{xpInto} / {xpFor} XP</span>
                  <span className="font-semibold text-muted-foreground">Niveau {level + 1}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-teal-100 dark:bg-teal-900/40">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: d.loading ? "0%" : `${pct}%`, backgroundColor: TEAL }}
                  />
                </div>
              </div>

              {/* The streak as the week walked */}
              <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                  <p className={`${EYEBROW} text-muted-foreground`}>Reeks</p>
                  {d.loading ? (
                    <SkeletonBlock className="mt-1.5 h-6 w-32" />
                  ) : (
                    <p className="content-in mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {d.streak} {d.streak === 1 ? "dag" : "dagen"}
                      {!tree.loading && tree.longestStreak > d.streak && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">· langste {tree.longestStreak}</span>
                      )}
                    </p>
                  )}
                </div>
                <ol className="flex items-start gap-1.5" aria-label="Deze week">
                  {d.weekDays.map((day, i) => {
                    const walked = day.count > 0
                    return (
                      <li key={i} className="flex flex-col items-center gap-1">
                        <span
                          aria-hidden
                          className={`block h-6 w-6 rounded-full ${
                            walked
                              ? ""
                              : day.isToday
                                ? "border-2 border-dashed border-[#0D9488] dark:border-teal-400"
                                : "bg-gray-200 dark:bg-secondary"
                          } ${d.statsLoading ? "skeleton-pulse" : ""}`}
                          style={walked ? { backgroundColor: TEAL } : undefined}
                        />
                        <span className={`text-[10px] font-medium ${day.isToday ? TEAL_TEXT : "text-muted-foreground"}`}>
                          {day.label}
                          <span className="sr-only">{walked ? `, ${day.count} keer gelezen` : ", niet gelezen"}</span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                {d.loading ? (
                  <SkeletonBlock className="h-11 w-44 rounded-xl" />
                ) : (
                  <Link
                    href={nextHref}
                    className="press inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
                    style={{ backgroundColor: TEAL }}
                  >
                    {d.lastRead ? `Verder in ${d.lastRead.book} ${d.lastRead.chapter}` : "Begin met lezen"}
                    <ArrowRight size={14} />
                  </Link>
                )}
                <Link href="/profiel/boom" className={`text-sm font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Bekijk je boom →
                </Link>
              </div>
            </div>

            <div className="relative aspect-[16/10] min-h-[220px] md:aspect-auto">
              <div className="absolute inset-0">
                <ProgressTreeScene />
              </div>
              {!tree.loading && (
                <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: TEAL }}>
                    Niveau {level}
                  </span>
                  {tree.hasTree && tree.stageName && (
                    <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                      {tree.stageName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Zone 2: the road and the steps ───────────── */}
        <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="reis-weg">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="reis-weg" className="text-base font-semibold text-foreground">Je weg door de Bijbel</h2>
                {!d.loading && (
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {d.booksWithProgress} van 66 boeken · {d.chaptersRead} van {TOTAL_CHAPTERS} hoofdstukken
                  </p>
                )}
              </div>

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-secondary">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: d.loading ? "0%" : `${(d.chaptersRead / TOTAL_CHAPTERS) * 100}%`, backgroundColor: TEAL }}
                />
              </div>

              <BookRoad
                label="Oude Testament"
                books={OT_BOOKS}
                loading={d.loading}
                ratioOf={d.bookReadRatio}
                current={d.lastRead}
                hovered={hoveredBook}
                onHover={setHoveredBook}
              />
              <BookRoad
                label="Nieuwe Testament"
                books={NT_BOOKS}
                loading={d.loading}
                ratioOf={d.bookReadRatio}
                current={d.lastRead}
                hovered={hoveredBook}
                onHover={setHoveredBook}
              />

              <p className="mt-1 h-4 text-xs text-muted-foreground">
                {hoveredBook ? (
                  <>
                    <span className="font-semibold" style={{ color: TEAL }}>{hoveredBook}</span>
                    {" · "}
                    <span className="tabular-nums">
                      {d.bookReadCount(hoveredBook)} van {CHAPTER_COUNTS[hoveredBook] ?? "?"} hoofdstukken gelezen
                    </span>
                  </>
                ) : d.lastRead ? (
                  <>Je bent bij <span className="font-semibold text-foreground">{d.lastRead.book} {d.lastRead.chapter}</span>. Beweeg over een boek voor details.</>
                ) : (
                  "Beweeg over een boek voor details"
                )}
              </p>
            </section>

            <section aria-labelledby="reis-stappen">
              <h2 id="reis-stappen" className="text-base font-semibold text-foreground">Volgende stappen</h2>
              <ol className="relative mt-4 space-y-3">
                {/* The thread the steps hang on */}
                <span aria-hidden className="absolute bottom-6 left-[15px] top-6 w-px bg-gray-200 dark:bg-border" />

                <li className="relative pl-12">
                  <StepNumber n={1} current />
                  {d.loading ? (
                    <div className={`rounded-2xl p-5 ${SOFT}`}>
                      <SkeletonBlock className="h-3 w-28" />
                      <SkeletonBlock className="mt-2.5 h-6 w-48" />
                      <SkeletonBlock className="mt-4 h-10 w-32 rounded-xl" />
                    </div>
                  ) : (
                    <div className={`content-in flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 ${SOFT}`}>
                      <div className="min-w-0">
                        <p className={`${EYEBROW} ${TEAL_TEXT}`}>{d.lastRead ? "Nu · verder waar je was" : "Nu · begin"}</p>
                        <p className="mt-1.5 text-lg font-semibold text-foreground">
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
                        className="press inline-flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
                        style={{ backgroundColor: TEAL }}
                      >
                        {d.lastRead ? "Doorgaan" : "Begin met lezen"} <ArrowRight size={14} />
                      </Link>
                    </div>
                  )}
                </li>

                {steps.map((study, i) => {
                  const badge = BADGE_STYLES[study.type]
                  return (
                    <li key={study.id} className="relative pl-12">
                      <StepNumber n={i + 2} />
                      <Link
                        href={`/studies/${study.id}`}
                        className={`group flex items-center gap-4 rounded-2xl p-4 no-underline transition-colors hover:bg-gray-50 dark:hover:bg-secondary/40 sm:p-5 ${CARD}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                              style={{ backgroundColor: badge.bg, color: badge.color }}
                            >
                              {study.type}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                              <Clock size={10} aria-hidden /> {study.durationLabel}
                            </span>
                          </div>
                          <p className="mt-1.5 truncate text-[15px] font-semibold text-foreground">{study.title}</p>
                          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{study.description}</p>
                        </div>
                        <ArrowRight size={16} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: TEAL }} />
                      </Link>
                    </li>
                  )
                })}
              </ol>
              <Link href="/studies" className={`mt-4 inline-block text-sm font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Alle studies bekijken →
              </Link>
            </section>
          </div>

          {/* ── Right rail ───────────────────────────────── */}
          <aside className="space-y-4">
            <div className="[&>div]:rounded-2xl">
              <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
            </div>

            {(d.loading || d.recentNotes.length > 0) && (
              <section className={`rounded-2xl p-5 ${CARD}`} aria-labelledby="reis-notities">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="reis-notities" className={`${EYEBROW} text-muted-foreground`}>Recente notities</h2>
                  <Link href="/notities" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                    Alle
                  </Link>
                </div>
                {d.loading ? (
                  <div className="mt-4 space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="space-y-1.5">
                        <SkeletonBlock className="h-3 w-2/5" />
                        <SkeletonBlock className="h-3 w-full" />
                        <SkeletonBlock className="h-3 w-4/5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="stagger-in mt-3 space-y-3">
                    {d.recentNotes.map(note => (
                      <li key={note._id}>
                        <Link href={readHref(note.book, note.chapter)} className="group block no-underline">
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
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

/* ── Pieces ────────────────────────────────────────────────── */

function StepNumber({ n, current = false }: { n: number; current?: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute left-0 top-5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
        current ? "text-white" : "border border-gray-200 bg-white text-muted-foreground dark:border-border dark:bg-card"
      }`}
      style={current ? { backgroundColor: TEAL } : undefined}
    >
      {n}
    </span>
  )
}

/**
 * One testament as a road: a dot per book on a line, filled by how much of it
 * is read, with the reader's position drawn larger and named. Scrolls sideways
 * on a phone and centres on the current book once the data lands - by moving
 * the strip itself, never the page.
 */
function BookRoad({
  label,
  books,
  loading,
  ratioOf,
  current,
  hovered,
  onHover,
}: {
  label: string
  books: readonly string[]
  loading: boolean
  ratioOf: (book: string) => number
  current: LastRead | null
  hovered: string | null
  onHover: (book: string | null) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLAnchorElement>(null)
  const hasCurrent = current ? books.includes(current.book) : false

  useEffect(() => {
    if (loading || !hasCurrent) return
    const strip = scroller.current
    const node = marker.current
    if (!strip || !node) return
    const target = node.offsetLeft - strip.clientWidth / 2 + node.offsetWidth / 2
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" })
  }, [loading, hasCurrent, current?.book])

  return (
    <div className="mt-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label} <span className="font-normal normal-case tabular-nums">({books.length})</span>
      </p>
      <div ref={scroller} className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">
        {/* 12 px dots on 6 px gaps: the 39 Old Testament books then fit the
            column at lg without a scrollbar; phones scroll and self-centre. */}
        <ol className={`relative flex min-w-max items-center gap-1.5 pt-3 ${hasCurrent ? "pb-7" : "pb-3"}`} aria-label={label}>
          <span aria-hidden className="absolute left-2 right-2 top-[22px] h-0.5 rounded-full bg-gray-200 dark:bg-secondary" />
          {books.map(book => {
            const ratio = loading ? 0 : ratioOf(book)
            const isCurrent = !loading && current?.book === book
            const complete = ratio >= 1
            const started = ratio > 0 && !complete
            return (
              <li key={book} className="relative flex h-5 w-3 items-center justify-center">
                <Link
                  ref={isCurrent ? marker : undefined}
                  href={readHref(book, isCurrent && current ? current.chapter : 1, isCurrent && current ? current.version : undefined)}
                  title={book}
                  aria-label={isCurrent && current ? `${book}, je bent bij hoofdstuk ${current.chapter}` : book}
                  aria-current={isCurrent ? "location" : undefined}
                  onMouseEnter={() => onHover(book)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(book)}
                  onBlur={() => onHover(null)}
                  className={`relative z-10 block rounded-full transition-transform duration-150 hover:scale-125 ${
                    isCurrent
                      ? "h-[18px] w-[18px] ring-4 ring-teal-100 dark:ring-teal-900/60"
                      : complete
                        ? "h-3 w-3"
                        : started
                          ? "h-3 w-3 border-2 border-[#0D9488]"
                          : "h-3 w-3 border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-card"
                  } ${loading ? "skeleton-pulse" : ""} ${hovered === book && !isCurrent ? "scale-125" : ""}`}
                  style={
                    isCurrent || complete
                      ? { backgroundColor: TEAL }
                      : started
                        ? { backgroundColor: `rgba(13,148,136,${0.15 + ratio * 0.5})` }
                        : undefined
                  }
                />
                {isCurrent && current && (
                  <span className={`pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold ${TEAL_TEXT}`}>
                    {book} {current.chapter}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
