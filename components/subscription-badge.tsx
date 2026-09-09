import { ProBadge } from "./ui/ProBadge"

interface SubscriptionBadgeProps {
  isSubscribed: boolean
  className?: string
}

/** The Pro marker next to the account in the header. Gold, like everywhere else. */
export function SubscriptionBadge({ isSubscribed, className }: SubscriptionBadgeProps) {
  if (!isSubscribed) return null

  return <ProBadge className={className} />
}
