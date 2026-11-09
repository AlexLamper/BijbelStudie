"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Card } from "../kit/primitives"
import GoalRing from "./GoalRing"
import { DAILY_GOAL_OPTIONS, useDailyGoal } from "./useDailyGoal"

/**
 * "Dagdoel" in the dashboard rail: the daily goal ring and the level with its
 * XP bar. The web twin of the app's Start strip (lib/features/daily_goal/present/start_progress_strip.dart).
 *
 * The goal is picked right here (5 / 10 / 15 / 20) as well as in
 * Instellingen; it is one stored value for web and app (lib/dailyGoal.ts).
 * When the goal is met the ring turns gold and a short line celebrates it,
 * once per day per browser.
 */

const CELEBRATED_KEY = "bs_goal_celebrated"

export default function DailyGoalCard({
  level,
  xpIntoLevel,
  xpForNextLevel,
}: {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
}) {
  const { goal, loading, choose } = useDailyGoal()
  const [celebrate, setCelebrate] = useState(false)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (!goal?.reached) return
    try {
      if (window.localStorage.getItem(CELEBRATED_KEY) === goal.day) return
      window.localStorage.setItem(CELEBRATED_KEY, goal.day)
    } catch {
      /* private mode: celebrate anyway */
    }
    setCelebrate(true)
  }, [goal?.reached, goal?.day])

  const minutes = goal?.minutes ?? 10
  const read = Math.min(goal?.minutesRead ?? 0, 999)
  const xpPct = xpForNextLevel > 0 ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)) : 0

  return (
    <Card className="flex-none p-[18px]">
      <div className="flex items-center gap-[14px]">
        <GoalRing progress={goal?.progress ?? 0}>
          {goal?.reached ? (
            <Check size={22} strokeWidth={3} className="text-gold" aria-hidden />
          ) : (
            <span className="text-[13px] font-bold tabular-nums text-ink">{loading ? "" : read}</span>
          )}
        </GoalRing>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-ink">Dagdoel</div>
          <div className="mt-[2px] text-[13px] text-ink-muted tabular-nums">
            {goal?.reached
              ? `${minutes} minuten gelezen vandaag`
              : `${read} van ${minutes} minuten vandaag`}
          </div>
          <button
            type="button"
            onClick={() => setPicking(v => !v)}
            className="mt-[5px] text-[12.5px] font-semibold text-teal hover:text-teal-dark dark:text-teal-400"
          >
            {goal?.chosen ? "Doel aanpassen" : "Kies je doel"}
          </button>
        </div>
      </div>

      {celebrate && (
        <p
          role="status"
          className="mt-3 animate-slide-up rounded-btn bg-teal-tint px-3 py-2 text-[13px] font-semibold text-teal-dark dark:text-teal-300"
        >
          Dagdoel gehaald. +10 XP voor je boom.
        </p>
      )}

      {picking && (
        <div className="mt-3 flex gap-2" role="group" aria-label="Dagdoel in minuten">
          {DAILY_GOAL_OPTIONS.map(option => {
            const active = goal?.chosen && option === minutes
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={async () => {
                  const ok = await choose(option, "web_dashboard")
                  if (ok) setPicking(false)
                }}
                className={`h-9 flex-1 rounded-[9px] border text-[13px] font-semibold transition-colors ${
                  active
                    ? "border-teal bg-teal text-white"
                    : "border-line bg-surface text-ink-body hover:border-line-strong"
                }`}
              >
                {option} min
              </button>
            )
          })}
        </div>
      )}

      <Link href="/profiel/boom" className="mt-4 block border-t border-line-soft pt-[13px] no-underline">
        <div className="flex items-center gap-[10px]">
          <span className="inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-full bg-gold px-[7px] text-[12px] font-bold text-gold-ink tabular-nums">
            {level}
          </span>
          <span className="text-[13.5px] font-semibold text-ink">Niveau {level}</span>
          <span className="ml-auto text-[12px] text-ink-faint tabular-nums">
            {xpIntoLevel} / {xpForNextLevel} XP
          </span>
        </div>
        <div
          className="mt-[9px] h-[6px] overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label={`XP naar niveau ${level + 1}`}
          aria-valuenow={xpPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-teal transition-[width] duration-700" style={{ width: `${xpPct}%` }} />
        </div>
      </Link>
    </Card>
  )
}
