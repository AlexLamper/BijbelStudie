"use client"

import { useEffect, useState } from "react"
import { OnboardingModal } from "./onboarding-modal"

interface OnboardingWrapperProps {
  shouldShow: boolean
}

export function OnboardingWrapper({ shouldShow }: OnboardingWrapperProps) {
  // Hold the modal back until the page's content has fully loaded, so it
  // never flashes over a half-rendered (or still-loading) page on the user's
  // first login/registration.
  const [contentLoaded, setContentLoaded] = useState(false)

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
      onClose={() => {}}
      onComplete={() => {}}
    />
  )
}
