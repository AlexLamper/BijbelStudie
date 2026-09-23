"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { PLANS, perWeek } from "../../lib/pricing"
import { track, trackNow } from "../../lib/analytics"
import { openProOffer } from "../../lib/proOffer"
import type { SerialisedPrompt } from "../../lib/feedbackPrompts"
import PromptCard from "../feedback/PromptCard"

/** Which gated surface this prompt is standing in for. */
export type PaywallSurface = "commentary" | "ai_limit" | "original_text" | "plan_limit"

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
  const pathname = usePathname()
  const reported = useRef(false)
  const [declined, setDeclined] = useState(false)
  const [whyPrompt, setWhyPrompt] = useState<SerialisedPrompt | null>(null)
  // Never inside the immersive /studie flow: a question there interrupts reading.
  const canAskWhy = !pathname?.startsWith("/studie")

  // One impression per mount, not per render.
  useEffect(() => {
    if (reported.current) return
    reported.current = true
    track("paywall_hit", { surface })
  }, [surface])

  /**
   * "Niet nu": asks "Wat houdt je tegen?" once per reader, ever (the
   * w1_paywall_reason budget in lib/feedbackPrompts.ts). The server decides;
   * a guest or an already-asked reader simply gets nothing back.
   */
  const handleDecline = () => {
    setDeclined(true)
    const params = new URLSearchParams({ touchpoint: "paywall_dismiss", path: pathname || "" })
    void fetch(`/api/feedback/next?${params.toString()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.prompt) setWhyPrompt(data.prompt as SerialisedPrompt)
      })
      .catch(() => {})
  }

  // The Pro offer dialog (components/pricing/ProOfferDialog.tsx), not a trip
  // to /abonnement: the trial, the plans and the checkout are one step away
  // from the thing the reader was looking at, and they land back on it if they
  // decline.
  const handleClick = () => {
    trackNow("paywall_cta_clicked", { surface })
    openProOffer({ surface, reason: body })
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

      {canAskWhy && !declined && (
        <button
          type="button"
          onClick={handleDecline}
          className="mt-2 block w-full text-[12px] font-semibold text-ink-muted hover:underline"
        >
          Niet nu
        </button>
      )}

      {whyPrompt && (
        <div className="text-left">
          <PromptCard prompt={whyPrompt} tone="light" context={{ path: pathname }} />
        </div>
      )}
    </div>
  )
}

export default UpgradePrompt
