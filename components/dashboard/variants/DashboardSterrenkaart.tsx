"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { CHAPTER_COUNTS } from "../../../lib/data/bible-chapter-counts"
import { seededRng } from "../../../lib/levensboom/rng"
import { useDashboardData, readHref, TOTAL_CHAPTERS } from "../../../hooks/useDashboardData"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, useTreeSummary } from "../ProgressTree"

/** Brand teal reads muddy against a night sky, so this page uses teal-400 for
 *  everything the reader is meant to notice. #0D9488 stays the light-surface
 *  brand colour everywhere else. */
const TEAL_BRIGHT = "#2DD4BF"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.18em]"
/** The night sky the tree itself paints after 21:00 (lib/levensboom/palette). */
const NIGHT_TOP = "#0B1027"
const NIGHT_BOTTOM = "#232C4D"
const GLASS = "rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur-md"

/** The map's own coordinate space. Positions below are in these units. */
const MAP_W = 1000
const MAP_H = 560

/**
 * The nine groups the 66 books fall into, each with the patch of sky it owns.
 * Books are laid along a gentle arc inside their patch, so a group reads as one
 * constellation and never tangles with its neighbours.
 */
const GROUPS: {
  name: string
  books: readonly string[]
  x: number
  y: number
  w: number
  h: number
  /** How far the arc bows, in map units. Sign picks the direction. */
  bow: number
}[] = [
  { name: "Wet", books: ["Genesis", "Exodus", "Leviticus", "Numeri", "Deuteronomium"], x: 60, y: 70, w: 190, h: 90, bow: -46 },
  { name: "Geschiedenis", books: ["Jozua", "Richteren", "Ruth", "1 Samuël", "2 Samuël", "1 Koningen", "2 Koningen", "1 Kronieken", "2 Kronieken", "Ezra", "Nehemia", "Esther"], x: 60, y: 210, w: 300, h: 130, bow: 62 },
  { name: "Poëzie", books: ["Job", "Psalmen", "Spreuken", "Prediker", "Hooglied"], x: 78, y: 420, w: 200, h: 90, bow: -40 },
  { name: "Grote profeten", books: ["Jesaja", "Jeremia", "Klaagliederen", "Ezechiël", "Daniël"], x: 370, y: 92, w: 210, h: 90, bow: 44 },
  { name: "Kleine profeten", books: ["Hosea", "Joël", "Amos", "Obadja", "Jona", "Micha", "Nahum", "Habakuk", "Zefanja", "Haggaï", "Zacharia", "Maleachi"], x: 340, y: 300, w: 290, h: 150, bow: -58 },
  { name: "Evangeliën", books: ["Mattheüs", "Markus", "Lukas", "Johannes", "Handelingen"], x: 660, y: 70, w: 230, h: 100, bow: -48 },
  { name: "Brieven van Paulus", books: ["Romeinen", "1 Korinthe", "2 Korinthe", "Galaten", "Efeziërs", "Filippenzen", "Kolossenzen", "1 Thessalonicenzen", "2 Thessalonicenzen", "1 Timotheüs", "2 Timotheüs", "Titus", "Filémon"], x: 668, y: 232, w: 268, h: 150, bow: 66 },
  { name: "Algemene brieven", books: ["Hebreeën", "Jakobus", "1 Petrus", "2 Petrus", "1 Johannes", "2 Johannes", "3 Johannes", "Judas"], x: 640, y: 440, w: 240, h: 84, bow: -34 },
  { name: "Openbaring", books: ["Openbaring"], x: 916, y: 494, w: 20, h: 20, bow: 0 },
]

type Star = { book: string; group: string; x: number; y: number; twinkle: number }

/**
 * Versie 13 - "Sterrenkaart".
 *
 * The Bible as a night sky. Every book is a star, and its brightness is the
 * share of it you have read: unread books are the faint pinpricks you only
 * notice once your eyes adjust, half-read books glow, and a finished book gets
 * a halo. The nine groups are drawn as constellations, joined by hairlines in
 * canonical order, so the shape of your reading - which corners of the sky are
 * lit and which are still dark - is the whole picture. Your own tree hangs in
 * the corner as the moon.
 *
 * The page commits to night in both themes. Half the point is that it does not
 * look like the rest of the app: this is the one screen you open to look at
 * rather than to work in, and it earns a wide monitor.
 */
export default function DashboardSterrenkaart() {
  const d = useDashboardData()
  const tree = useTreeSummary()
  const [hovered, setHovered] = useState<string | null>(null)

  const level = d.level?.level ?? tree.level
  const pct = Math.min(100, d.level?.progressPercentage ?? 0)
  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"

  // Deterministic: one seeded stream, no clock, no Math.random. The same
  // reader sees the same sky every night, which is what makes it a map.
  const stars: Star[] = useMemo(() => {
    const rand = seededRng("sterrenkaart:v1")
    const out: Star[] = []
    for (const group of GROUPS) {
      const n = group.books.length
      group.books.forEach((book, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1)
        const jitterX = (rand() - 0.5) * (group.w / Math.max(4, n)) * 0.9
        const jitterY = (rand() - 0.5) * group.h * 0.34
        out.push({
          book,
          group: group.name,
          x: group.x + t * group.w + jitterX,
          y: group.y + group.h / 2 + Math.sin(t * Math.PI) * group.bow + jitterY,
          twinkle: rand() * 3,
        })
      })
    }
    return out
  }, [])

  const starOf = useMemo(() => new Map(stars.map(s => [s.book, s])), [stars])
  const active = hovered ?? d.lastRead?.book ?? null
  const activeCount = active ? d.bookReadCount(active) : 0
  const activeTotal = active ? CHAPTER_COUNTS[active] ?? 0 : 0

  return (
    <div
      className="min-h-full text-white"
      style={{ background: `linear-gradient(to bottom, ${NIGHT_TOP} 0%, ${NIGHT_BOTTOM} 62%, ${NIGHT_TOP} 100%)` }}
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-20 pt-5 sm:px-10 xl:px-14">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-white/70">
          {d.dateLabel ? <p className="text-sm">{d.dateLabel}</p> : <SkeletonBlock className="h-3.5 w-36 bg-white/15" />}
          <VariantSwitcher className="[&_a]:text-white/60 [&_a:hover]:text-white [&>span]:text-white/40" />
        </div>

        <div className="mt-4 empty:hidden">
          <BillingNotices />
        </div>

        <header className="mt-7 max-w-[42rem]">
          <p className={`${EYEBROW} text-white/50`}>De hemel van je lezen</p>
          {d.greeting ? (
            <h1 className="content-in mt-2 text-3xl font-semibold tracking-tight text-white xl:text-4xl">{d.greeting}</h1>
          ) : (
            <SkeletonBlock className="mt-2 h-9 w-72 bg-white/15" />
          )}
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Elk boek is een ster. Hoe meer je ervan leest, hoe helderder hij brandt.
            {!d.loading && ` Je hebt er ${d.booksWithProgress} aangestoken, ${d.booksCompleted} staan in vol licht.`}
          </p>
        </header>

        {/* -- The map ------------------------------------------ */}
        <section
          aria-label="De 66 boeken als sterrenkaart"
          className="relative mt-7 overflow-hidden rounded-3xl border border-white/10"
          style={{ background: "radial-gradient(120% 90% at 72% 8%, rgba(62,78,128,0.55) 0%, rgba(11,16,39,0) 60%)" }}
        >
          <div className="relative w-full" style={{ aspectRatio: `${MAP_W} / ${MAP_H}`, minHeight: 420 }}>
            {/* Constellation hairlines, under the stars. */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {GROUPS.map(group => {
                const pts = group.books.map(b => starOf.get(b)).filter(Boolean) as Star[]
                if (pts.length < 2) return null
                return (
                  <polyline
                    key={group.name}
                    points={pts.map(p => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="rgba(201,214,255,0.16)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
            </svg>

            {/* Group names, set quietly under each constellation. */}
            {GROUPS.map(group => (
              <span
                key={group.name}
                aria-hidden
                className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25"
                style={{ left: `${((group.x + group.w / 2) / MAP_W) * 100}%`, top: `${((group.y + group.h + 16) / MAP_H) * 100}%` }}
              >
                {group.name}
              </span>
            ))}

            {/* The stars. */}
            {stars.map(star => {
              const ratio = d.loading ? 0 : Math.min(1, d.bookReadRatio(star.book))
              const complete = ratio >= 1
              const isCurrent = !d.loading && d.lastRead?.book === star.book
              const size = 3 + ratio * 9 + (complete ? 3 : 0)
              const opacity = 0.22 + ratio * 0.78
              return (
                <Link
                  key={star.book}
                  href={readHref(star.book, isCurrent && d.lastRead ? d.lastRead.chapter : 1)}
                  title={star.book}
                  aria-label={`${star.book}, ${d.bookReadCount(star.book)} van ${CHAPTER_COUNTS[star.book] ?? "?"} hoofdstukken gelezen`}
                  onMouseEnter={() => setHovered(star.book)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(star.book)}
                  onBlur={() => setHovered(null)}
                  className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center no-underline"
                  style={{ left: `${(star.x / MAP_W) * 100}%`, top: `${(star.y / MAP_H) * 100}%`, width: 26, height: 26 }}
                >
                  <span
                    aria-hidden
                    className={`block rounded-full transition-transform duration-200 group-hover:scale-150 ${ratio > 0 ? "skeleton-pulse" : ""}`}
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: isCurrent ? TEAL_BRIGHT : "#EAF0FF",
                      opacity: isCurrent ? 1 : opacity,
                      animationDelay: `${star.twinkle}s`,
                      boxShadow: isCurrent
                        ? `0 0 14px 4px rgba(45,212,191,0.65)`
                        : complete
                          ? "0 0 12px 3px rgba(234,240,255,0.5)"
                          : ratio > 0
                            ? "0 0 7px 1px rgba(234,240,255,0.32)"
                            : "none",
                    }}
                  />
                  {isCurrent && (
                    <span
                      className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold"
                      style={{ color: TEAL_BRIGHT }}
                    >
                      {star.book} {d.lastRead?.chapter}
                    </span>
                  )}
                </Link>
              )
            })}

            {/* The moon: the reader's own tree, hung in the sky. */}
            <div className="absolute right-[3.5%] top-[7%]">
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-8 rounded-full blur-2xl"
                  style={{ background: "radial-gradient(circle, rgba(201,214,255,0.35) 0%, rgba(201,214,255,0) 70%)" }}
                />
                <ProgressTreeDisc size={132} className="relative" />
              </div>
            </div>

            {/* What you are pointing at. */}
            <div className={`absolute bottom-4 left-4 min-w-[240px] px-4 py-3 ${GLASS}`}>
              {active ? (
                <>
                  <p className={`${EYEBROW} text-white/50`}>{starOf.get(active)?.group ?? "Boek"}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{active}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-white/60">
                    {activeCount} van {activeTotal} hoofdstukken
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/60">Beweeg over een ster</p>
              )}
            </div>
          </div>
        </section>

        {/* -- The ground ---------------------------------------- */}
        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_320px]">
          <section className={`p-6 ${GLASS}`} aria-labelledby="ster-nu">
            <h2 id="ster-nu" className={`${EYEBROW} text-white/50`}>
              {d.lastRead ? "Verder waar je was" : "Begin"}
            </h2>
            {d.loading ? (
              <SkeletonBlock className="mt-3 h-8 w-56 bg-white/15" />
            ) : (
              <p className="content-in mt-2 text-2xl font-semibold text-white">
                {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              {tree.wilting
                ? `Je boom heeft ${tree.daysSinceActive} dagen geen water gehad.`
                : d.readToday
                  ? `${d.todayCount} ${d.todayCount === 1 ? "hoofdstuk" : "hoofdstukken"} vandaag. Je reeks staat op ${d.streak}.`
                  : "Eén hoofdstuk vandaag steekt de volgende ster aan."}
            </p>

            <div className="mt-5">
              <div className="flex items-baseline justify-between text-xs tabular-nums text-white/55">
                <span>Niveau {level}</span>
                <span>{d.level?.xpIntoLevel ?? 0} / {d.level?.xpForNextLevel ?? 100} XP</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full transition-[width] duration-1000 ease-out"
                  style={{ width: d.loading ? "0%" : `${pct}%`, backgroundColor: TEAL_BRIGHT, boxShadow: `0 0 12px ${TEAL_BRIGHT}` }}
                />
              </div>
            </div>

            <Link
              href={nextHref}
              className="press mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 no-underline transition-colors hover:bg-white/90"
            >
              {d.lastRead ? "Doorgaan" : "Begin met lezen"} <ArrowRight size={14} />
            </Link>
          </section>

          <div className="[&>div]:rounded-2xl">
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </div>

          <aside className="space-y-5">
            <section className={`p-5 ${GLASS}`} aria-labelledby="ster-cijfers">
              <h2 id="ster-cijfers" className={`${EYEBROW} text-white/50`}>De sterrenhemel</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Sterren aangestoken" value={d.loading ? null : `${d.booksWithProgress} / 66`} />
                <Row label="In vol licht" value={d.loading ? null : `${d.booksCompleted}`} />
                <Row label="Hoofdstukken" value={d.loading ? null : `${d.chaptersRead} / ${TOTAL_CHAPTERS}`} />
                <Row label="Reeks" value={d.loading ? null : `${d.streak} ${d.streak === 1 ? "dag" : "dagen"}`} />
                <Row label="Notities" value={d.loading ? null : `${d.notesCount}`} />
              </dl>
              <Link href="/profiel/boom" className="mt-4 inline-block text-sm font-semibold no-underline hover:underline" style={{ color: TEAL_BRIGHT }}>
                Naar je boom →
              </Link>
            </section>

            {(d.loading || d.recentNotes.length > 0) && (
              <section className={`p-5 ${GLASS}`} aria-labelledby="ster-notities">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="ster-notities" className={`${EYEBROW} text-white/50`}>Recente notities</h2>
                  <Link href="/notities" className="text-xs font-semibold no-underline hover:underline" style={{ color: TEAL_BRIGHT }}>
                    Alle
                  </Link>
                </div>
                {d.loading ? (
                  <div className="mt-4 space-y-3">
                    <SkeletonBlock className="h-3 w-2/5 bg-white/15" />
                    <SkeletonBlock className="h-3 w-full bg-white/15" />
                  </div>
                ) : (
                  <ul className="stagger-in mt-3 space-y-3">
                    {d.recentNotes.map(note => (
                      <li key={note._id}>
                        <Link href={readHref(note.book, note.chapter)} className="group block no-underline">
                          <p className="text-xs font-semibold" style={{ color: TEAL_BRIGHT }}>
                            {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-white/60 group-hover:text-white/85">
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

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-white/55">{label}</dt>
      <dd className="font-semibold tabular-nums text-white">
        {value ?? <SkeletonBlock className="inline-block h-3.5 w-12 bg-white/15 align-middle" />}
      </dd>
    </div>
  )
}
