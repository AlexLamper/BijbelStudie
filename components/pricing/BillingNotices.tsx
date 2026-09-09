"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AlertTriangle, CalendarClock, Loader2, PauseCircle, X } from "lucide-react"
import { annualSaving, effectivePerMonth, PLANS } from "../../lib/pricing"
import { track, trackNow } from "../../lib/analytics"

/**
 * Colours for the scene. These notices render on the dashboard, which is one
 * fixed full-bleed landscape - so the old pale tints (a 50%-opaque #FEE2E2 with
 * #111827 type) sat on a photograph and stopped being readable at the top of a
 * noon sky. Every value below is a literal white or a literal dark ground, and
 * every white label sits on a fill that clears 4.5:1.
 */
const TEAL_ON_DARK = "#2DD4BF"
const DANGER_TEXT = "#FCA5A5"
const DANGER_FILL = "#B91C1C"
const WARN_TEXT = "#FCD34D"
const WARN_FILL = "#92400E"
/** Any solid fill under white type: white on #0D9488 is 3.74:1, on this 5.5:1. */
const TEAL_DEEP = "#0F766E"

/** The shared shape of all three notices: a panel, on the scene. */
const NOTICE = "mb-5 flex items-start gap-3 rounded-xl p-4 backdrop-blur-md"

const ACTION =
  "press mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-md px-3.5 text-xs font-semibold text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"

interface BillingState {
  subscribed: boolean
  interval: string | null
  hasBillingIssue: boolean
  isPaused: boolean
  pausedUntil: string | null
  showAnnualUpsell: boolean
}

/**
 * The in-app billing surfaces, in priority order:
 *
 *  1. A failed payment. This is involuntary churn - the card expired, the user
 *     has no idea, and access disappears in a few days unless they act. It is
 *     the single most recoverable kind of loss, and it is invisible without a
 *     banner, so it outranks everything else on the page.
 *  2. A paused subscription, so the state is never a mystery.
 *  3. The monthly-to-annual offer, shown only to someone who has already stayed
 *     two months.
 *
 * Only one is ever rendered at a time; stacking them would train people to
 * dismiss the important one.
 *
 * Both figures in the third notice come from lib/pricing.ts and neither the
 * wording nor the comparison moved when this was restyled.
 */
export function BillingNotices() {
  const { data: session, status } = useSession()
  const [state, setState] = useState<BillingState | null>(null)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false

    const load = async () => {
      // Best-effort self-heal: refresh Stripe truth before reading local billing
      // state so a missed webhook is corrected on this page load.
      await fetch("/api/subscription/status").catch(() => null)
      const data = await fetch("/api/subscription/billing-state")
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
      if (!cancelled && data && !data.error) setState(data)
    }
    load()

    return () => { cancelled = true }
  }, [status, session])

  useEffect(() => {
    if (!state) return
    if (state.hasBillingIssue) track("billing_issue_shown")
    else if (state.showAnnualUpsell) track("annual_upsell_shown")
  }, [state])

  if (!state || dismissed) return null

  // ── 1. Failed payment ──────────────────────────────────────────
  if (state.hasBillingIssue) {
    const openPortal = async () => {
      setBusy(true)
      trackNow("billing_issue_resolved_click")
      try {
        const res = await fetch("/api/subscription/portal", { method: "POST" })
        const data = await res.json()
        if (data.url) window.location.assign(data.url)
        else setBusy(false)
      } catch {
        setBusy(false)
      }
    }

    return (
      <div className={NOTICE} style={{ backgroundColor: "rgba(69,10,10,0.72)", boxShadow: "inset 0 0 0 1px rgba(252,165,165,0.45)" }}>
        <AlertTriangle size={18} aria-hidden className="mt-0.5 flex-shrink-0" style={{ color: DANGER_TEXT }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Je betaling is niet gelukt
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/80">
            We konden je laatste betaling niet verwerken - meestal is de kaart verlopen.
            Werk je gegevens bij om je toegang te behouden.
          </p>
          <button onClick={openPortal} disabled={busy} className={ACTION} style={{ backgroundColor: DANGER_FILL }}>
            {busy ? <Loader2 size={12} aria-hidden className="animate-spin" /> : null}
            Betaalgegevens bijwerken
          </button>
        </div>
      </div>
    )
  }

  // ── 2. Paused ──────────────────────────────────────────────────
  if (state.isPaused) {
    const resumesAt = state.pausedUntil
      ? new Date(state.pausedUntil).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
      : null

    const resume = async () => {
      setBusy(true)
      try {
        await fetch("/api/subscription/pause", { method: "DELETE" })
        window.location.reload()
      } catch {
        setBusy(false)
      }
    }

    return (
      <div className={NOTICE} style={{ backgroundColor: "rgba(69,39,3,0.72)", boxShadow: "inset 0 0 0 1px rgba(253,230,138,0.4)" }}>
        <PauseCircle size={18} aria-hidden className="mt-0.5 flex-shrink-0" style={{ color: WARN_TEXT }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Je abonnement is gepauzeerd
          </p>
          <p className="mt-0.5 text-xs text-white/80">
            {resumesAt ? `Het hervat automatisch op ${resumesAt}.` : "Het hervat automatisch."}
          </p>
          <button onClick={resume} disabled={busy} className={ACTION} style={{ backgroundColor: WARN_FILL }}>
            {busy ? <Loader2 size={12} aria-hidden className="animate-spin" /> : null}
            Nu hervatten
          </button>
        </div>
      </div>
    )
  }

  // ── 3. Monthly → annual ────────────────────────────────────────
  if (state.showAnnualUpsell) {
    const accept = async () => {
      setBusy(true)
      try {
        const res = await fetch("/api/subscription/upgrade-annual", { method: "POST" })
        if (res.ok) window.location.reload()
        else setBusy(false)
      } catch {
        setBusy(false)
      }
    }

    const dismiss = async () => {
      setDismissed(true)
      trackNow("annual_upsell_dismissed")
      await fetch("/api/subscription/upgrade-annual", { method: "DELETE" }).catch(() => {})
    }

    return (
      <div className={`relative ${NOTICE}`} style={{ backgroundColor: "rgba(0,0,0,0.45)", boxShadow: "inset 0 0 0 1px rgba(45,212,191,0.35)" }}>
        <CalendarClock size={18} aria-hidden className="mt-0.5 flex-shrink-0" style={{ color: TEAL_ON_DARK }} />
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-semibold text-white">
            Stap over op jaarlijks en bespaar {annualSaving()}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/80">
            Je gebruikt BijbelStudie al een tijd. Op het jaarplan betaal je{" "}
            {effectivePerMonth(PLANS.annual)} per maand in plaats van{" "}
            {effectivePerMonth(PLANS.monthly)}. Wat je deze maand al betaald hebt,
            wordt verrekend.
          </p>
          <button onClick={accept} disabled={busy} className={ACTION} style={{ backgroundColor: TEAL_DEEP }}>
            {busy ? <Loader2 size={12} aria-hidden className="animate-spin" /> : null}
            Overstappen naar jaarlijks
          </button>
        </div>
        <button
          onClick={dismiss}
          aria-label="Sluiten"
          className="absolute right-3 top-3 rounded-md text-white/60 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    )
  }

  return null
}

export default BillingNotices
