"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import TreeAvatar from "../kit/TreeAvatar"
import { Card } from "../kit/primitives"
import { formatXp } from "../../lib/levensboom/growthCopy"
import { useTreeSummary } from "./ProgressTree"

/**
 * "Je boom" in the dashboard rail (design 41b).
 *
 * One low row, vertically centred: the tree in a disc with a progress ring
 * left, three lines of text in the middle, a chevron right. The whole card is
 * the link to /profiel/boom - it has only ever had the one destination.
 *
 * What 41b changed against the earlier card: the progress moved off the bar
 * and onto the ring around the tree, the level moved into a gold badge on that
 * ring, "Bekijken →" became the chevron, and the XP is named once - line three,
 * towards the next phase - where the old card said it twice.
 *
 * Copy rule, as everywhere: the feature is never named to the reader. It is
 * "je boom". The strings are `lib/levensboom/growthCopy.ts`, which the app
 * mirrors in `lib/features/levensboom/domain/growth_copy.dart`.
 */

/** The disc and the ring around it. 88 px outer, a 5 px ring, 3 px of card between. */
const SIZE = 88
const STROKE = 5
const GAP = 3
const DISC = SIZE - 2 * (STROKE + GAP)
const BADGE = 26

/** The ring's radius, and the badge's top-left so its centre sits on the ring at 45°. */
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const BADGE_OFFSET = Math.round(SIZE / 2 + RADIUS / Math.SQRT2 - BADGE / 2)

/**
 * The progress ring: a light-grey track with a teal arc over it, starting at
 * twelve o'clock and filling clockwise, round caps. Rotating the whole svg is
 * what puts the start at the top; a dash offset alone would start it at three
 * o'clock.
 */
function ProgressRing({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, percent))
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      className="absolute inset-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--line)"
        strokeWidth={STROKE}
      />
      {pct > 0 && (
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--teal)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
        />
      )}
    </svg>
  )
}

export default function TreeCard({
  level,
  pct,
  remainingXp,
}: {
  /** The dashboard's own level, which wins over the tree state when it has one. */
  level?: number
  /** 0-100 towards the next level: the ring's value while there is no tree. */
  pct?: number
  /** XP to the next level, for the same treeless case. */
  remainingXp?: number
}) {
  const tree = useTreeSummary()
  // The step lines need the tree's own state (its floor); until that arrives,
  // or when the tree is off, the card keeps counting levels.
  const hasSteps = Boolean(tree.hasTree && tree.stageName && tree.stepOnly)
  const shownLevel = level ?? tree.level
  const ringPercent = hasSteps ? tree.stepPercentage : Math.min(100, pct ?? tree.progressPercentage)
  const toGo = remainingXp ?? tree.remainingXp
  // With a tree the XP points at the next phase; without one it still counts
  // levels, and on the last phase (full ring) there is nothing left to name.
  const xpLine = hasSteps ? tree.nextPhaseLine : `Nog ${formatXp(toGo)} XP tot niveau ${shownLevel + 1}`

  return (
    <Link href="/profiel/boom" className="group block flex-none no-underline">
      <Card className="p-[14px] transition-colors group-hover:border-line-strong">
        <div className="flex items-center gap-[14px]">
          <div
            className="relative flex-none"
            style={{ width: SIZE, height: SIZE }}
            role="progressbar"
            aria-label="Voortgang naar de volgende stap"
            aria-valuenow={Math.round(ringPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <ProgressRing percent={ringPercent} />
            <div className="absolute" style={{ inset: STROKE + GAP }}>
              <TreeAvatar size={DISC} />
            </div>
            <span
              className="absolute inline-flex items-center justify-center rounded-full bg-gold text-[12px] font-bold leading-none text-gold-ink tabular-nums"
              style={{
                width: BADGE,
                height: BADGE,
                left: BADGE_OFFSET,
                top: BADGE_OFFSET,
                border: "2px solid var(--surface)",
              }}
            >
              {shownLevel}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-bold leading-[1.25] text-ink">
              {hasSteps ? tree.stageName : `Niveau ${shownLevel}`}
            </div>
            {hasSteps && <div className="mt-[3px] text-[13px] text-ink-muted">{tree.stepOnly}</div>}
            {xpLine && (
              <div className="mt-[7px] text-[13px] font-semibold text-teal-dark dark:text-teal-400">
                {xpLine}
              </div>
            )}
          </div>

          <ChevronRight
            size={20}
            strokeWidth={2}
            className="flex-none text-ink-faint transition-colors group-hover:text-ink-muted"
            aria-hidden
          />
        </div>
      </Card>
    </Link>
  )
}
