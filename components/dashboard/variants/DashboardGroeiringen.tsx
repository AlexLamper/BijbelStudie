"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { CHAPTER_COUNTS } from "../../../lib/data/bible-chapter-counts"
import { curatedStudies } from "../../../lib/data/curated-studies"
import {
  useDashboardData,
  readHref,
  ALL_BOOKS,
  OT_BOOKS,
  TOTAL_CHAPTERS,
} from "../../../hooks/useDashboardData"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.18em]"
const CARD = "rounded-2xl border border-gray-200 bg-white dark:border-border dark:bg-card"

/* The dial, in its own square coordinate space. */
const SIZE = 660
const C = SIZE / 2
const R_WEEK = 176
const R_BOOKS = 214
const R_TOTAL = 300
/** Books are laid across the circle with a gap at the top for the readout. */
const BOOK_START = -76
const BOOK_END = 256

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)]
}

function arc(r: number, from: number, to: number): string {
  const [x1, y1] = polar(r, from)
  const [x2, y2] = polar(r, to)
  const large = Math.abs(to - from) > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

/**
 * Versie 14 - "Groeiringen".
 *
 * A tree's own way of recording time: rings. The reader's tree sits in the
 * middle with the XP bent around it, and everything else is a ring further
 * out - the seven days of this week, then all 66 books as spokes whose length
 * is how much of each you have read, then the whole Bible as one thin arc on
 * the rim. One object, four timescales, read from the inside out. Point at a
 * spoke and the middle tells you which book it is.
 *
 * The dial wants room, so on a wide screen it takes the centre column at its
 * full 660 units and the working panels flank it.
 */
export default function DashboardGroeiringen() {
  const d = useDashboardData()
  const tree = useTreeSummary()
  const [hovered, setHovered] = useState<string | null>(null)

  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"

  const readout = hovered ?? d.lastRead?.book ?? null
  const readoutCount = readout ? d.bookReadCount(readout) : 0
  const readoutTotal = readout ? CHAPTER_COUNTS[readout] ?? 0 : 0
  const totalRatio = d.loading ? 0 : d.chaptersRead / TOTAL_CHAPTERS

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1700px] px-6 pb-20 pt-5 sm:px-10 xl:px-14">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
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

        <div className="mt-6 grid grid-cols-1 items-start gap-8 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          {/* -- Left: what to do -------------------------------- */}
          <div className="space-y-4">
            <section className={`p-6 ${CARD}`} aria-labelledby="ring-nu">
              <h2 id="ring-nu" className={`${EYEBROW} ${TEAL_TEXT}`}>
                {d.lastRead ? "Verder waar je was" : "Begin"}
              </h2>
              {d.loading ? (
                <SkeletonBlock className="mt-3 h-7 w-44" />
              ) : (
                <p className="content-in mt-2 text-xl font-semibold text-foreground">
                  {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tree.wilting
                  ? `Je boom heeft ${tree.daysSinceActive} dagen geen water gehad.`
                  : d.readToday
                    ? `${d.todayCount} ${d.todayCount === 1 ? "hoofdstuk" : "hoofdstukken"} vandaag gelezen.`
                    : "Nog niets gelezen vandaag."}
              </p>
              <Link
                href={nextHref}
                className="press mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
                style={{ backgroundColor: TEAL }}
              >
                {d.lastRead ? "Doorgaan" : "Begin met lezen"} <ArrowRight size={14} />
              </Link>
            </section>

            <section className={`p-5 ${CARD}`} aria-labelledby="ring-cijfers">
              <h2 id="ring-cijfers" className={`${EYEBROW} text-muted-foreground`}>De ringen</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Deze week" value={d.statsLoading ? null : `${d.weekTotal} hoofdstukken`} />
                <Row label="Reeks" value={d.loading ? null : `${d.streak} ${d.streak === 1 ? "dag" : "dagen"}`} />
                <Row label="Langste reeks" value={tree.loading ? null : `${Math.max(tree.longestStreak, d.streak)}`} />
                <Row label="Boeken begonnen" value={d.loading ? null : `${d.booksWithProgress} / 66`} />
                <Row label="Boeken uit" value={d.loading ? null : `${d.booksCompleted}`} />
                <Row label="Hoofdstukken" value={d.loading ? null : `${d.chaptersRead} / ${TOTAL_CHAPTERS}`} />
                <Row label="Notities" value={d.loading ? null : `${d.notesCount}`} />
              </dl>
            </section>
          </div>

          {/* -- Middle: the dial -------------------------------- */}
          <section className="min-w-0" aria-label="Je voortgang als ringen">
            <div className="relative mx-auto aspect-square w-full max-w-[680px]">
              <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${SIZE} ${SIZE}`} role="presentation">
                {/* Rim: the whole Bible, one arc. */}
                <path d={arc(R_TOTAL, BOOK_START, BOOK_END)} fill="none" stroke="currentColor" className="text-gray-200 dark:text-secondary" strokeWidth={6} strokeLinecap="round" />
                <path
                  d={arc(R_TOTAL, BOOK_START, BOOK_START + (BOOK_END - BOOK_START) * totalRatio)}
                  fill="none"
                  stroke={TEAL}
                  strokeWidth={6}
                  strokeLinecap="round"
                  style={{ transition: "d 700ms ease-out" }}
                />

                {/* Week ring: seven arcs with gaps. */}
                {d.weekDays.map((day, i) => {
                  const span = 360 / 7
                  const from = -90 + i * span + 3
                  const to = -90 + (i + 1) * span - 3
                  return (
                    <path
                      key={i}
                      d={arc(R_WEEK, from, to)}
                      fill="none"
                      stroke={day.count > 0 ? TEAL : "currentColor"}
                      className={day.count > 0 ? "" : "text-gray-200 dark:text-secondary"}
                      strokeWidth={9}
                      strokeLinecap="round"
                      strokeDasharray={day.count === 0 && day.isToday ? "2 7" : undefined}
                      opacity={d.statsLoading ? 0.4 : 1}
                    />
                  )
                })}

                {/* Book spokes. Length is the share of that book you have read. */}
                {ALL_BOOKS.map((book, i) => {
                  const angle = BOOK_START + ((BOOK_END - BOOK_START) * i) / (ALL_BOOKS.length - 1)
                  const ratio = d.loading ? 0 : Math.min(1, d.bookReadRatio(book))
                  const isCurrent = !d.loading && d.lastRead?.book === book
                  const isHovered = hovered === book
                  const length = 10 + ratio * 58 + (isCurrent || isHovered ? 10 : 0)
                  const [x1, y1] = polar(R_BOOKS, angle)
                  const [x2, y2] = polar(R_BOOKS + length, angle)
                  return (
                    <a
                      key={book}
                      href={readHref(book, isCurrent && d.lastRead ? d.lastRead.chapter : 1)}
                      aria-label={`${book}, ${d.bookReadCount(book)} van ${CHAPTER_COUNTS[book] ?? "?"} hoofdstukken`}
                      onMouseEnter={() => setHovered(book)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(book)}
                      onBlur={() => setHovered(null)}
                    >
                      {/* A fat invisible line so the 66 spokes are actually hittable. */}
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={14} />
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isCurrent || ratio > 0 ? TEAL : "currentColor"}
                        className={isCurrent || ratio > 0 ? "" : "text-gray-200 dark:text-secondary"}
                        strokeWidth={isCurrent || isHovered ? 7 : 5}
                        strokeLinecap="round"
                        opacity={ratio > 0 ? 0.35 + ratio * 0.65 : 1}
                        style={{ transition: "stroke-width 150ms ease-out" }}
                      />
                    </a>
                  )
                })}

                {/* The seam between the testaments. */}
                {(() => {
                  const seam = BOOK_START + ((BOOK_END - BOOK_START) * (OT_BOOKS.length - 0.5)) / (ALL_BOOKS.length - 1)
                  const [sx1, sy1] = polar(R_BOOKS - 8, seam)
                  const [sx2, sy2] = polar(R_TOTAL - 12, seam)
                  return <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke="currentColor" className="text-gray-300 dark:text-border" strokeWidth={1.5} strokeDasharray="3 4" />
                })()}
              </svg>

              {/* Ring labels, in HTML so they never rotate with the dial. */}
              <span className="pointer-events-none absolute left-1/2 top-[2%] -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Oude Testament
              </span>
              <span className="pointer-events-none absolute bottom-[1%] left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Nieuwe Testament
              </span>

              {/* The middle: the tree, then the readout. */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <ProgressTreeDisc size={224} />
                <div className="min-h-[3.25rem] text-center">
                  {readout ? (
                    <>
                      <p className="text-sm font-semibold text-foreground">{readout}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {readoutCount} van {readoutTotal} hoofdstukken
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Beweeg over een boek</p>
                  )}
                  <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                    {tree.hasTree && tree.stageName ? `${tree.stageName} - ` : ""}
                    niveau {level} - {xpInto}/{xpFor} XP
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              Binnenste ring: deze week. Spaken: de 66 boeken. Buitenrand: de hele Bijbel
              {!d.loading && ` (${Math.round(totalRatio * 100)}%)`}.
            </p>
          </section>

          {/* -- Right: reading matter --------------------------- */}
          <aside className="space-y-4">
            <div className="[&>div]:rounded-2xl">
              <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
            </div>

            {(d.loading || d.recentNotes.length > 0) && (
              <section className={`p-5 ${CARD}`} aria-labelledby="ring-notities">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="ring-notities" className={`${EYEBROW} text-muted-foreground`}>Recente notities</h2>
                  <Link href="/notities" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>Alle</Link>
                </div>
                {d.loading ? (
                  <div className="mt-4 space-y-3">
                    <SkeletonBlock className="h-3 w-2/5" />
                    <SkeletonBlock className="h-3 w-full" />
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

            <section className={`p-5 ${CARD}`} aria-labelledby="ring-studies">
              <h2 id="ring-studies" className={`${EYEBROW} text-muted-foreground`}>Verder studeren</h2>
              <ul className="mt-3 space-y-3">
                {curatedStudies.slice(0, 3).map(study => (
                  <li key={study.id}>
                    <Link href={`/studies/${study.id}`} className="group block no-underline">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {study.type} - {study.durationLabel}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground group-hover:underline">{study.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/studies" className={`mt-4 inline-block text-sm font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Alle studies →
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground">
        {value ?? <SkeletonBlock className="inline-block h-3.5 w-12 align-middle" />}
      </dd>
    </div>
  )
}
