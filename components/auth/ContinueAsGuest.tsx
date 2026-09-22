"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { guestTarget } from "../../lib/guestTarget"
import { markGuestOnboardingPending } from "../../lib/guestOnboarding"
import { Modal } from "../ui/modal"
import { Button } from "../ui/button"

/**
 * The quiet way past the auth form: "of" and a secondary link into the app
 * without an account. Drawn for the night scene of /inloggen and /registreren,
 * so every colour outside the confirmation dialog is a literal (see
 * app/inloggen/page.tsx).
 *
 * `next` is the raw parameter from the URL; lib/guestTarget validates it and
 * falls back to the studies when it points at an account-only page.
 *
 * What used to be a caption under the button - "Zonder account lees je de
 * Bijbel ... Je voortgang wordt niet bewaard." - is now the body of a short
 * confirmation dialog instead, so it is read once, at the moment it matters,
 * rather than sitting as permanent fine print under a button most visitors
 * never press. The dialog itself is the app's ordinary Modal
 * (components/ui/modal.tsx), the same one CreateNoteModal/EditNoteModal use,
 * so a guest gets the same focus-trapped, themed dialog as everywhere else -
 * not a second implementation drawn to match the night scene.
 */
export default function ContinueAsGuest({ next }: { next: string | null }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const target = guestTarget(next)

  const proceed = () => {
    // Tells the root layout's GuestOnboardingWrapper to run the first-run
    // flow on the very next render, wherever `target` lands, now that there is
    // no account whose `onboardingCompleted` flag could carry the same signal.
    markGuestOnboardingPending()
    setConfirmOpen(false)
    router.push(target)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/15" />
        <span className="text-xs text-white/55">of</span>
        <div className="h-px flex-1 bg-white/15" />
      </div>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
      >
        Doorgaan als gast
      </button>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Doorgaan als gast"
      >
        <p className="text-sm leading-relaxed text-gray-600 dark:text-muted-foreground">
          Zonder account lees je de Bijbel en volg je de studies. Je voortgang wordt niet
          bewaard - maak later gratis een account aan om verder te gaan waar je gebleven was.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
            Annuleren
          </Button>
          <Button
            type="button"
            data-track="auth_continue_as_guest"
            onClick={proceed}
            className="bg-teal-700 text-white hover:bg-teal-800"
          >
            Doorgaan als gast
          </Button>
        </div>
      </Modal>
    </div>
  )
}
