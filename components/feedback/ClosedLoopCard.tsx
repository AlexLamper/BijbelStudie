"use client"

import Link from "next/link"
import { Card } from "../kit/primitives"

/**
 * "Je feedback is opgepakt": shown on the dashboard when the maker answered
 * something the reader sent and they have not read it yet. The link goes to
 * "Mijn feedback", which marks it as seen - so the card retires itself by
 * being used, not by a dismiss button.
 */

const STATUS_LINES: Record<string, string> = {
  planned: "Het staat op de planning.",
  shipped: "Het is opgelost.",
  resolved: "Het is opgelost.",
}

export interface ClosedLoopReply {
  feedbackId: string
  subject: string
  excerpt: string
  status: string
  reply: { at: string; body: string }
}

export default function ClosedLoopCard({ reply }: { reply: ClosedLoopReply }) {
  const about = reply.subject || reply.excerpt
  const statusLine = STATUS_LINES[reply.status]
  const preview = reply.reply.body.length > 180 ? `${reply.reply.body.slice(0, 180).trimEnd()}...` : reply.reply.body

  return (
    <Card className="flex flex-none flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5 max-md:px-5">
      <div className="min-w-[min(100%,240px)] flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[1.4px] text-teal dark:text-teal-400">
          Je feedback is opgepakt
        </div>
        {about && (
          <p className="mt-[6px] line-clamp-1 break-words text-[14.5px] font-semibold text-ink">{about}</p>
        )}
        <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-[13.5px] leading-[1.6] text-ink-muted">
          {statusLine ? `${statusLine} ` : ""}
          {preview}
        </p>
      </div>
      <Link
        href="/feedback?tab=mijn"
        className="inline-flex h-10 flex-none items-center rounded-[10px] border border-line px-4 text-[13.5px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft max-md:w-full max-md:justify-center"
      >
        Lees het antwoord
      </Link>
    </Card>
  )
}
