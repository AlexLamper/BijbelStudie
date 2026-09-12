"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart3, CreditCard, RefreshCw, Search, Settings, Users } from "lucide-react"
import BillingHealthCard, { type BillingStats } from "../../components/admin/BillingHealthCard"
import OnboardingPreviewButton from "../../components/admin/OnboardingPreviewButton"
import AppShell from "../../components/shell/AppShell"
import { Card, Skeleton, StatCard } from "../../components/kit/primitives"

/**
 * Every figure is nullable because /api/admin/stats degrades per query: one
 * collection it cannot read leaves that one number null and names it in
 * `degraded`, instead of failing the whole response. Null means "unknown" and
 * must render as a dash - never as 0, which reads as a real measurement.
 */
interface Stats {
  users: {
    total: number | null
    premium: number | null
    paying: number | null
    stripeSubscribers: number | null
    storeSubscribers: number | null
    comped: number | null
    admins: number | null
    newLast24h: number | null
    newLast7d: number | null
    newLast30d: number | null
    activeStreak: number | null
    premiumPercent: number | null
  }
  billing: BillingStats
  revenue: {
    mrrEur: number | null
    arrEur: number | null
    priceEur: number
    annualPriceEur: number
  }
  content: {
    notes: number | null
    notesLast7d: number | null
    readingSessions: number | null
    sessionsLast7d: number | null
    groups: number | null
    plans: number | null
  }
  /** Dutch labels of the figures that could not be read. Empty when healthy. */
  degraded?: string[]
}

interface InsightsResponse {
  signups: { date: string; count: number }[]
  notes: { date: string; count: number }[]
  readingSessions: { date: string; count: number }[]
}

interface RecentUser {
  _id: string
  name: string
  email: string
  image?: string
  subscribed: boolean
  isPro?: boolean
  isAdmin: boolean
  streak?: number
  lastStreakDate?: string | null
  createdAt: string
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "-"
  return n.toLocaleString("nl-NL")
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
}

function monthYear(d: string): string {
  return new Date(d).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "nu"
  if (m < 60) return `${m} min geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} u geleden`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} dag${d === 1 ? "" : "en"} geleden`
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
}

/** Active "now" is anything inside the last day - the green dot in the table. */
function isRecentlyActive(iso: string | null | undefined): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000
}

interface FetchResult {
  data: unknown
  /** HTTP status, or null when the request never reached the server at all. */
  status: number | null
  /** The server's own `error` field, when it sent one. */
  detail?: string
}

/**
 * The old wording ended every failure with "controleer je admin-sessie", which
 * for a 500 sent the reader after the one thing that is certainly fine: a 500 is
 * the server failing to answer a request it already accepted and authorised, so
 * signing in again cannot help and refreshing reproduces it. The status now
 * decides the wording, and the server's own message is shown when it sent one -
 * on this page the reader is the person who can act on it.
 */
function describeStatsFailure({ status, detail }: FetchResult): string {
  const details = detail ? ` Details: ${detail}` : ""
  if (status === null) {
    return "Kon statistieken niet laden: de server was niet bereikbaar. Controleer je internetverbinding en probeer het opnieuw."
  }
  if (status === 401) {
    return "Kon statistieken niet laden: je bent niet (meer) ingelogd. Log opnieuw in."
  }
  if (status === 403) {
    return "Kon statistieken niet laden: dit account heeft geen beheerdersrechten."
  }
  if (status === 503) {
    return `Kon statistieken niet laden: de database is nu niet bereikbaar. Dit ligt niet aan je verbinding of je admin-sessie.${details}`
  }
  if (status >= 500) {
    return `Kon statistieken niet laden: serverfout ${status}. Dit ligt niet aan je verbinding of je admin-sessie; de oorzaak staat in de serverlogs.${details}`
  }
  return `Kon statistieken niet laden (${status}).${details}`
}

/**
 * /beheer (design_handoff_web/PAGES.md §5).
 *
 * One column: five figures with MRR first, then the users table, then the two
 * cards under it as siblings of that table - never nested in it. Everything
 * below those three blocks is what the design has no row for and RULES.md §2
 * forbids throwing away: the Stripe health card, the two 30-day charts, the
 * content counters and today's funnel, in the same light surfaces.
 *
 * Restyle only. Every fetch, retry, degradation path, handler and endpoint on
 * this page is unchanged, including the two nullable-figure rules: a null
 * renders as "-", never as 0, and `degraded` names which figures those are.
 *
 * THREE THINGS THE DESIGN DRAWS ARE NOT WIRED, because doing so would mean a new
 * fetch or a new endpoint:
 *   - "Recente feedback" would need /api/admin/feedback, which this page does
 *     not call; the slot keeps the recent sign-ups it already has.
 *   - The table's filter field and its subscription select narrow the rows that
 *     are loaded, client-side. Full search lives on /admin/users.
 *   - "Gebruiker toevoegen" has no endpoint at all (admin tooling can only
 *     toggle isAdmin/subscribed), so the primary button is the link to
 *     /admin/users instead.
 * The three admin sub-routes (/admin/users, /admin/insights, /admin/feedback)
 * are outside the nine routes in this handoff and still wear the old immersive
 * chrome.
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [insights, setInsights] = useState<InsightsResponse | null>(null)
  const [recent, setRecent] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userQuery, setUserQuery] = useState("")
  const [planFilter, setPlanFilter] = useState<"all" | "pro" | "free">("all")

  const loadData = useCallback(async () => {
    const fetchJson = async (url: string): Promise<FetchResult> => {
      try {
        const response = await fetch(url, { cache: "no-store", credentials: "include" })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          return {
            data: null,
            status: response.status,
            detail: typeof body?.error === "string" ? body.error : undefined,
          }
        }
        return { data: body, status: response.status }
      } catch {
        // fetch itself rejected: DNS, offline, request never dispatched.
        return { data: null, status: null }
      }
    }

    const fetchStatsWithRetry = async (attempt = 0): Promise<FetchResult> => {
      const result = await fetchJson("/api/admin/stats")
      // Only retry what a second attempt could plausibly fix. A 401 or 403 is a
      // decision, not a hiccup, and asking again 400ms later gets the same
      // answer while making the page feel slower than it is.
      const worthRetrying = result.status === null || result.status >= 500
      if (result.data || attempt >= 1 || !worthRetrying) return result
      await new Promise((resolve) => setTimeout(resolve, 400))
      return fetchStatsWithRetry(attempt + 1)
    }

    return Promise.all([
      fetchStatsWithRetry(),
      fetchJson("/api/admin/insights?days=30"),
      fetchJson("/api/admin/users?limit=8"),
    ])
      .then(([statsRes, insightsRes, usersRes]) => {
        const s = statsRes.data
        const i = insightsRes.data
        const u = usersRes.data

        if (s) setStats(s as Stats)
        if (i) setInsights(i as InsightsResponse)
        if (u && typeof u === "object" && "users" in u && Array.isArray((u as { users?: unknown[] }).users)) {
          setRecent((u as { users: RecentUser[] }).users)
        }
        setLoadError(s ? null : describeStatsFailure(statsRes))
        if (s) setLastUpdated(new Date())
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    void loadData().finally(() => setRefreshing(false))
  }, [loadData])

  const degraded = stats?.degraded ?? []

  const signupChart = useMemo(() => {
    const data = insights?.signups ?? []
    const max = Math.max(1, ...data.map(d => d.count))
    return { data, max }
  }, [insights])

  const activityChart = useMemo(() => {
    const data = insights?.readingSessions ?? []
    const max = Math.max(1, ...data.map(d => d.count))
    return { data, max }
  }, [insights])

  /** The table's own narrowing, over the rows that are loaded. */
  const tableRows = useMemo(() => {
    const needle = userQuery.trim().toLowerCase()
    return recent.filter(u => {
      const pro = Boolean(u.isPro ?? (u.subscribed || u.isAdmin))
      if (planFilter === "pro" && !pro) return false
      if (planFilter === "free" && pro) return false
      if (!needle) return true
      return (u.name || "").toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)
    })
  }, [recent, userQuery, planFilter])

  const GRID = "grid grid-cols-[1.9fr_1fr_.9fr_.8fr_.9fr] gap-[14px]"

  return (
    <AppShell title="Beheer">
      <div className="flex flex-col gap-4">
        {/* The one control the design has no row for, kept small: what the
            figures below were read at, and the way to read them again. */}
        <div className="flex flex-none items-center gap-3">
          <p className="flex-1 text-[12px] text-ink-faint">
            {lastUpdated
              ? `Bijgewerkt ${lastUpdated.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`
              : " "}
            {degraded.length > 0 && (
              <span className="text-warn"> · {degraded.length} cijfer(s) niet leesbaar: {degraded.join(", ")}</span>
            )}
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex h-8 items-center gap-2 rounded-[9px] border border-line bg-white px-3 text-[12.5px] font-medium text-ink-body transition-colors hover:bg-line-soft disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} aria-hidden /> Vernieuwen
          </button>
        </div>

        {loadError && (
          <div role="alert" className="flex-none rounded-card border border-danger/40 bg-white p-4">
            <p className="text-[13.5px] leading-relaxed text-danger">{loadError}</p>
          </div>
        )}

        {/* ── Five figures, MRR first ───────────────────────────────── */}
        <div className="flex flex-none gap-[13px]">
          <StatCard
            className="flex-1"
            label="MRR"
            value={
              stats?.revenue.mrrEur != null
                ? `€ ${stats.revenue.mrrEur.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "-"
            }
          />
          <StatCard className="flex-1" label="Betalende gebruikers" value={formatNumber(stats?.users.paying)} />
          <StatCard
            className="flex-1"
            label="Gebruikers totaal"
            value={formatNumber(stats?.users.total)}
            delta={stats?.users.newLast7d != null ? `+${formatNumber(stats.users.newLast7d)}` : undefined}
          />
          <StatCard
            className="flex-1"
            label="Conversie"
            value={stats?.users.premiumPercent != null ? `${stats.users.premiumPercent.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} %` : "-"}
          />
          <StatCard className="flex-1" label="Actieve reeksen" value={formatNumber(stats?.users.activeStreak)} />
        </div>

        {/* ── The users table ───────────────────────────────────────── */}
        <Card className="flex-none overflow-hidden">
          <div className="flex items-center gap-[11px] px-5 py-[14px]">
            <h2 className="text-[15.5px] font-bold text-ink">Gebruikers beheren</h2>
            <span className="text-[12px] text-ink-faint tabular-nums">
              {formatNumber(stats?.users.total)} accounts
            </span>
            <div className="flex-1" />

            <div className="flex h-[34px] w-[210px] items-center gap-2 rounded-[9px] bg-line-soft px-[11px]">
              <Search size={14} className="flex-none text-ink-muted" aria-hidden />
              <input
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                placeholder="Naam of e-mailadres"
                aria-label="Filter gebruikers"
                className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
              />
            </div>

            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value as "all" | "pro" | "free")}
              aria-label="Filter op abonnement"
              className="h-[34px] cursor-pointer rounded-[9px] border border-line bg-white px-3 text-[12.5px] font-medium text-ink-body outline-none"
            >
              <option value="all">Alle abonnementen</option>
              <option value="pro">Pro</option>
              <option value="free">Gratis</option>
            </select>

            <button
              type="button"
              onClick={() => exportUsers(tableRows)}
              disabled={tableRows.length === 0}
              className="h-[34px] rounded-[9px] border border-line px-3 text-[12.5px] font-medium text-ink-body transition-colors hover:bg-line-soft disabled:opacity-40"
            >
              Exporteren
            </button>

            <Link
              href="/admin/users"
              className="flex h-[34px] items-center rounded-[9px] bg-teal px-[14px] text-[12.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
            >
              Alle gebruikers
            </Link>
          </div>

          <div className={`${GRID} px-5 pb-[10px]`}>
            {["Gebruiker", "Abonnement", "Lid sinds", "Laatst actief", "Voortgang"].map(h => (
              <div key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-faint">
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3 px-5 pb-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : tableRows.length === 0 ? (
            <p className="border-t border-line-soft px-5 py-6 text-[13px] text-ink-muted">
              Geen gebruiker past bij dit filter.
            </p>
          ) : (
            tableRows.map(u => {
              const pro = Boolean(u.isPro ?? (u.subscribed || u.isAdmin))
              return (
                <div key={u._id} className={`${GRID} items-center border-t border-line-soft px-5 py-3`}>
                  <div className="flex min-w-0 items-center gap-[11px]">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-line-soft text-[12px] font-semibold text-ink-muted">
                      {(u.name || u.email).slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{u.name || "Naamloos"}</p>
                      <p className="mt-[2px] truncate text-[11.5px] text-ink-faint">{u.email}</p>
                    </div>
                  </div>
                  <div>
                    {pro ? (
                      <span className="rounded-full bg-pro-soft px-[9px] py-1 text-[11px] font-semibold text-gold-ink">
                        {u.isAdmin ? "Admin" : "Pro"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-line-soft px-[9px] py-1 text-[11px] font-semibold text-ink-muted">
                        Gratis
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] text-ink-muted">{monthYear(u.createdAt)}</div>
                  <div className="flex items-center gap-[6px]">
                    <span
                      className="h-[7px] w-[7px] flex-none rounded-full"
                      style={{ backgroundColor: isRecentlyActive(u.lastStreakDate) ? "var(--success-fill)" : "var(--line-strong)" }}
                      aria-hidden
                    />
                    <span className="truncate text-[12.5px] text-ink-muted">
                      {u.lastStreakDate ? relativeTime(u.lastStreakDate) : "onbekend"}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-ink-faint tabular-nums">
                    {u.streak ? `${u.streak} dagen reeks` : "—"}
                  </div>
                </div>
              )
            })
          )}
        </Card>

        {/* ── The two cards under it: siblings, never nested ────────── */}
        <div className="flex flex-none gap-4">
          <Card className="min-w-0 flex-1 p-[17px]">
            <div className="flex items-center">
              <h2 className="flex-1 text-[14.5px] font-bold text-ink">Recente aanmeldingen</h2>
              <Link href="/admin/users" className="text-[12.5px] font-semibold text-teal no-underline hover:text-teal-dark">
                Alles bekijken
              </Link>
            </div>
            {loading ? (
              <div className="mt-3 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : recent.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-ink-muted">Nog geen gebruikers.</p>
            ) : (
              recent.slice(0, 3).map(u => (
                <div key={u._id} className="flex gap-[11px] border-t border-line-soft py-3">
                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-line-soft text-[12px] font-semibold text-ink-muted">
                    {(u.name || u.email).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-[1.5] text-ink-body">
                      <span className="font-semibold text-ink">{u.name || "Naamloos"}</span> — {u.email}
                    </p>
                    <p className="mt-[3px] text-[11px] text-ink-faint">{relativeTime(u.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card className="w-[340px] flex-none p-[14px]">
            <h2 className="text-[14.5px] font-bold text-ink">Snel naar</h2>
            <div className="mt-[11px] flex flex-col gap-[6px]">
              {[
                { href: "/admin/users", label: "Gebruikersbeheer", icon: Users },
                { href: "/admin/insights", label: "Inzichten & analytics", icon: BarChart3 },
                { href: "/admin/feedback", label: "Feedback", icon: Search },
                { href: "/abonnement", label: "Abonnementen", icon: CreditCard },
                { href: "/instellingen", label: "Mijn instellingen", icon: Settings },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex min-h-[40px] items-center gap-[11px] rounded-btn border border-line px-[13px] py-[7px] no-underline transition-colors hover:bg-line-soft"
                >
                  <Icon size={18} className="flex-none text-ink-body" aria-hidden />
                  <span className="flex-1 text-[13px] font-semibold text-ink-body">{label}</span>
                  <span className="text-[13px] text-ink-faint">›</span>
                </Link>
              ))}
              <OnboardingPreviewButton />
            </div>
          </Card>
        </div>

        {/* ── Kept from the old page: everything the design has no row
               for and RULES.md §2 forbids dropping. ─────────────────── */}
        <BillingHealthCard billing={stats?.billing} loading={loading} />

        <div className="flex flex-none gap-4">
          <ChartCard
            title="Nieuwe gebruikers"
            subtitle="Aanmeldingen per dag (laatste 30 dagen)"
            chart={signupChart}
            loading={loading}
          />
          <ChartCard
            title="Leessessies"
            subtitle="Activiteit per dag (laatste 30 dagen)"
            chart={activityChart}
            loading={loading}
          />
        </div>

        <div className="flex flex-none gap-4">
          <Card className="min-w-0 flex-1 p-[17px]">
            <h2 className="text-[14.5px] font-bold text-ink">Content &amp; engagement</h2>
            <p className="mt-1 text-[12.5px] text-ink-muted">Door gebruikers gegenereerde data</p>
            <div className="mt-3 grid grid-cols-4 gap-[13px]">
              <MiniStat label="Notities" value={formatNumber(stats?.content.notes)} delta={stats ? `+${stats.content.notesLast7d}` : ""} loading={loading} />
              <MiniStat label="Leessessies" value={formatNumber(stats?.content.readingSessions)} delta={stats ? `+${stats.content.sessionsLast7d}` : ""} loading={loading} />
              <MiniStat label="Studiegroepen" value={formatNumber(stats?.content.groups)} loading={loading} />
              <MiniStat label="Leesplannen" value={formatNumber(stats?.content.plans)} loading={loading} />
            </div>
          </Card>

          <Card className="w-[340px] flex-none p-[17px]">
            <h2 className="text-[14.5px] font-bold text-ink">Vandaag</h2>
            <dl className="mt-2">
              <FunnelRow label="Nieuwe aanmeldingen" value={stats?.users.newLast24h} loading={loading} />
              <FunnelRow label="Nieuw in 7 dagen" value={stats?.users.newLast7d} loading={loading} />
              <FunnelRow label="Nieuw in 30 dagen" value={stats?.users.newLast30d} loading={loading} />
              <FunnelRow label="Notities deze week" value={stats?.content.notesLast7d} loading={loading} />
              <FunnelRow label="Sessies deze week" value={stats?.content.sessionsLast7d} loading={loading} last />
            </dl>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

/* ── Sub components ───────────────────────────────────────────── */

/** The rows on screen, as a CSV written in the browser. No endpoint is called. */
function exportUsers(rows: RecentUser[]) {
  const head = "naam;e-mail;abonnement;lid sinds;reeks"
  const body = rows
    .map(u =>
      [
        (u.name || "").replace(/;/g, ","),
        u.email,
        (u.isPro ?? (u.subscribed || u.isAdmin)) ? "Pro" : "Gratis",
        new Date(u.createdAt).toLocaleDateString("nl-NL"),
        String(u.streak ?? 0),
      ].join(";"),
    )
    .join("\n")
  const blob = new Blob([`${head}\n${body}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "bijbelstudie-gebruikers.csv"
  link.click()
  URL.revokeObjectURL(url)
}

function ChartCard({
  title, subtitle, chart, loading,
}: {
  title: string
  subtitle: string
  chart: { data: { date: string; count: number }[]; max: number }
  loading: boolean
}) {
  const total = chart.data.reduce((s, d) => s + d.count, 0)
  return (
    <Card className="min-w-0 flex-1 p-[17px]">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[14.5px] font-bold text-ink">{title}</h2>
        <div className="flex-1" />
        {!loading && (
          <p className="text-[12px] text-ink-faint">
            Totaal: <span className="font-semibold text-ink tabular-nums">{total.toLocaleString("nl-NL")}</span>
          </p>
        )}
      </div>
      <p className="mt-1 text-[12.5px] text-ink-muted">{subtitle}</p>
      {loading ? (
        <Skeleton className="mt-4 h-32 w-full" />
      ) : (
        <div className="mt-4">
          <div className="flex h-32 items-end gap-[3px]">
            {chart.data.map((d) => {
              const pct = (d.count / chart.max) * 100
              return (
                <div key={d.date} className="relative flex h-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: d.count === 0 ? "4px" : `${Math.max(pct, 4)}%`,
                      backgroundColor: d.count === 0 ? "var(--line)" : "var(--teal)",
                    }}
                    title={`${formatDate(d.date)}: ${d.count}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-ink-faint tabular-nums">
            <span>{chart.data.length > 0 && formatDate(chart.data[0].date)}</span>
            <span>{chart.data.length > 0 && formatDate(chart.data[chart.data.length - 1].date)}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

function MiniStat({ label, value, delta, loading }: { label: string; value: string; delta?: string; loading: boolean }) {
  return (
    <div className="rounded-[10px] border border-line bg-sunken p-3">
      <dt className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-faint">{label}</dt>
      {loading ? (
        <dd><Skeleton className="h-5 w-2/3" /></dd>
      ) : (
        <dd className="content-in flex items-baseline gap-1.5">
          <span className="text-[18px] font-bold text-ink tabular-nums">{value}</span>
          {delta && <span className="text-[11px] font-semibold text-success tabular-nums">{delta}</span>}
        </dd>
      )}
    </div>
  )
}

function FunnelRow({ label, value, loading, last }: { label: string; value?: number | null; loading: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${last ? "" : "border-b border-line-soft"}`}>
      <dt className="text-[12.5px] text-ink-muted">{label}</dt>
      {loading ? (
        <dd><Skeleton className="h-3 w-8" /></dd>
      ) : (
        <dd className="text-[13px] font-bold text-ink tabular-nums">{formatNumber(value)}</dd>
      )}
    </div>
  )
}
