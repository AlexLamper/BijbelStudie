"use client"

/**
 * The interactive half of /abonnement: the two plan cards, the one button and
 * the checkout it starts. The left column (heading, what Pro includes, the
 * verse) and the FAQ are server components in page.tsx, so they are in the
 * HTML for every visitor and crawler and never wait for the session check.
 *
 * A card only SELECTS a plan; the single button starts the checkout for the
 * selected one. The checkout call, the sign-up redirect and the `?plan=`
 * resume are the same code paths as before (lib/startCheckout.ts).
 */

import Link from "next/link"
import { Check, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect, useCallback } from "react"
import { useToast } from "../../hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import {
  PLANS,
  RECOMMENDED,
  annualDiscountPercent,
  effectivePerMonth,
  euro,
  perWeek,
  type BillingInterval,
} from "../../lib/pricing"
import { PRO_TRIAL_DAYS } from "../../lib/promo"
import { signupForCheckoutHref, startCheckout as requestCheckout } from "../../lib/startCheckout"
import { track, trackNow } from "../../lib/analytics"
import { Skeleton } from "../../components/kit/primitives"

/** What /api/trial answers. */
interface TrialStatus {
  signedIn: boolean
  isPro: boolean
  eligible: boolean
  trialDays: number
}

/** "€ 89,99": this page sets the amounts large, with the space Dutch typography puts after the sign. */
function spaced(amount: string): string {
  return amount.replace("€", "€ ")
}

const PLAN_COPY: Record<BillingInterval, { name: string; derived: string; period: string }> = {
  annual: {
    name: "Jaarlijks",
    derived: `${spaced(effectivePerMonth(PLANS.annual))} per maand`,
    period: "per jaar",
  },
  monthly: {
    name: "Maandelijks",
    derived: `${spaced(perWeek(PLANS.monthly))} per week`,
    period: "per maand",
  },
}

/** The filled or empty circle at the head of a plan card. Also marks the current plan for a Pro reader. */
function RadioMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${
        selected ? "bg-teal text-white" : "border-[1.5px] border-line-strong bg-surface"
      }`}
    >
      {selected && <Check size={14} strokeWidth={3} />}
    </span>
  )
}

function PlanOption({
  interval,
  selected,
  disabled,
  onSelect,
}: {
  interval: BillingInterval
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const plan = PLANS[interval]
  const copy = PLAN_COPY[interval]
  return (
    // 1 px border plus a 1 px ring when selected, rather than a 2 px border:
    // the card keeps its size, so nothing shifts when the selection moves.
    <label
      className={`relative flex cursor-pointer items-center gap-4 rounded-card border bg-surface p-6 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#0F766E] max-md:gap-3 max-md:p-[18px] ${
        selected ? "border-teal ring-1 ring-teal" : "border-line hover:border-line-strong"
      }`}
    >
      <input
        type="radio"
        name="abonnement-plan"
        value={interval}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />

      {/* Stays on Jaarlijks whichever card is selected: it compares the two
          tariffs, it does not describe the selection. */}
      {interval === "annual" && (
        <span className="absolute -top-[11px] right-5 whitespace-nowrap rounded-full bg-teal-dark px-[11px] py-[5px] text-[11px] font-bold uppercase leading-none tracking-[0.6px] text-white">
          Bespaar {annualDiscountPercent()}%
          <span className="sr-only"> ten opzichte van maandelijks betalen</span>
        </span>
      )}

      <RadioMark selected={selected} />

      <span className="min-w-0 flex-1">
        <span className="block text-[19px] font-bold leading-[1.2] tracking-[-0.3px] text-ink max-md:text-[17px]">
          {copy.name}
        </span>
        <span className="mt-[3px] block text-[14px] text-ink-muted tabular-nums">{copy.derived}</span>
      </span>

      <span className="flex-none text-right">
        <span className="block text-[26px] font-bold leading-none tracking-[-0.6px] text-ink tabular-nums max-md:text-[22px]">
          {spaced(euro(plan.amountCents))}
        </span>
        <span className="mt-[5px] block text-[13px] text-ink-muted">{copy.period}</span>
      </span>
    </label>
  )
}

/** Stands in for the plan column only - the left column and the FAQ are server-rendered and never wait. */
export function PricingSkeleton() {
  return (
    <div role="status" aria-label="Abonnement laden" className="flex w-full flex-col gap-[18px]">
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-[98px] rounded-card" />
      <Skeleton className="h-[98px] rounded-card" />
      <Skeleton className="mt-2 h-[58px] rounded-panel" />
      <Skeleton className="mx-auto h-4 w-64" />
    </div>
  )
}

/** What a reader who already has Pro sees instead of the choice. */
function CurrentPlan() {
  return (
    <div className="flex w-full flex-col gap-[18px]">
      <h2 className="text-[20px] font-semibold tracking-[-0.3px] text-ink">Je huidige plan</h2>
      <div className="flex items-center gap-4 rounded-card border border-teal bg-surface p-6 ring-1 ring-teal max-md:gap-3 max-md:p-[18px]">
        <RadioMark selected />
        <div className="min-w-0 flex-1">
          <p className="text-[19px] font-bold leading-[1.2] tracking-[-0.3px] text-ink max-md:text-[17px]">
            BijbelStudie Pro
          </p>
          <p className="mt-[3px] text-[14px] text-ink-muted">Actief op dit account</p>
        </div>
      </div>
      <p className="text-center text-[13px] text-ink-muted">
        Facturen, pauzeren of opzeggen:{" "}
        <Link
          href="/instellingen?sectie=abonnement#instelling-abonnement"
          className="font-semibold text-teal-dark underline-offset-2 hover:underline dark:text-teal-400"
        >
          Instellingen &rsaquo; Abonnement
        </Link>
      </p>
    </div>
  )
}

export default function PricingPlans() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const sourceParam = searchParams.get("source")
  const planParam = searchParams.get("plan")
  const resumePlan: BillingInterval | null =
    planParam === "monthly" || planParam === "annual" ? planParam : null

  const [selected, setSelected] = useState<BillingInterval>(resumePlan ?? RECOMMENDED)
  const [busy, setBusy] = useState(false)

  const signedIn = Boolean(session)
  const sessionPro = Boolean(session?.user?.isSubscribed)

  // /api/trial runs the same checks as app/api/checkout (lib/trialEligibility.ts)
  // and the same `resolveIsPro` as the session, so one request answers both
  // "is this reader Pro after all" (the session can be older than a purchase)
  // and "will the checkout include the trial". Only asked for a signed-in
  // reader the session does not already call Pro: a guest's answer is a
  // constant (a new account has never had a trial; the check that binds is
  // the checkout's, after sign-up), and a Pro reader is not offered anything.
  const needsLookup = signedIn && !sessionPro
  const [trial, setTrial] = useState<TrialStatus | null>(null)
  const [checking, setChecking] = useState(needsLookup)
  useEffect(() => {
    if (!needsLookup) { setChecking(false); return }
    let cancelled = false
    setChecking(true)
    fetch("/api/trial", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<TrialStatus>) : null))
      .catch(() => null)
      .then((data) => {
        if (cancelled) return
        setTrial(data)
        setChecking(false)
      })
    return () => { cancelled = true }
  }, [needsLookup])

  const isPro = sessionPro || Boolean(trial?.isPro)
  // A failed lookup promises nothing: the button falls back to "Start met Pro".
  const offersTrial = !isPro && (signedIn ? Boolean(trial?.eligible) : true)
  const trialDays = trial?.trialDays ?? PRO_TRIAL_DAYS

  useEffect(() => {
    if (status === "loading") return
    const allowed = ["sidebar_cta", "paywall_commentary", "paywall_ai", "paywall_plan", "nav", "direct", "landing"]
    track("pricing_viewed", {
      source: sourceParam && allowed.includes(sourceParam) ? sourceParam : "direct",
      logged_in: session ? "yes" : "no",
    })
  }, [session, status, sourceParam])

  const startCheckout = useCallback(async (interval: BillingInterval) => {
    setBusy(true)
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
      setBusy(false)
    }
  }, [toast])

  const handleContinue = useCallback(() => {
    track("plan_selected", { interval: selected, logged_in: session ? "yes" : "no" })

    if (!session) {
      trackNow("signup_for_checkout", { interval: selected })
      router.push(signupForCheckoutHref(selected))
      return
    }

    void startCheckout(selected)
  }, [selected, session, router, startCheckout])

  // Back from sign-up with `?plan=`: carry on into the checkout the guest asked for.
  useEffect(() => {
    if (!session || checking || isPro) return
    if (!resumePlan) return
    if (busy) return

    router.replace("/abonnement")
    void startCheckout(resumePlan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, checking, isPro, resumePlan])

  if (status === "loading" || checking) return <PricingSkeleton />
  if (isPro) return <CurrentPlan />

  return (
    <div className="flex w-full flex-col gap-[18px]">
      <h2 id="kies-je-plan" className="text-[20px] font-semibold tracking-[-0.3px] text-ink">
        Kies je plan
      </h2>

      <div role="radiogroup" aria-labelledby="kies-je-plan" className="flex flex-col gap-[18px]">
        {(["annual", "monthly"] as const).map((interval) => (
          <PlanOption
            key={interval}
            interval={interval}
            selected={selected === interval}
            disabled={busy}
            onSelect={() => setSelected(interval)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={busy}
        className="press mt-2 flex h-[58px] w-full items-center justify-center gap-2 rounded-panel bg-teal-dark text-[17px] font-bold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {busy && <Loader2 size={18} aria-hidden className="animate-spin" />}
        {offersTrial ? `Probeer ${trialDays} dagen gratis` : "Start met Pro"}
      </button>

      <p className="text-center text-[13px] text-ink-muted">
        {offersTrial && <>Vandaag €&nbsp;0. </>}
        Altijd opzegbaar. Prijzen incl. btw.
      </p>
    </div>
  )
}
