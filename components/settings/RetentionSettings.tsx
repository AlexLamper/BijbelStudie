"use client"

import { useEffect, useState } from "react"
import { Switch } from "../ui/switch"
import { Card } from "../kit/primitives"
import { DAILY_GOAL_OPTIONS, useDailyGoal } from "../dailyGoal/useDailyGoal"

/**
 * Two cards on /instellingen -> Meldingen: the daily goal (lib/dailyGoal.ts)
 * and the win-back mail switch (lib/emailPrefs.ts). Both are the same stored
 * values the app's Instellingen change.
 */

/** Same toggle as the rest of /instellingen. */
const TOGGLE =
  "h-[27px] w-[46px] border-0 px-[3px] data-[state=checked]:bg-teal data-[state=unchecked]:bg-line-strong focus-visible:ring-teal focus-visible:ring-offset-0 [&>span]:h-[21px] [&>span]:w-[21px] [&>span]:bg-white [&>span]:shadow-none [&>span[data-state=checked]]:translate-x-[19px]"

const SEG_TRACK =
  "inline-flex h-9 items-center rounded-[9px] border border-line bg-surface p-[3px] max-md:max-w-full max-md:overflow-x-auto"
const SEG_ITEM =
  "flex h-[28px] items-center gap-1.5 rounded-[7px] px-3 text-[12.5px] font-medium outline-none transition-colors max-md:flex-none max-md:whitespace-nowrap"
const SEG_ON = "bg-teal font-semibold text-white"
const SEG_OFF = "text-ink-muted hover:bg-line-soft hover:text-ink-body"

function DailyGoalSetting() {
  const { goal, choose } = useDailyGoal()
  const [failed, setFailed] = useState(false)

  return (
    <Card id="instelling-dagdoel" className="flex-none scroll-mt-6 px-[22px] py-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16.5px] font-bold text-ink">Dagdoel</h2>
          <p className="mt-[3px] text-[12px] leading-relaxed text-ink-faint">
            Hoeveel minuten je per dag wilt lezen. Haal je het, dan groeit je boom een stukje extra.
          </p>
        </div>
        <div className={SEG_TRACK} role="group" aria-label="Dagdoel in minuten">
          {DAILY_GOAL_OPTIONS.map(option => {
            const active = Boolean(goal?.chosen) && goal?.minutes === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={async () => {
                  setFailed(false)
                  if (!(await choose(option, "web_settings"))) setFailed(true)
                }}
                className={`${SEG_ITEM} ${active ? SEG_ON : SEG_OFF}`}
              >
                {option} min
              </button>
            )
          })}
        </div>
      </div>
      {failed && (
        <p role="alert" className="mt-2 text-[12px] text-danger">
          Opslaan is niet gelukt. Probeer het later opnieuw.
        </p>
      )}
    </Card>
  )
}

function WinbackEmailSetting() {
  const [on, setOn] = useState<boolean | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch("/api/v1/email-prefs", { cache: "no-store" })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setOn(Boolean(data?.winback) && Boolean(data?.all)))
      .catch(() => setFailed(true))
  }, [])

  function change(next: boolean) {
    const previous = on
    setOn(next)
    setFailed(false)
    fetch("/api/v1/email-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winback: next }),
    })
      .then(res => {
        if (!res.ok) throw new Error()
      })
      .catch(() => {
        setOn(previous)
        setFailed(true)
      })
  }

  return (
    <Card id="instelling-email" className="flex-none scroll-mt-6 px-[22px] py-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16.5px] font-bold text-ink">E-mail als je een tijdje weg bent</h2>
          <p className="mt-[3px] text-[12px] leading-relaxed text-ink-faint">
            Na 3, 7 en 14 dagen zonder lezen een korte mail over waar je gebleven was. Hooguit drie keer, daarna niet meer.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center sm:justify-end">
          <Switch
            checked={on ?? true}
            disabled={on === null}
            onCheckedChange={change}
            aria-label="E-mail als je een tijdje weg bent"
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

export default function RetentionSettings() {
  return (
    <>
      <DailyGoalSetting />
      <WinbackEmailSetting />
    </>
  )
}
