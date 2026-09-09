"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, CalendarCheck2, ChevronRight, Clock, StickyNote } from "lucide-react"
import { curatedStudies, BADGE_STYLES } from "../../../../lib/data/curated-studies"
import { CHAPTER_COUNTS } from "../../../../lib/data/bible-chapter-counts"
import { NT_BOOKS, OT_BOOKS, readHref, TOTAL_CHAPTERS } from "../../../../hooks/useDashboardData"
import type { DashboardData } from "../../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../../lib/dailyVerseStore"
import BillingNotices from "../../../pricing/BillingNotices"
import DailyVerseCard from "../../DailyVerseCard"
import { SkeletonBlock } from "../../../ui/skeletons"
import { CARD_SHADOW, EYEBROW, FOCUS, GLASS_CARD, heatColor, HEAT_LEGEND, TEAL } from "./glas"

/**
 * The right column: the work.
 *
 * The live dashboard's content set, in its own order - resume, the verse of the
 * day, the 66 books, the notes, the studies, the quick links - as separate
 * sheets of glass with the landscape showing in the gutters between them. This
 * is the only part of the page that scrolls.
 */
export default function GlasWerkKolom({ d }: { d: DashboardData }) {
  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const version = versionAbbreviation(d.lastRead?.version)
  const readPct = Math.round((d.chaptersRead / TOTAL_CHAPTERS) * 100)

  return (
    <div className="min-w-0 space-y-5">
      {/* A failed payment is the one message that costs money to leave unread,
          so it stays above everything - on its own surface, deliberately not
          glass. */}
      <div className="empty:hidden">
        <BillingNotices />
      </div>

      {/* ── Verder waar je was ── */}
      <section style={CARD_SHADOW} className={`p-6 ${GLASS_CARD}`} aria-labelledby="glas-verder">
        <h2 id="glas-verder" className={EYEBROW}>
          {d.loading ? "Verder lezen" : d.lastRead ? "Ga verder waar je gebleven was" : "Begin vandaag"}
        </h2>
        {d.loading ? (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div className="flex-1 space-y-2.5">
              <SkeletonBlock className="h-8 w-2/3 bg-white/20" />
              <SkeletonBlock className="h-3 w-1/3 bg-white/20" />
            </div>
            <SkeletonBlock className="h-12 w-40 rounded-xl bg-white/20" />
          </div>
        ) : (
          <div className="content-in mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
              </p>
              <p className="mt-1.5 text-sm text-white/70">
                {d.lastRead
                  ? `Hoofdstuk ${d.lastRead.chapter}${version ? ` · ${version}` : ""}`
                  : "Lees dag voor dag door de Bijbel."}
              </p>
            </div>
            <Link
              href={nextHref}
              className={`press group inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-6 py-3.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0F766E] ${FOCUS}`}
            >
              {d.lastRead ? "Verder lezen" : "Begin met lezen"}
              <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </section>

      {/* ── Tekst van de dag. Its own photograph and its own scrim, so it needs
             no glass around it. ── */}
      <div className="[&>div]:rounded-2xl">
        <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
      </div>

      {/* ── Je weg door de Bijbel ── */}
      <section style={CARD_SHADOW} className={`p-6 ${GLASS_CARD}`} aria-labelledby="glas-bijbelboeken">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="glas-bijbelboeken" className="text-base font-semibold text-white">Je weg door de Bijbel</h2>
          {!d.loading && (
            <p className="text-xs tabular-nums text-white/70">
              {d.chaptersRead} van {TOTAL_CHAPTERS} hoofdstukken · {readPct}%
            </p>
          )}
        </div>

        <BookHeat
          label="Oude Testament"
          books={OT_BOOKS}
          loading={d.loading}
          ratioOf={d.bookReadRatio}
          countOf={d.bookReadCount}
          current={d.lastRead?.book ?? null}
        />
        <BookHeat
          label="Nieuwe Testament"
          books={NT_BOOKS}
          loading={d.loading}
          ratioOf={d.bookReadRatio}
          countOf={d.bookReadCount}
          current={d.lastRead?.book ?? null}
        />

        <div className="mt-5 flex items-center justify-end gap-1.5 text-[10px] text-white/70">
          <span>Minder</span>
          {HEAT_LEGEND.map((r, i) => (
            <span
              key={i}
              aria-hidden
              className="inline-block h-3 w-3 flex-shrink-0 rounded-sm ring-1 ring-inset ring-white/15"
              style={{ backgroundColor: heatColor(r) }}
            />
          ))}
          <span>Meer</span>
        </div>
      </section>

      {/* ── Recente notities ── */}
      <section style={CARD_SHADOW} className={`p-6 ${GLASS_CARD}`} aria-labelledby="glas-notities">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="glas-notities" className="text-base font-semibold text-white">Recente notities</h2>
          <Link href="/notities" className={`rounded text-xs font-semibold text-white/80 no-underline hover:text-white hover:underline ${FOCUS}`}>
            Alle notities
          </Link>
        </div>
        {d.loading ? (
          <div className="mt-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <SkeletonBlock className="h-3 w-1/4 bg-white/20" />
                <SkeletonBlock className="h-3.5 w-full bg-white/20" />
              </div>
            ))}
          </div>
        ) : d.recentNotes.length === 0 ? (
          <p className="mt-4 text-sm text-white/70">
            Nog geen notities.{" "}
            <Link href={nextHref} className={`rounded font-semibold text-white no-underline underline-offset-4 hover:underline ${FOCUS}`}>
              Schrijf er een tijdens het lezen
            </Link>
          </p>
        ) : (
          <ul className="stagger-in mt-2 list-none divide-y divide-white/10 p-0">
            {d.recentNotes.map(note => (
              <li key={note._id}>
                <Link href={readHref(note.book, note.chapter)} className={`group block rounded py-3 no-underline ${FOCUS}`}>
                  <p className="text-xs font-semibold text-white">
                    {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-white/70 group-hover:text-white">
                    {note.noteText}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Aanbevolen studies ── */}
      <section style={CARD_SHADOW} className={`p-6 ${GLASS_CARD}`} aria-labelledby="glas-studies">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="glas-studies" className="text-base font-semibold text-white">Aanbevolen studies</h2>
          <Link href="/studies" className={`inline-flex items-center gap-0.5 rounded text-xs font-semibold text-white/80 no-underline hover:text-white hover:underline ${FOCUS}`}>
            Bekijk alle
            <ChevronRight size={12} aria-hidden />
          </Link>
        </div>
        <ul className="mt-2 list-none divide-y divide-white/10 p-0">
          {curatedStudies.slice(0, 5).map(study => {
            const badge = BADGE_STYLES[study.type]
            return (
              <li key={study.id}>
                <Link
                  href={`/studies/${study.id}`}
                  className={`group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 no-underline transition-colors hover:bg-white/10 ${FOCUS}`}
                >
                  <span
                    className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {study.type}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold leading-tight text-white">
                      {study.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
                      <span className="flex items-center gap-1">
                        <Clock size={9} aria-hidden /> {study.durationLabel}
                      </span>
                      <span aria-hidden className="opacity-50">·</span>
                      <span className="truncate">{study.startBook}</span>
                    </span>
                  </span>
                  <ArrowRight
                    size={13}
                    aria-hidden
                    className="flex-shrink-0 text-white/50 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Snel naar ── */}
      <section aria-labelledby="glas-snel">
        <h2 id="glas-snel" className={`${EYEBROW} px-1`}>Snel naar</h2>
        <ul className="mt-2.5 flex list-none flex-wrap gap-2 p-0">
          {[
            { href: "/studie", label: "Bijbelstudie", icon: BookOpen },
            { href: "/notities", label: "Mijn notities", icon: StickyNote },
            { href: "/studies", label: "Leesplannen", icon: CalendarCheck2 },
          ].map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                style={CARD_SHADOW}
                className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-sm text-white/85 no-underline backdrop-blur-xl transition-colors hover:bg-black/40 hover:text-white ${FOCUS}`}
              >
                <Icon size={14} aria-hidden className="flex-shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/* ── Pieces ───────────────────────────────────────────────────── */

/**
 * One testament as the live dashboard's heat grid, re-anchored for a dark
 * ground: an unread book is a hole in the glass and the ramp climbs to the full
 * brand teal. The hover line above the grid is the same affordance the live
 * dashboard has, and it doubles as the focus readout when tabbing through.
 */
function BookHeat({
  label,
  books,
  loading,
  ratioOf,
  countOf,
  current,
}: {
  label: string
  books: readonly string[]
  loading: boolean
  ratioOf: (book: string) => number
  countOf: (book: string) => number
  current: string | null
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70">
          {label} <span className="font-normal normal-case tracking-normal">({books.length} boeken)</span>
        </h3>
        <p className="h-4 text-xs text-white/80">
          {hovered ? `${hovered} — ${countOf(hovered)} van ${CHAPTER_COUNTS[hovered] ?? "?"} hoofdstukken` : ""}
        </p>
      </div>
      <ul className="mt-2 flex list-none flex-wrap gap-[3px] p-0" aria-label={label}>
        {books.map(book => {
          const ratio = loading ? 0 : ratioOf(book)
          return (
            <li key={book}>
              <Link
                href={readHref(book, 1)}
                title={book}
                aria-label={`${book}, ${loading ? 0 : countOf(book)} van ${CHAPTER_COUNTS[book] ?? "?"} hoofdstukken gelezen`}
                onMouseEnter={() => setHovered(book)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(book)}
                onBlur={() => setHovered(null)}
                className={`relative block h-[18px] w-[18px] rounded-sm no-underline ring-1 ring-inset ring-white/15 transition-transform hover:z-10 hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  loading ? "skeleton-pulse" : ""
                }`}
                style={{
                  backgroundColor: heatColor(ratio),
                  outline: !loading && current === book ? `2px solid ${TEAL}` : undefined,
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
