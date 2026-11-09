"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { BookOpen, Flame, MessageCircle, NotebookPen } from "lucide-react"

import {
  PRO_FEATURE_NAMES,
  dutchList,
  freeIncludes,
  type ProFeature,
} from "../../lib/entitlements"
import type { TrialSummary } from "../../lib/reverseTrialRules"
import { track } from "../../lib/analytics"

/** What GET /api/v1/reverse-trial answers, as far as the recap uses it. */
interface RecapData {
  isPro: boolean
  trial: TrialSummary | null
  streak: number
  personal: { feature: ProFeature; headline: string | null; limitLine: string } | null
}

/**
 * "Je Pro-dagen zitten erop" - shown once, on the first visit after a new
 * account's reverse trial ended (lib/reverseTrial.ts): what the reader did
 * with Pro, what changes now (their personal limit, in the same words the
 * routes enforce), a way to keep Pro and a way to carry on for free.
 *
 * Mounted in the root layout, which passes `pending` from the session, so an
 * account without a recap due costs no request at all. Once shown it is
 * marked seen on the server, so the app does not show it a second time.
 */
export default function TrialRecapDialog({ pending }: { pending: boolean }) {
  const router = useRouter()
  const [data, setData] = useState<RecapData | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!pending) return
    let cancelled = false
    fetch("/api/v1/reverse-trial", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<RecapData>) : null))
      .catch(() => null)
      .then((next) => {
        if (cancelled || !next?.trial?.recapPending || next.isPro) return
        setData(next)
        setOpen(true)
        void fetch("/api/v1/reverse-trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "recap_seen", platform: "web" }),
        }).catch(() => undefined)
      })
    return () => {
      cancelled = true
    }
  }, [pending])

  if (!data?.trial) return null
  const { trial, personal } = data
  const feature = personal?.feature ?? null
  const report = (action: "upgrade" | "continue_free") =>
    track("trial_recap_action", { action, feature: feature ?? "none" })

  const stats = [
    { icon: BookOpen, value: trial.usage.chapters, label: trial.usage.chapters === 1 ? "hoofdstuk gelezen" : "hoofdstukken gelezen" },
    { icon: NotebookPen, value: trial.usage.notes, label: trial.usage.notes === 1 ? "notitie" : "notities" },
    { icon: MessageCircle, value: trial.usage.ai, label: trial.usage.ai === 1 ? "AI-vraag" : "AI-vragen" },
    { icon: Flame, value: data.streak, label: data.streak === 1 ? "dag reeks" : "dagen reeks" },
  ]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[130] bg-slate-900/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby="trial-recap-summary"
          className="fixed left-1/2 top-1/2 z-[131] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-xl outline-none max-md:p-5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-teal-dark">BijbelStudie Pro</p>
          <DialogPrimitive.Title className="mt-1.5 text-[24px] font-bold leading-tight tracking-[-0.4px] text-ink">
            Je Pro-dagen zitten erop
          </DialogPrimitive.Title>
          <p id="trial-recap-summary" className="mt-1.5 text-[14px] leading-[1.5] text-ink-muted">
            Dit deed je in {trial.daysUsed === 1 ? "je ene dag" : `je ${trial.daysUsed} dagen`} met Pro:
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-2.5">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-btn border border-line bg-line-soft px-3.5 py-3 dark:bg-background">
                <Icon size={16} aria-hidden className="text-teal" />
                <dt className="sr-only">{label}</dt>
                <dd className="mt-1.5 text-[22px] font-bold leading-none tabular-nums text-ink">{value}</dd>
                <dd className="mt-1 text-[12.5px] text-ink-muted">{label}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[1.1px] text-ink-faint">Wat er nu verandert</h3>
          {personal ? (
            <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-body">
              {personal.headline ? `${personal.headline}. ` : ""}
              Omdat je {PRO_FEATURE_NAMES[personal.feature]} het meest gebruikte, houd je daarvan gratis{" "}
              <strong className="font-semibold text-ink">{personal.limitLine}</strong>.
            </p>
          ) : (
            <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-body">
              Je gaat verder met de gratis versie.
            </p>
          )}
          <p className="mt-1.5 text-[13.5px] leading-[1.55] text-ink-muted">
            Gratis blijft: {dutchList(freeIncludes(feature))}.
          </p>

          <button
            type="button"
            onClick={() => {
              report("upgrade")
              setOpen(false)
              router.push("/abonnement?source=trial_recap")
            }}
            className="mt-5 flex h-14 w-full items-center justify-center rounded-btn bg-teal-dark text-[15.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Houd Pro
          </button>
          <button
            type="button"
            onClick={() => {
              report("continue_free")
              setOpen(false)
            }}
            className="mt-2 h-11 w-full rounded-btn text-[14px] font-medium text-ink-muted hover:bg-sunken hover:text-ink"
          >
            Gratis verder
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
