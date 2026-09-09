"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { CHAPTER_COUNTS } from "../../../lib/data/bible-chapter-counts"
import { curatedStudies } from "../../../lib/data/curated-studies"
import { seededRng } from "../../../lib/levensboom/rng"
import { SPECIES_IDS } from "../../../lib/levensboom/species"
import TreeCanvas from "../../levensboom/TreeCanvas"
import { useLevensboom, fracOf } from "../../../hooks/useLevensboom"
import {
  useDashboardData,
  readHref,
  ALL_BOOKS,
  TOTAL_CHAPTERS,
} from "../../../hooks/useDashboardData"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.18em]"
const CARD = "rounded-2xl border border-gray-200 bg-white dark:border-border dark:bg-card"
/** How many trees the grove shows before it asks you to open the full list. */
const GROVE_LIMIT = 14

type Planted = { book: string; read: number; total: number; ratio: number }

/**
 * Versie 15 - "Boomgaard".
 *
 * You already have one tree. This makes a grove of the rest: every book you
 * have started is planted beside it, seeded from its own name so it is always
 * the same tree, and grown to exactly the share of that book you have read.
 * Genesis at three chapters is a seedling; a finished Johannes is full-grown.
 * Because every tree is painted with the scene and the clock of your own
 * avatar, the strip of canvases joins into one continuous landscape - one
 * horizon, one sky, your reading standing in it.
 *
 * Wide screens see the whole grove at once; below that it pans sideways. The
 * trees are drawn still, never looping, so a grove of fourteen costs one paint.
 */
export default function DashboardBoomgaard() {
  const d = useDashboardData()
  const tree = useTreeSummary()
  const { data } = useLevensboom()
  const strip = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  const avatar = data?.levensboom && !data.levensboom.disabled ? data.levensboom : null
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? 0)
  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"

  const planted: Planted[] = useMemo(() => {
    if (d.loading) return []
    return ALL_BOOKS.map(book => {
      const read = d.bookReadCount(book)
      const total = CHAPTER_COUNTS[book] ?? 1
      return { book, read, total, ratio: read / total }
    })
      .filter(p => p.read > 0)
      .sort((a, b) => b.ratio - a.ratio || b.read - a.read)
      .slice(0, GROVE_LIMIT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.loading, d.readChapters])

  /** The next few books with nothing read yet, in canonical order. */
  const unplanted = useMemo(() => {
    if (d.loading) return []
    return ALL_BOOKS.filter(book => d.bookReadCount(book) === 0).slice(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.loading, d.readChapters])

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

        <header className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            {d.greeting ? (
              <h1 className="content-in text-3xl font-semibold tracking-tight text-foreground xl:text-4xl">{d.greeting}</h1>
            ) : (
              <SkeletonBlock className="h-9 w-72" />
            )}
            <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
              Elk boek dat je begint krijgt zijn eigen boom. Hij groeit mee met wat je ervan leest.
            </p>
          </div>
          {d.loading ? (
            <SkeletonBlock className="h-12 w-52 rounded-xl" />
          ) : (
            <Link
              href={nextHref}
              className="press inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
              style={{ backgroundColor: TEAL }}
            >
              {d.lastRead ? `Verder in ${d.lastRead.book} ${d.lastRead.chapter}` : "Begin met lezen"}
              <ArrowRight size={14} />
            </Link>
          )}
        </header>

        {/* -- The grove ---------------------------------------- */}
        <section className="mt-7" aria-labelledby="boomgaard-titel">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="boomgaard-titel" className="text-lg font-semibold text-foreground">Je boomgaard</h2>
            {!d.loading && (
              <p className="text-xs tabular-nums text-muted-foreground">
                {d.booksWithProgress} geplant - {d.booksCompleted} volgroeid - {d.chaptersRead} van {TOTAL_CHAPTERS} hoofdstukken
              </p>
            )}
          </div>

          <div className="mt-3 overflow-hidden rounded-3xl border border-teal-100 dark:border-teal-900/40">
            <div ref={strip} className="overflow-x-auto [scrollbar-width:thin]">
              <div className="flex min-w-max">
                {/* Your own tree, at the head of the row and twice the width. */}
                <div className="relative w-[300px] flex-shrink-0">
                  <div className="h-[248px]">
                    {avatar && data ? (
                      <TreeCanvas
                        seed={avatar.seed}
                        level={data.level}
                        frac={fracOf(data)}
                        health={avatar.health}
                        species={avatar.avatar.species}
                        scene={avatar.avatar.scene}
                        animal={avatar.avatar.animal}
                        framing="scene"
                        reducedMotion={avatar.reducedMotion}
                        className="block h-full w-full"
                        ariaLabel={`Je eigen boom, niveau ${data.level}`}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[#F0FDFA] dark:bg-teal-950/40">
                        <span className="text-4xl font-bold tabular-nums" style={{ color: TEAL }}>{level}</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70 dark:text-teal-200/70">Niveau</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-teal-100 bg-[#F0FDFA] px-4 py-3 dark:border-teal-900/40 dark:bg-teal-950/30">
                    <p className="text-sm font-semibold text-foreground">Jouw boom</p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                      {tree.hasTree && tree.stageName ? `${tree.stageName} - ` : ""}niveau {level} - {xpInto}/{xpFor} XP
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-teal-100 dark:bg-teal-900/50">
                      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
                    </div>
                  </div>
                </div>

                {d.loading &&
                  [1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="w-[168px] flex-shrink-0">
                      <SkeletonBlock className="h-[248px] rounded-none" />
                      <div className="border-t border-gray-200 px-3 py-3 dark:border-border">
                        <SkeletonBlock className="h-3 w-20" />
                        <SkeletonBlock className="mt-2 h-2.5 w-14" />
                      </div>
                    </div>
                  ))}

                {!d.loading &&
                  planted.map(p => (
                    <GroveTree
                      key={p.book}
                      planted={p}
                      scene={avatar?.avatar.scene ?? null}
                      reducedMotion={avatar?.reducedMotion ?? false}
                      hasCanvas={Boolean(avatar)}
                      hovered={hovered === p.book}
                      onHover={setHovered}
                    />
                  ))}

                {!d.loading && planted.length === 0 && (
                  <div className="flex w-[520px] flex-shrink-0 flex-col items-start justify-center gap-3 px-8 py-14">
                    <p className="text-lg font-semibold text-foreground">Nog niets geplant</p>
                    <p className="max-w-[40ch] text-sm text-muted-foreground">
                      Zodra je het eerste hoofdstuk van een boek leest, komt hier zijn boom te staan.
                    </p>
                    <Link
                      href={nextHref}
                      className="press mt-1 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white no-underline"
                      style={{ backgroundColor: TEAL }}
                    >
                      Plant je eerste boom <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!d.loading && d.booksWithProgress > GROVE_LIMIT && (
            <p className="mt-2 text-xs text-muted-foreground">
              De {GROVE_LIMIT} verst gegroeide bomen staan vooraan. Je hebt er {d.booksWithProgress} geplant.
            </p>
          )}
        </section>

        {/* -- Still to plant ----------------------------------- */}
        {!d.loading && unplanted.length > 0 && (
          <section className="mt-8" aria-labelledby="boomgaard-planten">
            <h2 id="boomgaard-planten" className="text-lg font-semibold text-foreground">Nog te planten</h2>
            <p className="mt-1 text-sm text-muted-foreground">Eén hoofdstuk is genoeg om een boek te laten wortelen.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {unplanted.map(book => (
                <li key={book}>
                  <Link
                    href={readHref(book, 1)}
                    className="inline-flex items-center gap-2 rounded-full border border-dashed border-gray-300 px-3.5 py-1.5 text-sm text-muted-foreground no-underline transition-colors hover:border-[#0D9488] hover:text-foreground dark:border-border"
                  >
                    <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-border" />
                    {book}
                    <span className="text-xs tabular-nums opacity-60">{CHAPTER_COUNTS[book] ?? "?"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* -- The working row ---------------------------------- */}
        <div className="mt-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_320px]">
          <section className={`p-6 ${CARD}`} aria-labelledby="boomgaard-week">
            <h2 id="boomgaard-week" className={`${EYEBROW} text-muted-foreground`}>Het seizoen</h2>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {d.streak} <span className="text-sm font-normal text-muted-foreground">{d.streak === 1 ? "dag reeks" : "dagen reeks"}</span>
              </p>
              {!d.statsLoading && (
                <p className="text-sm tabular-nums text-muted-foreground">{d.weekTotal} hoofdstukken deze week</p>
              )}
            </div>
            <ol className="mt-5 flex items-end gap-2" aria-label="Deze week">
              {d.weekDays.map((day, i) => (
                <li key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`block w-full rounded-md ${day.count > 0 ? "" : "bg-gray-200 dark:bg-secondary"} ${d.statsLoading ? "skeleton-pulse" : ""}`}
                    style={{
                      height: `${Math.max(8, day.count > 0 ? 16 + day.heightPct * 0.5 : 8)}px`,
                      backgroundColor: day.count > 0 ? TEAL : undefined,
                    }}
                  />
                  <span className={`text-[11px] font-medium ${day.isToday ? TEAL_TEXT : "text-muted-foreground"}`}>
                    {day.label}
                    <span className="sr-only">{day.count > 0 ? `, ${day.count} keer gelezen` : ", niet gelezen"}</span>
                  </span>
                </li>
              ))}
            </ol>
            {tree.nextUnlock && (
              <p className="mt-5 text-sm text-muted-foreground">
                Volgende vrijspeling: <span className="font-semibold text-foreground">{tree.nextUnlock.name}</span> op niveau {tree.nextUnlock.level}.
              </p>
            )}
          </section>

          <div className="[&>div]:rounded-2xl">
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </div>

          <aside className="space-y-4">
            {(d.loading || d.recentNotes.length > 0) && (
              <section className={`p-5 ${CARD}`} aria-labelledby="boomgaard-notities">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="boomgaard-notities" className={`${EYEBROW} text-muted-foreground`}>Recente notities</h2>
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

            <section className={`p-5 ${CARD}`} aria-labelledby="boomgaard-studies">
              <h2 id="boomgaard-studies" className={`${EYEBROW} text-muted-foreground`}>Verder studeren</h2>
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
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

/* -- Pieces --------------------------------------------------- */

/**
 * One book as a tree. The seed is the book's own name, so Ruth is always the
 * same Ruth; the species is picked from that same seeded stream; and the level
 * is the share of the book that is read, which is the only thing that changes.
 * The scene and the clock come from the reader's own avatar, so neighbouring
 * canvases share a horizon and the row reads as one landscape.
 */
function GroveTree({
  planted,
  scene,
  reducedMotion,
  hasCanvas,
  hovered,
  onHover,
}: {
  planted: Planted
  scene: string | null
  reducedMotion: boolean
  hasCanvas: boolean
  hovered: boolean
  onHover: (book: string | null) => void
}) {
  const { book, read, total, ratio } = planted
  const species = useMemo(() => {
    const rand = seededRng(`boomgaard:${book}`)
    return SPECIES_IDS[Math.floor(rand() * SPECIES_IDS.length)]
  }, [book])

  const complete = ratio >= 1
  // 1 at the first chapter, 25 at the last: the full range of stages, so a
  // finished book is unmistakably a grown tree next to a three-chapter seedling.
  const level = Math.max(1, Math.min(25, Math.round(1 + ratio * 24)))

  return (
    <Link
      href={readHref(book, 1)}
      onMouseEnter={() => onHover(book)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(book)}
      onBlur={() => onHover(null)}
      className="group relative w-[168px] flex-shrink-0 no-underline"
      aria-label={`${book}, ${read} van ${total} hoofdstukken gelezen`}
    >
      <div className="relative h-[248px] overflow-hidden">
        {hasCanvas ? (
          <TreeCanvas
            seed={`boek:${book}`}
            level={level}
            frac={0}
            species={species}
            scene={scene}
            framing="scene"
            still
            reducedMotion={reducedMotion}
            className="block h-full w-full"
            ariaLabel=""
          />
        ) : (
          <div className="flex h-full w-full items-end bg-[#F0FDFA] dark:bg-teal-950/40">
            <span aria-hidden className="w-full" style={{ height: `${8 + ratio * 70}%`, backgroundColor: TEAL, opacity: 0.25 + ratio * 0.6 }} />
          </div>
        )}
        <span
          aria-hidden
          className={`absolute inset-0 transition-colors ${hovered ? "bg-white/10" : "bg-transparent"}`}
        />
      </div>
      <div className="border-t border-gray-200 bg-white px-3 py-3 dark:border-border dark:bg-card">
        <p className="truncate text-sm font-semibold text-foreground group-hover:underline">{book}</p>
        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {read} / {total}{complete ? " - volgroeid" : ""}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-secondary">
          <div className="h-full rounded-full" style={{ width: `${Math.min(1, ratio) * 100}%`, backgroundColor: TEAL }} />
        </div>
      </div>
    </Link>
  )
}
