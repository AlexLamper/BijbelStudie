"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarCheck2, ArrowRight, Settings } from "lucide-react"

interface MemberProgress {
  userId: string
  name: string
  image: string | null
  completedDays: number[]
  progressPct: number
}

interface PlanReading {
  day: number
  book: string
  chapter: number
  title?: string
}

interface PlanProgressData {
  plan: { _id: string; title: string; duration: number; readings: PlanReading[] }
  members: MemberProgress[]
  groupProgressPct: number
}

function Avatar({ name, size = 6 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: "#0D9488", fontSize: size <= 6 ? 9 : 11 }}
    >
      {initials}
    </div>
  )
}

export default function VoortgangTab({
  groupId,
  planId,
}: {
  groupId: string
  planId: string | null
}) {
  const [data, setData] = useState<PlanProgressData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!planId) return
    setLoading(true)
    fetch(`/api/groepen/${groupId}/plan-progress`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.plan) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId, planId])

  if (!planId) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(13,148,136,0.07)" }}>
          <CalendarCheck2 className="w-6 h-6" style={{ color: "#0D9488" }} />
        </div>
        <p className="font-semibold text-gray-800 dark:text-foreground mb-1">Geen leesplan gekoppeld</p>
        <p className="text-sm text-gray-500 dark:text-muted-foreground max-w-xs mb-4">
          Koppel een leesplan aan deze groep via de groepsinstellingen (Leden tab).
        </p>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-muted-foreground">
          <Settings size={12} /> Groepsinstellingen → Leesplan
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-100 dark:bg-secondary rounded animate-pulse w-1/3" />
        <div className="h-2.5 bg-gray-100 dark:bg-secondary rounded-full animate-pulse" />
        <div className="space-y-2 mt-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-secondary rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-gray-500 dark:text-muted-foreground py-8 text-center">Kon voortgang niet laden.</p>
  }

  const { plan, members, groupProgressPct } = data

  // Determine which days to show
  const allDayNums = plan.readings.map(r => r.day)
  const anyCompletedDays = new Set(members.flatMap(m => m.completedDays))
  const maxCompleted = anyCompletedDays.size > 0 ? Math.max(...anyCompletedDays) : 0
  const visibleDays = showAll
    ? allDayNums
    : allDayNums.filter(d => d <= maxCompleted + 3)
  const hiddenCount = allDayNums.length - visibleDays.length

  return (
    <div className="space-y-5">
      {/* Plan title + group progress bar */}
      <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{plan.title}</p>
          <span className="text-xs font-semibold" style={{ color: "#0D9488" }}>{groupProgressPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-secondary rounded-full overflow-hidden">
          <div className="h-2 rounded-full transition-all"
            style={{ width: `${groupProgressPct}%`, backgroundColor: "#0D9488" }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1.5">
          Gemiddelde groepsvoortgang · {plan.duration} dagen totaal
        </p>
      </div>

      {/* Progress grid */}
      <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4 overflow-x-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground mb-3">
          Voortgang per lid
        </p>
        <table className="text-xs border-separate" style={{ borderSpacing: "2px 2px" }}>
          <thead>
            <tr>
              <th className="text-left font-medium text-gray-500 dark:text-muted-foreground pb-1 pr-4 w-28">Lid</th>
              {visibleDays.map(d => (
                <th key={d} className="text-center font-medium text-gray-400 dark:text-muted-foreground pb-1 w-7">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.userId}>
                <td className="pr-4 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <Avatar name={m.name} size={5} />
                    <span className="truncate max-w-[80px] text-gray-700 dark:text-foreground">{m.name}</span>
                  </div>
                </td>
                {visibleDays.map(d => (
                  <td key={d} className="text-center py-0.5">
                    {m.completedDays.includes(d) ? (
                      <span className="text-sm font-bold" style={{ color: "#0D9488" }}>✓</span>
                    ) : (
                      <span className="text-sm text-gray-200 dark:text-gray-700">○</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-3 text-xs font-medium"
            style={{ color: "#0D9488" }}>
            + {hiddenCount} verborgen dagen tonen
          </button>
        )}
        {showAll && allDayNums.length > 3 && (
          <button
            onClick={() => setShowAll(false)}
            className="mt-3 text-xs font-medium text-gray-400 dark:text-muted-foreground">
            Minder tonen
          </button>
        )}
      </div>

      <Link href={`/plans/${plan._id}`}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#0D9488" }}>
        <CalendarCheck2 size={15} />
        Lees vandaag
        <ArrowRight size={13} />
      </Link>
    </div>
  )
}
