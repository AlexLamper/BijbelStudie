"use client"

import { useState } from "react"
import { ThumbsDown, ThumbsUp } from "lucide-react"
import { SIGNAL_REASONS, type SignalKind } from "../../lib/feedbackSignal"

/**
 * Thumbs up or down, and after a thumbs-down one row of reason chips.
 *
 * A reader-initiated one-tap signal, not a prompt: it asks nothing on its own
 * and spends no prompt budget. Every send is fire-and-forget - a failed
 * feedback write must never surface to someone doing us a favour.
 *
 * `POST /api/v1/feedback/signal`. A thumbs-up is sent on the tap. A thumbs-down
 * opens the chips and is sent with the chosen reason, or without one when the
 * reader closes the row ("Sla over").
 */
export default function ThumbsSignal({
  kind,
  label,
  payload = {},
  onReason,
  className = "",
}: {
  kind: SignalKind
  /** Accessible name for the group, e.g. "Was dit antwoord nuttig?". */
  label: string
  /** Extra body fields: studyId, lessonDay, path. */
  payload?: Record<string, unknown>
  /** Called with the chosen thumbs-down reason, before it is sent. */
  onReason?: (reason: string) => void
  className?: string
}) {
  const [state, setState] = useState<"idle" | "choosing" | "done">("idle")
  const [picked, setPicked] = useState<"up" | "down" | null>(null)

  function send(value: "up" | "down", reason?: string) {
    void fetch("/api/v1/feedback/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, value, ...(reason ? { reason } : {}), platform: "web", ...payload }),
    }).catch(() => {})
  }

  if (state === "done") {
    return (
      <p role="status" className={`text-[11.5px] text-ink-faint ${className}`}>
        Dank je voor je reactie.
      </p>
    )
  }

  const thumb = (value: "up" | "down") =>
    `flex h-7 w-7 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 ${
      picked === value ? "bg-teal-faint text-teal dark:text-teal-400" : "text-ink-faint hover:bg-line-soft hover:text-ink-body"
    }`

  return (
    <div className={className}>
      <div role="group" aria-label={label} className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Nuttig"
          aria-pressed={picked === "up"}
          disabled={state !== "idle"}
          onClick={() => {
            setPicked("up")
            send("up")
            setState("done")
          }}
          className={thumb("up")}
        >
          <ThumbsUp size={14} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Niet nuttig"
          aria-pressed={picked === "down"}
          disabled={state !== "idle"}
          onClick={() => {
            setPicked("down")
            setState("choosing")
          }}
          className={thumb("down")}
        >
          <ThumbsDown size={14} aria-hidden />
        </button>
      </div>

      {state === "choosing" && (
        <div className="mt-1.5">
          <p className="text-[11.5px] text-ink-muted">Wat klopte er niet?</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {SIGNAL_REASONS[kind].map((reason) => (
              <button
                key={reason.key}
                type="button"
                onClick={() => {
                  onReason?.(reason.key)
                  send("down", reason.key)
                  setState("done")
                }}
                className="rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ink-body transition-colors hover:bg-line-soft"
              >
                {reason.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                send("down")
                setState("done")
              }}
              className="px-1.5 py-1 text-[11.5px] font-semibold text-ink-muted hover:underline"
            >
              Sla over
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
