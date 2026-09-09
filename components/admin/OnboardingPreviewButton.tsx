"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { OnboardingModal } from "../onboarding/onboarding-modal"
import { TEAL_ON_DARK } from "../scene/tokens"

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
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/85 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
      >
        {/* The one icon here identifies the control - this button plays
            something back. It is not decoration. */}
        <Play size={14} style={{ color: TEAL_ON_DARK, flexShrink: 0 }} aria-hidden />
        <span className="min-w-0 flex-1">
          Onboarding afspelen
          <span className="mt-0.5 block text-xs text-white/60">
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
