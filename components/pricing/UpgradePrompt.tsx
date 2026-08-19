"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { PLANS, perWeek } from "../../lib/pricing"
import { track, trackNow } from "../../lib/analytics"

const TEAL = "#0D9488"

/** Which gated surface this prompt is standing in for. */
export type PaywallSurface = "commentary" | "ai_limit" | "original_text" | "plan_limit"

/** Maps a surface onto the `source` the pricing page reports in its funnel. */
const SOURCE_FOR: Record<PaywallSurface, string> = {
  commentary: "paywall_commentary",
  ai_limit: "paywall_ai",
  original_text: "paywall_commentary",
  plan_limit: "paywall_plan",
}

/**
 * The single upgrade prompt used at every gated surface.
 *
 * Two things it does that the hand-rolled blocks it replaces did not: it carries
 * the price, framed per week, so the ask is answered in place rather than one
 * navigation away; and it records which surface produced the impression and the
 * click, which is how the contextual paywalls get ranked against each other.
 */
export function UpgradePrompt({
  surface,
  title,
  body,
  cta = "Bekijk Pro",
  compact = false,
}: {
  surface: PaywallSurface
  title: string
  body: string
  cta?: string
  compact?: boolean
}) {
  const router = useRouter()
  const reported = useRef(false)

  // One impression per mount, not per render.
  useEffect(() => {
    if (reported.current) return
    reported.current = true
    track("paywall_hit", { surface })
  }, [surface])

  const handleClick = () => {
    trackNow("paywall_cta_clicked", { surface })
    router.push(`/abonnement?source=${SOURCE_FOR[surface]}`)
  }

  return (
    <div
      className={`max-w-[340px] mx-auto rounded-xl border border-gray-200 dark:border-border bg-gradient-to-br from-gray-50 to-white dark:from-card dark:to-background text-center shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <Sparkles className="h-5 w-5 mx-auto mb-2.5" style={{ color: TEAL }} />

      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1.5">
        {title}
      </h3>

      <p className="text-xs text-muted-foreground max-w-[260px] mx-auto leading-relaxed mb-3">
        {body}
      </p>

      {/* The price, answered here. The billed amount stays attached to the
          per-week figure wherever that figure appears. */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3.5">
        Vanaf{" "}
        <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {perWeek(PLANS.annual)}
        </span>{" "}
        per week
        <span className="block text-[11px] text-gray-400 mt-0.5">
          {PLANS.annual.billedLabel}
        </span>
      </p>

      <button
        onClick={handleClick}
        className="px-5 h-9 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: TEAL }}
      >
        {cta}
      </button>
    </div>
  )
}

export default UpgradePrompt
