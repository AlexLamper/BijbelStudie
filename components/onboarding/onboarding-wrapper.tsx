"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

/**
 * Loaded on demand, never with the page.
 *
 * This wrapper is mounted by the ROOT layout, so a static import of the modal
 * put its entire graph - Radix's dialog, TreeCanvas and the levensboom
 * generator behind it - into the client graph of every signed-in route, to
 * render a surface that only a brand-new account ever sees, once. The wrapper
 * already renders nothing until `contentLoaded`, so deferring the import
 * changes nothing about what appears on screen or when: the request for the
 * chunk starts at exactly the moment the modal would have started rendering.
 */
const OnboardingModal = dynamic(
  () => import("./onboarding-modal").then(m => m.OnboardingModal),
  { ssr: false },
)

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
