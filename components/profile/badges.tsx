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

const badges: BadgeInfo[] = [
  { id: "streak30", icon: Flame, description: "30 day streak" },
  { id: "streak60", icon: Flame, description: "60 day streak" },
  { id: "streak90", icon: Flame, description: "90 day streak" },
  { id: "streak120", icon: Flame, description: "120 day streak" },
  { id: "verified", icon: BadgeCheck, description: "Verified user" },
  { id: "contributor", icon: Star, description: "Course contributor" },
  { id: "completed1", icon: BookOpen, description: "Complete 1 course" },
  { id: "completed5", icon: BookOpen, description: "Complete 5 courses" },
  { id: "completed10", icon: BookOpen, description: "Complete 10 courses" },
  { id: "points100", icon: Trophy, description: "Earn 100 quiz points" },
  { id: "points500", icon: Trophy, description: "Earn 500 quiz points" },
  { id: "points1000", icon: Trophy, description: "Earn 1000 quiz points" },
  { id: "premium", icon: Crown, description: "Premium subscriber" },
  { id: "invite", icon: Users, description: "Invite a friend" },
  { id: "commenter", icon: MessageCircle, description: "Post a comment" },
  { id: "profilepic", icon: Camera, description: "Upload a profile picture" },
  { id: "firstlesson", icon: CheckCircle, description: "Complete first lesson" },
  { id: "tester", icon: FlaskConical, description: "Beta tester" },
  { id: "anniversary", icon: Gift, description: "One year anniversary" },
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
