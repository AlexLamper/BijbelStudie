"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"
import BillingHealthCard, { type BillingStats } from "../../components/admin/BillingHealthCard"
import OnboardingPreviewButton from "../../components/admin/OnboardingPreviewButton"
import { ProBadge } from "../../components/ui/ProBadge"
import SceneShell from "../../components/scene/SceneShell"
import { SceneSkeleton, SectionHeading } from "../../components/scene/pieces"
import { EYEBROW, TEAL_DEEP, TEAL_ON_DARK } from "../../components/scene/tokens"
import {
  ADMIN_BUTTON,
  DANGER,
  DATA_INSET,
  DATA_PANEL,
  DATA_TILE,
  GOOD,
  ROW_LINE,
  SERIES_SKY,
  WARN,
} from "../../components/admin/adminSurface"

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

/**
 * The admin overview, in the immersive shell.
 *
 * The shell is the same one the dashboard uses, so a beheerder never leaves the
 * world - but admin gets far less of the picture than any other screen, on
 * purpose. Above the fold there is a heading and the four running figures, set
 * into the landscape the way the dashboard's are. Below that every single thing
 * is operational data, and it all sits on DATA_PANEL: a near-opaque plate in
 * the shell's own ground colour. A revenue figure or a Stripe status has to be
 * read exactly, and the landscape is not allowed to compete with it.
 *
 * Restyle only. Every fetch, retry, degradation path, handler and endpoint on
 * this page is unchanged, including the two nullable-figure rules: a null
 * renders as "-", never as 0, and `degraded` names which figures those are.
 */
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
    <SceneShell backdrop="reader" header rail>
      {/* -- The sky: deliberately short ------------------------------- */}
      {/* A full screen of landscape before the first number would be wrong
          here: the person on this page came to read figures. One heading
          block, then the data. */}
      <section aria-labelledby="beheer-titel" className="pb-10 pt-6">
        <div className="scene-sky flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 max-w-[40rem]">
            {/* The one accent up here, and it does the work the shield chip
                used to: it says which part of the product you are standing in. */}
            <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
              Admin
            </p>
            <h1
              id="beheer-titel"
              className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Beheer
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Overzicht van gebruikers, abonnementen en activiteit
              {lastUpdated && (
                <span className="text-white/60">
                  {" "}· bijgewerkt {lastUpdated.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleRefresh} disabled={refreshing || loading} className={ADMIN_BUTTON}>
              {/* Identifies the control, not decoration. */}
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} aria-hidden /> Vernieuwen
            </button>
            <Link href="/admin/users" className={ADMIN_BUTTON}>
              Gebruikers
            </Link>
            <Link
              href="/admin/insights"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white no-underline outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white"
              style={{ backgroundColor: TEAL_DEEP }}
            >
              Inzichten
            </Link>
          </div>
        </div>
      </section>

      {/* -- The horizon: the four running figures --------------------- */}
      <div className="scene-horizon">
        <dl className="stagger-in grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Totaal gebruikers"
            value={formatNumber(stats?.users.total)}
            sub={stats ? `+${formatNumber(stats.users.newLast7d)} deze week` : ""}
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
            loading={loading}
            accent={GOOD}
          />
          <KpiCard
            label="Actieve streaks"
            value={formatNumber(stats?.users.activeStreak)}
            sub={stats ? `Laatste 7 dagen` : ""}
            loading={loading}
          />
        </dl>
      </div>

      {/* -- The desk: everything below here is opaque ----------------- */}
      <div className="grid grid-cols-1 items-start gap-6 pb-20 pt-8 xl:grid-cols-[minmax(0,1fr)_320px]">

        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-5">
          {loadError && (
            <div
              role="alert"
              className="rounded-xl px-4 py-3 text-sm leading-relaxed"
              style={{ backgroundColor: "rgba(248,113,113,0.16)", color: DANGER, boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.35)" }}
            >
              {loadError}
            </div>
          )}

          {/* Partial answer: the response came through, but the server could
              not read some of the figures. Naming them is the difference
              between a dash that means "nul" and a dash that means "kapot". */}
          {degraded.length > 0 && (
            <div
              className="rounded-xl px-4 py-3 text-sm leading-relaxed"
              style={{ backgroundColor: "rgba(251,191,36,0.16)", color: WARN, boxShadow: "inset 0 0 0 1px rgba(251,191,36,0.35)" }}
            >
              Sommige cijfers konden niet worden opgehaald en staan hieronder als &ldquo;-&rdquo;:{" "}
              {degraded.join(", ")}. De rest van de pagina klopt wel.
            </div>
          )}

          {/* Stripe <-> database health. Placed directly under the KPIs because
              a paying customer without access is the most expensive thing on
              this page to not notice. */}
          <BillingHealthCard billing={stats?.billing} loading={loading} />

          {/* Signups chart */}
          <ChartCard
            id="beheer-aanmeldingen"
            title="Nieuwe gebruikers"
            subtitle="Aanmeldingen per dag (laatste 30 dagen)"
            chart={signupChart}
            color={TEAL_ON_DARK}
            loading={loading}
          />

          {/* Activity chart */}
          <ChartCard
            id="beheer-leessessies"
            title="Leessessies"
            subtitle="Activiteit per dag (laatste 30 dagen)"
            chart={activityChart}
            color={SERIES_SKY}
            loading={loading}
          />

          {/* Content stats */}
          <section className={`p-5 ${DATA_PANEL}`} aria-labelledby="beheer-content">
            <SectionHeading
              id="beheer-content"
              title="Content & engagement"
              subtitle="Door gebruikers gegenereerde data"
            />
            <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MiniStat label="Notities" value={formatNumber(stats?.content.notes)} delta={stats ? `+${stats.content.notesLast7d}` : ""} loading={loading} />
              <MiniStat label="Leessessies" value={formatNumber(stats?.content.readingSessions)} delta={stats ? `+${stats.content.sessionsLast7d}` : ""} loading={loading} />
              <MiniStat label="Studiegroepen" value={formatNumber(stats?.content.groups)} loading={loading} />
              <MiniStat label="Leesplannen" value={formatNumber(stats?.content.plans)} loading={loading} />
            </dl>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">

          {/* Recent users */}
          <section className={`p-5 ${DATA_PANEL}`} aria-labelledby="beheer-recent">
            <SectionHeading id="beheer-recent" title="Recente aanmeldingen" rule />
            {loading ? (
              <div className="mt-4 space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-1.5">
                    <SceneSkeleton className="h-3.5 w-3/5" />
                    <SceneSkeleton className="h-3 w-4/5" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="mt-4 text-xs text-white/70">Nog geen gebruikers.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {recent.map(u => (
                  <div key={u._id} className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ring-1 ring-white/20"
                      style={{ backgroundColor: "rgba(13,148,136,0.35)" }}
                    >
                      {(u.name || u.email).slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-white">{u.name || "Naamloos"}</p>
                        {u.subscribed && <ProBadge size="xs" />}
                        {u.isAdmin && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                            style={{ backgroundColor: "rgba(45,212,191,0.18)", color: TEAL_ON_DARK }}
                          >
                            ADMIN
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-white/60">{u.email}</p>
                    </div>
                    <p className="whitespace-nowrap text-[10px] tabular-nums text-white/55">{relativeTime(u.createdAt)}</p>
                  </div>
                ))}
                <Link
                  href="/admin/users"
                  className="pt-0.5 text-xs font-semibold no-underline hover:underline"
                  style={{ color: TEAL_ON_DARK }}
                >
                  Alle gebruikers bekijken →
                </Link>
              </div>
            )}
          </section>

          {/* Today's funnel */}
          <section className={`p-5 ${DATA_PANEL}`} aria-labelledby="beheer-vandaag">
            <SectionHeading id="beheer-vandaag" title="Vandaag" rule />
            <dl className="mt-1">
              <FunnelRow label="Nieuwe aanmeldingen" value={stats?.users.newLast24h} loading={loading} />
              <FunnelRow label="Nieuw in 7 dagen" value={stats?.users.newLast7d} loading={loading} />
              <FunnelRow label="Nieuw in 30 dagen" value={stats?.users.newLast30d} loading={loading} />
              <FunnelRow label="Notities deze week" value={stats?.content.notesLast7d} loading={loading} />
              <FunnelRow label="Sessies deze week" value={stats?.content.sessionsLast7d} loading={loading} last />
            </dl>
          </section>

          {/* Quick actions */}
          <section className={`p-4 ${DATA_PANEL}`} aria-labelledby="beheer-snel">
            <SectionHeading id="beheer-snel" title="Snel naar" rule />
            <div className="mt-2 flex flex-col gap-0.5">
              {[
                { href: "/admin/users", label: "Gebruikersbeheer" },
                { href: "/admin/insights", label: "Inzichten & analytics" },
                { href: "/admin/feedback", label: "Feedback" },
                { href: "/abonnement", label: "Abonnementen" },
                { href: "/instellingen", label: "Mijn instellingen" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-2 text-sm text-white/85 no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                >
                  {label}
                </Link>
              ))}
              <OnboardingPreviewButton />
            </div>
          </section>
        </div>
      </div>
    </SceneShell>
  )
}

/* ── Sub components ───────────────────────────────────────────── */

/**
 * One figure on the horizon.
 *
 * Not `GlassStat` from components/scene/pieces: that surface is deliberately
 * translucent so the landscape runs through it, and a euro figure read against
 * moving colour is a figure the beheerder has to check twice. Same shape, opaque
 * plate. The tinted icon square each of these used to carry is gone - it named
 * nothing the label did not already say.
 */
function KpiCard({
  label, value, sub, loading, accent,
}: {
  label: string
  value: string
  sub: string
  loading: boolean
  /** Only for a figure whose colour carries meaning, e.g. revenue. */
  accent?: string
}) {
  return (
    <div className={`px-4 py-3.5 ${DATA_TILE}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">{label}</dt>
      {loading ? (
        <dd className="mt-2 space-y-2">
          <SceneSkeleton className="h-6 w-2/3" />
          <SceneSkeleton className="h-3 w-1/2" />
        </dd>
      ) : (
        <dd className="content-in mt-1">
          <span
            className="block text-2xl font-semibold leading-tight tabular-nums text-white"
            style={accent ? { color: accent } : undefined}
          >
            {value}
          </span>
          {sub && <span className="mt-0.5 block text-[11px] tabular-nums text-white/60">{sub}</span>}
        </dd>
      )}
    </div>
  )
}

function ChartCard({
  id, title, subtitle, chart, color, loading,
}: {
  id: string
  title: string
  subtitle: string
  chart: { data: { date: string; count: number }[]; max: number }
  color: string
  loading: boolean
}) {
  const total = chart.data.reduce((s, d) => s + d.count, 0)
  return (
    <section className={`p-5 ${DATA_PANEL}`} aria-labelledby={id}>
      <SectionHeading
        id={id}
        title={title}
        subtitle={subtitle}
        action={
          !loading ? (
            <p className="text-xs text-white/65">
              Totaal:{" "}
              <span className="font-semibold tabular-nums text-white">{total.toLocaleString("nl-NL")}</span>
            </p>
          ) : undefined
        }
      />
      {loading ? (
        <SceneSkeleton className="mt-4 h-32 w-full rounded-lg" />
      ) : (
        <div className="mt-4">
          <div className="flex h-32 items-end gap-[3px]">
            {chart.data.map((d) => {
              const pct = (d.count / chart.max) * 100
              return (
                <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: d.count === 0 ? "4px" : `${Math.max(pct, 4)}%`,
                      // An empty day has to still be visible on a dark plate;
                      // the light-page rgba(0,0,0,0.06) disappeared entirely.
                      backgroundColor: d.count === 0 ? "rgba(255,255,255,0.16)" : color,
                      opacity: d.count === 0 ? 0.7 : 1,
                    }}
                    title={`${formatDate(d.date)}: ${d.count}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] tabular-nums text-white/55">
            <span>{chart.data.length > 0 && formatDate(chart.data[0].date)}</span>
            <span>{chart.data.length > 0 && formatDate(chart.data[chart.data.length - 1].date)}</span>
          </div>
        </div>
      )}
    </section>
  )
}

function MiniStat({ label, value, delta, loading }: { label: string; value: string; delta?: string; loading: boolean }) {
  return (
    <div className={`p-3 ${DATA_INSET}`}>
      <dt className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">{label}</dt>
      {loading ? (
        <dd>
          <SceneSkeleton className="h-5 w-2/3" />
        </dd>
      ) : (
        <dd className="content-in flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tabular-nums text-white">{value}</span>
          {delta && (
            <span className="text-[10px] font-medium tabular-nums" style={{ color: TEAL_ON_DARK }}>
              {delta}
            </span>
          )}
        </dd>
      )}
    </div>
  )
}

function FunnelRow({ label, value, loading, last }: { label: string; value?: number; loading: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${last ? "" : `border-b ${ROW_LINE}`}`}>
      <dt className="text-xs text-white/70">{label}</dt>
      {loading ? (
        <dd>
          <SceneSkeleton className="h-3 w-8" />
        </dd>
      ) : (
        <dd className="text-sm font-semibold tabular-nums text-white">{formatNumber(value)}</dd>
      )}
    </div>
  )
}
