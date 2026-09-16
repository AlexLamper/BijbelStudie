"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AlertTriangle, CalendarClock, Loader2, PauseCircle, X } from "lucide-react"
import { annualSaving, effectivePerMonth, PLANS } from "../../lib/pricing"
import { track, trackNow } from "../../lib/analytics"

/**
 * These notices render at the top of /dashboard, which is the ordinary light
 * AppShell page - not the full-bleed scene it once was. So each notice is a
 * card in the app's own vocabulary (`rounded-card`, `border-line`, the
 * `ink-*` text scale from kit/primitives.tsx), tinted with a literal status
 * colour rather than the old dark, translucent, white-on-photograph panel.
 *
 * `--danger` (#DC2626) and `--warn` (#EA580C) are the same literals
 * app/globals.css documents as reading the same on either ground; the tint
 * behind them and the icon get an explicit dark: step for the same reason
 * components/study/flow/PassageReader.tsx pairs `text-danger` with
 * `dark:text-red-400` - a hairline safer on a near-black surface than the
 * bare literal alone.
 */
const NOTICE = "mb-5 flex items-start gap-3 rounded-card border p-4"

const ACTION =
  "press mt-2.5 inline-flex h-8 max-md:h-10 items-center gap-1.5 rounded-btn px-3.5 text-xs max-md:text-sm font-semibold text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60"

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
      <div className={`${NOTICE} border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30`}>
        <AlertTriangle size={18} aria-hidden className="mt-0.5 flex-shrink-0 text-danger dark:text-red-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Je betaling is niet gelukt
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
            We konden je laatste betaling niet verwerken - meestal is de kaart verlopen.
            Werk je gegevens bij om je toegang te behouden.
          </p>
          <button onClick={openPortal} disabled={busy} className={ACTION} style={{ backgroundColor: "#DC2626" }}>
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
      <div className={`${NOTICE} border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30`}>
        <PauseCircle size={18} aria-hidden className="mt-0.5 flex-shrink-0 text-warn dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Je abonnement is gepauzeerd
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {resumesAt ? `Het hervat automatisch op ${resumesAt}.` : "Het hervat automatisch."}
          </p>
          <button onClick={resume} disabled={busy} className={ACTION} style={{ backgroundColor: "#EA580C" }}>
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
      <div className={`relative ${NOTICE} border-line bg-teal-faint`}>
        <CalendarClock size={18} aria-hidden className="mt-0.5 flex-shrink-0 text-teal-dark dark:text-teal-400" />
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-semibold text-ink">
            Stap over op jaarlijks en bespaar {annualSaving()}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
            Je gebruikt BijbelStudie al een tijd. Op het jaarplan betaal je{" "}
            {effectivePerMonth(PLANS.annual)} per maand in plaats van{" "}
            {effectivePerMonth(PLANS.monthly)}. Wat je deze maand al betaald hebt,
            wordt verrekend.
          </p>
          <button onClick={accept} disabled={busy} className={ACTION} style={{ backgroundColor: "#0F766E" }}>
            {busy ? <Loader2 size={12} aria-hidden className="animate-spin" /> : null}
            Overstappen naar jaarlijks
          </button>
        </div>
        <button
          onClick={dismiss}
          aria-label="Sluiten"
          className="absolute right-3 top-3 max-md:right-1 max-md:top-1 max-md:flex max-md:h-10 max-md:w-10 max-md:items-center max-md:justify-center rounded-btn text-ink-faint outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    )
  }

  return null
}

export default BillingNotices
