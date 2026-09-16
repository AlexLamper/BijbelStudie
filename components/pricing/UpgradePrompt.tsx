"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { PLANS, perWeek } from "../../lib/pricing"
import { track, trackNow } from "../../lib/analytics"

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
 *
 * Same card as everywhere else in kit/primitives.tsx - `rounded-card
 * border-line bg-surface`, no gradient - and `bg-teal` for the CTA, the same
 * fill /dashboard's own primary button and MembershipPanel's "Upgrade naar
 * Pro" button use.
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
      className={`mx-auto max-w-[340px] rounded-card border border-line bg-surface text-center ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <h3 className="mb-1.5 text-sm font-semibold text-ink">
        {title}
      </h3>

      <p className="mx-auto mb-3 max-w-[260px] text-xs leading-relaxed text-ink-muted">
        {body}
      </p>

      {/* The price, answered here. The billed amount stays attached to the
          per-week figure wherever that figure appears. */}
      <p className="mb-3.5 text-xs text-ink-muted">
        Vanaf{" "}
        <span className="font-bold text-ink tabular-nums">
          {perWeek(PLANS.annual)}
        </span>{" "}
        per week
        <span className="mt-0.5 block text-[11px] text-ink-faint">
          {PLANS.annual.billedLabel}
        </span>
      </p>

      <button
        onClick={handleClick}
        className="h-9 max-md:h-10 rounded-btn bg-teal px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {cta}
      </button>
    </div>
  )
}

export default UpgradePrompt
