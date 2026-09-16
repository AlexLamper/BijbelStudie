"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import { useTranslation } from "../i18n/client"
import { trackNow } from "../../lib/analytics"
import { useLevensboom } from "../../hooks/useLevensboom"
import AppShell from "../../components/shell/AppShell"
import { Card, Skeleton } from "../../components/kit/primitives"

/**
 * The checkout return, in the app shell.
 *
 * Restyled, not rebuilt: the same single POST to /api/verify-subscription per
 * session id, the same `update()` of the session, the same Levensboom refresh
 * for the new gold ring, the same `checkout_completed` event, the same
 * redirect back to /abonnement when there is no session id or the verification
 * fails, and the same two destinations afterwards.
 *
 * Someone is standing in the middle of a transaction here, so everything that
 * answers "did my payment go through" sits in one card on the first screen.
 * The top bar carries the page's only <h1> ("Abonnement", the route the
 * checkout started from), so the card's heading is an <h2>.
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
    <AppShell title="Abonnement">
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="w-full max-w-[38rem]">
          {status === "loading" ? (
            // The waiting state, in the shape of the card that is coming.
            <div role="status" aria-label={t("verifying")}>
              <Skeleton className="h-[26rem] w-full rounded-card" />
            </div>
          ) : (
            <section aria-labelledby="succes-titel">
              <Card className="p-6 sm:p-8">
                {/* The answer to "did it work", first and in the brand colour.
                    The tick identifies the line as a status. teal-dark, not
                    teal: #0D9488 on the faint wash is too light for 12 px type. */}
                <p className="inline-flex items-center gap-1.5 rounded-full bg-teal-faint px-3 py-1 text-xs font-semibold text-teal-dark dark:text-teal-400">
                  <CheckCircle size={14} aria-hidden className="flex-shrink-0" />
                  {t("status")}
                </p>
                <h2
                  id="succes-titel"
                  className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl"
                >
                  {t("title")}
                </h2>
                <p className="mt-2 text-base leading-relaxed text-ink-body">{t("subtitle")}</p>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t("message")}</p>

                {/* What the subscription now is, in three lines. */}
                <dl className="mt-6 divide-y divide-line-soft border-y border-line-soft">
                  <div className="py-3">
                    <dt className="text-sm font-semibold text-ink">{t("features.full_access")}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-ink-muted">{t("features.full_access_desc")}</dd>
                  </div>
                  <div className="py-3">
                    <dt className="text-sm font-semibold text-ink">{t("features.advanced")}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-ink-muted">{t("features.advanced_desc")}</dd>
                  </div>
                  <div className="py-3">
                    <dt className="text-sm font-semibold text-ink">
                      {t(billingInterval === "annual" ? "features.billing_annual" : "features.billing_monthly")}
                    </dt>
                    <dd className="mt-1 text-xs leading-relaxed text-ink-muted">
                      {t(
                        billingInterval === "annual"
                          ? "features.billing_annual_desc"
                          : "features.billing_monthly_desc"
                      )}
                    </dd>
                  </div>
                </dl>

                {sessionId && (
                  <p className="mt-3 text-[11px] tabular-nums text-ink-faint">
                    {t("reference")} {sessionId.substring(0, 16)}...
                  </p>
                )}

                {/* Actions. Dutch routes: /study only resolved via a 308 and
                    /courses resolved to nothing at all - a 404 on the page a
                    customer lands on immediately after paying. White type
                    sits on teal-dark (#0F766E, 5.5:1), not teal (3.74:1). */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/studie`}
                    className="press inline-flex h-11 items-center justify-center rounded-btn bg-teal-dark px-5 text-sm font-semibold text-white no-underline outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
                  >
                    {t("cta_study")}
                  </Link>
                  <Link
                    href={`/studies`}
                    className="press inline-flex h-11 items-center justify-center rounded-btn border border-line bg-surface px-5 text-sm font-semibold text-ink-body no-underline outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
                  >
                    {t("cta_courses")}
                  </Link>
                </div>
              </Card>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  )
}
