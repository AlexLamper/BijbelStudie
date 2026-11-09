"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Check, Loader2, X } from "lucide-react"

import {
  PLANS,
  PRO_FEATURES,
  RECOMMENDED,
  annualDeal,
  euro,
  type BillingInterval,
} from "../../lib/pricing"
import type { ProFeature } from "../../lib/entitlements"
import { PRO_OFFER_EVENT, type ProOfferRequest, type ProOfferSurface } from "../../lib/proOffer"
import { signupForCheckoutHref, startCheckout } from "../../lib/startCheckout"
import { track, trackNow } from "../../lib/analytics"
import { useLivePrices } from "../../hooks/useLivePrices"
import AnnualDealLine from "./AnnualDealLine"

/** What /api/trial answers. */
interface TrialStatus {
  signedIn: boolean
  isPro: boolean
  eligible: boolean
  trialDays: number
}

/**
 * One answer per page load. Eligibility only changes through a checkout, and a
 * checkout leaves the page, so there is nothing to invalidate - and the Stripe
 * lookup behind it is not something to repeat on every paywall.
 */
let statusPromise: Promise<TrialStatus | null> | null = null

function fetchTrialStatus(): Promise<TrialStatus | null> {
  if (!statusPromise) {
    statusPromise = fetch("/api/trial", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<TrialStatus>) : null))
      .catch(() => null)
      .then((status) => {
        // A failed lookup must not stick for the rest of the visit.
        if (!status) statusPromise = null
        return status
      })
  }
  return statusPromise
}

/** What /api/v1/reverse-trial answers, as far as the offer uses it. */
interface PersonalStatus {
  isPro: boolean
  limits: { limitedFeature: ProFeature | null } | null
  personal: { feature: ProFeature; headline: string | null; limitLine: string } | null
}

/**
 * The reader's own reverse-trial numbers, once per page load: they are frozen
 * when the trial ends, and the offer only leads with them after that.
 */
let personalPromise: Promise<PersonalStatus | null> | null = null

function fetchPersonal(): Promise<PersonalStatus | null> {
  if (!personalPromise) {
    personalPromise = fetch("/api/v1/reverse-trial", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<PersonalStatus>) : null))
      .catch(() => null)
  }
  return personalPromise
}

/** Which feature a gate belongs to, to tell a personal limit from the normal one. */
const SURFACE_FEATURE: Partial<Record<ProOfferSurface, ProFeature>> = {
  ai_limit: "ai",
  note_limit: "notes",
  original_text: "study",
  commentary: "study",
  crossrefs: "study",
  tts: "audio",
  lessons: "studies",
}

/**
 * The PRO_FEATURES lines that belong to a feature, so a reader whose top
 * feature is the AI sees the AI line first, not a generic list.
 */
const FEATURE_LINES: Record<ProFeature, number[]> = {
  studies: [],
  ai: [2],
  notes: [3],
  study: [0, 1, 4],
  audio: [6],
}

/**
 * Lessons are free for every account but one whose personal limit they are,
 * so "zoveel lessen als je wilt" is not in PRO_FEATURES (it would tell every
 * free reader they lack something they have). It leads only for that reader.
 */
const STUDIES_LINE = "Zoveel nieuwe lessen per dag als je wilt"

function featuresFirst(feature: ProFeature | null): string[] {
  if (!feature) return PRO_FEATURES.slice(0, 4)
  const lead = [
    ...(feature === "studies" ? [STUDIES_LINE] : []),
    ...FEATURE_LINES[feature].map((i) => PRO_FEATURES[i]),
  ]
  return [...lead, ...PRO_FEATURES.filter((line) => !lead.includes(line))].slice(0, 4)
}

/** The close controls appear after this long (Alex: the X fades in after about 3 seconds). */
const CLOSE_DELAY_MS = 3000

/** "30 september" - the day the first payment is taken if the trial runs out. */
function dayAfterTrial(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000)
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })
}

/**
 * The Pro offer, raised at the moment a reader reaches for something Pro: a
 * limit they just hit, a Pro control they just tapped (lib/proOffer.ts).
 *
 * For an account that has never had Pro it offers the free trial the way an
 * app store would: "Probeer Pro 7 dagen gratis", pick a plan, and Stripe
 * Checkout asks for a payment method with €0 due today. The first payment
 * follows automatically when the trial ends, unless the reader cancels before
 * then - and the dialog says exactly that, with the date and the amount, next
 * to the button. Whether the trial applies is decided by the server
 * (app/api/checkout via lib/trialEligibility.ts); /api/trial only tells this
 * dialog what the checkout is going to do, so the promise on screen and the
 * charge cannot disagree. Once per account, ever: someone who already had the
 * trial - from the landing banner, the pricing page or here - is offered Pro
 * at the normal price instead.
 *
 * No countdown and no "alleen vandaag": the trial is always available to a new
 * account, so a deadline would be false (UCPD Annex I, point 7).
 *
 * Mounted once, in the root layout.
 */
export default function ProOfferDialog() {
  const router = useRouter()
  const [request, setRequest] = useState<ProOfferRequest | null>(null)
  const [status, setStatus] = useState<TrialStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [interval, setPlanInterval] = useState<BillingInterval>(RECOMMENDED)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personal, setPersonal] = useState<PersonalStatus | null>(null)
  const [canClose, setCanClose] = useState(false)
  const live = useLivePrices()

  useEffect(() => {
    const onOffer = (event: Event) => {
      const detail = (event as CustomEvent<ProOfferRequest>).detail
      if (!detail) return
      setError(null)
      setBusy(false)
      setRequest(detail)
      setLoadingStatus(true)
      void Promise.all([fetchTrialStatus(), fetchPersonal()]).then(([next, mine]) => {
        setStatus(next)
        setPersonal(next?.signedIn ? mine : null)
        setLoadingStatus(false)
        // A gate that refused because of the reader's PERSONAL limit, not the
        // normal free one: counted per feature.
        const feature = SURFACE_FEATURE[detail.surface]
        if (feature && mine?.limits?.limitedFeature === feature && !mine.isPro) {
          track("personal_limit_hit", { feature })
        }
      })
    }
    window.addEventListener(PRO_OFFER_EVENT, onOffer)
    return () => window.removeEventListener(PRO_OFFER_EVENT, onOffer)
  }, [])

  // The offer can always be closed, but the close controls fade in after a
  // moment, so the reader takes in what they were offered first.
  useEffect(() => {
    if (!request) {
      setCanClose(false)
      return
    }
    const timer = window.setTimeout(() => setCanClose(true), CLOSE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [request])

  // A reader who already has Pro reached a gate on a stale session (the page
  // was open when they upgraded). There is nothing to sell them; a reload
  // picks up the new session.
  useEffect(() => {
    if (request && status?.isPro) setRequest(null)
  }, [request, status])

  const close = useCallback(() => {
    if (!busy && canClose) setRequest(null)
  }, [busy, canClose])

  const trialDays = status?.trialDays ?? 7
  // A guest is offered the trial too: a new account has never had one, and the
  // checkout after sign-up checks it for real.
  const offersTrial = !loadingStatus && (status?.eligible ?? false)
  // Live Stripe prices; the constants only stand in until they arrive.
  const amountCents = (key: BillingInterval) => live?.[key]?.amountCents ?? PLANS[key].amountCents
  const deal = annualDeal(live?.monthly, live?.annual)
  const plan = { ...PLANS[interval], amountCents: amountCents(interval) }
  const billedLabel = (key: BillingInterval) =>
    `${euro(amountCents(key))} per ${key === "annual" ? "jaar, in één keer" : "maand, maandelijks"} gefactureerd`
  // After the reverse trial the offer leads with the reader's own top feature
  // and numbers ("Je stelde 9 vragen aan de AI in 3 dagen"), not a generic pitch.
  const mine = personal && !personal.isPro ? personal.personal : null

  const handleContinue = async () => {
    if (!request) return
    // The lookup failed: let the pricing page sort it out rather than guess
    // whether this is a guest.
    if (!status) {
      router.push(`/abonnement?source=${request.surface}`)
      setRequest(null)
      return
    }
    if (!status.signedIn) {
      router.push(signupForCheckoutHref(interval))
      setRequest(null)
      return
    }
    setBusy(true)
    setError(null)
    try {
      trackNow("checkout_started", { interval })
      await startCheckout(interval)
    } catch (err) {
      setError(
        err instanceof Error && !(err instanceof TypeError)
          ? err.message
          : "Afrekenen mislukt. Controleer je verbinding en probeer het opnieuw.",
      )
      setBusy(false)
    }
  }

  return (
    <DialogPrimitive.Root open={request !== null} onOpenChange={(open) => { if (!open) close() }}>
      <DialogPrimitive.Portal>
        {/* Above the note dialog (z-100/101) and the lesson window's header:
            the offer can be raised from inside either, and whatever the reader
            was doing stays open underneath. */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[130] bg-slate-900/50 backdrop-blur-[2px]
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
            motion-reduce:animate-none"
        />
        <DialogPrimitive.Content
          aria-describedby="pro-offer-summary"
          onEscapeKeyDown={(event) => { if (!canClose) event.preventDefault() }}
          onPointerDownOutside={(event) => { if (!canClose) event.preventDefault() }}
          className="fixed left-1/2 top-1/2 z-[131] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[440px]
            -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-card border border-line bg-surface
            p-6 shadow-xl outline-none max-md:p-5
            data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
            motion-reduce:animate-none"
        >
          <DialogPrimitive.Close
            aria-label="Sluiten"
            aria-hidden={!canClose}
            tabIndex={canClose ? 0 : -1}
            disabled={busy || !canClose}
            className={`absolute right-3 top-3 rounded-btn p-1.5 text-ink-faint transition-[opacity,colors] duration-500 hover:bg-sunken hover:text-ink motion-reduce:transition-none ${
              canClose ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <X size={18} aria-hidden />
          </DialogPrimitive.Close>

          <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-teal-dark">
            BijbelStudie Pro
          </p>

          {/* The title waits for /api/trial rather than flipping from one
              promise to the other in front of the reader. */}
          <DialogPrimitive.Title className="mt-1.5 pr-6 text-[22px] font-bold leading-tight tracking-[-0.4px] text-ink">
            {loadingStatus ? (
              <>
                <span className="sr-only">BijbelStudie Pro</span>
                <span className="block h-7 w-3/4 animate-pulse rounded bg-sunken" aria-hidden />
              </>
            ) : mine?.headline ? (
              `${mine.headline}.`
            ) : offersTrial ? (
              `Probeer Pro ${trialDays} dagen gratis`
            ) : (
              "Ga verder met Pro"
            )}
          </DialogPrimitive.Title>

          <p id="pro-offer-summary" className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-muted">
            {request?.reason ?? "Alles om een gedeelte grondig te bestuderen."}
          </p>
          {mine && !loadingStatus && (
            <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-muted">
              Gratis houd je {mine.limitLine}. Met Pro heb je het weer helemaal
              {offersTrial ? `, en de eerste ${trialDays} dagen zijn gratis` : ""}.
            </p>
          )}

          {/* The full list lives on /abonnement ("Alles over Pro" below); a
              dialog raised mid-task only needs the headline reasons, not all
              eight - the first four cover what most readers reach for, and
              the reader's own top feature goes first. */}
          <ul className="mt-4 space-y-[7px]">
            {featuresFirst(mine?.feature ?? null).map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-[13.5px] text-ink-body">
                <Check size={16} strokeWidth={2.2} aria-hidden className="mt-[1px] flex-shrink-0 text-teal" />
                {feature}
              </li>
            ))}
          </ul>

          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Kies je plan</legend>
            {(["annual", "monthly"] as const).map((key) => {
              const selected = interval === key
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-3 rounded-btn border px-3.5 py-2.5 transition-colors ${
                    selected ? "border-teal bg-teal-faint" : "border-line hover:bg-sunken"
                  }`}
                >
                  <input
                    type="radio"
                    name="pro-offer-plan"
                    value={key}
                    checked={selected}
                    onChange={() => setPlanInterval(key)}
                    className="mt-1 accent-[#0D9488]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink">
                        {key === "annual" ? "Jaarlijks" : "Maandelijks"}
                      </span>
                      {key === "annual" && deal && (
                        <span className="rounded-full bg-teal-soft px-2 py-[1px] text-[11px] font-bold text-teal-dark">
                          bespaar {deal.savePercent}%
                        </span>
                      )}
                    </span>
                    {key === "annual" && deal ? (
                      <AnnualDealLine deal={deal} className="mt-0.5 text-[12.5px] leading-[1.45] text-ink-muted" />
                    ) : (
                      <span className="mt-0.5 block text-[12.5px] text-ink-muted">{billedLabel(key)}</span>
                    )}
                  </span>
                </label>
              )
            })}
          </fieldset>

          <button
            type="button"
            onClick={handleContinue}
            disabled={busy || loadingStatus}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-btn bg-teal-dark text-[15.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {offersTrial ? `Start ${trialDays} dagen gratis` : `Word Pro voor ${euro(plan.amountCents)}`}
          </button>

          {/* The terms of the trial, beside the button that starts it: what is
              paid today, what is paid when and how much, and how to stop it. */}
          {!loadingStatus && (
            <p className="mt-2.5 text-center text-[12px] leading-[1.55] text-ink-muted">
              {offersTrial ? (
                <>
                  Vandaag betaal je €0; je kiest wel een betaalmethode. Op {dayAfterTrial(trialDays)} betaal je{" "}
                  {euro(plan.amountCents)} voor je eerste {interval === "annual" ? "jaar" : "maand"}, tenzij je
                  vóór die dag opzegt. Daarna verlengt het abonnement automatisch; opzeggen kan altijd via
                  Instellingen.
                </>
              ) : (
                <>{billedLabel(interval)}. Het abonnement verlengt automatisch tot je opzegt; opzeggen kan altijd via Instellingen.</>
              )}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-2 text-center text-[12.5px] text-danger">
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 text-[13px]">
            <button
              type="button"
              onClick={close}
              disabled={busy || !canClose}
              aria-hidden={!canClose}
              tabIndex={canClose ? 0 : -1}
              className={`font-medium text-ink-muted underline-offset-2 transition-opacity duration-500 hover:text-ink hover:underline motion-reduce:transition-none ${
                canClose ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {mine ? "Gratis verder" : "Niet nu"}
            </button>
            <Link
              href={`/abonnement?source=${mine ? "personal_limit" : (request?.surface ?? "direct")}`}
              onClick={() => setRequest(null)}
              className="font-semibold text-teal-dark underline-offset-2 hover:underline"
            >
              Alles over Pro
            </Link>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
