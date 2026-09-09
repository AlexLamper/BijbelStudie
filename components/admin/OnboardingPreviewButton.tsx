"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { OnboardingModal } from "../onboarding/onboarding-modal"

const TEAL = "#0D9488"

/**
 * Replay the first-run flow without making an account for it.
 *
 * The flow only ever shows itself to an account whose `onboardingCompleted` is
 * false, so reviewing a change to it used to mean registering again. This
 * mounts the same component in preview mode, where every write it normally
 * does - the preferences POST that flips `onboardingCompleted`, `plant()`, the
 * study-style context and the theme - is suppressed, and the theme is restored
 * on the way out. Nothing about the reviewer's account changes.
 *
 * `runId` remounts the modal on every open so a second run starts at step one
 * with the default answers rather than where the last one stopped.
 */
export default function OnboardingPreviewButton() {
  const [runId, setRunId] = useState(0)
  const [running, setRunning] = useState(false)

  const close = () => setRunning(false)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRunId(id => id + 1)
          setRunning(true)
        }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-foreground dark:hover:bg-secondary"
      >
        <Play size={14} style={{ color: TEAL, flexShrink: 0 }} aria-hidden />
        <span className="min-w-0 flex-1">
          Onboarding afspelen
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-muted-foreground">
            Niets wordt opgeslagen
          </span>
        </span>
      </button>

      {running && (
        <OnboardingModal
          key={runId}
          preview
          isOpen
          onClose={close}
          onComplete={close}
        />
      )}
    </>
  )
}
