"use client"

import { useEffect, useState } from "react"
import { Gift } from "lucide-react"
import { Card } from "../kit/primitives"
import { relativeTime } from "./adminSurface"

type TrialRow = {
  id: string
  name: string
  email: string
  startedAt: string
  platform: "apple" | "google" | "web"
  status: "trial" | "paying" | "stopped"
  endsAt: string | null
}

const PLATFORM: Record<TrialRow["platform"], string> = { apple: "iPhone", google: "Android", web: "Website" }
const STATUS: Record<TrialRow["status"], { label: string; className: string }> = {
  trial: { label: "Loopt", className: "bg-teal/10 text-teal" },
  paying: { label: "Betaalt nu", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  stopped: { label: "Gestopt", className: "bg-ink/5 text-ink-muted" },
}

const day = (iso: string) => new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })

/**
 * "Proefperiodes" on /beheer: everyone who started a free trial in the last 60
 * days, newest first, with whether it is still running, became a paid
 * subscription, or stopped. Fetched on its own (`/api/admin/trials`) so a slow
 * stats call never holds it up.
 */
export default function TrialsCard() {
  const [rows, setRows] = useState<TrialRow[] | null>(null)
  const [counts, setCounts] = useState<{ last7d: number; running: number; paying: number } | null>(null)
  const [all, setAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/trials", { cache: "no-store", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setRows(data.rows ?? [])
        setCounts(data.counts ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const shown = rows ? (all ? rows : rows.slice(0, 8)) : []

  return (
    <Card className="p-4 sm:p-[17px]">
      <div className="flex items-center gap-3">
        <Gift size={18} className="flex-none text-teal" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold text-ink">Proefperiodes</p>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            {counts === null
              ? "Laden..."
              : `${counts.last7d} gestart in 7 dagen · ${counts.running} lopen nu · ${counts.paying} betalen nu`}
          </p>
        </div>
      </div>

      {rows !== null && rows.length === 0 && (
        <p className="mt-3 text-[13px] text-ink-muted">Nog niemand heeft een proefperiode gestart (laatste 60 dagen).</p>
      )}

      {shown.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {shown.map((r) => (
            <li key={`${r.id}-${r.platform}`} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{r.name || r.email}</p>
                <p className="truncate text-[12px] text-ink-muted">
                  {r.email} · {PLATFORM[r.platform]} · gestart {day(r.startedAt)} ({relativeTime(r.startedAt)})
                  {r.endsAt ? ` · eindigt ${day(r.endsAt)}` : ""}
                </p>
              </div>
              <span className={`flex-none rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${STATUS[r.status].className}`}>
                {STATUS[r.status].label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {rows !== null && rows.length > 8 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-2 cursor-pointer text-[13px] font-semibold text-teal hover:underline focus-visible:underline dark:text-teal-400"
        >
          {all ? "Minder tonen" : `Alle ${rows.length} tonen`}
        </button>
      )}
    </Card>
  )
}
