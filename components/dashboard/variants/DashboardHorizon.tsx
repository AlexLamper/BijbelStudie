"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { curatedStudies } from "../../../lib/data/curated-studies"
import {
  useDashboardData,
  readHref,
  OT_BOOKS,
  NT_BOOKS,
  TOTAL_CHAPTERS,
} from "../../../hooks/useDashboardData"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeScene, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.18em]"
const CARD = "rounded-2xl border border-gray-200 bg-white dark:border-border dark:bg-card"
/** Frosted tile for anything laid over the scene. Literal white, never a token:
 *  it has to hold up over a noon sky and a midnight one alike. */
const GLASS = "rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md"

/**
 * Versie 11 - "Horizon".
 *
 * The tree stops being a tile and becomes the room. Its scene fills the whole
 * viewport under the header - sky, land, weather, the reader's own time of day
 * - and the greeting, the level and the one action that matters are set into
 * that sky on glass. Nothing is boxed above the fold; the numbers ride the
 * horizon line as four frosted tiles that break the fold on purpose, so the
 * page reads as a place you look out of before it reads as a screen you work
 * in. Everything that needs a white page waits below.
 *
 * Built for a wide monitor: the hero is viewport-tall, the text column is
 * capped so it never stretches, and the desk underneath opens to three columns
 * at xl.
 */
export default function DashboardHorizon() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? 0)

  return (
    <div className="min-h-full bg-background">
      {/* -- The room ------------------------------------------- */}
      <section
        aria-labelledby="horizon-titel"
        className="relative h-[calc(100vh-3.5rem)] min-h-[620px] w-full overflow-hidden"
      >
        <div className="absolute inset-0">
          <ProgressTreeScene />
        </div>

        {/* Two scrims. The left one carries the text, the bottom one carries
            the tiles; together they keep white legible over any scene. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="relative flex h-full flex-col justify-between px-6 pb-24 pt-5 sm:px-10 xl:px-16">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-white/80">
            {d.dateLabel ? (
              <p className="text-sm">{d.dateLabel}</p>
            ) : (
              <SkeletonBlock className="h-3.5 w-36 bg-white/20" />
            )}
            <VariantSwitcher className="[&_a]:text-white/70 [&_a:hover]:text-white [&>span]:text-white/50" />
          </div>

          <div className="max-w-[46rem]">
            <p className={`${EYEBROW} text-white/70`}>
              {tree.hasTree && tree.stageName ? `${tree.stageName} - niveau ${level}` : `Niveau ${level}`}
            </p>
            {d.greeting ? (
              <h1
                id="horizon-titel"
                className="content-in mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl xl:text-6xl"
              >
                {d.greeting}
              </h1>
            ) : (
              <SkeletonBlock className="mt-3 h-14 w-[26rem] max-w-full bg-white/20" />
            )}

            <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">
              {tree.wilting
                ? `Je boom heeft ${tree.daysSinceActive} dagen geen water gehad. Eén hoofdstuk is genoeg.`
                : d.readToday
                  ? "Je hebt vandaag al gelezen. Alles hierna is winst."
                  : "Eén hoofdstuk vandaag houdt je boom in leven."}
            </p>

            {/* XP as a line of light along the horizon, not a boxed meter. */}
            <div className="mt-8 max-w-[30rem]">
              <div className="flex items-baseline justify-between text-xs font-medium tabular-nums text-white/75">
                <span>Niveau {level}</span>
                <span>{xpInto} / {xpFor} XP</span>
                <span>Niveau {level + 1}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-1000 ease-out"
                  style={{ width: d.loading ? "0%" : `${pct}%`, boxShadow: "0 0 18px rgba(255,255,255,0.85)" }}
                />
              </div>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              {d.loading ? (
                <SkeletonBlock className="h-14 w-64 rounded-full bg-white/20" />
              ) : (
                <Link
                  href={nextHref}
                  className="press group inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-base font-semibold text-gray-900 no-underline shadow-xl shadow-black/20 transition-colors hover:bg-white/90"
                >
                  {d.lastRead ? `Verder in ${d.lastRead.book} ${d.lastRead.chapter}` : "Begin met lezen"}
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
              <Link
                href="/profiel/boom"
                className="text-sm font-semibold text-white/85 no-underline underline-offset-4 hover:text-white hover:underline"
              >
                Bekijk je boom →
              </Link>
            </div>
          </div>

          {/* Keeps the button row clear of the tiles that break the fold. */}
          <div aria-hidden />
        </div>
      </section>

      {/* -- The horizon line: four numbers, half in the sky ----- */}
      <div className="relative z-10 -mt-14 px-6 sm:px-10 xl:px-16">
        <dl className="stagger-in mx-auto grid max-w-[1500px] grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <GlassStat
            label="Reeks"
            value={d.loading ? null : `${d.streak}`}
            unit={d.streak === 1 ? "dag" : "dagen"}
            note={!tree.loading && tree.longestStreak > d.streak ? `langste ${tree.longestStreak}` : undefined}
          />
          <GlassStat label="Hoofdstukken" value={d.loading ? null : `${d.chaptersRead}`} unit={`van ${TOTAL_CHAPTERS}`} />
          <GlassStat
            label="Boeken begonnen"
            value={d.loading ? null : `${d.booksWithProgress}`}
            unit="van 66"
            note={!d.loading && d.booksCompleted > 0 ? `${d.booksCompleted} uitgelezen` : undefined}
          />
          <GlassStat
            label="Notities"
            value={d.loading ? null : `${d.notesCount}`}
            unit={d.notesCount === 1 ? "notitie" : "notities"}
          />
        </dl>
      </div>

      {/* -- The desk ------------------------------------------- */}
      <div className="mx-auto w-full max-w-[1500px] px-6 pb-20 pt-14 sm:px-10 xl:px-16">
        <div className="mb-8 empty:hidden">
          <BillingNotices />
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)_340px]">
          <section aria-labelledby="horizon-weg" className="min-w-0">
            <h2 id="horizon-weg" className="text-lg font-semibold text-foreground">Je weg door de Bijbel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {d.loading
                ? " "
                : `${d.chaptersRead} van ${TOTAL_CHAPTERS} hoofdstukken - ${Math.round((d.chaptersRead / TOTAL_CHAPTERS) * 100)}%`}
            </p>
            <BookRibbon label="Oude Testament" books={OT_BOOKS} ratioOf={d.bookReadRatio} loading={d.loading} current={d.lastRead?.book ?? null} />
            <BookRibbon label="Nieuwe Testament" books={NT_BOOKS} ratioOf={d.bookReadRatio} loading={d.loading} current={d.lastRead?.book ?? null} />

            <h2 className="mt-10 text-lg font-semibold text-foreground">Verder studeren</h2>
            <ul className="mt-4 space-y-3">
              {curatedStudies.slice(0, 3).map(study => (
                <li key={study.id}>
                  <Link href={`/studies/${study.id}`} className={`lift group flex items-center gap-4 p-4 no-underline ${CARD}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {study.type} - {study.durationLabel}
                      </p>
                      <p className="mt-1 truncate text-[15px] font-semibold text-foreground">{study.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{study.description}</p>
                    </div>
                    <ArrowRight size={16} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: TEAL }} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <div className="min-w-0 [&>div]:rounded-2xl">
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </div>

          <aside className="space-y-4">
            <section className={`p-5 ${CARD}`} aria-labelledby="horizon-boom">
              <h2 id="horizon-boom" className={`${EYEBROW} text-muted-foreground`}>Jouw voortgang</h2>
              {tree.loading ? (
                <SkeletonBlock className="mt-3 h-4 w-40" />
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">Niveau</span>
                    <span className="font-semibold tabular-nums text-foreground">{level}</span>
                  </li>
                  {tree.nextStage && (
                    <li className="flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground">Volgende fase</span>
                      <span className="font-semibold text-foreground">{tree.nextStage.name} - {tree.nextStage.level}</span>
                    </li>
                  )}
                  {tree.nextUnlock && (
                    <li className="flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground">Volgende vrijspeling</span>
                      <span className="font-semibold text-foreground">{tree.nextUnlock.name} - {tree.nextUnlock.level}</span>
                    </li>
                  )}
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">Nog te gaan</span>
                    <span className="font-semibold tabular-nums text-foreground">{Math.max(0, xpFor - xpInto)} XP</span>
                  </li>
                </ul>
              )}
              <Link href="/profiel/boom" className={`mt-4 inline-block text-sm font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Naar je boom →
              </Link>
            </section>

            {(d.loading || d.recentNotes.length > 0) && (
              <section className={`p-5 ${CARD}`} aria-labelledby="horizon-notities">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="horizon-notities" className={`${EYEBROW} text-muted-foreground`}>Recente notities</h2>
                  <Link href="/notities" className={`text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>Alle</Link>
                </div>
                {d.loading ? (
                  <div className="mt-4 space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="space-y-1.5">
                        <SkeletonBlock className="h-3 w-2/5" />
                        <SkeletonBlock className="h-3 w-full" />
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

            <section className={`p-5 ${CARD}`} aria-labelledby="horizon-week">
              <h2 id="horizon-week" className={`${EYEBROW} text-muted-foreground`}>Deze week</h2>
              <ol className="mt-3 flex items-end justify-between gap-1.5" aria-label="Deze week">
                {d.weekDays.map((day, i) => (
                  <li key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span
                      aria-hidden
                      className={`block w-full rounded-t ${day.count > 0 ? "" : "bg-gray-200 dark:bg-secondary"} ${d.statsLoading ? "skeleton-pulse" : ""}`}
                      style={{
                        height: `${Math.max(6, day.count > 0 ? 12 + day.heightPct * 0.44 : 6)}px`,
                        backgroundColor: day.count > 0 ? TEAL : undefined,
                      }}
                    />
                    <span className={`text-[10px] font-medium ${day.isToday ? TEAL_TEXT : "text-muted-foreground"}`}>
                      {day.label}
                      <span className="sr-only">{day.count > 0 ? `, ${day.count} keer gelezen` : ", niet gelezen"}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {!d.statsLoading && (
                <p className="mt-3 text-xs tabular-nums text-muted-foreground">{d.weekTotal} hoofdstukken deze week</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

/* -- Pieces --------------------------------------------------- */

function GlassStat({
  label,
  value,
  unit,
  note,
}: {
  label: string
  value: string | null
  unit: string
  note?: string
}) {
  return (
    <div className={`px-5 py-4 shadow-lg shadow-black/10 ${GLASS}`}>
      <dt className={`${EYEBROW} text-white/70`}>{label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-1.5">
        {value === null ? (
          <SkeletonBlock className="h-7 w-14 bg-white/25" />
        ) : (
          <span className="text-2xl font-semibold tabular-nums text-white xl:text-3xl">{value}</span>
        )}
        <span className="text-xs text-white/70">{unit}</span>
      </dd>
      {note && <p className="mt-0.5 text-[11px] text-white/60">{note}</p>}
    </div>
  )
}

/**
 * One testament as a ribbon of slats, each slat filled to the share of that
 * book already read. A wide monitor gets all 39 at once, which is the point:
 * the shape of what you have and have not touched, in one glance.
 */
function BookRibbon({
  label,
  books,
  ratioOf,
  loading,
  current,
}: {
  label: string
  books: readonly string[]
  ratioOf: (book: string) => number
  loading: boolean
  current: string | null
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="h-4 text-xs font-medium text-foreground">{hovered ?? ""}</p>
      </div>
      <ol className="mt-2 flex gap-[3px]" aria-label={label}>
        {books.map(book => {
          const ratio = loading ? 0 : ratioOf(book)
          const isCurrent = !loading && current === book
          return (
            <li key={book} className="flex-1">
              <Link
                href={readHref(book, 1)}
                title={book}
                aria-label={book}
                onMouseEnter={() => setHovered(book)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(book)}
                onBlur={() => setHovered(null)}
                className={`relative block h-12 overflow-hidden rounded-[3px] bg-gray-200 no-underline transition-transform hover:scale-y-110 dark:bg-secondary ${
                  loading ? "skeleton-pulse" : ""
                } ${isCurrent ? "ring-2 ring-[#0D9488] ring-offset-1 dark:ring-offset-card" : ""}`}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
                  style={{ height: `${Math.min(1, ratio) * 100}%`, backgroundColor: TEAL }}
                />
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
