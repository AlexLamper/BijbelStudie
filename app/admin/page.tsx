"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Users, ShieldCheck, Sparkles, StickyNote, BookOpen, BarChart3,
  TrendingUp, ArrowRight, Flame, Euro, Settings2, RefreshCw,
} from "lucide-react"
import BillingHealthCard, { type BillingStats } from "../../components/admin/BillingHealthCard"

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
  subscribed: boolean
  isAdmin: boolean
  createdAt: string
}

const TEAL = "#0D9488"

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "-"
  return n.toLocaleString("nl-NL")
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "zojuist"
  if (m < 60) return `${m} min geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} u geleden`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} dag${d === 1 ? "" : "en"} geleden`
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [insights, setInsights] = useState<InsightsResponse | null>(null)
  const [recent, setRecent] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

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
          setRecent(((u as { users: RecentUser[] }).users).slice(0, 6))
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Beheer</h1>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}
              >
                <ShieldCheck size={11} /> Admin
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Overzicht van gebruikers, abonnementen en activiteit
              {lastUpdated && (
                <span className="text-muted-foreground/70">
                  {" "}· bijgewerkt {lastUpdated.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-secondary text-foreground disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Vernieuwen
            </button>
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium no-underline transition-colors border border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-secondary text-foreground"
            >
              <Users size={14} /> Gebruikers
            </Link>
            <Link
              href="/admin/insights"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium no-underline transition-colors text-white"
              style={{ backgroundColor: TEAL }}
            >
              <BarChart3 size={14} /> Inzichten
            </Link>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 xl:px-10 py-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">

          {/* Left column */}
          <div className="flex flex-col gap-5 min-w-0">
            {loadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {loadError}
              </div>
            )}

            {/* Partial answer: the response came through, but the server could
                not read some of the figures. Naming them is the difference
                between a dash that means "nul" and a dash that means "kapot". */}
            {degraded.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                Sommige cijfers konden niet worden opgehaald en staan hieronder als &ldquo;-&rdquo;:{" "}
                {degraded.join(", ")}. De rest van de pagina klopt wel.
              </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Totaal gebruikers"
                value={formatNumber(stats?.users.total)}
                sub={stats ? `+${formatNumber(stats.users.newLast7d)} deze week` : ""}
                icon={Users}
                tint="rgba(13,148,136,0.08)"
                color={TEAL}
                loading={loading}
              />
              <KpiCard
                label="Betalende abonnees"
                value={formatNumber(stats?.users.paying)}
                sub={
                  stats
                    ? `${formatNumber(stats.users.stripeSubscribers)} Stripe · ${formatNumber(stats.users.storeSubscribers)} store` +
                      ((stats.users.comped ?? 0) > 0 ? ` · +${stats.users.comped} gratis` : "")
                    : ""
                }
                icon={Sparkles}
                tint="rgba(217,119,6,0.08)"
                color="#D97706"
                loading={loading}
              />
              <KpiCard
                label="MRR (geschat)"
                value={
                  stats?.revenue.mrrEur != null
                    ? `€ ${stats.revenue.mrrEur.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "-"
                }
                sub={stats ? `${formatNumber(stats.billing.monthlySubscribers)} p/m · ${formatNumber(stats.billing.annualSubscribers)} p/j` : ""}
                icon={Euro}
                tint="rgba(34,197,94,0.08)"
                color="#16A34A"
                loading={loading}
              />
              <KpiCard
                label="Actieve streaks"
                value={formatNumber(stats?.users.activeStreak)}
                sub={stats ? `Laatste 7 dagen` : ""}
                icon={Flame}
                tint="rgba(234,88,12,0.08)"
                color="#EA580C"
                loading={loading}
              />
            </div>

            {/* Stripe <-> database health. Placed directly under the KPIs because
                a paying customer without access is the most expensive thing on
                this page to not notice. */}
            <BillingHealthCard billing={stats?.billing} loading={loading} />

            {/* Signups chart */}
            <ChartCard
              title="Nieuwe gebruikers"
              subtitle="Aanmeldingen per dag (laatste 30 dagen)"
              icon={TrendingUp}
              chart={signupChart}
              color={TEAL}
              loading={loading}
            />

            {/* Activity chart */}
            <ChartCard
              title="Leessessies"
              subtitle="Activiteit per dag (laatste 30 dagen)"
              icon={BookOpen}
              chart={activityChart}
              color="#0EA5E9"
              loading={loading}
            />

            {/* Content stats */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <StickyNote size={14} style={{ color: TEAL }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-foreground">Content & engagement</p>
                  <p className="text-xs text-gray-500 dark:text-muted-foreground">
                    Door gebruikers gegenereerde data
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat label="Notities" value={formatNumber(stats?.content.notes)} delta={stats ? `+${stats.content.notesLast7d}` : ""} loading={loading} />
                <MiniStat label="Leessessies" value={formatNumber(stats?.content.readingSessions)} delta={stats ? `+${stats.content.sessionsLast7d}` : ""} loading={loading} />
                <MiniStat label="Studiegroepen" value={formatNumber(stats?.content.groups)} loading={loading} />
                <MiniStat label="Leesplannen" value={formatNumber(stats?.content.plans)} loading={loading} />
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">

            {/* Recent users */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-muted-foreground">
                  Recente aanmeldingen
                </p>
                <Users size={14} style={{ color: TEAL }} />
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-3.5 w-3/5 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
                      <div className="h-3 w-4/5 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
                    </div>
                  ))}
                </div>
              ) : recent.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nog geen gebruikers.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recent.map(u => (
                    <div key={u._id} className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}>
                        {(u.name || u.email).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-foreground truncate">{u.name || "Naamloos"}</p>
                          {u.subscribed && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#D97706" }}>PRO</span>
                          )}
                          {u.isAdmin && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}>ADMIN</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap">{relativeTime(u.createdAt)}</p>
                    </div>
                  ))}
                  <Link href="/admin/users" className="text-xs font-medium pt-0.5 flex items-center gap-0.5" style={{ color: TEAL }}>
                    Alle gebruikers bekijken <ArrowRight size={11} />
                  </Link>
                </div>
              )}
            </div>

            {/* Today's funnel */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500 dark:text-muted-foreground">
                Vandaag
              </p>
              <FunnelRow label="Nieuwe aanmeldingen" value={stats?.users.newLast24h} loading={loading} />
              <FunnelRow label="Nieuw in 7 dagen" value={stats?.users.newLast7d} loading={loading} />
              <FunnelRow label="Nieuw in 30 dagen" value={stats?.users.newLast30d} loading={loading} />
              <FunnelRow label="Notities deze week" value={stats?.content.notesLast7d} loading={loading} />
              <FunnelRow label="Sessies deze week" value={stats?.content.sessionsLast7d} loading={loading} last />
            </div>

            {/* Quick actions */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500 dark:text-muted-foreground">
                Snel naar
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { href: "/admin/users", label: "Gebruikersbeheer", icon: Users },
                  { href: "/admin/insights", label: "Inzichten & analytics", icon: BarChart3 },
                  { href: "/abonnement", label: "Abonnementen", icon: Sparkles },
                  { href: "/instellingen", label: "Mijn instellingen", icon: Settings2 },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 dark:hover:bg-secondary text-gray-700 dark:text-foreground no-underline"
                  >
                    <Icon size={14} style={{ color: TEAL, flexShrink: 0 }} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub components ───────────────────────────────────────────── */

function KpiCard({
  label, value, sub, icon: Icon, tint, color, loading,
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
  tint: string
  color: string
  loading: boolean
}) {
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
          {label}
        </p>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: tint }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-6 w-2/3 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
          <div className="h-3 w-1/2 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 dark:text-foreground leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-gray-500 dark:text-muted-foreground mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  )
}

function ChartCard({
  title, subtitle, icon: Icon, chart, color, loading,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  chart: { data: { date: string; count: number }[]; max: number }
  color: string
  loading: boolean
}) {
  const total = chart.data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}14` }}>
            <Icon size={14} style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-foreground">{title}</p>
            <p className="text-xs text-gray-500 dark:text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {!loading && (
          <p className="text-xs text-gray-500 dark:text-muted-foreground">
            Totaal: <span className="font-semibold text-foreground">{total.toLocaleString("nl-NL")}</span>
          </p>
        )}
      </div>
      {loading ? (
        <div className="h-32 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
      ) : (
        <div>
          <div className="flex items-end gap-[3px] h-32">
            {chart.data.map((d) => {
              const pct = (d.count / chart.max) * 100
              return (
                <div key={d.date} className="flex-1 flex flex-col justify-end h-full group relative">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: d.count === 0 ? "4px" : `${Math.max(pct, 4)}%`,
                      backgroundColor: d.count === 0 ? "rgba(0,0,0,0.06)" : color,
                      opacity: d.count === 0 ? 0.4 : 1,
                    }}
                    title={`${formatDate(d.date)}: ${d.count}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>{chart.data.length > 0 && formatDate(chart.data[0].date)}</span>
            <span>{chart.data.length > 0 && formatDate(chart.data[chart.data.length - 1].date)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, delta, loading }: { label: string; value: string; delta?: string; loading: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-gray-50/50 dark:bg-secondary/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      {loading ? (
        <div className="h-5 w-2/3 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <p className="text-lg font-bold text-foreground">{value}</p>
          {delta && <span className="text-[10px] font-medium" style={{ color: TEAL }}>{delta}</span>}
        </div>
      )}
    </div>
  )
}

function FunnelRow({ label, value, loading, last }: { label: string; value?: number; loading: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? "" : "border-b border-border/60"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {loading ? (
        <div className="h-3 w-8 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
      ) : (
        <p className="text-sm font-semibold text-foreground">{formatNumber(value)}</p>
      )}
    </div>
  )
}
