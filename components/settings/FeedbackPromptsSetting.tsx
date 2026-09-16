"use client"

import { useEffect, useState } from "react"
import { Switch } from "../ui/switch"
import { Card } from "../kit/primitives"

/**
 * "Korte vragen over BijbelStudie", on /instellingen -> Meldingen.
 *
 * The switch is ON when questions are allowed; turning it off sets
 * `FeedbackState.optedOut` through `/api/v1/feedback/opt-out`, which every
 * prompt check honours. The thumbs a reader taps on their own and the
 * /feedback page are not questions and stay available.
 */

/** Same toggle as the rest of /instellingen. */
const TOGGLE =
  "h-[27px] w-[46px] border-0 px-[3px] data-[state=checked]:bg-teal data-[state=unchecked]:bg-line-strong focus-visible:ring-teal focus-visible:ring-offset-0 [&>span]:h-[21px] [&>span]:w-[21px] [&>span]:bg-white [&>span]:shadow-none [&>span[data-state=checked]]:translate-x-[19px]"

export default function FeedbackPromptsSetting() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch("/api/v1/feedback/opt-out", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setAllowed(!data?.optedOut))
      .catch(() => setFailed(true))
  }, [])

  function change(next: boolean) {
    const previous = allowed
    setAllowed(next)
    setFailed(false)
    fetch("/api/v1/feedback/opt-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optedOut: !next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error()
      })
      .catch(() => {
        setAllowed(previous)
        setFailed(true)
      })
  }

  return (
    <Card id="instelling-feedback-vragen" className="flex-none scroll-mt-6 px-[22px] py-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16.5px] font-bold text-ink">Korte vragen</h2>
          <p className="mt-[3px] text-[12px] leading-relaxed text-ink-faint">
            Af en toe één vraag over BijbelStudie, bijvoorbeeld na een afgeronde studie. Hooguit één per maand.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center sm:justify-end">
          <Switch
            checked={allowed ?? true}
            disabled={allowed === null}
            onCheckedChange={change}
            aria-label="Korte vragen over BijbelStudie"
            className={TOGGLE}
          />
        </div>
      </div>
      {failed && (
        <p role="alert" className="mt-2 text-[12px] text-danger">
          Opslaan of laden is niet gelukt. Probeer het later opnieuw.
        </p>
      )}
    </Card>
  )
}
