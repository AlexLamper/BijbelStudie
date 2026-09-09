"use client"

import { ArrowRight, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { ProBadge } from "../../components/ui/ProBadge"
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
import { Panel, SceneSkeleton, SectionHeading } from "../../components/scene/pieces"
import { PLATE, TEAL, TEAL_DEEP, TEAL_ON_DARK } from "../../components/scene/tokens"

/** #0D9488 is 3.7:1 on white - fine as a fill, short of AA as type. */
const TEAL_TEXT = "#0F766E"

/**
 * The reasons apply to the product, not to a billing interval. The page used to
 * carry a "Waarom kiezen voor maandelijks?" section, which argued against the
 * plan it should have been selling.
 */
const REASSURANCE = [
  { title: "Altijd opzegbaar",   body: "Zeg op wanneer je wil. Je houdt toegang tot het einde van de periode." },
  { title: "Veilig betalen",     body: "Betaling via Stripe met iDEAL, Bancontact, SEPA of creditcard." },
  { title: "Even pauzeren kan",  body: "Geen tijd? Pauzeer je abonnement tot drie maanden in plaats van opzeggen." },
]

/**
 * A plan, as a lit object on the landscape.
 *
 * The card keeps every colour it had, because it keeps the white ground it was
 * drawn for: the price, the billed label, the saving line and the amber
 * comparison badge all measure exactly what they measured before, and a figure
 * a subscriber may want to check is the last thing that should be sitting on a
 * photograph. PLATE is the shell's surface for precisely this - see
 * components/scene/README.md.
 *
 * Nothing about how a price is phrased moved. Every amount is derived in
 * lib/pricing.ts, where the EU Omnibus and Dutch price-indication rules are
 * answered once, and no wording on this card was rewritten.
 */
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
      className={`relative flex flex-col p-6 ${PLATE}`}
      // `outline` rather than a ring, so the plate keeps its own hairline and
      // its shadow; a negative offset keeps the frame inside the rounded edge.
      style={recommended ? { outline: `2px solid ${TEAL}`, outlineOffset: -2 } : undefined}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          {/* Same words as before. Only the fill moved, from #0D9488 to
              #0F766E: white on the former measures 3.74:1 and fails. */}
          <span
            className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: TEAL_DEEP }}
          >
            Beste waarde
          </span>
        </div>
      )}

      <div className="mb-5">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
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
              className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold"
              style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
            >
              {annualDiscountPercent()}% goedkoper
            </span>
          )}
        </div>

        {/* Headline is the weekly figure; the amount actually charged sits
            directly underneath, which the price-indication rules require. */}
        <div className="flex flex-wrap items-end gap-1.5">
          <span className="text-4xl font-bold tabular-nums text-gray-900">
            {perWeek(plan)}
          </span>
          <span className="mb-1 text-sm text-gray-500">per week</span>
        </div>

        {isAnnual ? (
          <>
            <p className="mt-1.5 text-xs font-semibold" style={{ color: TEAL_TEXT }}>
              Je bespaart {annualSaving()} per jaar
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {plan.billedLabel} · {effectivePerMonth(plan)} per maand
            </p>
            {/* A comparison between two tariffs we genuinely charge - not a
                former price - so it carries no "was/now" styling. */}
            <p className="mt-0.5 text-xs text-gray-500">
              Bij maandelijkse betaling: {monthlyEquivalentPerYear()} per jaar
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-xs text-gray-500">
            {plan.billedLabel} · Altijd opzegbaar
          </p>
        )}
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {PRO_FEATURES.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
            {/* Both plans contain the same product, so both get the same ticks.
                The annual card used to render these grey, which read as
                "not included". */}
            <CheckCircle size={14} aria-hidden style={{ color: TEAL_TEXT, flexShrink: 0, marginTop: 3 }} />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(interval)}
        disabled={busy}
        className="press flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:opacity-60"
        style={
          recommended
            ? { backgroundColor: TEAL_DEEP, color: "#fff" }
            : { color: "#374151", backgroundColor: "#FFFFFF", border: "1px solid #D1D5DB" }
        }
      >
        {busy ? (
          <Loader2 size={16} aria-hidden className="animate-spin" />
        ) : (
          <>
            {isAnnual ? "Start met Pro" : "Kies maandelijks"}
            <ArrowRight size={14} aria-hidden />
          </>
        )}
      </button>
    </div>
  )
}

/** The waiting state, in the shape of what is coming. Text never waits on the
 *  scene - only on its own data. */
function PricingSkeleton() {
  return (
    <div role="status" aria-label="Abonnement laden" className="pb-20 pt-24">
      <div className="max-w-[46rem] space-y-3">
        <SceneSkeleton className="h-12 w-[24rem] max-w-full" />
        <SceneSkeleton className="h-4 w-[20rem] max-w-full" />
      </div>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SceneSkeleton className="h-80 rounded-3xl" />
        <SceneSkeleton className="h-80 rounded-3xl" />
      </div>
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

  // Only block on the session while there IS a session to resolve. `checking`
  // starts true and `status` is "loading" during SSR, so gating on them
  // unconditionally served this page to logged-out visitors - and to Googlebot
  // - as a skeleton with no <h1>, no prices and no copy. The pricing content
  // is identical for everyone who is not already Pro, so it can render
  // immediately; only the "Je bent al Pro" branch below needs the session.
  if (status === "authenticated" && checking) {
    return <PricingSkeleton />
  }

  if (isSubscribed) {
    return (
      <section
        aria-labelledby="abonnement-pro-titel"
        className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-center pb-24"
      >
        <div className="scene-sky max-w-[40rem]">
          <CheckCircle className="h-9 w-9" aria-hidden style={{ color: TEAL_ON_DARK }} />
          <h1
            id="abonnement-pro-titel"
            className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl"
          >
            Je bent al Pro
          </h1>
          <p className="mt-4 max-w-[32rem] text-base leading-relaxed text-white/85">
            Bedankt voor je steun. Je hebt volledige toegang tot alle functies.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="press mt-8 inline-flex items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-base font-semibold text-gray-900 shadow-xl shadow-black/30 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          >
            Terug naar dashboard <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* This route is crawlable and is reached signed OUT from search, and the
          shell only draws its navbar and rail for a session (the navbar pushes
          an unauthenticated visitor to the sign-in page). Without this the
          pricing page would be a dead end for exactly the visitor it is written
          for. `SessionProvider` is seeded on the server, so a signed-in reader
          never sees this flash in. */}
      {status !== "authenticated" && (
        <div className="pt-5">
          <Link
            href="/"
            className="rounded-md text-sm font-bold tracking-tight text-white no-underline outline-none transition-colors hover:text-white/80 focus-visible:ring-2 focus-visible:ring-white"
          >
            BijbelStudie
          </Link>
        </div>
      )}

      {/* -- Layer 1: the sky ------------------------------------------
          `id` is the shell's canvas gate: the still SVG upgrades to the live
          tree only while this screen is on view. */}
      <section
        id="abonnement-hero"
        aria-labelledby="abonnement-titel"
        className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-end pb-28 pt-8"
      >
        <div className="scene-sky max-w-[46rem]">
          <ProBadge size="md" label="BijbelStudie Pro" />
          <h1
            id="abonnement-titel"
            className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl xl:text-6xl"
          >
            Alles wat je nodig hebt<br />voor serieuze bijbelstudie.
          </h1>
          <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">
            Onbeperkte toegang tot commentaren, de grondtekst, notities en de AI-assistent.
          </p>
        </div>
      </section>

      {/* -- Layer 2: the horizon --------------------------------------
          Annual first, in the DOM as well as visually, so it also leads on
          mobile. */}
      <div className="scene-horizon -mt-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      {/* -- Layer 3: the desk ----------------------------------------- */}
      <div className="pb-20 pt-16">
        {/* A neutral label for the three items that were already here. It says
            nothing about price, saving or discount on purpose: every claim on
            this page is fixed by the EU Omnibus rules and none of them moved. */}
        <SectionHeading id="abonnement-zeker" title="Goed om te weten" rule />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {REASSURANCE.map(({ title, body }) => (
            <Panel key={title} className="p-4">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">{body}</p>
            </Panel>
          ))}
        </div>

        <p className="mt-10 text-xs font-medium text-white/75">
          Veilige betaling via Stripe &nbsp;·&nbsp; Altijd opzegbaar &nbsp;·&nbsp; Geen verborgen kosten
        </p>
        {/* Pre-contract information. A subscriber is entitled to see the renewal
            terms, how to stop, and the withdrawal right before paying, not only
            in the terms page afterwards. */}
        <p className="mt-3 max-w-[46rem] text-xs leading-relaxed text-white/70">
          Prijzen inclusief btw. Je abonnement verlengt automatisch en is daarna maandelijks opzegbaar
          via Instellingen &rsaquo; Abonnement, zonder opgaaf van reden. Je hebt 14 dagen
          herroepingsrecht; zie de{" "}
          <a
            href="/algemene-voorwaarden"
            className="rounded-sm font-semibold text-white underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            algemene voorwaarden
          </a>
          .
        </p>
      </div>
    </>
  )
}

export default function SubscribePage() {
  // useSearchParams needs a Suspense boundary to keep the route from opting the
  // whole page into client-side rendering.
  return (
    <Suspense fallback={<PricingSkeleton />}>
      <SubscribePageInner />
    </Suspense>
  )
}
