"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import { useTranslation } from "../i18n/client"
import { trackNow } from "../../lib/analytics"
import { useLevensboom } from "../../hooks/useLevensboom"
import { Panel, SceneSkeleton } from "../../components/scene/pieces"
import { CTA_PRIMARY, EYEBROW, TEAL_ON_DARK } from "../../components/scene/tokens"

/**
 * The checkout return, on the scene.
 *
 * Restyled, not rebuilt: the same single POST to /api/verify-subscription per
 * session id, the same `update()` of the session, the same Levensboom refresh
 * for the new gold ring, the same `checkout_completed` event, the same
 * redirect back to /abonnement when there is no session id or the verification
 * fails, and the same two destinations afterwards.
 *
 * Someone is standing in the middle of a transaction here, so everything that
 * answers "did my payment go through" fits on the first screen and nothing on
 * the page waits for the landscape - the layout mounts no canvas at all.
 */
export default function SuccessPage() {
  const { t } = useTranslation("success")
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session_id")
  const [status, setStatus] = useState("loading")
  // Drives the billing line. Assuming monthly here would tell an annual
  // subscriber they are charged EUR 9,99 a month, which is simply untrue.
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual" | null>(null)
  const { update } = useSession()
  const { refresh: refreshLevensboom } = useLevensboom()

  useEffect(() => {
    if (status !== "success") return
    // /api/verify-subscription has just written the account's first Pro grant
    // and, with it, the gold ring (lib/levensboom/proRing.ts). The shared tree
    // state was fetched before the payment and sits in a one-minute session
    // cache, so refetch it: the navbar and the profile then show the ring now,
    // not after a reload. Its own effect, deliberately not a dependency of the
    // verification below - that one must run exactly once per session id.
    void refreshLevensboom()
  }, [status, refreshLevensboom])

  useEffect(() => {
    // Redirect if no sessionId is found
    if (!sessionId) {
      router.replace("/abonnement")
      return
    }

    const verifySession = async () => {
      try {

        const response = await fetch("/api/verify-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        })

        if (response.ok) {
          const data = await response.json().catch(() => null)
          const confirmed: "monthly" | "annual" =
            data?.interval === "annual" || data?.interval === "monthly" ? data.interval : "monthly"
          setBillingInterval(confirmed)
          await update()
          setStatus("success")
          // The web conversion event. It was only ever fired by the iOS app, so
          // until now the website half of the funnel had a start
          // (checkout_started) and no end, making web conversion unmeasurable.
          trackNow("checkout_completed", { interval: confirmed })
        } else {
          router.replace("/abonnement")
        }
      } catch {
        router.replace("/abonnement")
      }
    }

    verifySession()
  }, [sessionId, router, update])

  return (
    <section
      aria-labelledby="succes-titel"
      className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-center py-16"
    >
      <div className="mx-auto w-full max-w-[46rem]">
        {status === "loading" ? (
          <div role="status" aria-label={t("verifying")} className="space-y-4">
            <SceneSkeleton className="h-4 w-32" />
            <SceneSkeleton className="h-12 w-[22rem] max-w-full" />
            <SceneSkeleton className="h-4 w-[26rem] max-w-full" />
            <SceneSkeleton className="mt-6 h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {/* The answer to "did it work", set straight into the landscape. */}
            <div className="scene-sky">
              <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
                <CheckCircle size={13} aria-hidden className="mr-1.5 inline-block align-[-2px]" />
                {t("status")}
              </p>
              <h1
                id="succes-titel"
                className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl"
              >
                {t("title")}
              </h1>
              <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">
                {t("subtitle")}
              </p>
            </div>

            {/* What the subscription now is, in three lines. */}
            <Panel className="mt-10 p-5 sm:p-6" labelledBy="succes-wat">
              <h2 id="succes-wat" className="sr-only">{t("status")}</h2>
              <p className="text-sm leading-relaxed text-white/85">{t("message")}</p>

              <dl className="mt-5 divide-y divide-white/10 border-t border-white/10">
                <div className="py-3">
                  <dt className="text-sm font-semibold text-white">{t("features.full_access")}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-white/75">{t("features.full_access_desc")}</dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-semibold text-white">{t("features.advanced")}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-white/75">{t("features.advanced_desc")}</dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-semibold text-white">
                    {t(billingInterval === "annual" ? "features.billing_annual" : "features.billing_monthly")}
                  </dt>
                  <dd className="mt-1 text-xs leading-relaxed text-white/75">
                    {t(
                      billingInterval === "annual"
                        ? "features.billing_annual_desc"
                        : "features.billing_monthly_desc"
                    )}
                  </dd>
                </div>
              </dl>

              {sessionId && (
                <p className="mt-4 text-[11px] tabular-nums text-white/55">
                  {t("reference")} {sessionId.substring(0, 16)}...
                </p>
              )}
            </Panel>

            {/* Actions. Dutch routes: /study only resolved via a 308 and
                /courses resolved to nothing at all - a 404 on the page a
                customer lands on immediately after paying. */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={`/studie`} className={CTA_PRIMARY}>
                {t("cta_study")}
              </Link>
              <Link
                href={`/studies`}
                className="rounded-md text-sm font-semibold text-white/85 no-underline underline-offset-4 outline-none transition-colors hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white"
              >
                {t("cta_courses")}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
