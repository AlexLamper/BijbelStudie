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

export default function UserBadges({ earned }: UserBadgesProps) {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-5 gap-4">
        {badges.map((b) => {
          const IconComponent = b.icon
          return (
            <Tooltip key={b.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "p-2 rounded-lg border flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow",
                    earned.includes(b.id)
                      ? "bg-brand text-white border-teal-600 dark:bg-[#e0e0e0] dark:text-black dark:border-[#e0e0e0]"
                      : "bg-gray-100 dark:bg-background text-gray-400 dark:text-gray-600 opacity-50 border-border"
                  )}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-semibold">{BADGE_META[b.id]?.label ?? b.id}</span>
                {" · "}
                {BADGE_META[b.id]?.description ?? ""}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
