"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { GUEST_ONBOARDING_PENDING_KEY } from "../../lib/guestOnboarding"

/** Loaded on demand, never with the page - see onboarding-wrapper.tsx. */
const OnboardingModal = dynamic(
  () => import("./onboarding-modal").then(m => m.OnboardingModal),
  { ssr: false },
)

/**
 * The account onboarding's guest counterpart.
 *
 * `OnboardingWrapper` only mounts once `session?.user` exists (app/layout.tsx
 * gates it there), because it reads the account's `onboardingCompleted` flag -
 * so a visitor who chooses "Doorgaan als gast" on /inloggen or /registreren
 * never saw the first-run tour at all, even though a guest is exactly who
 * benefits most from being shown around the platform.
 *
 * There is no account here to carry a flag, so the signal is a one-shot
 * localStorage key instead: `ContinueAsGuest` sets it the moment a visitor
 * confirms they want to continue without an account, right before it sends
 * them into the app. This wrapper - mounted in the root layout for every
 * signed-out page - reads it on the very next render and removes it
 * immediately, so a later refresh (or simply browsing on as a guest) can
 * never re-trigger the modal.
 */
export function GuestOnboardingWrapper() {
  const [shouldShow, setShouldShow] = useState(false)
  const [contentLoaded, setContentLoaded] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(GUEST_ONBOARDING_PENDING_KEY)) {
        localStorage.removeItem(GUEST_ONBOARDING_PENDING_KEY)
        setShouldShow(true)
      }
    } catch {
      /* no localStorage (private mode, etc.) - guest simply gets no tour */
    }
  }, [])

  // Same "wait for the page behind it to finish loading" discipline as the
  // account wrapper, so the modal never flashes over a half-rendered page.
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
