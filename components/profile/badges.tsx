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
import { TEAL } from "../scene/tokens"
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

/**
 * The badge wall, on the scene.
 *
 * Earned is the brand fill; not-yet-earned is a film of white with the icon
 * dropped back, so the grid reads as one set with two states rather than as
 * two designs. Every colour is literal - the panel behind this is dark in both
 * themes, so a token would be wrong half the time. The old `bg-brand` class is
 * gone: the project hardcodes the brand inline.
 *
 * Each badge is a real button so the tooltip is reachable by keyboard, and it
 * carries its name and its state as its accessible name - the icon alone says
 * neither.
 */
export default function UserBadges({ earned }: UserBadgesProps) {
  return (
    <TooltipProvider>
      <ul className="m-0 grid list-none grid-cols-5 gap-3 p-0 sm:grid-cols-6 lg:grid-cols-8">
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
                      "flex aspect-square w-full items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white",
                      has
                        ? "text-white ring-1 ring-white/25"
                        : "bg-white/[0.06] text-white/35 ring-1 ring-white/15 hover:bg-white/10",
                    )}
                    style={has ? { backgroundColor: TEAL } : undefined}
                  >
                    <IconComponent className="h-5 w-5" aria-hidden />
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
