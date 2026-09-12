"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { OnboardingModal } from "../onboarding/onboarding-modal"

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
        className="flex min-h-[40px] w-full items-center gap-[11px] rounded-btn border border-line px-[13px] py-[7px] text-left transition-colors hover:bg-line-soft"
      >
        {/* The one icon here identifies the control - this button plays
            something back. It is not decoration. */}
        <Play size={18} className="flex-none text-ink-body" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-ink-body">Onboarding afspelen</span>
          <span className="mt-[2px] block text-[11px] text-ink-faint">Niets wordt opgeslagen</span>
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
