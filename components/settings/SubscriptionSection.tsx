"use client"

import { useEffect, useState } from "react"
import { Loader2, CreditCard, PauseCircle, ArrowRight } from "lucide-react"
import { SkeletonBlock } from "../ui/skeletons"
import { PLANS, effectivePerMonth, annualSaving } from "../../lib/pricing"
import { track, trackNow } from "../../lib/analytics"

/**
 * Colours on a dark panel. Everything here is a literal, never a theme token:
 * the panel is dark in BOTH themes because the landscape behind it does not
 * flip with the reader's setting.
 */
/** The warning amber, lightened for a dark ground - #B45309 is unreadable here. */
const WARN = "#FCD34D"
/** The error red, likewise. The destructive BUTTON keeps its #B91C1C fill,
 *  where white type measures well over 4.5:1. */
const DANGER_TEXT = "#FCA5A5"
const DANGER_FILL = "#B91C1C"
/** The brand as an accent on dark. Never a fill under white type. */
/** The brand fill, for a glyph beside body type on a white card. */
const TEAL = "#0D9488"

/** A quiet bordered control on the scene, with a real focus ring. */
const GHOST_BUTTON =
  "press inline-flex h-9 items-center gap-1.5 rounded-btn border border-line px-3.5 text-[13px] font-semibold text-ink-body outline-none transition-colors hover:bg-line-soft disabled:opacity-60"

/**
 * One row of the settings page, repeated here so this panel's facts and its
 * one control sit at the same x as every other row on /instellingen.
 */
const ROW = "flex flex-col gap-2.5 py-4 first:pt-5 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8"

interface BillingState {
  /** ENTITLED, from any channel - Stripe, an app store, or an admin grant. */
  subscribed: boolean
  /** Which channel entitles them. Only "stripe" is billable from the website. */
  source: "stripe" | "apple" | "google" | "admin" | null
  /** Billed by us through Stripe. The portal, pause and cancel need this. */
  stripeSubscribed: boolean
  /** When an app-store entitlement lapses, if the store told us. */
  storeExpiresAt: string | null
  status: string | null
  interval: "monthly" | "annual" | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasBillingIssue: boolean
  isPaused: boolean
  pausedUntil: string | null
}

/** What to call the store an entitlement came from, in Dutch. */
const STORE_LABEL: Record<"apple" | "google", string> = {
  apple: "de App Store",
  google: "Google Play",
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
 *
 * Every amount on this surface comes from lib/pricing.ts and not one word of
 * the wording has ever moved when it was restyled: the billed label, the
 * effective monthly figure and the saving are all derived there, where the EU
 * price-indication rules are answered once.
 *
 * What this panel calls "subscribed" is the ENTITLEMENT, not the Stripe flag.
 * /api/subscription/billing-state used to answer with the raw `subscribed`
 * field, which only Stripe writes, so a reader who bought Pro in the app
 * (RevenueCat -> `storePremium`) or an admin/comped account was told here that
 * they had no active subscription while the navbar badge, /profiel and every
 * paywall in the app read them as Pro. The route resolves it with
 * `resolveIsPro` now - the same helper lib/authOptions and /api/v1/me use - and
 * reports the channel in `source`, which is what the branch below keys the
 * Stripe-only controls off.
 *
 * The layout pass that grouped /instellingen changed three things here and
 * nothing else: the plan and its date read as a labelled list in that page's
 * row rhythm instead of as a paragraph, the reason radios are a real
 * fieldset/legend in two columns rather than a loose <p> over six labels, and
 * the confirmation - the one destructive step on the page - is a marked block
 * at reading size rather than a stack of 12px type. Every string, every
 * handler and every endpoint is untouched.
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
      <div className="pt-5" role="status" aria-label="Abonnement laden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className={"h-3.5 w-52"} />
            <SkeletonBlock className={"h-3 w-36"} />
            <SkeletonBlock className={"h-3 w-44"} />
          </div>
          <SkeletonBlock className={"h-9 w-52 rounded-lg"} />
        </div>
        <div className="mt-5 border-t border-line-soft pt-4">
          <SkeletonBlock className={"h-3 w-40"} />
        </div>
      </div>
    )
  }

  if (!state?.subscribed) {
    return (
      <div className="content-in pt-5">
        <p className="text-[13.5px] text-ink-muted">
          Je hebt op dit moment geen actief abonnement.
        </p>
        <a
          href="/abonnement?source=nav"
          className={"mt-4 inline-flex h-10 items-center justify-center rounded-btn bg-teal px-4 text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90"}
        >
          Bekijk Pro <ArrowRight size={13} aria-hidden />
        </a>
      </div>
    )
  }

  /* Pro, but not through us.
     `subscribed` above is the entitlement; everything below this point is the
     Stripe subscription we bill, pause and cancel. An account that is Pro
     through an app store or an admin grant has none of that, so it gets the
     facts and no controls it cannot use - offering the Stripe portal to an App
     Store subscriber opens a customer record with no subscription in it, and
     "Abonnement opzeggen" would cancel nothing while looking like it had.
     Gated on `stripeSubscribed`, not on `source`: an account that somehow has
     both must keep its exit from the one it actually pays for. */
  if (!state.stripeSubscribed) {
    const store = state.source === "apple" || state.source === "google" ? state.source : null

    return (
      <div className="content-in pt-5">
        <p className="text-[14.5px] font-semibold text-ink">
          {store
            ? `BijbelStudie Pro · via ${STORE_LABEL[store]}`
            : "BijbelStudie Pro · via je account"}
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
          {store
            ? `Je Pro-toegang komt uit je aankoop in de app. Verlengen, wijzigen en opzeggen doe je daarom in ${STORE_LABEL[store]}, niet hier.`
            : "Je hebt volledige toegang tot alle Pro-functies. Er is geen betaald abonnement aan dit account gekoppeld, dus er wordt ook niets afgeschreven."}
        </p>
        {store && state.storeExpiresAt && (
          <p className="mt-1.5 text-[12px] text-ink-faint">
            Loopt door tot {formatDate(state.storeExpiresAt)}
          </p>
        )}
      </div>
    )
  }

  const plan = state.interval === "annual" ? PLANS.annual : PLANS.monthly

  return (
    <div className="content-in">
      {/* What you have now. The lines and their wording are untouched - only
          the row they sit in changed, so the plan reads on the left and its one
          control ends at the same right edge as every other control on the
          page. */}
      <div className={ROW}>
        <div className="min-w-0 sm:max-w-[26rem]">
          <p className="text-[14.5px] font-semibold text-ink">
            BijbelStudie Pro · {state.interval === "annual" ? "Jaarlijks" : "Maandelijks"}
          </p>
          <p className="mt-1 text-[12px] text-ink-faint">{plan.billedLabel}</p>
          {state.cancelAtPeriodEnd ? (
            <p className="mt-1 text-xs" style={{ color: WARN }}>
              Loopt af op {formatDate(state.currentPeriodEnd)}
            </p>
          ) : state.currentPeriodEnd ? (
            <p className="mt-1 text-[12px] text-ink-faint">
              Volgende verlenging op {formatDate(state.currentPeriodEnd)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-shrink-0 items-center sm:justify-end">
          <button onClick={openPortal} disabled={busy} className={GHOST_BUTTON}>
            <CreditCard size={13} aria-hidden /> Facturen en betaalgegevens
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-xs" style={{ color: DANGER_TEXT }}>{error}</p>
      )}

      {/* Cancellation. Stays available while paused: a paused subscriber must
          be able to end the subscription outright without going to Stripe. */}
      {!state.cancelAtPeriodEnd && (
        <div className="border-t border-line-soft pt-4">
          {stage === "idle" && (
            <button
              onClick={() => { setStage("confirm"); track("cancel_flow_opened") }}
              className="text-[12px] text-ink-muted underline underline-offset-4 transition-colors hover:text-ink-body"
            >
              Abonnement opzeggen
            </button>
          )}

          {/* The one destructive step on this page, so it is marked as its own
              block on a darker ground and set at reading size rather than at
              12px. Not one word of it moved. */}
          {stage === "confirm" && (
            <div className="space-y-5 rounded-[12px] border border-line bg-sunken p-4 sm:p-5">
              <div>
                <p className="text-[15.5px] font-semibold text-ink">Abonnement opzeggen</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
                  De opzegging gaat in aan het einde van de huidige periode. Tot{" "}
                  {formatDate(state.currentPeriodEnd)} houd je toegang tot Pro, daarna wordt er
                  niets meer afgeschreven. Je notities en voortgang blijven bewaard.
                </p>
              </div>

              {/* Optional, and labelled as such. Requiring feedback would make
                  cancelling harder than subscribing, which is what the rules
                  forbid; the answer rate matters less than the exit staying
                  open. A real fieldset/legend, so the six radios are one named
                  group instead of six unrelated controls under a paragraph. */}
              <fieldset className="min-w-0" style={{ colorScheme: "dark" }}>
                <legend className="text-[12px] font-medium text-ink-muted">
                  Wil je ons vertellen waarom? (optioneel)
                </legend>
                <div className="mt-2 grid gap-y-1.5 sm:grid-cols-2 sm:gap-x-6">
                  {REASONS.map(r => (
                    <label key={r.value} className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink-body">
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-[#2DD4BF]"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value.slice(0, 1000))}
                placeholder="Wil je er iets aan toevoegen? (optioneel)"
                aria-label="Toelichting bij het opzeggen"
                rows={3}
                className="w-full rounded-btn border border-line bg-white p-2.5 text-[13.5px] text-ink placeholder:text-ink-faint outline-none transition-colors focus-visible:border-teal"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={confirmCancel}
                  disabled={busy}
                  className="press inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[14.5px] font-semibold text-ink outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                  style={{ backgroundColor: DANGER_FILL }}
                >
                  {busy && <Loader2 size={14} aria-hidden className="animate-spin" />}
                  Definitief opzeggen
                </button>
                <button
                  onClick={() => setStage("idle")}
                  className="inline-flex h-10 items-center rounded-btn px-3 text-[13.5px] font-semibold text-ink-muted outline-none transition-colors hover:bg-line-soft hover:text-ink-body"
                >
                  Toch niet
                </button>
              </div>

              {/* Save offer, beside the exit rather than in front of it, and
                  deliberately styled quieter than the cancel button. */}
              {!state.isPaused && (
                <div className="space-y-3 border-t border-line-soft pt-4">
                  <div className="flex items-start gap-2.5">
                    <PauseCircle size={16} aria-hidden className="mt-0.5 flex-shrink-0" style={{ color: TEAL }} />
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold text-ink">Liever even pauzeren?</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">
                        Je betaalt tijdens de pauze niets en je gegevens, notities en voortgang
                        blijven bewaard. Het abonnement hervat daarna vanzelf.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map(m => (
                      <button key={m} onClick={() => pause(m)} disabled={busy} className={GHOST_BUTTON}>
                        {m} {m === 1 ? "maand" : "maanden"} pauzeren
                      </button>
                    ))}
                  </div>

                  {state.interval === "monthly" && (
                    <p className="text-[12px] text-ink-muted">
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
        <p className="mt-4 text-[13.5px] text-ink-muted">
          Je abonnement is opgezegd. Je houdt toegang tot{" "}
          {formatDate(state.currentPeriodEnd)}.
        </p>
      )}
    </div>
  )
}

export default SubscriptionSection
