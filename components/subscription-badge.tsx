import { Crown } from "lucide-react"
import { cn } from "../lib/utils"

interface SubscriptionBadgeProps {
  isSubscribed: boolean
  className?: string
}

export function SubscriptionBadge({ isSubscribed, className }: SubscriptionBadgeProps) {
  if (!isSubscribed) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        "bg-[rgba(13,148,136,0.1)] text-[#0F766E] dark:bg-[rgba(13,148,136,0.18)] dark:text-[#2DD4BF]",
        className,
      )}
    >
      <Crown className="h-3 w-3" />
      Pro
    </span>
  )
}
