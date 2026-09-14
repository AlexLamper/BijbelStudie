"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, RefreshCw } from "lucide-react"
import AppShell from "../../../components/shell/AppShell"
import { Card, Skeleton } from "../../../components/kit/primitives"
import {
  ADMIN_BUTTON,
  ADMIN_FIELD,
  BACK_LINK,
  CARD_SUBTITLE,
  CARD_TITLE,
  ROW_LINE,
  TABLE_HEAD,
} from "../../../components/admin/adminSurface"


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

/** One study/lesson row of view 2: where the prompted answers came from. */
interface LessonRow {
  studyId: string
  lessonDay: number | null
  total: number
  prompts: Record<string, number>
  choices: Record<string, number>
  lastAt: string
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

/**
 * Feedback, in the AppShell.
 *
 * Restyle only: the list request and its three filters, the once-loaded
 * per-lesson rollup and the status PATCH are exactly as they were. The filters
 * sit in one bar above the content; the per-lesson table scrolls sideways
 * inside its card below `md`, never the page.
 */
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
  /**
   * View 2: the same answers grouped per lesson. The list says what people
   * wrote; this says where. Loaded once, not per filter - it is a rollup of
   * everything, and re-running an aggregation on every dropdown change would
   * spend CPU to show the same numbers.
   */
  const [lessonRows, setLessonRows] = useState<LessonRow[]>([])

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

  useEffect(() => {
    fetch("/api/admin/feedback/by-lesson", { cache: "no-store", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.rows)) setLessonRows(data.rows)
      })
      .catch(() => {})
  }, [])

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
    <AppShell title="Feedback" active="/beheer">
      <div className="flex flex-col gap-4">
        {/* -- The way back, what this is, and the refresh ----------------- */}
        <div className="flex flex-none flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <Link href="/beheer" className={BACK_LINK}>
              <ChevronLeft size={15} aria-hidden /> Beheer
            </Link>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Alles wat gebruikers hebben teruggestuurd, nieuwste eerst ·{" "}
              <span className="font-semibold text-ink tabular-nums">{total}</span> in totaal
            </p>
          </div>
          <button onClick={() => void load()} disabled={loading} className={ADMIN_BUTTON}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden /> Vernieuwen
          </button>
        </div>

        {/* -- Filters ------------------------------------------------------ */}
        <Card className="flex flex-none flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter op status"
            className={`w-full cursor-pointer sm:w-auto ${ADMIN_FIELD}`}
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
            aria-label="Filter op categorie"
            className={`w-full cursor-pointer sm:w-auto ${ADMIN_FIELD}`}
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
            aria-label="Filter op bron"
            className={`w-full cursor-pointer sm:w-auto ${ADMIN_FIELD}`}
          >
            <option value="">Alle bronnen</option>
            {Object.entries(TOUCHPOINT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label} {counts?.touchpoint[value] ? `(${counts.touchpoint[value]})` : ""}
              </option>
            ))}
          </select>
        </Card>

        {lessonRows.length > 0 && (
          <Card className="flex-none overflow-hidden">
            <section aria-labelledby="feedback-per-les">
              <div className="px-4 pb-3 pt-[14px] sm:px-5">
                <h2 id="feedback-per-les" className={CARD_TITLE}>Per les</h2>
                <p className={CARD_SUBTITLE}>
                  Waar de antwoorden vandaan komen. Veel &quot;nee&quot; op &quot;ging deze quiz over wat
                  je net gelezen had&quot; betekent dat de quizkoppeling van die les niet klopt.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[12.5px]">
                  <thead>
                    <tr className={`border-t ${ROW_LINE} ${TABLE_HEAD}`}>
                      <th scope="col" className="px-4 py-[10px] font-semibold sm:px-5">Studie</th>
                      <th scope="col" className="px-3 py-[10px] font-semibold">Les</th>
                      <th scope="col" className="px-3 py-[10px] font-semibold tabular-nums">Antwoorden</th>
                      <th scope="col" className="px-3 py-[10px] font-semibold">Vragen</th>
                      <th scope="col" className="px-3 py-[10px] font-semibold">Keuzes</th>
                      <th scope="col" className="px-4 py-[10px] font-semibold sm:px-5">Laatste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonRows.map((row) => (
                      <tr key={`${row.studyId}-${row.lessonDay ?? "x"}`} className={`border-t align-top ${ROW_LINE}`}>
                        <td className="px-4 py-2.5 font-semibold text-ink sm:px-5">{row.studyId}</td>
                        <td className="px-3 py-2.5 tabular-nums text-ink-body">{row.lessonDay ?? "-"}</td>
                        <td className="px-3 py-2.5 tabular-nums text-ink-body">{row.total}</td>
                        <td className="px-3 py-2.5 text-ink-muted">
                          {Object.entries(row.prompts)
                            .map(([id, n]) => `${id} (${n})`)
                            .join(", ")}
                        </td>
                        <td className="px-3 py-2.5 text-ink-muted">
                          {Object.entries(row.choices)
                            .map(([key, n]) => `${key} (${n})`)
                            .join(", ") || "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted sm:px-5">{formatDate(row.lastAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </Card>
        )}

        {error && (
          <div role="alert" className="flex-none rounded-card border border-danger/40 bg-surface p-4">
            <p className="text-[13.5px] leading-relaxed text-danger dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="flex-none px-5 py-10 text-center">
            <p className="text-[13px] text-ink-muted">Geen feedback voor deze filters.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <Card key={row._id} className="flex-none p-4 sm:p-[17px]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-[6px] flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-teal-dark dark:text-teal-400">
                        {TOUCHPOINT_LABELS[row.touchpoint] ?? row.touchpoint}
                      </span>
                      <span className="rounded-full bg-line-soft px-[7px] py-[2px] text-[11px] font-semibold text-ink-muted">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </span>
                      {row.rating != null && (
                        <span className="text-[11.5px] text-ink-faint tabular-nums">{row.rating} / 5</span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.6] text-ink">{row.message}</p>
                    {row.answers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {row.answers.map((a, i) => (
                          <span key={i} className="max-w-full break-words rounded-full border border-line bg-sunken px-[7px] py-[2px] text-[11px] text-ink-muted">
                            {a.key}: {a.value}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 break-words text-[11.5px] text-ink-faint">
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
                    aria-label="Status"
                    className={`w-full flex-shrink-0 cursor-pointer sm:w-auto ${ADMIN_FIELD}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
