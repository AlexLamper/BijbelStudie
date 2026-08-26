"use client"

import { useEffect, useState } from "react"
import { Loader2, CreditCard, PauseCircle, ArrowRight } from "lucide-react"
import { SkeletonBlock } from "../ui/skeletons"
import { PLANS, effectivePerMonth, annualSaving } from "../../lib/pricing"
import { track, trackNow } from "../../lib/analytics"

const TEAL = "#0D9488"

interface BillingState {
  subscribed: boolean
  status: string | null
  interval: "monthly" | "annual" | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasBillingIssue: boolean
  isPaused: boolean
  pausedUntil: string | null
}

const REASONS: { value: string; label: string }[] = [
  { value: "too_expensive",      label: "Te duur" },
  { value: "not_using",          label: "Ik gebruik het te weinig" },
  { value: "missing_features",   label: "Ik mis functies" },
  { value: "technical_problems", label: "Technische problemen" },
  { value: "temporary_break",    label: "Ik neem even pauze" },
  { value: "other",              label: "Anders" },
]

function formatDate(value: string | null): string {
  if (!value) return ""
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric", month: "long", year: "numeric",
  })
}

/**
 * Subscription management. The cancel API existed but nothing in the app ever
 * called it, so the only way to stop paying was to contact support - which
 * reads as a dark pattern and generates chargebacks.
 *
 * Cancelling is two clicks and nothing gates it: Dutch and EU consumer rules
 * require ending a subscription to be no harder than starting one. The pause
 * offer and the reason question sit next to the cancel button rather than in
 * front of it - they are retention mechanisms, not steps in the flow - and the
 * reason is explicitly optional. A paused subscriber can cancel too; hiding the
 * button from them left the portal as their only exit.
 */
export function SubscriptionSection() {
  const [state, setState] = useState<BillingState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState<"idle" | "confirm" | "done">("idle")
  const [reason, setReason] = useState<string>("")
  const [feedback, setFeedback] = useState("")
  const [error, setError] = useState("")

  const load = () => {
    // Best-effort reconcile first, then read local billing snapshot.
    fetch("/api/subscription/status")
      .catch(() => null)
      .then(() => fetch("/api/subscription/billing-state"))
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && !d.error) setState(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openPortal = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/subscription/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) window.location.assign(data.url)
      else { setError(data.error || "Kon het portaal niet openen"); setBusy(false) }
    } catch {
      setError("Kon het portaal niet openen")
      setBusy(false)
    }
  }

  const pause = async (months: number) => {
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/subscription/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || "Pauzeren mislukt")
      trackNow("subscription_paused", { months: String(months) })
      setStage("idle")
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pauzeren mislukt")
    } finally {
      setBusy(false)
    }
  }

  const confirmCancel = async () => {
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, feedback }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || "Opzeggen mislukt")
      setStage("done")
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opzeggen mislukt")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5" role="status" aria-label="Abonnement laden">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <SkeletonBlock className="h-3.5 w-52" />
            <SkeletonBlock className="h-3 w-36" />
            <SkeletonBlock className="h-3 w-44" />
          </div>
          <SkeletonBlock className="h-9 w-52 rounded-lg" />
        </div>
        <div className="pt-4 border-t border-gray-100 dark:border-border">
          <SkeletonBlock className="h-3 w-40" />
        </div>
      </div>
    )
  }

  if (!state?.subscribed) {
    return (
      <div className="content-in space-y-3">
        <p className="text-sm text-muted-foreground">
          Je hebt op dit moment geen actief abonnement.
        </p>
        <a
          href="/abonnement?source=nav"
          className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold text-white no-underline"
          style={{ backgroundColor: TEAL }}
        >
          Bekijk Pro <ArrowRight size={13} />
        </a>
      </div>
    )
  }

  const plan = state.interval === "annual" ? PLANS.annual : PLANS.monthly

  return (
    <div className="content-in space-y-5">
      {/* Current plan */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">
            BijbelStudie Pro · {state.interval === "annual" ? "Jaarlijks" : "Maandelijks"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{plan.billedLabel}</p>
          {state.cancelAtPeriodEnd ? (
            <p className="text-xs mt-1" style={{ color: "#B45309" }}>
              Loopt af op {formatDate(state.currentPeriodEnd)}
            </p>
          ) : state.currentPeriodEnd ? (
            <p className="text-xs text-muted-foreground mt-1">
              Volgende verlenging op {formatDate(state.currentPeriodEnd)}
            </p>
          ) : null}
        </div>

        <button
          onClick={openPortal}
          disabled={busy}
          className="press inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-xs font-semibold border border-border text-foreground disabled:opacity-60"
        >
          <CreditCard size={13} /> Facturen en betaalgegevens
        </button>
      </div>

      {error && <p className="text-xs" style={{ color: "#B91C1C" }}>{error}</p>}

      {/* Cancellation. Stays available while paused: a paused subscriber must
          be able to end the subscription outright without going to Stripe. */}
      {!state.cancelAtPeriodEnd && (
        <div className="pt-4 border-t border-gray-100 dark:border-border">
          {stage === "idle" && (
            <button
              onClick={() => { setStage("confirm"); track("cancel_flow_opened") }}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Abonnement opzeggen
            </button>
          )}

          {stage === "confirm" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Abonnement opzeggen</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  De opzegging gaat in aan het einde van de huidige periode. Tot{" "}
                  {formatDate(state.currentPeriodEnd)} houd je toegang tot Pro, daarna wordt er
                  niets meer afgeschreven. Je notities en voortgang blijven bewaard.
                </p>
              </div>

              {/* Optional, and labelled as such. Requiring feedback would make
                  cancelling harder than subscribing, which is what the rules
                  forbid; the answer rate matters less than the exit staying open. */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Wil je ons vertellen waarom? (optioneel)
                </p>
                {REASONS.map(r => (
                  <label key={r.value} className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-[#0D9488]"
                    />
                    {r.label}
                  </label>
                ))}
              </div>

              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value.slice(0, 1000))}
                placeholder="Wil je er iets aan toevoegen? (optioneel)"
                rows={3}
                className="w-full rounded-lg border border-border bg-white dark:bg-secondary/40 p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
              />

              <div className="flex gap-2 items-center flex-wrap">
                <button
                  onClick={confirmCancel}
                  disabled={busy}
                  className="press inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#B91C1C" }}
                >
                  {busy && <Loader2 size={12} className="animate-spin" />}
                  Definitief opzeggen
                </button>
                <button
                  onClick={() => setStage("idle")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Toch niet
                </button>
              </div>

              {/* Save offer, beside the exit rather than in front of it, and
                  deliberately styled quieter than the cancel button. */}
              {!state.isPaused && (
                <div className="pt-3.5 border-t border-gray-100 dark:border-border space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <PauseCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: TEAL }} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Liever even pauzeren?</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Je betaalt tijdens de pauze niets en je gegevens, notities en voortgang
                        blijven bewaard. Het abonnement hervat daarna vanzelf.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3].map(m => (
                      <button
                        key={m}
                        onClick={() => pause(m)}
                        disabled={busy}
                        className="px-3.5 h-9 rounded-lg text-xs font-semibold border border-border text-foreground disabled:opacity-60"
                      >
                        {m} {m === 1 ? "maand" : "maanden"} pauzeren
                      </button>
                    ))}
                  </div>

                  {state.interval === "monthly" && (
                    <p className="text-xs text-muted-foreground">
                      Te duur? Op het jaarplan betaal je {effectivePerMonth(PLANS.annual)} per maand
                      en bespaar je {annualSaving()} per jaar.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Outside the block above on purpose: the reload after cancelling flips
          cancelAtPeriodEnd, which used to unmount this confirmation unread. */}
      {stage === "done" && (
        <p className="text-sm text-muted-foreground">
          Je abonnement is opgezegd. Je houdt toegang tot{" "}
          {formatDate(state.currentPeriodEnd)}.
        </p>
      )}
    </div>
  )
}

export default SubscriptionSection
