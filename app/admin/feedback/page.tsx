"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, MessageSquare, RefreshCw } from "lucide-react"

const TEAL = "#0D9488"

interface FeedbackRow {
  _id: string
  userId: string | null
  name: string
  email: string
  contactName: string
  contactEmail: string
  category: string
  rating: number | null
  message: string
  page: string
  status: string
  touchpoint: string
  answers: { key: string; value: string }[]
  context: Record<string, unknown> | null
  createdAt: string
}

interface FeedbackResponse {
  feedback: FeedbackRow[]
  total: number
  counts: { status: Record<string, number>; category: Record<string, number>; touchpoint: Record<string, number> }
}

const STATUS_LABELS: Record<string, string> = {
  new: "Nieuw",
  reviewed: "Bekeken",
  resolved: "Afgehandeld",
  archived: "Gearchiveerd",
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Er gaat iets mis",
  feature: "Ik mis iets",
  other: "Iets anders",
  praise: "Compliment",
}

const TOUCHPOINT_LABELS: Record<string, string> = {
  unprompted: "Feedbackpagina",
  study_lesson_complete: "Na een les",
  quiz_question_review: "Quizvraag",
  quiz_complete: "Na een quiz",
  study_abandoned: "Studie verlaten",
  onboarding_abandoned: "Onboarding afgebroken",
  subscription_cancel: "Opzegging",
  dormant_return: "Terugkeer",
  pmf_survey: "PMF-onderzoek",
}

function formatDate(iso: string): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [counts, setCounts] = useState<FeedbackResponse["counts"] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [touchpointFilter, setTouchpointFilter] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (categoryFilter) params.set("category", categoryFilter)
      if (touchpointFilter) params.set("touchpoint", touchpointFilter)
      const res = await fetch(`/api/admin/feedback?${params.toString()}`, { cache: "no-store", credentials: "include" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : `Kon feedback niet laden (${res.status})`)
        return
      }
      setRows(data.feedback ?? [])
      setTotal(data.total ?? 0)
      setCounts(data.counts ?? null)
    } catch {
      setError("Kon feedback niet laden: server niet bereikbaar")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, touchpointFilter])

  useEffect(() => {
    void load()
  }, [load])

  const setStatus = useCallback(async (id: string, status: string) => {
    setPendingId(id)
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)))
      }
    } finally {
      setPendingId(null)
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft size={12} /> Beheer
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Feedback</h1>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}
              >
                <MessageSquare size={11} /> {total}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Alles wat gebruikers hebben teruggestuurd, nieuwste eerst</p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-secondary text-foreground disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Vernieuwen
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-white dark:bg-card text-xs text-foreground"
          >
            <option value="">Alle statussen</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label} {counts?.status[value] ? `(${counts.status[value]})` : ""}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-white dark:bg-card text-xs text-foreground"
          >
            <option value="">Alle categorieën</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label} {counts?.category[value] ? `(${counts.category[value]})` : ""}
              </option>
            ))}
          </select>
          <select
            value={touchpointFilter}
            onChange={(e) => setTouchpointFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-white dark:bg-card text-xs text-foreground"
          >
            <option value="">Alle bronnen</option>
            {Object.entries(TOUCHPOINT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label} {counts?.touchpoint[value] ? `(${counts.touchpoint[value]})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 xl:px-10 py-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse bg-gray-100 dark:bg-secondary" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen feedback voor deze filters.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div key={row._id} className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEAL }}>
                        {TOUCHPOINT_LABELS[row.touchpoint] ?? row.touchpoint}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-secondary text-gray-600 dark:text-muted-foreground">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </span>
                      {row.rating != null && (
                        <span className="text-[11px] text-gray-500 dark:text-muted-foreground">{row.rating} / 5</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{row.message}</p>
                    {row.answers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {row.answers.map((a, i) => (
                          <span key={i} className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-50 dark:bg-secondary/50 border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground">
                            {a.key}: {a.value}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {formatDate(row.createdAt)}
                      {row.name || row.contactName ? ` · ${row.name || row.contactName}` : ""}
                      {row.email || row.contactEmail ? ` (${row.email || row.contactEmail})` : ""}
                      {row.page ? ` · ${row.page}` : ""}
                    </p>
                  </div>
                  <select
                    value={row.status}
                    disabled={pendingId === row._id}
                    onChange={(e) => void setStatus(row._id, e.target.value)}
                    className="h-8 px-2 rounded-lg border border-border bg-white dark:bg-card text-xs text-foreground flex-shrink-0"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
