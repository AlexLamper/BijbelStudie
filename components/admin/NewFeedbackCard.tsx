"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { MessageSquare } from "lucide-react"
import { Card } from "../kit/primitives"

/**
 * "Nieuwe feedback" on /beheer: how many items nobody has looked at yet, and
 * the way into exactly that list. The owner reads feedback here rather than
 * through alerts, so this count is the alert.
 *
 * One indexed count (`GET /api/admin/feedback?summary=1`), fetched on its own
 * so a slow stats call never holds it up.
 */
export default function NewFeedbackCard() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/feedback?summary=1", { cache: "no-store", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.newCount === "number") setCount(data.newCount)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Link href="/beheer/feedback?status=new" className="group block flex-none no-underline">
      <Card className="flex items-center gap-3 p-4 transition-colors group-hover:border-line-strong sm:p-[17px]">
        <MessageSquare size={18} className="flex-none text-teal" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold text-ink">Nieuwe feedback</p>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            {count === null ? "Laden..." : count === 0 ? "Alles is bekeken" : "Nog niet bekeken"}
          </p>
        </div>
        <span className="text-[22px] font-bold text-ink tabular-nums">{count ?? "-"}</span>
        <span className="text-[13px] font-semibold text-teal dark:text-teal-400">Bekijken →</span>
      </Card>
    </Link>
  )
}
