"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * The daily goal on the website: GET/PATCH /api/v1/daily-goal
 * (lib/dailyGoal.ts). The same stored goal the app shows, so a goal picked on
 * the phone is already the goal here.
 *
 * The reading clock (ReadingClock.tsx) reports time on /lezen and /studie and
 * broadcasts the server's answer as GOAL_EVENT, so a card mounted in the same
 * tab moves without a refetch. Another tab picks it up on its next load.
 */

export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20] as const

export const GOAL_EVENT = "bs:daily-goal"

export type DailyGoalView = {
  minutes: number
  chosen: boolean
  day: string
  seconds: number
  minutesRead: number
  progress: number
  reached: boolean
}

/** The reader's own calendar day, 'YYYY-MM-DD'. */
export function localDay(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function useDailyGoal(enabled = true) {
  const [goal, setGoal] = useState<DailyGoalView | null>(null)
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetch(`/api/v1/daily-goal?day=${localDay()}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled && data?.goal) setGoal(data.goal as DailyGoalView)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    function onUpdate(e: Event) {
      const next = (e as CustomEvent<DailyGoalView>).detail
      if (next) setGoal(next)
    }
    window.addEventListener(GOAL_EVENT, onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener(GOAL_EVENT, onUpdate)
    }
  }, [enabled])

  const choose = useCallback(
    async (minutes: number, source: "web_dashboard" | "web_settings") => {
      const previous = goal
      if (goal) {
        const progress = Math.min(1, goal.seconds / (minutes * 60))
        setGoal({ ...goal, minutes, chosen: true, progress, reached: goal.seconds >= minutes * 60 })
      }
      try {
        const res = await fetch("/api/v1/daily-goal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes, day: localDay(), source, platform: "web" }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data?.goal) setGoal(data.goal as DailyGoalView)
        return true
      } catch {
        setGoal(previous)
        return false
      }
    },
    [goal],
  )

  return { goal, loading, choose }
}
