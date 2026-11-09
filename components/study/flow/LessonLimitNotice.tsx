"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Lock } from "lucide-react"

import { openProOffer } from "../../../lib/proOffer"
import { trackNow } from "../../../lib/analytics"

/**
 * In place of a lesson the reader may not START today: their personal limit
 * after the reverse trial is studies (lib/lessonAllowance.ts). A lesson they
 * already began is never refused, so this only ever stands in for a new one.
 * The offer opens at once - the reader reached for something Pro - and can be
 * raised again from here after closing it.
 */
export default function LessonLimitNotice({ reason, backHref }: { reason: string; backHref: string }) {
  useEffect(() => {
    trackNow("paywall_hit", { surface: "lessons", platform: "web" })
    openProOffer({ surface: "lessons", reason })
  }, [reason])

  return (
    <main className="flex min-h-[70dvh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-[460px] rounded-card border border-line bg-surface p-6 text-center shadow-sm max-md:p-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-faint text-teal-dark">
          <Lock size={20} aria-hidden />
        </div>
        <h1 className="mt-4 text-[20px] font-bold tracking-[-0.3px] text-ink">Je nieuwe les voor vandaag</h1>
        <p className="mt-2 text-[14px] leading-[1.55] text-ink-muted">{reason}</p>
        <button
          type="button"
          onClick={() => {
            trackNow("paywall_cta_clicked", { surface: "lessons", platform: "web" })
            openProOffer({ surface: "lessons", reason })
          }}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-btn bg-teal-dark text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Meer lessen met Pro
        </button>
        <Link
          href={backHref}
          className="mt-3 inline-block text-[13.5px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Terug naar de studie
        </Link>
      </div>
    </main>
  )
}
