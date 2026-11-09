"use client"

import { useState } from "react"
import Link from "next/link"

/** The one action on /afmelden: POST the signed link, then say what happened. */
export default function UnsubscribeButton({ u, k, t }: { u: string; k: string; t: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle")

  async function confirm() {
    setState("busy")
    try {
      const q = new URLSearchParams({ u, k, t })
      const res = await fetch(`/api/email/unsubscribe?${q.toString()}`, { method: "POST" })
      setState(res.ok ? "done" : "error")
    } catch {
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <p className="mt-5 text-[15px] leading-[1.6] text-ink">
        Gelukt, je bent afgemeld. Wil je het later weer aanzetten? Dat kan bij{" "}
        <Link href="/instellingen" className="font-semibold text-teal">
          Instellingen
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={confirm}
        disabled={state === "busy"}
        className="inline-flex h-11 items-center rounded-btn bg-teal px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {state === "busy" ? "Bezig..." : "Afmelden"}
      </button>
      {state === "error" && (
        <p className="mt-3 text-[13.5px] text-ink-muted">
          Dat lukte niet. Probeer het nog eens, of zet het uit bij Instellingen.
        </p>
      )}
    </div>
  )
}
