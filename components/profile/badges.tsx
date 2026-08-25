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
import type { LucideIcon } from "lucide-react"

interface BadgeInfo {
  id: string
  icon: LucideIcon
  description: string
}

// Descriptions are Dutch like the rest of the app, and now describe what
// actually awards each badge — see lib/gamification.ts `evaluateBadges`. The
// `points*` ids date from a quiz that no longer exists; they are XP milestones
// now, and the copy says so.
const badges: BadgeInfo[] = [
  { id: "streak30", icon: Flame, description: "30 dagen op rij" },
  { id: "streak60", icon: Flame, description: "60 dagen op rij" },
  { id: "streak90", icon: Flame, description: "90 dagen op rij" },
  { id: "streak120", icon: Flame, description: "120 dagen op rij" },
  { id: "verified", icon: BadgeCheck, description: "Geverifieerd account" },
  { id: "contributor", icon: Star, description: "Bijdrage aan een studie" },
  { id: "completed1", icon: BookOpen, description: "1 studie voltooid" },
  { id: "completed5", icon: BookOpen, description: "5 studies voltooid" },
  { id: "completed10", icon: BookOpen, description: "10 studies voltooid" },
  { id: "points100", icon: Trophy, description: "100 XP verdiend" },
  { id: "points500", icon: Trophy, description: "500 XP verdiend" },
  { id: "points1000", icon: Trophy, description: "1000 XP verdiend" },
  { id: "premium", icon: Crown, description: "Pro-abonnement" },
  { id: "invite", icon: Users, description: "Een vriend uitgenodigd" },
  { id: "commenter", icon: MessageCircle, description: "Een bericht geplaatst" },
  { id: "profilepic", icon: Camera, description: "Profielfoto ingesteld" },
  { id: "firstlesson", icon: CheckCircle, description: "Eerste les bestudeerd" },
  { id: "tester", icon: FlaskConical, description: "Bètatester" },
  { id: "anniversary", icon: Gift, description: "Één jaar lid" },
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
              <TooltipContent>{b.description}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
