"use client"

import { useState } from "react"
import Link from "next/link"
import { readHref, type WeekDay } from "../../../../hooks/useDashboardData"
import { SkeletonBlock } from "../../../ui/skeletons"

/**
 * The small parts candidate 3 is assembled from.
 *
 * Every one of them is drawn to sit ON the scene, so every colour here is a
 * literal white or black - never a theme token. A token flips with the theme,
 * and the thing underneath these is a landscape that can be a noon sky in dark
 * mode or a midnight one in light mode. The page's scrims and its `--veil` do
 * the contrast work; these only have to be honest about what they are.
 */

/** Brand teal, hardcoded. Fills only. */
export const TEAL = "#0D9488"
/** The same brand on a dark ground, as app-sidebar.tsx uses in its dark branch. */
export const TEAL_ON_DARK = "#2DD4BF"

export const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60"

/** Skeletons on these surfaces. The shared block carries `dark:bg-secondary`,
 *  which is invisible against a panel that is dark in BOTH themes, so the dark
 *  branch is overridden here rather than left to the token. */
export const SKEL = "bg-white/20 dark:bg-white/20"

/** A working panel: dark enough to read a paragraph on, translucent enough that
 *  the landscape is still visibly the thing underneath. */
export const PANEL = "rounded-2xl bg-black/80 ring-1 ring-white/10 backdrop-blur-md"

/** Smoked glass, for the numbers that break the fold. Version 11's frosted
 *  white tile was measured against a noon sky and lost: white-on-white/10 over
 *  a bright horizon is around 2.8:1. Turning the same tile dark keeps the
 *  landscape running through it and puts the figures back above 4.5:1. */
export const TILE = "rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md"

/* ── The four numbers on the horizon ─────────────────────────── */

export function GlassStat({
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
    <div className={`px-5 py-4 shadow-lg shadow-black/20 ${TILE}`}>
      <dt className={`${EYEBROW} text-white/70`}>{label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-1.5">
        {value === null ? (
          <SkeletonBlock className={`h-7 w-14 ${SKEL}`} />
        ) : (
          <span className="content-in text-2xl font-semibold tabular-nums text-white xl:text-3xl">{value}</span>
        )}
        <span className="text-xs text-white/75">{unit}</span>
      </dd>
      {note && <p className="mt-0.5 text-[11px] text-white/60">{note}</p>}
    </div>
  )
}

/* ── One running total in the reader panel ───────────────────── */

export function Total({
  label,
  loading,
  value,
  sub,
}: {
  label: string
  loading: boolean
  value: string
  sub: string
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/60">{label}</dt>
      {loading ? (
        <dd className="mt-1 space-y-1">
          <SkeletonBlock className={`h-5 w-10 ${SKEL}`} />
          <SkeletonBlock className={`h-2.5 w-16 ${SKEL}`} />
        </dd>
      ) : (
        <dd className="content-in">
          <span className="block text-lg font-semibold leading-none tabular-nums text-white">{value}</span>
          <span className="mt-1 block truncate text-[10px] tabular-nums text-white/60">{sub}</span>
        </dd>
      )}
    </div>
  )
}

/* ── The week ────────────────────────────────────────────────── */

export function WeekStrip({ days, loading }: { days: WeekDay[]; loading: boolean }) {
  return (
    <ol className="mt-3 flex gap-1.5" aria-label="Deze week">
      {days.map((day, i) => {
        const read = day.count > 0
        return (
          <li key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              aria-hidden
              className={`block h-7 w-full rounded-md ${
                read ? "" : day.isToday ? "border-2 border-dashed border-white/45" : "bg-white/15"
              } ${loading ? "skeleton-pulse" : ""}`}
              style={read ? { backgroundColor: day.isToday ? TEAL_ON_DARK : "rgba(45,212,191,0.45)" } : undefined}
            />
            <span className={`text-[10px] font-medium ${day.isToday ? "text-white" : "text-white/60"}`}>
              {day.label}
              <span className="sr-only">{read ? `, ${day.count} keer gelezen` : ", niet gelezen"}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ── One testament as a ribbon of slats ──────────────────────── */

/**
 * Each slat is one book, filled to the share of it already read, and it links
 * into that book. On a wide monitor all 39 fit at once, which is the point:
 * what you have and have not touched, in one glance.
 */
export function BookRibbon({
  label,
  books,
  ratioOf,
  countOf,
  totalOf,
  loading,
  current,
}: {
  label: string
  books: readonly string[]
  ratioOf: (book: string) => number
  countOf: (book: string) => number
  totalOf: (book: string) => number
  loading: boolean
  current: string | null
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">{label}</p>
        <p className="h-4 text-xs font-medium tabular-nums text-white/90">
          {hovered ? `${hovered} — ${countOf(hovered)}/${totalOf(hovered)}` : ""}
        </p>
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
                aria-label={`${book}, ${loading ? 0 : countOf(book)} van ${totalOf(book)} hoofdstukken gelezen`}
                onMouseEnter={() => setHovered(book)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(book)}
                onBlur={() => setHovered(null)}
                className={`relative block h-11 overflow-hidden rounded-[3px] bg-white/15 no-underline outline-none transition-transform hover:scale-y-110 focus-visible:ring-2 focus-visible:ring-white ${
                  loading ? "skeleton-pulse" : ""
                } ${isCurrent ? "ring-2 ring-white" : ""}`}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
                  style={{ height: `${Math.min(1, ratio) * 100}%`, backgroundColor: TEAL_ON_DARK }}
                />
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
