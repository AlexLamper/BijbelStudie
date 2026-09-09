"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Clock } from "lucide-react"
import { curatedStudies, BADGE_STYLES } from "../../../../lib/data/curated-studies"
import { CHAPTER_COUNTS } from "../../../../lib/data/bible-chapter-counts"
import {
  readHref,
  OT_BOOKS,
  NT_BOOKS,
  TOTAL_CHAPTERS,
  type DashboardData,
} from "../../../../hooks/useDashboardData"
import BillingNotices from "../../../pricing/BillingNotices"
import DailyVerseCard from "../../DailyVerseCard"
import { SkeletonBlock } from "../../../ui/skeletons"
import { TEAL_TEXT, EYEBROW, FOCUS, progressColor } from "./shell"

/**
 * The right half of the composition: the work.
 *
 * Versie 10's rule holds - this is the only column that scrolls - and the
 * content is the live dashboard's, in the live dashboard's own shapes: the
 * verse card, the 66 books as a field of squares you can hover for the count,
 * the last three notes, the recommended studies. Sections are separated by
 * rules rather than boxed in cards, because they are already inside one.
 *
 * "Snel naar" is the one block of the live dashboard that is not here: it was
 * three shortcuts into the sidebar, and in this candidate the whole sidebar is
 * a row at the top of the page, so the shortcuts would point at links already
 * on screen.
 */
export default function WerkKolom({ d, nextHref }: { d: DashboardData; nextHref: string }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const pct = Math.round((d.chaptersRead / TOTAL_CHAPTERS) * 100)

  return (
    <div className="min-w-0 p-6 lg:p-7">
      <div className="mb-6 empty:hidden">
        <BillingNotices />
      </div>

      {/* Tekst van de dag. The card carries its own eyebrow and its own
          photograph, so it gets a heading only for the outline. */}
      <section aria-labelledby="v5-vers">
        <h2 id="v5-vers" className="sr-only">
          Tekst van de dag
        </h2>
        <div className="[&>div]:rounded-2xl">
          <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
        </div>
      </section>

      {/* The 66 books */}
      <section aria-labelledby="v5-weg" className="mt-7 border-t border-black/10 pt-6 dark:border-white/10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="v5-weg" className="text-base font-semibold text-foreground">
            Je weg door de Bijbel
          </h2>
          {!d.loading && (
            <p className="text-xs tabular-nums text-muted-foreground">
              {d.chaptersRead} van {TOTAL_CHAPTERS} hoofdstukken · {pct}%
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          {/* One reserved line, so hovering a book never reflows the field. */}
          <p className="h-5 text-xs text-muted-foreground">
            {hovered ? (
              <>
                <span className={`font-semibold ${TEAL_TEXT}`}>{hovered}</span>
                {" — "}
                {d.bookReadCount(hovered)} van {CHAPTER_COUNTS[hovered] ?? "?"} hoofdstukken gelezen
              </>
            ) : (
              "Beweeg over een boek voor details"
            )}
          </p>
          <p aria-hidden className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            Minder
            {[0, 0.15, 0.37, 0.75, 1].map((r, i) => (
              <span
                key={i}
                className={`inline-block h-3 w-3 flex-shrink-0 rounded-sm ${r === 0 ? "bg-gray-200 dark:bg-white/10" : ""}`}
                style={r === 0 ? undefined : { backgroundColor: progressColor(r) }}
              />
            ))}
            Meer
          </p>
        </div>

        <BoekenVeld label="Oude Testament" books={OT_BOOKS} d={d} hovered={hovered} setHovered={setHovered} />
        <BoekenVeld label="Nieuwe Testament" books={NT_BOOKS} d={d} hovered={hovered} setHovered={setHovered} />
      </section>

      {/* Notes */}
      <section aria-labelledby="v5-notities" className="mt-7 border-t border-black/10 pt-6 dark:border-white/10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="v5-notities" className="text-base font-semibold text-foreground">
            Recente notities
          </h2>
          <Link
            href="/notities"
            className={`rounded text-xs font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}
          >
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
            Nog geen notities.{" "}
            <Link href={nextHref} className={`font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}>
              Schrijf er een tijdens het lezen
            </Link>
          </p>
        ) : (
          <ul className="stagger-in m-0 mt-1 list-none divide-y divide-black/10 p-0 dark:divide-white/10">
            {d.recentNotes.map(note => (
              <li key={note._id} className="list-none">
                <Link
                  href={readHref(note.book, note.chapter)}
                  className={`group block rounded py-3 no-underline ${FOCUS}`}
                >
                  <p className={`text-xs font-semibold ${TEAL_TEXT}`}>
                    {note.book} {note.chapter}
                    {note.verse ? `:${note.verse}` : ""}
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
      <section aria-labelledby="v5-studies" className="mt-7 border-t border-black/10 pt-6 dark:border-white/10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="v5-studies" className="text-base font-semibold text-foreground">
            Aanbevolen studies
          </h2>
          <Link
            href="/studies"
            className={`rounded text-xs font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}
          >
            Bekijk alle
          </Link>
        </div>
        <ul className="m-0 mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {curatedStudies.slice(0, 4).map(study => {
            const badge = BADGE_STYLES[study.type]
            return (
              <li key={study.id} className="list-none">
                <Link
                  href={`/studies/${study.id}`}
                  className={`group flex h-full flex-col rounded-2xl border border-black/10 bg-white/70 p-4 no-underline transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 ${FOCUS}`}
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
  )
}

/* -- Pieces --------------------------------------------------- */

/** One testament as the live dashboard draws it: a field of 18px squares. */
function BoekenVeld({
  label,
  books,
  d,
  hovered,
  setHovered,
  className = "",
}: {
  label: string
  books: readonly string[]
  d: DashboardData
  hovered: string | null
  setHovered: (book: string | null) => void
  className?: string
}) {
  return (
    <div className={`mt-4 ${className}`}>
      <h3 className={`${EYEBROW} text-gray-500 dark:text-gray-400`}>
        {label} <span className="font-normal normal-case tracking-normal">({books.length} boeken)</span>
      </h3>
      <ul className="m-0 mt-2 flex list-none flex-wrap gap-[3px] p-0" aria-label={label}>
        {books.map(book => {
          const ratio = d.loading ? 0 : d.bookReadRatio(book)
          const empty = ratio === 0
          return (
            <li key={book} className="list-none">
              <Link
                href={readHref(book, 1)}
                title={book}
                aria-label={`${book}, ${d.loading ? 0 : d.bookReadCount(book)} van ${CHAPTER_COUNTS[book] ?? "?"} hoofdstukken gelezen`}
                onMouseEnter={() => setHovered(book)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(book)}
                onBlur={() => setHovered(null)}
                className={`relative block h-[18px] w-[18px] rounded-sm no-underline transition-transform duration-100 hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:scale-110 focus-visible:outline-none ${
                  empty ? "bg-gray-200 dark:bg-white/10" : ""
                } ${d.loading ? "skeleton-pulse" : ""}`}
                style={{
                  backgroundColor: empty ? undefined : progressColor(ratio),
                  outline: hovered === book ? "2px solid #0D9488" : "none",
                  outlineOffset: 1,
                }}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
