"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { curatedStudies } from "../../../lib/data/curated-studies"
import { useDashboardData, readHref, TOTAL_CHAPTERS } from "../../../hooks/useDashboardData"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, ProgressTreeScene, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.18em]"
const CARD = "rounded-2xl border border-gray-200 bg-white dark:border-border dark:bg-card"

/** The road, in the SVG's own units. `preserveAspectRatio="none"` stretches it
 *  to the container, so a point's user coordinates double as percentages and
 *  the HTML markers can be placed on the curve without measuring the DOM. */
const VB_W = 1000
const VB_H = 300
const ROAD = "M 20 236 C 150 236 168 78 300 78 S 470 244 610 244 S 790 70 980 70"

type StopId = "nu" | "vandaag" | "week" | "unlock" | "niveau"

type Stop = {
  id: StopId
  /** Position along the road, 0 at the start, 1 at the next level. */
  t: number
  label: string
}

/**
 * Versie 12 - "Pad".
 *
 * One level, drawn as a road you are standing on. The curve runs from the
 * level you have to the level you are walking towards; your tree stands on it
 * at exactly the share of XP you have earned, the tarmac behind it is laid and
 * the road ahead is dashed. The four things that actually move you forward -
 * today's chapter, this week, the next unlock, the level itself - are stops
 * along that road, and clicking one opens it underneath. Nothing here is a
 * statistic for its own sake: every stop is a thing to do, or the reward for
 * having done it.
 *
 * Wide by design: the road wants a monitor, and the panel under it opens to
 * two columns from lg.
 */
export default function DashboardPad() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? 0)
  const walked = d.loading ? 0 : pct / 100
  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"

  const stops: Stop[] = [
    { id: "nu", t: 0.02, label: d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Begin" },
    { id: "vandaag", t: 0.3, label: "Vandaag" },
    { id: "week", t: 0.56, label: "Deze week" },
    { id: "unlock", t: 0.8, label: tree.nextUnlock?.name ?? "Onderweg" },
    { id: "niveau", t: 0.99, label: `Niveau ${level + 1}` },
  ]

  // Default to the first stop still ahead of the walker: the thing to do next.
  const [selected, setSelected] = useState<StopId>("vandaag")
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (touched || d.loading) return
    const ahead = stops.find(s => s.t > walked)
    setSelected(ahead?.id ?? "niveau")
    // Only re-aims when the walker's position first lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.loading, walked, touched])

  // The measured path is held in state, not a ref: the points can only be read
  // once the node exists, and a ref would not re-render when it arrives.
  const [roadEl, setRoadEl] = useState<SVGPathElement | null>(null)
  const points = useRoadPoints(roadEl, stops.map(s => s.t).concat(walked))
  const walkerPoint = points[points.length - 1]

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-20 pt-5 sm:px-10 xl:px-14">
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

        <header className="mt-6">
          {d.greeting ? (
            <h1 className="content-in text-3xl font-semibold tracking-tight text-foreground xl:text-4xl">{d.greeting}</h1>
          ) : (
            <SkeletonBlock className="h-9 w-72" />
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {tree.hasTree && tree.stageName ? `${tree.stageName} - niveau ${level}` : `Niveau ${level}`}
            {" - "}
            {d.loading ? "…" : `nog ${Math.max(0, xpFor - xpInto)} XP tot niveau ${level + 1}`}
          </p>
        </header>

        {/* -- The road ----------------------------------------- */}
        <section
          aria-label="Je weg naar het volgende niveau"
          className="relative mt-6 h-[300px] overflow-hidden rounded-3xl border border-teal-100 dark:border-teal-900/40 sm:h-[340px] xl:h-[400px]"
        >
          {/* The tree's own sky, pushed back far enough to be landscape. */}
          <div aria-hidden className="absolute inset-0 opacity-60 blur-[1px] saturate-[0.85] dark:opacity-40">
            <ProgressTreeScene />
          </div>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/45 to-white/80 dark:from-background/75 dark:via-background/55 dark:to-background/85" />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              ref={setRoadEl}
              d={ROAD}
              fill="none"
              stroke="currentColor"
              className="text-gray-300 dark:text-border"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray="1 18"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={ROAD}
              fill="none"
              stroke={TEAL}
              strokeWidth={10}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray={`${walked} 1`}
              style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>

          {/* Stops, placed on the curve. */}
          {stops.map((stop, i) => {
            const p = points[i]
            if (!p) return null
            const passed = walked >= stop.t
            const isSelected = selected === stop.id
            return (
              <button
                key={stop.id}
                type="button"
                onClick={() => { setTouched(true); setSelected(stop.id) }}
                aria-pressed={isSelected}
                className="press absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                style={{ left: `${(p.x / VB_W) * 100}%`, top: `${(p.y / VB_H) * 100}%` }}
              >
                <span className="flex flex-col items-center gap-1.5">
                  <span
                    className={`block rounded-full border-2 transition-all duration-300 ${
                      isSelected ? "h-6 w-6 shadow-lg" : "h-4 w-4"
                    } ${
                      passed
                        ? "border-white dark:border-card"
                        : "border-gray-300 bg-white dark:border-border dark:bg-card"
                    }`}
                    style={passed ? { backgroundColor: TEAL } : undefined}
                  />
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm transition-colors ${
                      isSelected
                        ? "bg-[#0D9488] text-white"
                        : "bg-white/80 text-foreground dark:bg-card/80"
                    }`}
                  >
                    {stop.label}
                  </span>
                </span>
              </button>
            )
          })}

          {/* The walker. Sits on the curve at the XP fraction. */}
          {walkerPoint && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 transition-[left,top] duration-1000 ease-out"
              style={{ left: `${(walkerPoint.x / VB_W) * 100}%`, top: `${(walkerPoint.y / VB_H) * 100}%` }}
            >
              <div className="pointer-events-auto -translate-y-[calc(100%-6px)]">
                <ProgressTreeDisc size={84} still />
              </div>
            </div>
          )}

          <p className="absolute bottom-3 left-4 text-[11px] font-medium tabular-nums text-muted-foreground">
            {d.loading ? " " : `${xpInto} / ${xpFor} XP naar niveau ${level + 1}`}
          </p>
        </section>

        {/* -- The stop you opened ------------------------------ */}
        <div className="mt-7 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className={`min-w-0 p-6 sm:p-7 ${CARD}`} aria-live="polite">
            {selected === "nu" && (
              <StopBody
                eyebrow={d.lastRead ? "Nu - verder waar je was" : "Nu - begin"}
                title={d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
                body={
                  d.lastRead
                    ? "Je las hier het laatst. Eén hoofdstuk verder is genoeg om de dag te tellen."
                    : "Kies een hoofdstuk en begin. De rest van het pad tekent zich vanzelf."
                }
                href={nextHref}
                cta={d.lastRead ? "Doorgaan" : "Begin met lezen"}
              />
            )}

            {selected === "vandaag" && (
              <StopBody
                eyebrow="Vandaag"
                title={d.readToday ? "Vandaag telt al mee" : "Nog niets gelezen vandaag"}
                body={
                  d.readToday
                    ? `${d.todayCount} ${d.todayCount === 1 ? "hoofdstuk" : "hoofdstukken"} vandaag. Je reeks staat op ${d.streak}.`
                    : "Eén hoofdstuk zet je reeks door en geeft je boom water."
                }
                href={nextHref}
                cta={d.readToday ? "Nog een hoofdstuk" : "Lees een hoofdstuk"}
              >
                <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                  <Check done={d.readToday} label="Hoofdstuk gelezen" />
                  <Check done={d.noteToday} label="Notitie geschreven" />
                  <Check done={d.streakToday} label="Reeks bijgewerkt" />
                </ul>
              </StopBody>
            )}

            {selected === "week" && (
              <StopBody
                eyebrow="Deze week"
                title={d.statsLoading ? "…" : `${d.weekTotal} ${d.weekTotal === 1 ? "hoofdstuk" : "hoofdstukken"}`}
                body={`Je reeks staat op ${d.streak} ${d.streak === 1 ? "dag" : "dagen"}${
                  tree.longestStreak > d.streak ? `, je langste was ${tree.longestStreak}` : ""
                }.`}
                href={nextHref}
                cta="Lees verder"
              >
                <ol className="mt-5 flex items-end gap-2" aria-label="Deze week">
                  {d.weekDays.map((day, i) => (
                    <li key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <span
                        aria-hidden
                        className={`block w-full rounded-md ${day.count > 0 ? "" : "bg-gray-200 dark:bg-secondary"} ${
                          d.statsLoading ? "skeleton-pulse" : ""
                        }`}
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
              </StopBody>
            )}

            {selected === "unlock" && (
              <StopBody
                eyebrow="Onderweg"
                title={tree.nextUnlock ? tree.nextUnlock.name : "Alles vrijgespeeld"}
                body={
                  tree.nextUnlock
                    ? `Komt vrij op niveau ${tree.nextUnlock.level}. Nog ${Math.max(0, xpFor - xpInto)} XP tot niveau ${level + 1}.`
                    : "Je hebt alles wat er op dit moment te ontgrendelen valt. Je boom groeit gewoon door."
                }
                href="/profiel/boom"
                cta="Bekijk je boom"
              />
            )}

            {selected === "niveau" && (
              <StopBody
                eyebrow={`Niveau ${level + 1}`}
                title={tree.nextStage ? `${tree.nextStage.name} op niveau ${tree.nextStage.level}` : `Nog ${Math.max(0, xpFor - xpInto)} XP`}
                body={`Je staat op ${Math.round(pct)}% van dit niveau. Lezen, studeren en notities maken tellen allemaal mee.`}
                href={nextHref}
                cta="Verdien XP"
              >
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-teal-100 dark:bg-teal-900/40">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: TEAL }}
                  />
                </div>
              </StopBody>
            )}
          </section>

          <div className="[&>div]:rounded-2xl">
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </div>
        </div>

        {/* -- The long road: the whole Bible ------------------- */}
        <section className="mt-10" aria-labelledby="pad-bijbel">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="pad-bijbel" className="text-lg font-semibold text-foreground">De lange weg</h2>
            {!d.loading && (
              <p className="text-xs tabular-nums text-muted-foreground">
                {d.booksWithProgress} van 66 boeken - {d.chaptersRead} van {TOTAL_CHAPTERS} hoofdstukken
              </p>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-out"
              style={{ width: d.loading ? "0%" : `${(d.chaptersRead / TOTAL_CHAPTERS) * 100}%`, backgroundColor: TEAL }}
            />
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {curatedStudies.slice(0, 3).map(study => (
              <li key={study.id}>
                <Link href={`/studies/${study.id}`} className={`lift group block h-full p-5 no-underline ${CARD}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {study.type} - {study.durationLabel}
                  </p>
                  <p className="mt-1.5 text-[15px] font-semibold text-foreground">{study.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{study.description}</p>
                  <span className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${TEAL_TEXT}`}>
                    Openen <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/* -- The road geometry ---------------------------------------- */

/**
 * Points on the road at fractions 0..1 of its length, in SVG user units.
 *
 * No resize listener on purpose: `preserveAspectRatio="none"` means the curve
 * is stretched to the box, so a point's user coordinates stay valid as
 * percentages however wide the window gets. Only the fractions can change.
 */
function useRoadPoints(path: SVGPathElement | null, fractions: number[]): { x: number; y: number }[] {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([])
  const key = fractions.join(",")
  const latest = useRef(fractions)
  latest.current = fractions

  useLayoutEffect(() => {
    if (!path) return
    const total = path.getTotalLength()
    if (!total) return
    setPoints(
      latest.current.map(f => {
        const p = path.getPointAtLength(total * Math.min(1, Math.max(0, f)))
        return { x: p.x, y: p.y }
      }),
    )
  }, [path, key])

  return points
}

/* -- Pieces --------------------------------------------------- */

function StopBody({
  eyebrow,
  title,
  body,
  href,
  cta,
  children,
}: {
  eyebrow: string
  title: string
  body: string
  href: string
  cta: string
  children?: React.ReactNode
}) {
  return (
    <div className="content-in">
      <p className={`${EYEBROW} ${TEAL_TEXT}`}>{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">{body}</p>
      {children}
      <Link
        href={href}
        className="press mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
        style={{ backgroundColor: TEAL }}
      >
        {cta} <ArrowRight size={14} />
      </Link>
    </div>
  )
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${
        done
          ? "border-teal-200 bg-[#F0FDFA] text-foreground dark:border-teal-900/50 dark:bg-teal-950/30"
          : "border-gray-200 text-muted-foreground dark:border-border"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
          done ? "" : "border border-gray-300 bg-transparent dark:border-border"
        }`}
        style={done ? { backgroundColor: TEAL } : undefined}
      >
        {done ? "✓" : ""}
      </span>
      {label}
      <span className="sr-only">{done ? ", gedaan" : ", nog niet gedaan"}</span>
    </li>
  )
}
