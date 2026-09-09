"use client"

import { type WeekDay } from "../../../hooks/useDashboardData"
import { SkeletonBlock } from "../../ui/skeletons"

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

/**
 * One surface for everything that sits on the scene.
 *
 * The working panels used to be `bg-black/80`, which read as a hole punched in
 * the landscape once the page had scrolled. This is the tile the four horizon
 * numbers already used and the one to keep: dark enough that white type clears
 * 4.5:1 over a noon sky (version 11's frosted `bg-white/10` measured about
 * 2.8:1 there), light enough that the sky and the land keep running through it.
 * The page's `--veil` does the rest of the contrast work as you scroll.
 */
export const TILE = "rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md"

/** Kept as a name so the page can say "panel" where it means a panel; the
 *  surface is deliberately identical to TILE. */
export const PANEL = TILE

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
