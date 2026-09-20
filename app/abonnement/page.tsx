"use client"

import { ArrowRight, Check, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect, useCallback, Suspense } from "react"
import { useToast } from "../../hooks/use-toast"
import getStripe from "../../lib/stripe-client"
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
import { PRO_TRIAL_DAYS, promoWindow } from "../../lib/promo"
import { track, trackNow } from "../../lib/analytics"
import AppShell from "../../components/shell/AppShell"
import { Card, Pill, Skeleton } from "../../components/kit/primitives"

/** The four free-tier lines. Only "Bijbelstudie Pro" writes copy that touches
 *  price or entitlement, so this list lives beside PRO_FEATURES rather than in
 *  lib/pricing.ts, which is about what Pro unlocks, not what free already has. */
const FREE_FEATURES = [
  "Bijbeltekst in alle vertalingen",
  "Commentaren: eerste alinea",
  "5 AI-vragen per dag",
  "Notities en markeringen",
]

/** "21 september" - the current action's deadline, for the trial notice. */
const promoEndLabel = (endsAt: number) =>
  new Date(endsAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })

const GOOD_TO_KNOW = [
  { title: "Altijd opzegbaar", body: "Zeg op wanneer je wil. Je houdt toegang tot het einde van de periode." },
  { title: "Veilig betalen", body: "Betaling via Stripe met iDEAL, Bancontact, SEPA of creditcard." },
  { title: "Even pauzeren kan", body: "Geen tijd? Pauzeer je abonnement tot drie maanden in plaats van opzeggen." },
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

function PricingSkeleton() {
  return (
    <div role="status" aria-label="Abonnement laden" className="mx-auto max-w-[992px]">
      <div className="mx-auto max-w-[620px] space-y-3 text-center">
        <Skeleton className="mx-auto h-5 w-40" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="mx-auto h-4 w-3/4" />
      </div>
      <div className="mt-[22px] grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-80 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  )
}

function SubscribePageInner() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState<BillingInterval | null>(null)
  const [checking, setChecking] = useState(true)
  // The session/API only report whether Stripe is active, not which interval -
  // so "which card is current" can't be answered without guessing. Both Pro
  // cards fall back to the same disabled "Huidig plan" state rather than
  // fabricating an interval.
  const [isPro, setIsPro] = useState(false)
  // The current action window, or null in an off-week. Resolved after mount
  // only: it is a comparison against the clock, and rendering it on the server
  // would let a cached page keep promising a trial that the checkout route has
  // already stopped granting. Re-checked once a minute so a page left open
  // across the end of a window stops advertising a trial it no longer gets.
  const [trialEndsAt, setTrialEndsAt] = useState<number | null>(null)
  useEffect(() => {
    const check = () => {
      const win = promoWindow()
      setTrialEndsAt(win.active ? win.endsAt : null)
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

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
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Betaling mislukt")

      trackNow("checkout_started", { interval })

      if (data.url) {
        window.location.assign(data.url)
        return
      }

      if (!data.sessionId) throw new Error("Geen sessie ontvangen")
      const stripe = await getStripe()
      if (!stripe) throw new Error("Stripe kon niet worden geladen")
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
      if (error) throw error
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
      router.push(`/registreren?next=${encodeURIComponent(`/abonnement?plan=${interval}`)}`)
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
    <div className="mx-auto max-w-[992px]">
      <section aria-labelledby="abonnement-titel" className="mx-auto max-w-[620px] text-center">
        <Pill label="BIJBELSTUDIE PRO" className="mx-auto" />
        <h1 id="abonnement-titel" className="mt-[10px] text-[30px] font-bold leading-[1.15] tracking-[-0.6px] text-ink [text-wrap:balance]">
          Alles wat je nodig hebt voor serieuze bijbelstudie.
        </h1>
        <p className="mt-[10px] text-[14.5px] leading-[1.6] text-ink-muted">
          Onbeperkte toegang tot commentaren, de grondtekst, notities en de AI-assistent.
        </p>
        {trialEndsAt !== null && !isPro && (
          <p className="mx-auto mt-[14px] max-w-[540px] rounded-card bg-teal-soft px-4 py-3 text-[13px] leading-[1.6] text-teal-dark">
            <strong className="font-bold">De eerste {PRO_TRIAL_DAYS} dagen zijn gratis.</strong>{" "}
            Daarna loopt je abonnement automatisch door tegen de prijs van je plan. Zeg je op
            binnen {PRO_TRIAL_DAYS} dagen, dan betaal je niets. Deze actie loopt tot{" "}
            {promoEndLabel(trialEndsAt)}.
          </p>
        )}
      </section>

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

      <div className="mt-[22px] grid grid-cols-1 gap-[14px] md:mx-auto md:max-w-[992px] md:grid-cols-3">
        {GOOD_TO_KNOW.map(({ title, body }) => (
          <Card key={title} className="px-[17px] py-[15px]">
            <p className="text-[14px] font-bold text-ink">{title}</p>
            <p className="mt-[5px] text-[12.5px] leading-[1.6] text-ink-muted">{body}</p>
          </Card>
        ))}
      </div>

      <p className="mt-[22px] text-center text-[12px] text-ink-faint">
        Prijzen inclusief btw &nbsp;·&nbsp; Je abonnement verlengt automatisch en is opzegbaar via Instellingen &rsaquo; Abonnement
      </p>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <AppShell title="BijbelStudie Pro" active="" ownHeading>
      <div className="min-h-full bg-line-soft px-[28px] py-[26px] max-md:px-4 max-md:py-5 -m-[28px] max-md:-m-4">
        <Suspense fallback={<PricingSkeleton />}>
          <SubscribePageInner />
        </Suspense>
      </div>
    </AppShell>
  )
}
