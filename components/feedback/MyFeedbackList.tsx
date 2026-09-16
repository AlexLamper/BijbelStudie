"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "../kit/primitives"
import type { MineItem, MineStatus } from "../../lib/feedbackMine"

/**
 * "Mijn feedback": what the reader sent, where it stands, and any answer.
 *
 * Opening the list marks answers as seen (one POST, only when there is
 * something unseen), which is also what retires the dashboard's closed-loop
 * card. The unseen answers keep their highlight for this visit.
 */

const STEPS: { key: MineStatus; label: string }[] = [
  { key: "ontvangen", label: "Ontvangen" },
  { key: "bekeken", label: "Bekeken" },
  { key: "gepland", label: "Gepland" },
  { key: "opgelost", label: "Opgelost" },
]

function formatDate(iso: string): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
}

export default function MyFeedbackList({ onSeen }: { onSeen?: () => void }) {
  const [items, setItems] = useState<MineItem[] | null>(null)
  const [error, setError] = useState(false)
  const onSeenRef = useRef(onSeen)
  onSeenRef.current = onSeen

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/feedback/mine", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return
        const list: MineItem[] = Array.isArray(data?.items) ? data.items : []
        setItems(list)
        if (list.some((item) => item.hasUnseenReply)) {
          void fetch("/api/v1/feedback/mine", { method: "POST" })
            .then(() => onSeenRef.current?.())
            .catch(() => {})
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <Card className="p-[22px]">
        <p className="text-[13.5px] text-ink-muted">Je feedback kon niet worden geladen. Probeer het later opnieuw.</p>
      </Card>
    )
  }

  if (items === null) {
    return (
      <Card className="p-[22px]" aria-busy="true">
        <div className="h-4 w-1/3 animate-pulse rounded bg-line-soft" />
        <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-line-soft" />
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="p-[22px]">
        <h2 className="text-[16px] font-bold text-ink">Nog geen feedback</h2>
        <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-muted">
          Wat je hier via het formulier stuurt, verschijnt in deze lijst. Je ziet dan ook wat ermee gebeurt.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const stepIndex = STEPS.findIndex((step) => step.key === item.status)
        return (
          <Card
            key={item.id}
            className={`p-[18px] ${item.hasUnseenReply ? "border-[#0D9488]" : ""}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="min-w-0 flex-1 break-words text-[14.5px] font-semibold text-ink">
                {item.subject || item.message.split("\n")[0].slice(0, 90)}
              </p>
              <span className="text-[12px] text-ink-faint">{formatDate(item.createdAt)}</span>
            </div>
            {item.subject && (
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[13px] leading-[1.6] text-ink-muted">
                {item.message}
              </p>
            )}

            <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1" aria-label={`Status: ${item.statusLabel}`}>
              {STEPS.map((step, i) => {
                const reached = i <= stepIndex
                return (
                  <li key={step.key} className="flex items-center gap-2">
                    <span
                      aria-current={i === stepIndex ? "step" : undefined}
                      className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold ${
                        i === stepIndex
                          ? "bg-teal text-white"
                          : reached
                            ? "bg-teal-faint text-teal dark:text-teal-400"
                            : "bg-line-soft text-ink-faint"
                      }`}
                    >
                      {step.label}
                    </span>
                    {i < STEPS.length - 1 && <span aria-hidden className="text-[11px] text-ink-faint">·</span>}
                  </li>
                )
              })}
            </ol>

            {item.replies.map((reply, i) => (
              <div key={i} className="mt-3 rounded-[10px] border border-line bg-sunken px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.9px] text-teal dark:text-teal-400">
                  Antwoord van de maker · {formatDate(reply.at)}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.6] text-ink">{reply.body}</p>
              </div>
            ))}
          </Card>
        )
      })}
    </div>
  )
}
