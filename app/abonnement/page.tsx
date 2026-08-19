"use client"

import { ArrowRight, CheckCircle, Loader2, Sparkles, Shield, CreditCard, RefreshCw } from "lucide-react"
import { SkeletonPage } from "../../components/ui/skeletons"
import { useSession } from "next-auth/react"
import { useState, useEffect, useCallback, Suspense } from "react"
import { useToast } from "../../hooks/use-toast"
import getStripe from "../../lib/stripe-client"
import { useRouter, useSearchParams } from "next/navigation"
import {
  PLANS,
  PRO_FEATURES,
  RECOMMENDED,
  annualDiscountPercent,
  annualSaving,
  effectivePerMonth,
  monthlyEquivalentPerYear,
  perWeek,
  type BillingInterval,
} from "../../lib/pricing"
import { track, trackNow } from "../../lib/analytics"

const TEAL = "#0D9488"

/**
 * The reasons apply to the product, not to a billing interval. The page used to
 * carry a "Waarom kiezen voor maandelijks?" section, which argued against the
 * plan it should have been selling.
 */
const REASSURANCE = [
  { icon: Shield,     title: "Altijd opzegbaar",   body: "Zeg op wanneer je wil. Je houdt toegang tot het einde van de periode." },
  { icon: CreditCard, title: "Veilig betalen",     body: "Betaling via Stripe met iDEAL, Bancontact, SEPA of creditcard." },
  { icon: RefreshCw,  title: "Even pauzeren kan",  body: "Geen tijd? Pauzeer je abonnement tot drie maanden in plaats van opzeggen." },
]

function PlanCard({
  interval,
  recommended,
  loading,
  onSelect,
}: {
  interval: BillingInterval
  recommended: boolean
  loading: BillingInterval | null
  onSelect: (interval: BillingInterval) => void
}) {
  const plan = PLANS[interval]
  const isAnnual = interval === "annual"
  const busy = loading === interval

  return (
    <div
      className="relative rounded-2xl p-6 bg-white dark:bg-card flex flex-col"
      style={
        recommended
          ? { border: `2px solid ${TEAL}` }
          : { border: "1px solid #E5E7EB" }
      }
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap"
            style={{ backgroundColor: TEAL }}
          >
            Beste waarde
          </span>
        </div>
      )}

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {isAnnual ? "Jaarlijks" : "Maandelijks"}
          </p>
          {/* The badge is a comparison between the two tariffs we actually
              charge, which is a factual statement rather than a price-reduction
              claim - so it carries no 30-day lowest-price obligation and can run
              permanently. "3 maanden gratis" was rejected here: the real saving
              is €29,89, or 2,99 months, and rounding that up would be a claim
              the prices do not support. */}
          {isAnnual && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
              style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
            >
              {annualDiscountPercent()}% goedkoper
            </span>
          )}
        </div>

        {/* Headline is the weekly figure; the amount actually charged sits
            directly underneath, which the price-indication rules require. */}
        <div className="flex items-end gap-1.5 flex-wrap">
          <span className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
            {perWeek(plan)}
          </span>
          <span className="text-gray-400 text-sm mb-1">per week</span>
        </div>

        {isAnnual ? (
          <>
            <p className="text-xs font-semibold mt-1.5" style={{ color: TEAL }}>
              Je bespaart {annualSaving()} per jaar
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {plan.billedLabel} · {effectivePerMonth(plan)} per maand
            </p>
            {/* A comparison between two tariffs we genuinely charge - not a
                former price - so it carries no "was/now" styling. */}
            <p className="text-xs text-gray-400 mt-0.5">
              Bij maandelijkse betaling: {monthlyEquivalentPerYear()} per jaar
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400 mt-1.5">
            {plan.billedLabel} · Altijd opzegbaar
          </p>
        )}
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {PRO_FEATURES.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
            {/* Both plans contain the same product, so both get the same ticks.
                The annual card used to render these grey, which read as
                "not included". */}
            <CheckCircle size={14} style={{ color: TEAL, flexShrink: 0, marginTop: 3 }} />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(interval)}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
        style={
          recommended
            ? { backgroundColor: TEAL, color: "#fff" }
            : { color: "#374151", backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }
        }
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            {isAnnual ? "Start met Pro" : "Kies maandelijks"}
            <ArrowRight size={14} />
          </>
        )}
      </button>
    </div>
  )
}

function SubscribePageInner() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState<BillingInterval | null>(null)
  const [checking, setChecking] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const sourceParam = searchParams.get("source")
  const planParam = searchParams.get("plan")

  useEffect(() => {
    if (status === "loading") return

    async function checkSubscription() {
      if (!session) { setChecking(false); return }
      try {
        const r = await fetch("/api/user")
        if (r.ok) {
          const d = await r.json()
          if (d.user?.subscribed) setIsSubscribed(true)
        }
      } catch { /* noop */ } finally {
        setChecking(false)
      }
    }
    checkSubscription()
  }, [session, status])

  // Funnel entry. `source` tells us which surface sent them, which is how the
  // contextual paywalls get ranked against each other.
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
        // Only the interval is sent. The price is resolved server-side so a
        // crafted request cannot choose what it pays.
        body: JSON.stringify({ interval }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Betaling mislukt")

      trackNow("checkout_started", { interval })

      // Stripe returns a hosted URL; prefer it over redirectToCheckout so the
      // flow works even if the Stripe JS bundle is blocked.
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
        description: err instanceof Error ? err.message : "Afrekenen mislukt",
        variant: "destructive",
      })
      setLoading(null)
    }
  }, [toast])

  const handleSelect = useCallback((interval: BillingInterval) => {
    track("plan_selected", { interval, logged_in: session ? "yes" : "no" })

    // Previously the button was simply disabled for logged-out visitors, which
    // threw away every visitor arriving from search at the exact moment their
    // intent was highest. They now continue into signup and the chosen plan
    // resumes automatically afterwards.
    if (!session) {
      trackNow("signup_for_checkout", { interval })
      router.push(`/registreren?next=${encodeURIComponent(`/abonnement?plan=${interval}`)}`)
      return
    }

    void startCheckout(interval)
  }, [session, router, startCheckout])

  // Resume after signup: ?plan=annual arrives back here once the account exists.
  useEffect(() => {
    if (!session || checking || isSubscribed) return
    if (planParam !== "monthly" && planParam !== "annual") return
    if (loading) return

    // Clear the parameter first so a refresh does not restart checkout.
    router.replace("/abonnement")
    void startCheckout(planParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, checking, isSubscribed, planParam])

  if (status === "loading" || checking) {
    return <SkeletonPage fullHeight />
  }

  if (isSubscribed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
          <CheckCircle className="h-8 w-8" style={{ color: TEAL }} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Je bent al Pro</h1>
        <p className="text-gray-500 mb-6 max-w-sm">
          Bedankt voor je steun. Je hebt volledige toegang tot alle functies.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: TEAL }}
        >
          Terug naar dashboard <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ backgroundColor: "rgba(13,148,136,0.08)", color: TEAL }}>
            <Sparkles size={12} />
            BijbelStudie Pro
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
            Alles wat je nodig hebt<br />voor serieuze bijbelstudie.
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-base">
            Onbeperkte toegang tot commentaren, leesplannen, notities en de AI-assistent.
          </p>
        </div>

        {/* Annual first, in the DOM as well as visually, so it also leads on mobile. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <PlanCard
            interval="annual"
            recommended={RECOMMENDED === "annual"}
            loading={loading}
            onSelect={handleSelect}
          />
          <PlanCard
            interval="monthly"
            recommended={RECOMMENDED === "monthly"}
            loading={loading}
            onSelect={handleSelect}
          />
        </div>

        <div className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {REASSURANCE.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl p-4 bg-white dark:bg-card border" style={{ borderColor: "#E5E7EB" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <Icon size={15} style={{ color: TEAL }} />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Veilige betaling via Stripe &nbsp;·&nbsp; Altijd opzegbaar &nbsp;·&nbsp; Geen verborgen kosten
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          Prijzen inclusief btw. Je abonnement verlengt automatisch en is daarna maandelijks opzegbaar.
        </p>

      </div>
    </div>
  )
}

export default function SubscribePage() {
  // useSearchParams needs a Suspense boundary to keep the route from opting the
  // whole page into client-side rendering.
  return (
    <Suspense fallback={<SkeletonPage fullHeight />}>
      <SubscribePageInner />
    </Suspense>
  )
}
