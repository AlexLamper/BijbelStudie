"use client"

/**
 * The interactive half of /abonnement: the trial notice, the three plan cards
 * and the checkout they start. Moved out of page.tsx unchanged in behaviour -
 * the checkout call, the sign-up redirect and the `?plan=` resume are the same
 * code as before; the trial notice now follows /api/trial instead of the old
 * one-week-on, one-week-off promo window.
 *
 * Everything static (the heading, the comparison, the FAQ) now lives in
 * page.tsx as server components, so it is in the HTML for every visitor and
 * crawler, is not hidden behind the skeleton while a signed-in session is
 * checked, and is not shipped again as client JavaScript.
 */

import { ArrowRight, Check, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect, useCallback } from "react"
import { useToast } from "../../hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import {
  PLANS,
  PRO_FEATURES,
  annualDiscountPercent,
  annualSaving,
  effectivePerMonth,
  perWeek,
  type BillingInterval,
} from "../../lib/pricing"
import { PRO_TRIAL_DAYS } from "../../lib/promo"
import { FREE_AI_DAILY_CAP } from "../../lib/entitlements"
import { signupForCheckoutHref, startCheckout as requestCheckout } from "../../lib/startCheckout"
import { track, trackNow } from "../../lib/analytics"
import { Card, Skeleton } from "../../components/kit/primitives"

/** The four free-tier lines. Only "Bijbelstudie Pro" writes copy that touches
 *  price or entitlement, so this list lives beside PRO_FEATURES rather than in
 *  lib/pricing.ts, which is about what Pro unlocks, not what free already has.
 *
 *  "Commentaren: eerste alinea" was replaced: KingComments is free in full
 *  (lib/proContent.ts `isAlwaysFreeCommentary`), and the line undersold it.
 *  The per-feature detail, including the notes limit, is in the comparison
 *  table under the cards (app/abonnement/content.ts). */
const FREE_FEATURES = [
  "Bijbeltekst in alle vertalingen",
  "Alle begeleide studies",
  "KingComments volledig",
  `${FREE_AI_DAILY_CAP} AI-vragen per dag`,
]

function FreeCard({ isPro }: { isPro: boolean }) {
  return (
    <Card className="flex flex-col self-center px-[22px] py-6">
      <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-ink-faint">Gratis</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[32px] font-bold tracking-[-0.8px] text-ink">€0</span>
        <span className="text-[13.5px] text-ink-muted">voor altijd</span>
      </div>
      <p className="mt-1 text-[12.5px] text-ink-faint">Wat je nu al hebt</p>
      <ul className="mt-[18px] flex-1 space-y-[11px]">
        {FREE_FEATURES.map(f => (
          <li key={f} className="flex items-start gap-2 text-[13.5px] text-ink-body">
            <Check size={16} strokeWidth={2.2} aria-hidden className="mt-[1px] flex-shrink-0 text-ink-faint" />
            {f}
          </li>
        ))}
      </ul>
      {!isPro && (
        <button
          disabled
          className="mt-[18px] flex h-[42px] w-full items-center justify-center rounded-btn border border-line text-[13.5px] font-semibold text-ink-faint"
        >
          Huidig plan
        </button>
      )}
    </Card>
  )
}

function AnnualCard({
  busy,
  isCurrent,
  isOtherPro,
  onSelect,
}: {
  busy: boolean
  isCurrent: boolean
  isOtherPro: boolean
  onSelect: () => void
}) {
  const plan = PLANS.annual
  return (
    <Card className="relative flex flex-col px-[26px] py-7" style={{ borderColor: "#0D9488", borderWidth: 2 }}>
      <div className="absolute -top-[13px] left-1/2 -translate-x-1/2">
        <span className="whitespace-nowrap rounded-full bg-teal px-[13px] py-[5px] text-[12px] font-bold text-white">
          Meest gekozen
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-teal-dark">Pro · Jaarlijks</p>
        <span className="whitespace-nowrap rounded-full bg-teal-soft px-2 py-[2px] text-[11px] font-bold text-teal-dark">
          {annualDiscountPercent()}% goedkoper
        </span>
      </div>

      <div className="mt-[10px] flex items-baseline gap-1.5">
        <span className="text-[42px] font-bold leading-none tracking-[-1.2px] text-ink tabular-nums">
          {perWeek(plan)}
        </span>
        <span className="text-[14px] text-ink-muted">per week</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-[1.5] text-ink-muted">
        {plan.billedLabel} · {effectivePerMonth(plan)} per maand
      </p>
      <p className="mt-[2px] text-[12.5px] font-semibold text-teal-dark">
        Je bespaart {annualSaving()} per jaar
      </p>

      <ul className="mt-5 flex-1 space-y-3">
        {PRO_FEATURES.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink">
            <Check size={16} strokeWidth={2.2} aria-hidden className="mt-[2px] flex-shrink-0 text-teal" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={busy || isCurrent}
        className="press mt-5 flex h-[46px] w-full items-center justify-center gap-2 rounded-btn bg-teal text-[14.5px] font-semibold text-white outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={16} aria-hidden className="animate-spin" />
        ) : isCurrent ? (
          "Huidig plan"
        ) : isOtherPro ? (
          <>
            Wissel naar jaarlijks
            <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
          </>
        ) : (
          <>
            Start met Pro
            <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
          </>
        )}
      </button>
      <p className="mt-[9px] text-center text-[12px] text-ink-faint">
        Altijd opzegbaar · Geen verborgen kosten
      </p>
    </Card>
  )
}

function MonthlyCard({
  busy,
  isCurrent,
  isOtherPro,
  onSelect,
}: {
  busy: boolean
  isCurrent: boolean
  isOtherPro: boolean
  onSelect: () => void
}) {
  const plan = PLANS.monthly
  return (
    <Card className="flex flex-col self-center px-[22px] py-6">
      <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-ink-faint">Pro · Maandelijks</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[32px] font-bold tracking-[-0.8px] text-ink tabular-nums">{perWeek(plan)}</span>
        <span className="text-[13.5px] text-ink-muted">per week</span>
      </div>
      <p className="mt-1 text-[12.5px] text-ink-faint">{plan.billedLabel}</p>
      <ul className="mt-[18px] flex-1 space-y-[11px]">
        {PRO_FEATURES.map(f => (
          <li key={f} className="flex items-start gap-2 text-[13.5px] text-ink-body">
            <Check size={16} strokeWidth={2.2} aria-hidden className="mt-[1px] flex-shrink-0 text-teal" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        disabled={busy || isCurrent}
        className="press mt-[18px] flex h-[42px] w-full items-center justify-center gap-2 rounded-btn border border-line-strong bg-surface text-[13.5px] font-semibold text-ink outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={16} aria-hidden className="animate-spin" />
        ) : isCurrent ? (
          "Huidig plan"
        ) : isOtherPro ? (
          <>
            Wissel naar maandelijks
            <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
          </>
        ) : (
          <>
            Kies maandelijks
            <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
          </>
        )}
      </button>
    </Card>
  )
}

/** Stands in for the cards only - the heading and the text under them are server-rendered and never wait. */
export function PricingSkeleton() {
  return (
    <div role="status" aria-label="Abonnement laden" className="mt-[22px] grid grid-cols-1 gap-4 md:grid-cols-3">
      <Skeleton className="h-80 rounded-card" />
      <Skeleton className="h-96 rounded-card" />
      <Skeleton className="h-80 rounded-card" />
    </div>
  )
}

export default function PricingPlans() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState<BillingInterval | null>(null)
  const [checking, setChecking] = useState(true)
  // The session/API only report whether Stripe is active, not which interval -
  // so "which card is current" can't be answered without guessing. Both Pro
  // cards fall back to the same disabled "Huidig plan" state rather than
  // fabricating an interval.
  const [isPro, setIsPro] = useState(false)
  // Whether the checkout will include the free trial for this visitor. Asked
  // of /api/trial, which runs the same check as app/api/checkout
  // (lib/trialEligibility.ts), so the notice never promises a trial the
  // checkout will not give: once per account, never to someone who had Pro.
  // Resolved after mount only - a cached server render cannot know who is
  // looking.
  const [offersTrial, setOffersTrial] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetch("/api/trial", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled) setOffersTrial(Boolean(data?.eligible)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [session])

  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const sourceParam = searchParams.get("source")
  const planParam = searchParams.get("plan")

  useEffect(() => {
    if (status === "loading") return

    async function checkSubscription() {
      if (!session) { setChecking(false); return }
      if (session.user?.isSubscribed) {
        setIsPro(true)
        setChecking(false)
        return
      }
      try {
        const r = await fetch("/api/user")
        if (r.ok) {
          const d = await r.json()
          if (d.user?.subscribed) setIsPro(true)
        }
      } catch { /* noop */ } finally {
        setChecking(false)
      }
    }
    checkSubscription()
  }, [session, status])

  useEffect(() => {
    if (status === "loading") return
    const allowed = ["sidebar_cta", "paywall_commentary", "paywall_ai", "paywall_plan", "nav", "direct", "landing"]
    track("pricing_viewed", {
      source: sourceParam && allowed.includes(sourceParam) ? sourceParam : "direct",
      logged_in: session ? "yes" : "no",
    })
  }, [session, status, sourceParam])

  const startCheckout = useCallback(async (interval: BillingInterval) => {
    setLoading(interval)
    try {
      trackNow("checkout_started", { interval })
      await requestCheckout(interval)
    } catch (err) {
      toast({
        title: "Er ging iets mis",
        description:
          err instanceof Error && !(err instanceof TypeError)
            ? err.message
            : "Afrekenen mislukt. Controleer je verbinding en probeer het opnieuw.",
        variant: "destructive",
      })
      setLoading(null)
    }
  }, [toast])

  const handleSelect = useCallback((interval: BillingInterval) => {
    track("plan_selected", { interval, logged_in: session ? "yes" : "no" })

    if (!session) {
      trackNow("signup_for_checkout", { interval })
      router.push(signupForCheckoutHref(interval))
      return
    }

    void startCheckout(interval)
  }, [session, router, startCheckout])

  useEffect(() => {
    if (!session || checking || isPro) return
    if (planParam !== "monthly" && planParam !== "annual") return
    if (loading) return

    router.replace("/abonnement")
    void startCheckout(planParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, checking, isPro, planParam])

  if (status === "authenticated" && checking) {
    return <PricingSkeleton />
  }

  return (
    <>
      {offersTrial && !isPro && (
        <p className="mx-auto mt-[14px] max-w-[540px] rounded-card bg-teal-soft px-4 py-3 text-center text-[13px] leading-[1.6] text-teal-dark">
          <strong className="font-bold">De eerste {PRO_TRIAL_DAYS} dagen zijn gratis.</strong>{" "}
          Je kiest een betaalmethode, maar betaalt vandaag niets. Daarna loopt je abonnement
          automatisch door tegen de prijs van je plan; zeg je binnen {PRO_TRIAL_DAYS} dagen op, dan
          betaal je niets. Eén keer per account.
        </p>
      )}

      <div className="mt-[22px] grid grid-cols-1 gap-4 md:grid-cols-[300px_360px_300px] md:justify-center md:items-stretch">
        <FreeCard isPro={isPro} />
        <AnnualCard
          busy={loading === "annual"}
          isCurrent={isPro}
          isOtherPro={false}
          onSelect={() => handleSelect("annual")}
        />
        <MonthlyCard
          busy={loading === "monthly"}
          isCurrent={isPro}
          isOtherPro={false}
          onSelect={() => handleSelect("monthly")}
        />
      </div>
    </>
  )
}
