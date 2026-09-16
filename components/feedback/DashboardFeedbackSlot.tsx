"use client"

import { useEffect, useState } from "react"
import { Card } from "../kit/primitives"
import type { SerialisedPrompt } from "../../lib/feedbackPrompts"
import ClosedLoopCard, { type ClosedLoopReply } from "./ClosedLoopCard"
import PromptCard from "./PromptCard"

/**
 * The dashboard's single feedback slot (lib/feedbackDashboard.ts decides):
 * an unseen answer, else the "studie afgerond" rating, else "welkom terug".
 * Renders nothing at all on the usual visit.
 *
 * One GET per mount. Serving a prompt spends its budget on the server, so
 * this must never be fetched speculatively or twice.
 */

type Slot =
  | { kind: "reply"; reply: ClosedLoopReply }
  | { kind: "prompt"; prompt: SerialisedPrompt; context: { studyId: string | null } }
  | { kind: "none" }

export default function DashboardFeedbackSlot() {
  const [slot, setSlot] = useState<Slot>({ kind: "none" })

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/feedback/dashboard", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Slot | null) => {
        if (!cancelled && data && (data.kind === "reply" || data.kind === "prompt")) setSlot(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (slot.kind === "reply") return <ClosedLoopCard reply={slot.reply} />

  if (slot.kind === "prompt") {
    return (
      // PromptCard brings its own border and top margin; the Card is the
      // dashboard surface around it.
      <Card className="flex-none px-6 pb-5 pt-1 max-md:px-5">
        <PromptCard
          prompt={slot.prompt}
          tone="light"
          context={{ studyId: slot.context.studyId, path: "/dashboard" }}
          onDone={(outcome) => {
            if (outcome === "skipped") setSlot({ kind: "none" })
          }}
        />
      </Card>
    )
  }

  return null
}
