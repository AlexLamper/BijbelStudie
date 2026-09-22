"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  guestOnboardingRoute,
  hasGuestOnboarding,
  takeGuestOnboardingPending,
} from "../../lib/guestOnboarding"

/** Loaded on demand, never with the page - see onboarding-wrapper.tsx. */
const OnboardingModal = dynamic(
  () => import("./onboarding-modal").then(m => m.OnboardingModal),
  { ssr: false },
)

/**
 * The first-run flow for a visitor without an account.
 *
 * A guest gets the same questions a new account gets, in the same order, from
 * the same component - there is no lesser guest version. What differs is where
 * the answers go: an account posts them to /api/user/preferences, a guest keeps
 * them in localStorage until there is an account to post them to (see
 * lib/guestOnboarding.ts and components/onboarding/onboarding-wrapper.tsx).
 *
 * Two things open it, and the order matters:
 *
 * 1. The one-shot key "Doorgaan als gast" leaves behind, which wins on any
 *    page, because the visitor has just told us they are starting here.
 * 2. Otherwise: a product route (the studies, the reader, a lesson) that this
 *    browser has never answered the questions on. The wrapper is mounted by the
 *    root layout, so it is also alive on the marketing pages, the pricing page
 *    and the auth forms - a full-screen flow over any of those would interrupt
 *    what the visitor actually came for, so it stays shut there.
 *
 * There is no sign-up wall anywhere in here. The account nudge is the last
 * screen of the flow, after the visitor has answers worth keeping.
 */
export function GuestOnboardingWrapper() {
  const pathname = usePathname()
  const [shouldShow, setShouldShow] = useState(false)
  const [contentLoaded, setContentLoaded] = useState(false)

  useEffect(() => {
    if (shouldShow) return
    // Both reads go through lib/guestOnboarding, which falls back to an
    // in-memory copy when the browser hands back nothing at all - so a private
    // window still runs the flow once and still closes it for good.
    if (takeGuestOnboardingPending()) {
      setShouldShow(true)
      return
    }
    if (guestOnboardingRoute(pathname) && !hasGuestOnboarding()) {
      setShouldShow(true)
    }
  }, [pathname, shouldShow])

  // Same "wait for the page behind it to finish loading" discipline as the
  // account wrapper, so the flow never flashes over a half-rendered page.
  useEffect(() => {
    if (!shouldShow) return

    if (document.readyState === "complete") {
      setContentLoaded(true)
      return
    }

    const onLoad = () => setContentLoaded(true)
    window.addEventListener("load", onLoad)
    return () => window.removeEventListener("load", onLoad)
  }, [shouldShow])

  if (!shouldShow || !contentLoaded) return null

  return (
    <OnboardingModal
      isOpen={true}
      guest
      onClose={() => setShouldShow(false)}
      onComplete={() => setShouldShow(false)}
    />
  )
}
