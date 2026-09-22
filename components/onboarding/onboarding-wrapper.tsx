"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  clearGuestOnboarding,
  hasGuestOnboarding,
  migrateGuestOnboarding,
} from "../../lib/guestOnboarding"
import { useLevensboom } from "../../hooks/useLevensboom"
import { useStudyStyle } from "../providers/study-style-provider"

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
  const router = useRouter()
  const { plant } = useLevensboom()
  const { setStudyStyle } = useStudyStyle()

  // Resolved once the guest handover below has had its say. Until then nothing
  // renders, so someone who already answered the questions as a guest never
  // sees them flash past before the handover removes them.
  const [ask, setAsk] = useState(false)
  const [resolved, setResolved] = useState(false)
  const ran = useRef(false)

  // Hold the modal back until the page's content has fully loaded, so it
  // never flashes over a half-rendered (or still-loading) page on the user's
  // first login/registration.
  const [contentLoaded, setContentLoaded] = useState(false)

  /**
   * What the visitor answered before they had an account.
   *
   * The guest flow keeps its answers in localStorage; this is where they stop
   * being a guest's and become the account's. It runs on every signed-in page
   * load and costs one localStorage read when there is nothing to carry over,
   * which is the normal case - same discipline as
   * components/auth/GuestProgressMigration.tsx, which does the same job for
   * lessons.
   */
  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!hasGuestOnboarding()) {
      setAsk(shouldShow)
      setResolved(true)
      return
    }

    // The account has already been through this. Its own preferences win, so
    // the guest record is dropped rather than replayed over them.
    if (!shouldShow) {
      clearGuestOnboarding()
      setResolved(true)
      return
    }

    let cancelled = false
    void migrateGuestOnboarding()
      .then(async answers => {
        if (cancelled) return
        if (!answers) {
          // The post failed, so nothing was carried over and the record is
          // still there for the next load. Ask the questions in the meantime -
          // answering them writes the same preferences anyway.
          setAsk(true)
          setResolved(true)
          return
        }
        // Applied to the live app before the refresh, exactly as the flow does
        // it: the sidebar reads the study style from context, not from the
        // server render.
        if (answers.studyStyle) setStudyStyle(answers.studyStyle)
        if (answers.species) await plant(answers.species)
        if (cancelled) return
        setResolved(true)
        router.refresh()
      })
      .catch(() => {
        if (cancelled) return
        setAsk(shouldShow)
        setResolved(true)
      })

    return () => {
      cancelled = true
    }
  }, [shouldShow, plant, setStudyStyle, router])

  useEffect(() => {
    if (!resolved || !ask) return

    if (document.readyState === "complete") {
      setContentLoaded(true)
      return
    }

    const onLoad = () => setContentLoaded(true)
    window.addEventListener("load", onLoad)
    return () => window.removeEventListener("load", onLoad)
  }, [resolved, ask])

  if (!resolved || !ask || !contentLoaded) return null

  return (
    <OnboardingModal
      isOpen={true}
      onClose={() => setAsk(false)}
      onComplete={() => setAsk(false)}
    />
  )
}
