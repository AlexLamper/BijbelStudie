import { Crown, Sparkles, ShieldCheck } from "lucide-react"
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
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
          <Crown size={14} style={{ color: "#0D9488" }} />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-foreground">Abonnement</p>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#7C3AED" }}>
              <ShieldCheck size={10} /> Admin
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {subscribed || isAdmin ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0D9488" }}>
                <Sparkles size={11} />
                {isAdmin ? "Admin toegang" : "Pro actief"}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-muted-foreground leading-relaxed">
              {isAdmin
                ? "Als admin heb je toegang tot alle Pro-functies zonder abonnement."
                : "Je hebt een actief Pro-abonnement. Geniet van alle premium functies."}
            </p>
            {stripeSubscriptionId && !isAdmin && (
              <p className="text-xs text-gray-400 dark:text-muted-foreground font-mono">
                ID: {stripeSubscriptionId}
              </p>
            )}
            {!isAdmin && (
              <Link
                href="/abonnement"
                className="inline-flex items-center text-xs font-semibold mt-1"
                style={{ color: "#0D9488" }}>
                Beheer abonnement →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-muted-foreground leading-relaxed">
              Upgrade naar Pro voor commentaren, historische context en meer studiehulpmiddelen.
            </p>
            <Link
              href="/abonnement"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0D9488" }}>
              <Sparkles size={14} />
              Upgrade naar Pro
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
