"use client"

import { useEffect, useState } from "react"
import { CalendarCheck2, Check, Target, Settings } from "lucide-react"
import { SkeletonRows } from "../../../components/ui/skeletons"

const TEAL = "#0D9488"
const TEAL_TEXT = "#0F766E"

interface MemberRow {
  id: string
  name: string
  assignmentDone: boolean
  challengeCount: number
}

interface Voortgang {
  assignment: { book: string; chapter: number; title: string | null; dueDate: string | null } | null
  challenge: { title: string; type: "chapters" | "notes"; target: number; endDate: string | null } | null
  members: MemberRow[]
}

function formatDate(value: string | null): string {
  if (!value) return ""
  return new Date(value).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })
}

/**
 * Group progress.
 *
 * The previous version scored members against a reading plan attached to the
 * group, so it showed "geen leesplan gekoppeld" to almost everyone and stopped
 * meaning anything once leesplannen was removed. A group's shared work is its
 * weekly assignment and its challenge, so that is what this reports.
 */
export default function VoortgangTab({ groupId }: { groupId: string }) {
  const [data, setData] = useState<Voortgang | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/groepen/${groupId}/voortgang`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && !cancelled) setData(d) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [groupId])

  if (loading) {
    return <div className="p-4"><SkeletonRows count={4} /></div>
  }

  if (!data) {
    return (
      <p className="text-sm text-gray-500 dark:text-muted-foreground py-10 text-center">
        Voortgang kon niet worden geladen.
      </p>
    )
  }

  const { assignment, challenge, members } = data

  if (!assignment && !challenge) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-4 content-in">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(13,148,136,0.07)" }}>
          <CalendarCheck2 className="w-6 h-6" style={{ color: TEAL }} />
        </div>
        <p className="font-semibold text-gray-800 dark:text-foreground mb-1">Nog niets om te volgen</p>
        <p className="text-sm text-gray-500 dark:text-muted-foreground max-w-xs mb-4">
          Zodra een groepsleider een weekopdracht of een challenge instelt, zie je hier
          hoe ver iedereen is.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-muted-foreground">
          <Settings size={12} /> Leden-tab → Weekopdracht
        </div>
      </div>
    )
  }

  const doneCount = members.filter(m => m.assignmentDone).length

  return (
    <div className="p-4 space-y-6 content-in">
      {assignment && (
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: TEAL_TEXT }}>
                Weekopdracht
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-foreground mt-0.5">
                {assignment.title || `${assignment.book} ${assignment.chapter}`}
              </p>
              {assignment.dueDate && (
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  Tot {formatDate(assignment.dueDate)}
                </p>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-muted-foreground tabular-nums">
              {doneCount} van {members.length} klaar
            </p>
          </div>

          <ul className="space-y-1.5">
            {members.map(m => (
              <li key={m.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 bg-gray-50 dark:bg-secondary/40">
                <span className="text-sm text-gray-800 dark:text-foreground truncate">{m.name}</span>
                {m.assignmentDone ? (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: TEAL_TEXT }}>
                    <Check size={13} /> Bestudeerd
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-muted-foreground">Nog niet</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {challenge && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} style={{ color: TEAL }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: TEAL_TEXT }}>
                Challenge
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-foreground mt-0.5">
                {challenge.title || `${challenge.target} ${challenge.type === "chapters" ? "hoofdstukken" : "notities"}`}
                {challenge.endDate && (
                  <span className="font-normal text-gray-500 dark:text-muted-foreground">
                    {" "}· tot {formatDate(challenge.endDate)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {members.map(m => {
              const pct = Math.min(100, Math.round((m.challengeCount / challenge.target) * 100))
              return (
                <li key={m.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-800 dark:text-foreground truncate">{m.name}</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-muted-foreground tabular-nums">
                      {m.challengeCount} / {challenge.target}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-secondary">
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: TEAL }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
