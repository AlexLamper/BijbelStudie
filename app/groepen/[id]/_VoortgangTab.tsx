"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { Skeleton } from "../../../components/kit/primitives"

const TEAL = "#0D9488"
/** #0F766E on the light card; teal-400 on the dark one. */
const TEAL_TEXT = "text-teal-dark dark:text-teal-400"

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
    return (
      <div role="status" aria-label="Voortgang laden" className="space-y-2 rounded-card border border-line bg-surface p-[18px] max-md:p-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-9 rounded-btn" />)}
      </div>
    )
  }

  if (!data) {
    return (
      <p className="text-sm text-ink-muted py-10 text-center">
        Voortgang kon niet worden geladen.
      </p>
    )
  }

  const { assignment, challenge, members } = data

  if (!assignment && !challenge) {
    return (
      <div className="flex flex-col items-center rounded-card border border-line bg-surface text-center py-16 px-4 content-in">
        <p className="font-semibold text-ink mb-1">Nog niets om te volgen</p>
        <p className="text-sm text-ink-muted max-w-xs mb-4">
          Zodra een groepsleider een weekopdracht of een challenge instelt, zie je hier
          hoe ver iedereen is.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-ink-faint">
          Zijpaneel → Wekelijkse opdracht
        </div>
      </div>
    )
  }

  const doneCount = members.filter(m => m.assignmentDone).length

  return (
    <div className="rounded-card border border-line bg-surface p-[18px] max-md:p-4 space-y-6 content-in">
      {assignment && (
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${TEAL_TEXT}`}>
                Weekopdracht
              </p>
              <p className="text-sm font-semibold text-ink mt-0.5">
                {assignment.title || `${assignment.book} ${assignment.chapter}`}
              </p>
              {assignment.dueDate && (
                <p className="text-xs text-ink-muted">
                  Tot {formatDate(assignment.dueDate)}
                </p>
              )}
            </div>
            <p className="text-xs font-semibold text-ink-muted tabular-nums">
              {doneCount} van {members.length} klaar
            </p>
          </div>

          <ul className="space-y-1.5">
            {members.map(m => (
              <li key={m.id}
                className="flex items-center justify-between max-md:gap-3 rounded-lg px-3 py-2 bg-sunken">
                <span className="text-sm text-ink truncate max-md:min-w-0">{m.name}</span>
                {m.assignmentDone ? (
                  <span className={`flex max-md:flex-shrink-0 items-center gap-1 text-xs font-semibold ${TEAL_TEXT}`}>
                    <Check size={13} aria-hidden /> Bestudeerd
                  </span>
                ) : (
                  <span className="max-md:flex-shrink-0 text-xs text-ink-faint">Nog niet</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {challenge && (
        <section>
          <div className="mb-3">
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${TEAL_TEXT}`}>
                Challenge
              </p>
              <p className="text-sm font-semibold text-ink mt-0.5">
                {challenge.title || `${challenge.target} ${challenge.type === "chapters" ? "hoofdstukken" : "notities"}`}
                {challenge.endDate && (
                  <span className="font-normal text-ink-muted">
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
                  <div className="flex items-center justify-between max-md:gap-3 mb-1">
                    <span className="text-sm text-ink truncate max-md:min-w-0">{m.name}</span>
                    <span className="text-xs font-semibold text-ink-muted tabular-nums">
                      {m.challengeCount} / {challenge.target}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-line">
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
