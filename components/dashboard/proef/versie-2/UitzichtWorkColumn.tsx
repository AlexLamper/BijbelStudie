"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock, BookOpen, StickyNote, CalendarCheck2 } from "lucide-react"
import { curatedStudies, BADGE_STYLES } from "../../../../lib/data/curated-studies"
import { CHAPTER_COUNTS } from "../../../../lib/data/bible-chapter-counts"
import {
  OT_BOOKS,
  NT_BOOKS,
  TOTAL_CHAPTERS,
  readHref,
  type DashboardData,
} from "../../../../hooks/useDashboardData"
import BillingNotices from "../../../pricing/BillingNotices"
import DailyVerseCard from "../../DailyVerseCard"
import { SkeletonBlock } from "../../../ui/skeletons"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const CARD = "rounded-2xl border border-gray-200 bg-white dark:border-border dark:bg-card"
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"

/** The dashboard's own scale: five steps from untouched to finished. */
function progressColor(ratio: number): string {
  if (ratio < 0.25) return "rgba(13,148,136,0.22)"
  if (ratio < 0.50) return "rgba(13,148,136,0.45)"
  if (ratio < 1.00) return "rgba(13,148,136,0.72)"
  return TEAL
}

/**
 * Versie 10's right panel with the live dashboard's content set: the work, and
 * the only thing in the sheet that scrolls from lg up.
 *
 * The verse, the 66 books, the notes, the studies and the quick links - the
 * same things `/dashboard` shows today, in the order someone actually works
 * through them. The resume action is not here: it is in the band, over the
 * sky, because it is the one thing the reader came for.
 */
export default function UitzichtWorkColumn({ d }: { d: DashboardData }) {
  const [focusedBook, setFocusedBook] = useState<string | null>(null)
  const readPct = Math.round((d.chaptersRead / TOTAL_CHAPTERS) * 100)

  return (
    <div className="min-w-0 flex-1 p-5 sm:p-6 lg:overflow-y-auto">
      <div className="mb-5 empty:hidden">
        <BillingNotices />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 xl:order-2">
          {/* ── Tekst van de dag ────────────────────────── */}
          <section aria-labelledby="uitzicht-vers" className="[&>div]:rounded-2xl">
            <h2 id="uitzicht-vers" className="sr-only">Tekst van de dag</h2>
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </section>

          {/* ── Snel naar ───────────────────────────────── */}
          <section aria-labelledby="uitzicht-snel" className={`mt-5 p-4 ${CARD}`}>
            <h2 id="uitzicht-snel" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Snel naar
            </h2>
            <ul className="mt-2 flex list-none flex-col gap-0.5 p-0">
              {[
                { href: "/studie", label: "Bijbelstudie", icon: BookOpen },
                { href: "/notities", label: "Mijn notities", icon: StickyNote },
                { href: "/studies", label: "Leesplannen", icon: CalendarCheck2 },
              ].map(({ href, label, icon: Icon }) => (
                <li key={href} className="list-none">
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground no-underline transition-colors hover:bg-gray-50 dark:hover:bg-secondary ${FOCUS}`}
                  >
                    <Icon size={14} aria-hidden className="flex-shrink-0" style={{ color: TEAL }} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="min-w-0 xl:order-1">
          {/* ── Je weg door de Bijbel ───────────────────── */}
          <section aria-labelledby="uitzicht-weg" className={`p-5 ${CARD}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="uitzicht-weg" className="text-base font-semibold text-foreground">Je weg door de Bijbel</h2>
              {!d.loading && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {d.chaptersRead} van {TOTAL_CHAPTERS} hoofdstukken · {readPct}%
                </p>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              {/* One line that answers "which book is that square?" for mouse
                  and keyboard alike; it keeps its height so nothing jumps. */}
              <p className="min-h-[1.25rem] text-xs text-muted-foreground">
                {focusedBook ? (
                  <>
                    <span className="font-semibold" style={{ color: TEAL }}>{focusedBook}</span>
                    {" · "}
                    {d.bookReadCount(focusedBook)} van {CHAPTER_COUNTS[focusedBook] ?? "?"} hoofdstukken gelezen
                  </>
                ) : (
                  "Kies een boek om te gaan lezen"
                )}
              </p>
              <p aria-hidden className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                Minder
                <span className="inline-block h-3 w-3 flex-shrink-0 rounded-sm bg-gray-200 dark:bg-gray-700" />
                {[0.15, 0.37, 0.75, 1].map(r => (
                  <span
                    key={r}
                    className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: progressColor(r) }}
                  />
                ))}
                Meer
              </p>
            </div>

            <BookGrid
              label="Oude Testament"
              books={OT_BOOKS}
              d={d}
              onFocusBook={setFocusedBook}
              className="mt-4"
            />
            <BookGrid
              label="Nieuwe Testament"
              books={NT_BOOKS}
              d={d}
              onFocusBook={setFocusedBook}
              className="mt-4"
            />
          </section>

          {/* ── Recente notities ────────────────────────── */}
          <section aria-labelledby="uitzicht-notities" className={`mt-5 p-5 ${CARD}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="uitzicht-notities" className="text-base font-semibold text-foreground">Recente notities</h2>
              <Link href="/notities" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}>
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
              <p className="mt-3 text-sm text-muted-foreground">
                Nog geen notities. Schrijf er een tijdens het lezen.
              </p>
            ) : (
              <ul className="stagger-in mt-1 list-none divide-y divide-gray-100 p-0 dark:divide-border/70">
                {d.recentNotes.map(note => (
                  <li key={note._id} className="list-none">
                    <Link
                      href={readHref(note.book, note.chapter)}
                      className={`group block rounded-md py-3 no-underline ${FOCUS}`}
                    >
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

          {/* ── Aanbevolen studies ──────────────────────── */}
          <section aria-labelledby="uitzicht-studies" className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="uitzicht-studies" className="text-base font-semibold text-foreground">Aanbevolen studies</h2>
              <Link href="/studies" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}>
                Bekijk alle
              </Link>
            </div>
            <ul className="mt-3 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
              {curatedStudies.slice(0, 4).map(study => {
                const badge = BADGE_STYLES[study.type]
                return (
                  <li key={study.id} className="list-none">
                    <Link
                      href={`/studies/${study.id}`}
                      className={`lift group flex h-full flex-col p-5 no-underline ${CARD} ${FOCUS}`}
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
                        <ArrowRight size={12} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
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

/**
 * One testament as the dashboard's own grid of squares, each filled to the
 * share of that book already read. Hover AND focus feed the line above the
 * grid, so the grid is readable with a keyboard and not only with a mouse.
 */
function BookGrid({
  label,
  books,
  d,
  onFocusBook,
  className = "",
}: {
  label: string
  books: readonly string[]
  d: DashboardData
  onFocusBook: (book: string | null) => void
  className?: string
}) {
  return (
    <div className={className}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label} <span className="font-normal normal-case">({books.length} boeken)</span>
      </h3>
      <ul className="m-0 flex list-none flex-wrap gap-[3px] p-0">
        {books.map(book => {
          const ratio = d.loading ? 0 : d.bookReadRatio(book)
          const empty = ratio === 0
          const read = d.loading ? 0 : d.bookReadCount(book)
          return (
            <li key={book} className="list-none">
              <Link
                href={readHref(book, 1)}
                title={book}
                aria-label={`${book}, ${read} van ${CHAPTER_COUNTS[book] ?? "?"} hoofdstukken gelezen`}
                onMouseEnter={() => onFocusBook(book)}
                onMouseLeave={() => onFocusBook(null)}
                onFocus={() => onFocusBook(book)}
                onBlur={() => onFocusBook(null)}
                className={[
                  "block h-[18px] w-[18px] rounded-sm no-underline transition-transform duration-100 hover:scale-125",
                  empty ? "bg-gray-200 dark:bg-gray-700" : "",
                  d.loading ? "skeleton-pulse" : "",
                  FOCUS,
                ].join(" ")}
                style={empty ? undefined : { backgroundColor: progressColor(ratio) }}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
