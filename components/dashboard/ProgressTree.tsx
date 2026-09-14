"use client"

import TreeCanvas from "../levensboom/TreeCanvas"
import { useLevensboom, fracOf } from "../../hooks/useLevensboom"

const TEAL = "#0D9488"

/**
 * The reader's tree as the dashboard's progress element.
 *
 * A landscape that fills whatever box it is given (a hero band). It reads the
 * shared provider the root layout mounts, so it costs no extra request, and
 * degrades to a skeleton while the state loads and a plain level panel when
 * the reader has switched the tree off.
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
 * The tree as a landscape. Fills its parent: give the parent a size or an
 * aspect ratio and `overflow-hidden` with the radius you want.
 *
 * `still` draws the same picture and never animates it, whatever the reader's
 * own motion preference says. It is for the one place the tree stands behind a
 * column of scripture (SceneBackdrop's muted mode on /lezen), where a swaying
 * branch under the verse someone is following is the one thing atmosphere must
 * never do.
 */
export function ProgressTreeScene({ className = "", still = false }: { className?: string; still?: boolean }) {
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
      still={still}
      className={`block h-full w-full ${className}`}
      ariaLabel={`Je boom, ${tree.stage.name.toLowerCase()} op niveau ${data.level}`}
    />
  )
}
