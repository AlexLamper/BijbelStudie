"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useEffect, useState } from "react"
import { Check } from "lucide-react"

import { PRO_AI_DAILY_CAP, REVERSE_TRIAL_DAYS } from "../../lib/entitlements"

/** What there is to try, kept to four lines. Each one is Pro on the website. */
const TRY = [
  "Matthew Henry, Calvijn en Dachsel bij elk hoofdstuk",
  "De grondtekst in het Hebreeuws en Grieks",
  `Tot ${PRO_AI_DAILY_CAP} vragen per dag aan de AI-assistent`,
  "Voorlezen met natuurlijke stemmen",
]

/**
 * "Je hebt 3 dagen Pro gekregen" - once, on the first visit of an older free
 * account that is given the reverse trial (lib/reverseTrialRules.ts
 * `isExistingFreeAccount`). New accounts are not shown it: for them the Pro
 * days are simply how the app starts.
 *
 * Mounted in the root layout with `pending` from the session, so nobody else
 * pays a request for it. Marked seen on the server as it opens, so the app
 * does not show it a second time.
 */
export default function TrialAnnouncementDialog({ pending, daysUsed = 1 }: { pending: boolean; daysUsed?: number }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!pending) return
    setOpen(true)
    void fetch("/api/v1/reverse-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "announce_seen", platform: "web" }),
    }).catch(() => undefined)
  }, [pending])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[130] bg-slate-900/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby="trial-announcement-summary"
          className="fixed left-1/2 top-1/2 z-[131] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-xl outline-none max-md:p-5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-teal-dark">BijbelStudie Pro</p>
          <DialogPrimitive.Title className="mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.4px] text-ink">
            Je hebt {REVERSE_TRIAL_DAYS} dagen Pro gekregen
          </DialogPrimitive.Title>
          <p id="trial-announcement-summary" className="mt-1.5 text-[14px] leading-[1.5] text-ink-muted">
            Op de eerste {REVERSE_TRIAL_DAYS} dagen waarop je BijbelStudie opent, kun je alles van Pro gebruiken.
            {daysUsed <= 1 ? " Vandaag is de eerste." : ` Vandaag is dag ${Math.min(daysUsed, REVERSE_TRIAL_DAYS)}.`} Probeer
            bijvoorbeeld:
          </p>
          <ul className="mt-4 space-y-[7px]">
            {TRY.map((line) => (
              <li key={line} className="flex items-start gap-2 text-[14px] text-ink-body">
                <Check size={16} strokeWidth={2.2} aria-hidden className="mt-[2px] flex-shrink-0 text-teal" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] leading-[1.5] text-ink-muted">
            Daarna ga je vanzelf verder met de gratis versie. Van wat je het meest gebruikte, houd je dan een
            klein dagelijks deel.
          </p>
          <DialogPrimitive.Close className="mt-5 flex h-12 w-full items-center justify-center rounded-btn bg-teal-dark text-[15px] font-semibold text-white transition-opacity hover:opacity-90">
            Aan de slag
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
