"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AlertTriangle, CalendarClock, Loader2, PauseCircle, X } from "lucide-react"
import { annualSaving, effectivePerMonth, PLANS } from "../../lib/pricing"
import { track, trackNow } from "../../lib/analytics"

const TEAL = "#0D9488"

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
 */
export function BillingNotices() {
  const { data: session, status } = useSession()
  const [state, setState] = useState<BillingState | null>(null)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false

    fetch("/api/subscription/billing-state")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d && !d.error) setState(d) })
      .catch(() => {})

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
      <div className="rounded-xl border p-4 mb-5 flex items-start gap-3"
        style={{ borderColor: "#FCA5A5", backgroundColor: "rgba(254,226,226,0.5)" }}>
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#B91C1C" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Je betaling is niet gelukt
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
            We konden je laatste betaling niet verwerken - meestal is de kaart verlopen.
            Werk je gegevens bij om je toegang te behouden.
          </p>
          <button
            onClick={openPortal}
            disabled={busy}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-md text-xs font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#B91C1C" }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : null}
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
      <div className="rounded-xl border p-4 mb-5 flex items-start gap-3"
        style={{ borderColor: "#FDE68A", backgroundColor: "rgba(254,243,199,0.5)" }}>
        <PauseCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#92400E" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Je abonnement is gepauzeerd
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {resumesAt ? `Het hervat automatisch op ${resumesAt}.` : "Het hervat automatisch."}
          </p>
          <button
            onClick={resume}
            disabled={busy}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-md text-xs font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#92400E" }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : null}
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
      <div className="relative rounded-xl border p-4 mb-5 flex items-start gap-3"
        style={{ borderColor: "rgba(13,148,136,0.3)", backgroundColor: "rgba(13,148,136,0.05)" }}>
        <CalendarClock size={18} className="flex-shrink-0 mt-0.5" style={{ color: TEAL }} />
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Stap over op jaarlijks en bespaar {annualSaving()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
            Je gebruikt BijbelStudie al een tijd. Op het jaarplan betaal je{" "}
            {effectivePerMonth(PLANS.annual)} per maand in plaats van{" "}
            {effectivePerMonth(PLANS.monthly)}. Wat je deze maand al betaald hebt,
            wordt verrekend.
          </p>
          <button
            onClick={accept}
            disabled={busy}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-md text-xs font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: TEAL }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : null}
            Overstappen naar jaarlijks
          </button>
        </div>
        <button
          onClick={dismiss}
          aria-label="Sluiten"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return null
}

export default BillingNotices
