"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Users, ShieldCheck, Sparkles, StickyNote, BookOpen, BarChart3,
  TrendingUp, ArrowRight, Flame, Euro, Settings2,
} from "lucide-react"

interface Stats {
  users: {
    total: number
    premium: number
    admins: number
    newLast24h: number
    newLast7d: number
    newLast30d: number
    activeStreak: number
    premiumPercent: number
  }
  revenue: { mrrEur: number; priceEur: number }
  content: {
    notes: number
    notesLast7d: number
    readingSessions: number
    sessionsLast7d: number
    groups: number
    plans: number
  }
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

function formatNumber(n: number | undefined): string {
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [insights, setInsights] = useState<InsightsResponse | null>(null)
  const [recent, setRecent] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then(r => r.ok ? r.json() : null),
      fetch("/api/admin/insights?days=30").then(r => r.ok ? r.json() : null),
      fetch("/api/admin/users?limit=8").then(r => r.ok ? r.json() : null),
    ])
      .then(([s, i, u]) => {
        if (s) setStats(s)
        if (i) setInsights(i)
        if (u?.users) setRecent(u.users.slice(0, 6))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
            </p>
          </div>
          <div className="flex items-center gap-2">
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

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Totaal gebruikers"
                value={formatNumber(stats?.users.total)}
                sub={stats ? `+${stats.users.newLast7d} deze week` : ""}
                icon={Users}
                tint="rgba(13,148,136,0.08)"
                color={TEAL}
                loading={loading}
              />
              <KpiCard
                label="Pro abonnees"
                value={formatNumber(stats?.users.premium)}
                sub={stats ? `${stats.users.premiumPercent}% conversie` : ""}
                icon={Sparkles}
                tint="rgba(217,119,6,0.08)"
                color="#D97706"
                loading={loading}
              />
              <KpiCard
                label="MRR (geschat)"
                value={stats ? `€ ${stats.revenue.mrrEur.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                sub={stats ? `${stats.users.premium} × € ${stats.revenue.priceEur.toFixed(2)}` : ""}
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
