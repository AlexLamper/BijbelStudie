"use client"

import {
  BadgeCheck,
  Flame,
  Star,
  BookOpen,
  Trophy,
  Crown,
  Users,
  MessageCircle,
  Camera,
  CheckCircle,
  FlaskConical,
  Gift,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { cn } from "../../lib/utils"
import { BADGE_META } from "../../lib/badgeCatalog"
import type { LucideIcon } from "lucide-react"

interface BadgeInfo {
  id: string
  icon: LucideIcon
}

// Order and icon live here; the name and the "what earns it" line live in
// lib/badgeCatalog.ts, because the end-of-lesson card needs the same words and
// two copies of them drift. The `points*` ids date from a quiz that no longer
// exists; they are XP milestones now, and the copy says so.
const badges: BadgeInfo[] = [
  { id: "streak30", icon: Flame },
  { id: "streak60", icon: Flame },
  { id: "streak90", icon: Flame },
  { id: "streak120", icon: Flame },
  { id: "verified", icon: BadgeCheck },
  { id: "contributor", icon: Star },
  { id: "completed1", icon: BookOpen },
  { id: "completed5", icon: BookOpen },
  { id: "completed10", icon: BookOpen },
  { id: "points100", icon: Trophy },
  { id: "points500", icon: Trophy },
  { id: "points1000", icon: Trophy },
  { id: "premium", icon: Crown },
  { id: "invite", icon: Users },
  { id: "commenter", icon: MessageCircle },
  { id: "profilepic", icon: Camera },
  { id: "firstlesson", icon: CheckCircle },
  { id: "tester", icon: FlaskConical },
  { id: "anniversary", icon: Gift },
]

interface UserBadgesProps {
  earned: string[]
}

/** How many badges there are to earn. The profile card counts against this. */
export const BADGE_TOTAL = badges.length

/**
 * The first few badges the reader has earned, as overlapping rings - the shape
 * the Badges card wears at rest (design_handoff_web/PAGES.md §6). The last ring
 * is the remainder as a number, so the row says "and this many more" without
 * growing.
 */
export function BadgeRings({ earned, show = 4 }: { earned: string[]; show?: number }) {
  const mine = badges.filter(b => earned.includes(b.id))
  const shown = mine.slice(0, show)
  const rest = BADGE_TOTAL - shown.length

  return (
    <div className="ml-[9px] flex">
      {shown.map(b => {
        const Icon = b.icon
        const label = BADGE_META[b.id]?.label ?? b.id
        return (
          <span
            key={b.id}
            title={label}
            className="-ml-[9px] flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-badgering bg-badgering-wash shadow-[0_0_0_3px_var(--surface)]"
          >
            <Icon size={19} strokeWidth={1.8} className="text-badgering" aria-hidden />
          </span>
        )
      })}
      {rest > 0 && (
        <span className="-ml-[9px] flex h-11 w-11 items-center justify-center rounded-full bg-line text-[12.5px] font-semibold text-ink-muted shadow-[0_0_0_3px_var(--surface)] tabular-nums">
          +{rest}
        </span>
      )}
    </div>
  )
}

/**
 * The badge wall.
 *
 * Earned is the brand fill with a white glyph; not-yet-earned is the page's own
 * sunken grey with the glyph dropped back, so the grid reads as one set with
 * two states rather than as two designs.
 *
 * Each badge is a real button so the tooltip is reachable by keyboard, and it
 * carries its name and its state as its accessible name - the icon alone says
 * neither.
 */
export default function UserBadges({ earned }: UserBadgesProps) {
  return (
    <TooltipProvider>
      <ul className="m-0 grid list-none grid-cols-5 gap-2 p-0">
        {badges.map((b) => {
          const IconComponent = b.icon
          const has = earned.includes(b.id)
          const label = BADGE_META[b.id]?.label ?? b.id
          return (
            <li key={b.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${label} — ${has ? "verdiend" : "nog niet verdiend"}`}
                    className={cn(
                      "flex aspect-square w-full items-center justify-center rounded-[10px] outline-none transition-colors",
                      has
                        ? "bg-teal text-white"
                        : "bg-line-soft text-ink-faint hover:bg-line",
                    )}
                  >
                    <IconComponent className="h-4 w-4" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-semibold">{label}</span>
                  {" · "}
                  {BADGE_META[b.id]?.description ?? ""}
                </TooltipContent>
              </Tooltip>
            </li>
          )
        })}
      </ul>
    </TooltipProvider>
  )
}
