"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
import { ProgressTreeDisc, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
const CARD = "rounded-xl border border-gray-200 bg-white dark:border-border dark:bg-card"
/** A spine narrower than this cannot carry its own name, so it gets a tooltip only. */
const NAME_MIN_WIDTH = 22

/**
 * Versie 6 - "Boekenplank".
 *
 * The Bible drawn as it sits on a shelf: 66 spines, each as wide as the book
 * is long, filling from the bottom as it is read, with the book you are in
 * pulled slightly out of the row. Browsing is the primary act here - the whole
 * canon is on screen at once and every spine is a link - so the numbers are
 * kept to a single line under each shelf.
 */
export default function DashboardBoekenplank() {
  const d = useDashboardData()
  const tree = useTreeSummary()
  const [hovered, setHovered] = useState<string | null>(null)

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const pct = TOTAL_CHAPTERS ? (d.chaptersRead / TOTAL_CHAPTERS) * 100 : 0

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-5 sm:px-6 xl:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {d.greeting ? (
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{d.greeting}</h1>
            ) : (
              <SkeletonBlock className="h-6 w-52" />
            )}
            {d.dateLabel ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{d.dateLabel}</p>
            ) : (
              <SkeletonBlock className="mt-1.5 h-3.5 w-36" />
            )}
          </div>
          <VariantSwitcher />
        </div>

        <div className="mt-4 empty:hidden">
          <BillingNotices />
        </div>

        {/* --- Pick the book back up --------------------------- */}
        <section
          className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-teal-100 bg-[#F0FDFA] px-5 py-4 dark:border-teal-900/40 dark:bg-teal-950/30"
          aria-labelledby="plank-verder"
        >
          <div className="min-w-0">
            <h2 id="plank-verder" className={`${EYEBROW} ${TEAL_TEXT}`}>
              {d.lastRead ? "Verder waar je was" : "Begin vandaag"}
            </h2>
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

        {/* --- The shelves ------------------------------------- */}
        <section className="mt-7" aria-labelledby="plank-titel">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="plank-titel" className="text-base font-semibold text-foreground">Je boekenplank</h2>
            {!d.loading && (
              <p className="text-xs tabular-nums text-muted-foreground">
                {d.chaptersRead} van {TOTAL_CHAPTERS} hoofdstukken · {d.booksWithProgress} van 66 boeken geopend ·{" "}
                {d.booksCompleted} uitgelezen
              </p>
            )}
          </div>

          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: d.loading ? "0%" : `${pct}%`, backgroundColor: TEAL }}
            />
          </div>

          {/* The read-out line, held at a fixed height so the shelves never jump. */}
          <p className="mt-3 flex h-5 items-center text-sm">
            {hovered ? (
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold normal-nums" style={{ color: TEAL }}>{hovered}</span>
                {" · "}
                {d.bookReadCount(hovered)} van {CHAPTER_COUNTS[hovered] ?? "?"} hoofdstukken gelezen
              </span>
            ) : (
              <span className="text-muted-foreground">Kies een boek om te gaan lezen.</span>
            )}
          </p>

          <Shelf
            label="Oude Testament"
            books={OT_BOOKS}
            loading={d.loading}
            ratioOf={d.bookReadRatio}
            countOf={d.bookReadCount}
            current={d.lastRead}
            hovered={hovered}
            onHover={setHovered}
          />
          <Shelf
            label="Nieuwe Testament"
            books={NT_BOOKS}
            loading={d.loading}
            ratioOf={d.bookReadRatio}
            countOf={d.bookReadCount}
            current={d.lastRead}
            hovered={hovered}
            onHover={setHovered}
          />
        </section>

        {/* --- Underneath the shelves ------------------------- */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="[&>div]:h-full [&>div]:rounded-xl">
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </div>

          <section className={`flex flex-col p-5 ${CARD}`} aria-labelledby="plank-voortgang">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="plank-voortgang" className={EYEBROW}>Jouw voortgang</h2>
              <Link href="/profiel/boom" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Bekijk je boom
              </Link>
            </div>
            <div className="mt-4 flex flex-1 items-center gap-4">
              <ProgressTreeDisc size={76} />
              <div className="min-w-0 flex-1">
                {tree.loading ? (
                  <div className="space-y-2">
                    <SkeletonBlock className="h-4 w-36" />
                    <SkeletonBlock className="h-3 w-28" />
                    <SkeletonBlock className="h-3 w-24" />
                  </div>
                ) : (
                  <div className="content-in">
                    <p className="text-sm font-semibold text-foreground">
                      {tree.hasTree && tree.stageName ? `${tree.stageName} · niveau ${tree.level}` : `Niveau ${tree.level}`}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {tree.wilting
                        ? `${tree.daysSinceActive} dagen niet gelezen`
                        : `Nog ${tree.remainingXp} XP tot niveau ${tree.level + 1}`}
                    </p>
                    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                      Reeks {d.streak} {d.streak === 1 ? "dag" : "dagen"} · langste {tree.longestStreak}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={`flex flex-col p-5 ${CARD}`} aria-labelledby="plank-notities">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="plank-notities" className={EYEBROW}>
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
              <p className="mt-4 flex-1 text-sm text-muted-foreground">
                Nog geen notities.{" "}
                <Link href={nextHref} className={`font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Schrijf er een tijdens het lezen
                </Link>
              </p>
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
  )
}

/* --- Pieces ------------------------------------------------- */

/**
 * One testament as a row of spines standing on a board.
 *
 * Width is `flex-grow` in proportion to the chapter count, so Psalmen is wide
 * and Obadja is a sliver, and the row always fills the column exactly. The
 * read part is drawn as a fill rising from the base of the spine.
 */
function Shelf({
  label,
  books,
  loading,
  ratioOf,
  countOf,
  current,
  hovered,
  onHover,
}: {
  label: string
  books: readonly string[]
  loading: boolean
  ratioOf: (book: string) => number
  countOf: (book: string) => number
  current: LastRead | null
  hovered: string | null
  onHover: (book: string | null) => void
}) {
  const chapters = books.map(book => CHAPTER_COUNTS[book] ?? 1)
  const total = chapters.reduce((sum, n) => sum + n, 0)

  return (
    <div className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label} <span className="font-normal normal-case tabular-nums">({books.length})</span>
      </p>

      <div className="mt-2">
        <ul className="flex h-[132px] items-end gap-[2px] sm:h-[156px]" aria-label={label}>
          {books.map((book, i) => {
            const ratio = loading ? 0 : Math.min(1, ratioOf(book))
            const isCurrent = !loading && current?.book === book
            const isHovered = hovered === book
            // Percentage of the row, so the spines keep their proportions at
            // every breakpoint instead of wrapping.
            const widthPct = (chapters[i] / total) * 100
            return (
              <li
                key={book}
                className="min-w-[7px] flex-shrink-0"
                style={{ width: `${widthPct}%` }}
              >
                <Link
                  href={readHref(book, isCurrent && current ? current.chapter : 1, isCurrent && current ? current.version : undefined)}
                  title={`${book} · ${countOf(book)} van ${chapters[i]} hoofdstukken`}
                  aria-label={`${book}, ${countOf(book)} van ${chapters[i]} hoofdstukken gelezen`}
                  aria-current={isCurrent ? "location" : undefined}
                  onMouseEnter={() => onHover(book)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(book)}
                  onBlur={() => onHover(null)}
                  className={`relative block w-full overflow-hidden rounded-t-[3px] border border-b-0 no-underline transition-[height,transform] duration-150 ${
                    isCurrent
                      ? "h-[124px] border-[#0D9488] sm:h-[148px]"
                      : isHovered
                        ? "h-[116px] border-gray-300 dark:border-gray-600 sm:h-[140px]"
                        : "h-[108px] border-gray-200 dark:border-border sm:h-[130px]"
                  } ${loading ? "skeleton-pulse bg-gray-100 dark:bg-secondary" : "bg-gray-50 dark:bg-secondary/50"}`}
                >
                  {/* The read part, rising from the base of the spine. */}
                  {!loading && ratio > 0 && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 block transition-[height] duration-700 ease-out"
                      style={{ height: `${ratio * 100}%`, backgroundColor: ratio >= 1 ? TEAL : "rgba(13,148,136,0.55)" }}
                    />
                  )}
                  {/* The name, printed down the spine where there is room for it. */}
                  {widthPct * 10 >= NAME_MIN_WIDTH && (
                    <span
                      aria-hidden
                      className={`absolute inset-0 flex items-center justify-center px-0.5 text-[10px] font-semibold leading-none ${
                        ratio > 0.55 ? "text-white" : "text-muted-foreground"
                      }`}
                      style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                    >
                      <span className="truncate">{book}</span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
        {/* The board the books stand on. */}
        <div className="h-1.5 rounded-b-sm bg-gray-300 dark:bg-border" />
      </div>
    </div>
  )
}
