import { Button } from "../../components/ui/button"
import { Crown, ShieldCheck } from "lucide-react"
import Link from "next/link"

interface SubscriptionStatusProps {
  userId: string
  subscribed?: boolean
  stripeSubscriptionId?: string
  isAdmin?: boolean
}

export function SubscriptionStatus({
  subscribed = false,
  stripeSubscriptionId,
  isAdmin = false,
}: SubscriptionStatusProps) {
  return (
    <div className="shadow-lg border dark:border-none dark:shadow-gray-900/20 bg-white dark:bg-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-merriweather text-lg font-bold text-foreground">
            Subscription Status
          </h2>
          {isAdmin && (
            <span className="text-xs px-2 py-1 bg-purple-600 text-white flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              <span>Admin</span>
            </span>
          )}
        </div>
      </div>
      <div className="p-6">
        {subscribed ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-amber-500 text-white flex items-center gap-1">
                <Crown className="h-3 w-3" />
                <span>Premium</span>
              </span>
              <span className="font-inter text-sm text-muted-foreground">Active</span>
            </div>
            <p className="font-inter text-sm text-gray-900 dark:text-gray-100">
              You have an active premium subscription. Enjoy access to all premium courses and features!
            </p>
            <div className="font-inter text-xs text-gray-500">
              {stripeSubscriptionId && <p>Subscription ID: {stripeSubscriptionId}</p>}
            </div>
            <Link href={`/account/billing`}>
              <Button variant="outline" className="w-full mt-4 border-border text-foreground hover:bg-accent">
                Manage Subscription
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-inter text-sm text-gray-900 dark:text-gray-100">
              {isAdmin
                ? "As an admin, you have access to all premium content without a subscription."
                : "Upgrade to premium to access exclusive courses and features."}
            </p>
            {!isAdmin && (
              <Link href={`/subscribe`}>
                <Button className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg">Upgrade to Premium</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

