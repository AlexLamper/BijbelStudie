"use client"

import { ArrowRight, CheckCircle, Loader2 } from "lucide-react"
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
import AppShell from "../../components/shell/AppShell"
import { Card, SectionHeading, Skeleton } from "../../components/kit/primitives"

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
 * A plan, as one of the two cards in the shell's content column.
 *
 * Same shape as every other card in the app - `rounded-card border border-line
 * bg-surface`, the kit/primitives.tsx `Card` surface - with `teal-dark`
 * (#0F766E) rather than `teal` (#0D9488) wherever the fill carries white type,
 * because white on #0D9488 measures 3.74:1 and fails; on #0F766E it is 5.5:1.
 * Both are literal entries in tailwind.config.ts (`teal.DEFAULT` /
 * `teal.dark`), not theme tokens, so the brand colour never drifts with the
 * reader's light/dark setting.
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
      className={`relative flex flex-col rounded-card border bg-surface p-6 ${
        recommended ? "border-teal-dark" : "border-line"
      }`}
      style={recommended ? { borderWidth: 2 } : undefined}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="whitespace-nowrap rounded-full bg-teal-dark px-3 py-1 text-xs font-bold text-white">
            Beste waarde
          </span>
        </div>
      )}

      <div className="mb-5">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {isAnnual ? "Jaarlijks" : "Maandelijks"}
          </p>
          {/* The badge is a comparison between the two tariffs we actually
              charge, which is a factual statement rather than a price-reduction
              claim - so it carries no 30-day lowest-price obligation and can run
              permanently. "3 maanden gratis" was rejected here: the real saving
              is €29,89, or 2,99 months, and rounding that up would be a claim
              the prices do not support. */}
          {isAnnual && (
            <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              {annualDiscountPercent()}% goedkoper
            </span>
          )}
        </div>

        {/* Headline is the weekly figure; the amount actually charged sits
            directly underneath, which the price-indication rules require. */}
        <div className="flex flex-wrap items-end gap-1.5">
          <span className="text-4xl font-bold tabular-nums text-ink">
            {perWeek(plan)}
          </span>
          <span className="mb-1 text-sm text-ink-muted">per week</span>
        </div>

        {isAnnual ? (
          <>
            <p className="mt-1.5 text-xs font-semibold text-teal-dark dark:text-teal-400">
              Je bespaart {annualSaving()} per jaar
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {plan.billedLabel} · {effectivePerMonth(plan)} per maand
            </p>
            {/* A comparison between two tariffs we genuinely charge - not a
                former price - so it carries no "was/now" styling. */}
            <p className="mt-0.5 text-xs text-ink-muted">
              Bij maandelijkse betaling: {monthlyEquivalentPerYear()} per jaar
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-xs text-ink-muted">
            {plan.billedLabel} · Altijd opzegbaar
          </p>
        )}
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {PRO_FEATURES.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-ink-body">
            {/* Both plans contain the same product, so both get the same ticks.
                The annual card used to render these grey, which read as
                "not included". */}
            <CheckCircle size={14} aria-hidden className="mt-[3px] flex-shrink-0 text-teal-dark dark:text-teal-400" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(interval)}
        disabled={busy}
        className={`press flex h-12 w-full items-center justify-center gap-2 rounded-btn text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:opacity-60 ${
          recommended
            ? "bg-teal-dark text-white hover:opacity-90"
            : "border border-line bg-surface text-ink-body hover:border-line-strong"
        }`}
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
 *  data - only the plan cards, whose prices come from the same fetch, get a
 *  placeholder. */
function PricingSkeleton() {
  return (
    <div role="status" aria-label="Abonnement laden" className="max-w-[64rem]">
      <div className="max-w-[38rem] space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-full max-w-[28rem]" />
        <Skeleton className="h-4 w-full max-w-[22rem]" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        <Skeleton className="h-80 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
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
      // The session already carries the resolved entitlement: lib/authOptions
      // sets `isSubscribed` with `resolveIsPro`, which is Stripe OR an app
      // store purchase OR an admin grant. /api/user reports only `subscribed`
      // (Stripe, plus a forced true for admins), so on its own it offered a
      // checkout page to someone who had already bought Pro in the app.
      if (session.user?.isSubscribed) {
        setIsSubscribed(true)
        setChecking(false)
        return
      }
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
        // Our own throws above carry Dutch copy; a TypeError is the browser's
        // English "Failed to fetch" when the request never left.
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
        className="flex min-h-[50vh] flex-col items-center justify-center text-center"
      >
        <Card className="max-w-[26rem] p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-faint">
            <CheckCircle className="h-6 w-6 text-teal-dark dark:text-teal-400" aria-hidden />
          </div>
          <h1 id="abonnement-pro-titel" className="mt-4 text-2xl font-bold tracking-tight text-ink">
            Je bent al Pro
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Bedankt voor je steun. Je hebt volledige toegang tot alle functies.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="press mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-btn bg-teal text-sm font-semibold text-white outline-none transition-colors hover:bg-teal-dark focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
          >
            Terug naar dashboard <ArrowRight size={16} aria-hidden />
          </button>
        </Card>
      </section>
    )
  }

  return (
    <div className="max-w-[64rem]">
      <section aria-labelledby="abonnement-titel" className="max-w-[38rem]">
        <ProBadge size="md" label="BijbelStudie Pro" />
        <h1 id="abonnement-titel" className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Alles wat je nodig hebt voor serieuze bijbelstudie.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          Onbeperkte toegang tot commentaren, de grondtekst, notities en de AI-assistent.
        </p>
      </section>

      {/* Annual first, in the DOM as well as visually, so it also leads on
          mobile. */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
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

      <div className="mt-14">
        {/* A neutral label for the three items that were already here. It says
            nothing about price, saving or discount on purpose: every claim on
            this page is fixed by the EU Omnibus rules and none of them moved. */}
        <SectionHeading title="Goed om te weten" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {REASSURANCE.map(({ title, body }) => (
            <Card key={title} className="p-4">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-xs font-medium text-ink-muted">
          Veilige betaling via Stripe &nbsp;·&nbsp; Altijd opzegbaar &nbsp;·&nbsp; Geen verborgen kosten
        </p>
        {/* Pre-contract information. A subscriber is entitled to see the renewal
            terms, how to stop, and the withdrawal right before paying, not only
            in the terms page afterwards. */}
        <p className="mt-3 max-w-[46rem] text-xs leading-relaxed text-ink-faint">
          Prijzen inclusief btw. Je abonnement verlengt automatisch en is daarna maandelijks opzegbaar
          via Instellingen &rsaquo; Abonnement, zonder opgaaf van reden. Je hebt 14 dagen
          herroepingsrecht; zie de{" "}
          <a
            href="/algemene-voorwaarden"
            className="rounded-sm font-semibold text-teal-dark underline underline-offset-4 outline-none dark:text-teal-400 focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          >
            algemene voorwaarden
          </a>
          .
        </p>
      </div>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <AppShell title="Abonnement" ownHeading>
      {/* useSearchParams needs a Suspense boundary to keep the route from
          opting the whole page into client-side rendering. */}
      <Suspense fallback={<PricingSkeleton />}>
        <SubscribePageInner />
      </Suspense>
    </AppShell>
  )
}
