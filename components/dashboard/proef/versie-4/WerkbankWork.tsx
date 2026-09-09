"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { curatedStudies, BADGE_STYLES } from "../../../../lib/data/curated-studies"
import { CHAPTER_COUNTS } from "../../../../lib/data/bible-chapter-counts"
import {
  NT_BOOKS,
  OT_BOOKS,
  TOTAL_CHAPTERS,
  readHref,
  type DashboardData,
} from "../../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../../lib/dailyVerseStore"
import BillingNotices from "../../../pricing/BillingNotices"
import DailyVerseCard from "../../DailyVerseCard"
import { SkeletonBlock } from "../../../ui/skeletons"
import { DIVIDER, EYEBROW, FOCUS, HAIRLINE, MUTED, PANEL, TEAL, TEAL_TEXT, TEXT } from "./styles"

/**
 * The right column: the work.
 *
 * The only thing on the page that scrolls, and the content set of the live
 * dashboard in the order someone actually uses it: the failed-payment notice
 * first because it costs money to leave unread, then the one action that
 * matters, then the verse, then what has been read, written and can be studied.
 *
 * The five-step teal ramp over the 66 books is the live dashboard's own, kept
 * deliberately: it is the densest thing on the page and the piece a returning
 * reader looks at first.
 */

/** The live dashboard's ramp, minus its theme token for the empty square. */
function progressColor(ratio: number): string {
  if (ratio >= 1) return TEAL
  if (ratio >= 0.5) return "rgba(13,148,136,0.72)"
  if (ratio >= 0.25) return "rgba(13,148,136,0.45)"
  return "rgba(13,148,136,0.22)"
}

export default function WerkbankWork({ d }: { d: DashboardData }) {
  const [hovered, setHovered] = useState<string | null>(null)

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const version = versionAbbreviation(d.lastRead?.version)
  const readPct = Math.round((d.chaptersRead / TOTAL_CHAPTERS) * 100)

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="empty:hidden">
        <BillingNotices />
      </div>

      {/* The one action */}
      {d.loading ? (
        <SkeletonBlock className="h-[124px] w-full rounded-2xl" />
      ) : (
        <section aria-labelledby="werkbank-verder" className={`content-in overflow-hidden ${PANEL}`}>
          <div className="flex flex-wrap items-end justify-between gap-4 border-l-4 p-5" style={{ borderColor: TEAL }}>
            <div className="min-w-0">
              <h2 id="werkbank-verder" className={`${EYEBROW} ${TEAL_TEXT}`}>
                {d.lastRead ? "Verder waar je was" : "Begin vandaag"}
              </h2>
              <p className={`mt-2 text-2xl font-semibold tracking-tight sm:text-[28px] ${TEXT}`}>
                {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
              </p>
              <p className={`mt-1 text-sm ${MUTED}`}>
                {d.lastRead
                  ? `Hoofdstuk ${d.lastRead.chapter}${version ? ` · ${version}` : ""}`
                  : "Lees dag voor dag door de Bijbel."}
              </p>
            </div>
            <Link
              href={nextHref}
              className={`press inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0F766E] ${FOCUS}`}
              style={{ backgroundColor: TEAL }}
            >
              {d.lastRead ? "Verder lezen" : "Begin met lezen"}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* Tekst van de dag - the card carries its own visible title. */}
      <section aria-labelledby="werkbank-vers" className="[&>div]:rounded-2xl">
        <h2 id="werkbank-vers" className="sr-only">
          Tekst van de dag
        </h2>
        <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
      </section>

      {/* The 66 books */}
      <section aria-labelledby="werkbank-weg" className={`p-5 ${PANEL}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="werkbank-weg" className={`text-base font-semibold ${TEXT}`}>
            Je weg door de Bijbel
          </h2>
          {d.loading ? (
            <SkeletonBlock className="h-3 w-44" />
          ) : (
            <p className={`text-xs tabular-nums ${MUTED}`}>
              {d.chaptersRead} van {TOTAL_CHAPTERS} hoofdstukken · {readPct}% · {d.booksWithProgress} van 66 boeken
              geopend
            </p>
          )}
        </div>

        {/* One line, always the same height, so nothing jumps on hover. */}
        <p className={`mt-3 flex h-5 items-center text-xs ${MUTED}`}>
          {hovered ? (
            <span>
              <span className="font-semibold" style={{ color: TEAL }}>
                {hovered}
              </span>{" "}
              - {d.bookReadCount(hovered)} van {CHAPTER_COUNTS[hovered] ?? "?"} hoofdstukken gelezen
            </span>
          ) : (
            <span>Beweeg over een boek voor details</span>
          )}
        </p>

        <div className="mt-1 flex flex-col gap-4">
          <Testament label="Oude Testament" books={OT_BOOKS} d={d} onHover={setHovered} />
          <Testament label="Nieuwe Testament" books={NT_BOOKS} d={d} onHover={setHovered} />
        </div>

        <div className={`mt-4 flex items-center justify-end gap-1.5 border-t pt-3 text-[10px] ${HAIRLINE} ${MUTED}`}>
          <span>Minder</span>
          <span aria-hidden className="inline-block h-3 w-3 flex-shrink-0 rounded-sm bg-slate-200 dark:bg-white/10" />
          {[0.15, 0.37, 0.75, 1].map(ratio => (
            <span
              key={ratio}
              aria-hidden
              className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: progressColor(ratio) }}
            />
          ))}
          <span>Meer</span>
        </div>
      </section>

      {/* Notes */}
      <section aria-labelledby="werkbank-notities" className={`p-5 ${PANEL}`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="werkbank-notities" className={`text-base font-semibold ${TEXT}`}>
            Recente notities
          </h2>
          <Link
            href="/notities"
            className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}
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
          <p className={`mt-3 text-sm ${MUTED}`}>
            Nog geen notities.{" "}
            <Link
              href={nextHref}
              className={`font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}
            >
              Schrijf er een tijdens het lezen
            </Link>
          </p>
        ) : (
          <ul className={`stagger-in m-0 mt-1 list-none divide-y p-0 ${DIVIDER}`}>
            {d.recentNotes.map(note => (
              <li key={note._id}>
                <Link href={readHref(note.book, note.chapter)} className={`group block py-3 no-underline ${FOCUS}`}>
                  <p className={`text-xs font-semibold ${TEAL_TEXT}`}>
                    {note.book} {note.chapter}
                    {note.verse ? `:${note.verse}` : ""}
                  </p>
                  <p className={`mt-0.5 line-clamp-2 text-sm leading-relaxed group-hover:text-slate-900 dark:group-hover:text-slate-100 ${MUTED}`}>
                    {note.noteText}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Studies */}
      <section aria-labelledby="werkbank-studies" className={`p-5 ${PANEL}`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="werkbank-studies" className={`text-base font-semibold ${TEXT}`}>
            Aanbevolen studies
          </h2>
          <Link href="/studies" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}>
            Bekijk alle
          </Link>
        </div>
        <ul className={`m-0 mt-1 list-none divide-y p-0 ${DIVIDER}`}>
          {curatedStudies.slice(0, 5).map(study => {
            const badge = BADGE_STYLES[study.type]
            return (
              <li key={study.id}>
                <Link
                  href={`/studies/${study.id}`}
                  className={`group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 no-underline transition-colors hover:bg-slate-900/[0.03] dark:hover:bg-white/5 ${FOCUS}`}
                >
                  <span
                    className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {study.type}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[13.5px] font-semibold leading-tight ${TEXT}`}>
                      {study.title}
                    </span>
                    <span className={`mt-1 flex items-center gap-1.5 text-[11px] ${MUTED}`}>
                      <span className="flex items-center gap-1">
                        <Clock size={10} aria-hidden /> {study.durationLabel}
                      </span>
                      <span aria-hidden className="opacity-50">
                        ·
                      </span>
                      <span className="truncate">{study.startBook}</span>
                    </span>
                  </span>
                  <ArrowRight
                    size={13}
                    aria-hidden
                    className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: TEAL }}
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

/* --- Pieces --------------------------------------------------- */

function Testament({
  label,
  books,
  d,
  onHover,
}: {
  label: string
  books: readonly string[]
  d: DashboardData
  onHover: (book: string | null) => void
}) {
  return (
    <div>
      <h3 className={EYEBROW}>
        {label}{" "}
        <span className="font-normal normal-case tracking-normal">({books.length} boeken)</span>
      </h3>
      <ul className="m-0 mt-2 flex list-none flex-wrap gap-[3px] p-0">
        {books.map(book => {
          const total = CHAPTER_COUNTS[book] ?? 1
          const read = d.loading ? 0 : d.bookReadCount(book)
          const ratio = d.loading ? 0 : d.bookReadRatio(book)
          const empty = ratio === 0
          return (
            <li key={book}>
              <Link
                href={readHref(book, 1)}
                title={book}
                aria-label={`${book}, ${read} van ${total} hoofdstukken gelezen`}
                onMouseEnter={() => onHover(book)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(book)}
                onBlur={() => onHover(null)}
                className={`block h-[18px] w-[18px] rounded-[3px] no-underline transition-transform duration-100 hover:scale-110 ${FOCUS} ${
                  empty ? "bg-slate-200 dark:bg-white/10" : ""
                } ${d.loading ? "skeleton-pulse" : ""}`}
                style={empty ? undefined : { backgroundColor: progressColor(ratio) }}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
