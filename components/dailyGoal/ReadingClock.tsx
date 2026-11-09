"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { toast } from "../../hooks/use-toast"
import { GOAL_EVENT, localDay, type DailyGoalView } from "./useDailyGoal"

/**
 * Counts reading time for the daily goal on /lezen and /studie. Renders
 * nothing.
 *
 * A second counts when the tab is visible and the reader did something - a
 * scroll, a key, a tap, a wheel - in the last two minutes; a tab left open
 * on a chapter overnight adds nothing. Time is sent to POST
 * /api/v1/daily-goal every minute and when the tab is hidden or closed
 * (`keepalive`, so the last stretch survives the navigation). The server
 * bounds what a report may add (lib/dailyGoal.ts).
 *
 * The app's twin is lib/features/daily_goal/data/reading_clock.dart, with the
 * same two-minute rule.
 */

const TICK_MS = 5_000
const IDLE_MS = 120_000
const FLUSH_SECONDS = 60

export default function ReadingClock() {
  const { status } = useSession()

  useEffect(() => {
    if (status !== "authenticated") return

    let lastActive = Date.now()
    let pending = 0
    let sending = false

    const touch = () => {
      lastActive = Date.now()
    }

    async function flush(keepalive = false) {
      if (pending <= 0 || (sending && !keepalive)) return
      const seconds = pending
      pending = 0
      sending = true
      try {
        const res = await fetch("/api/v1/daily-goal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seconds, day: localDay(), platform: "web" }),
          keepalive,
        })
        if (!res.ok) return
        const data = (await res.json().catch(() => null)) as { goal?: DailyGoalView; justReached?: boolean } | null
        if (data?.goal) window.dispatchEvent(new CustomEvent(GOAL_EVENT, { detail: data.goal }))
        if (data?.justReached && data.goal) {
          toast({
            title: "Dagdoel gehaald",
            description: `${data.goal.minutes} minuten gelezen vandaag. +10 XP voor je boom.`,
          })
        }
      } catch {
        // Lost time is lost; a retry storm is worse.
      } finally {
        sending = false
      }
    }

    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - lastActive > IDLE_MS) return
      pending += TICK_MS / 1000
      if (pending >= FLUSH_SECONDS) void flush()
    }, TICK_MS)

    const onHide = () => {
      if (document.visibilityState === "hidden") void flush(true)
    }
    const onPageHide = () => void flush(true)

    const events = ["scroll", "keydown", "pointerdown", "wheel", "touchstart"] as const
    for (const name of events) window.addEventListener(name, touch, { passive: true, capture: true })
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", onPageHide)

    return () => {
      window.clearInterval(tick)
      for (const name of events) window.removeEventListener(name, touch, { capture: true })
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pagehide", onPageHide)
      void flush(true)
    }
  }, [status])

  return null
}
