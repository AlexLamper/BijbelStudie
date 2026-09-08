"use client"

import Link from "next/link"
import TreeCanvas from "../levensboom/TreeCanvas"
import { useLevensboom, fracOf } from "../../hooks/useLevensboom"
import { ringColors } from "../../lib/levensboom/ring"

const TEAL = "#0D9488"
const STUDIO_HREF = "/profiel/boom"

/**
 * The reader's tree as the dashboard's progress element.
 *
 * Two framings for two kinds of space: a disc with the XP ring bent around it
 * (a tile, a masthead), and a landscape that fills whatever box it is given (a
 * hero band). Both read the shared provider the root layout mounts, so they
 * cost no extra request, and both degrade the same way: a skeleton while the
 * state loads, a plain level disc when the reader has switched the tree off.
 *
 * Copy rule for every surface that uses these: the feature is never named to
 * the reader. It is "je boom" and the section is "Jouw voortgang".
 */

export type TreeSummary = {
  loading: boolean
  /** False when the tree is off or the state never arrived: show numbers only. */
  hasTree: boolean
  level: number
  stageName: string | null
  /** XP still needed for the next level. */
  remainingXp: number
  progressPercentage: number
  wilting: boolean
  daysSinceActive: number
  longestStreak: number
  nextUnlock: { name: string; level: number } | null
  nextStage: { name: string; level: number } | null
}

/** The numbers a variant prints next to the tree, from the same state the tree is drawn from. */
export function useTreeSummary(): TreeSummary {
  const { data, loading } = useLevensboom()
  const tree = data?.levensboom
  return {
    loading,
    hasTree: Boolean(data && tree && !tree.disabled),
    level: data?.level ?? 1,
    stageName: tree?.stage?.name ?? null,
    remainingXp: data ? Math.max(0, data.xpForNextLevel - data.xpIntoLevel) : 0,
    progressPercentage: data?.progressPercentage ?? 0,
    wilting: tree?.wilting ?? false,
    daysSinceActive: tree?.daysSinceActive ?? 0,
    longestStreak: tree?.longestStreak ?? 0,
    nextUnlock: tree?.nextUnlock ? { name: tree.nextUnlock.name, level: tree.nextUnlock.level } : null,
    nextStage:
      tree?.stage?.nextName && tree.stage.nextLevel != null
        ? { name: tree.stage.nextName, level: tree.stage.nextLevel }
        : null,
  }
}

/**
 * The tree in a disc, the XP bar as its ring, the level in the corner.
 * Links to the studio. `still` skips the sway - use it below ~96 px, where
 * a sway is sub-pixel anyway.
 */
export function ProgressTreeDisc({
  size = 72,
  still = false,
  className = "",
}: {
  size?: number
  still?: boolean
  className?: string
}) {
  const { data, loading } = useLevensboom()

  if (loading) {
    return (
      <div
        aria-hidden
        className={`skeleton-pulse flex-shrink-0 rounded-full bg-gray-100 dark:bg-secondary ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  const tree = data?.levensboom
  const stroke = Math.max(3, Math.round(size * 0.045))
  const badge = Math.max(16, Math.round(size * 0.3))
  const badgeFont = Math.max(9, Math.round(size * 0.14))

  if (!data || !tree || tree.disabled) {
    // The tree is off: the level still deserves a face.
    return (
      <Link
        href={STUDIO_HREF}
        aria-label={`Jouw voortgang, niveau ${data?.level ?? 1}`}
        className={`flex flex-shrink-0 items-center justify-center rounded-full border-2 font-bold tabular-nums no-underline border-gray-200 bg-gray-50 text-gray-700 dark:border-border dark:bg-secondary dark:text-foreground ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }}
      >
        {data?.level ?? "–"}
      </Link>
    )
  }

  const ring = ringColors(tree.avatar.ring)
  const gold = tree.avatar.ring === "goud"
  const radius = size / 2 - stroke / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * Math.min(1, Math.max(0, data.progressPercentage / 100))
  const gradientId = `voortgang-ring-${tree.avatar.ring}-${size}`

  return (
    <Link
      href={STUDIO_HREF}
      className={`group relative block flex-shrink-0 no-underline ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Je boom, ${tree.stage.name.toLowerCase()} op niveau ${data.level}. Bekijk je voortgang`}
    >
      <span
        className="absolute overflow-hidden rounded-full ring-1 ring-black/5 transition-transform group-hover:scale-[1.02] dark:ring-white/10"
        style={{ inset: stroke + 2 }}
      >
        <TreeCanvas
          seed={tree.seed}
          level={data.level}
          frac={fracOf(data)}
          health={tree.health}
          species={tree.avatar.species}
          scene={tree.avatar.scene}
          animal={tree.avatar.animal}
          framing="portrait"
          still={still}
          reducedMotion={tree.reducedMotion}
          className="block h-full w-full"
          ariaLabel=""
        />
      </span>

      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ring.from} />
            <stop offset="100%" stopColor={ring.to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ring.track ?? "currentColor"}
          className={ring.track ? undefined : "text-gray-200 dark:text-secondary"}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>

      <span
        className="absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full border-2 border-white font-bold tabular-nums text-white dark:border-card"
        style={{
          backgroundColor: gold ? ring.stroke : TEAL,
          minWidth: badge,
          height: badge,
          fontSize: badgeFont,
          lineHeight: 1,
          paddingLeft: 5,
          paddingRight: 5,
        }}
        title={`Niveau ${data.level}`}
      >
        {data.level}
      </span>
    </Link>
  )
}

/**
 * The tree as a landscape. Fills its parent: give the parent a size or an
 * aspect ratio and `overflow-hidden` with the radius you want.
 */
export function ProgressTreeScene({ className = "" }: { className?: string }) {
  const { data, loading } = useLevensboom()

  if (loading) {
    return <div aria-hidden className={`skeleton-pulse h-full w-full bg-gray-100 dark:bg-secondary ${className}`} />
  }

  const tree = data?.levensboom
  if (!data || !tree || tree.disabled) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-[#F0FDFA] dark:bg-teal-950/40 ${className}`}
        aria-label={`Jouw voortgang, niveau ${data?.level ?? 1}`}
        role="img"
      >
        <span className="text-4xl font-bold tabular-nums" style={{ color: TEAL }}>{data?.level ?? "–"}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70 dark:text-teal-200/70">
          Niveau
        </span>
      </div>
    )
  }

  return (
    <TreeCanvas
      seed={tree.seed}
      level={data.level}
      frac={fracOf(data)}
      health={tree.health}
      species={tree.avatar.species}
      scene={tree.avatar.scene}
      animal={tree.avatar.animal}
      framing="scene"
      reducedMotion={tree.reducedMotion}
      className={`block h-full w-full ${className}`}
      ariaLabel={`Je boom, ${tree.stage.name.toLowerCase()} op niveau ${data.level}`}
    />
  )
}
