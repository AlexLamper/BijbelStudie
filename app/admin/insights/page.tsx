"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, TrendingUp, BookOpen, StickyNote, Sparkles } from "lucide-react"

interface Series { date: string; count: number }
interface InsightsResponse {
  range: number
  signups: Series[]
  notes: Series[]
  readingSessions: Series[]
  newSubscribers: Series[]
}

const TEAL = "#0D9488"

function formatDate(d: string, short = true): string {
  return new Date(d).toLocaleDateString("nl-NL", short ? { day: "numeric", month: "short" } : { day: "numeric", month: "long", year: "numeric" })
}

export default function AdminInsightsPage() {
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/insights?days=${range}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [range])

  const sums = useMemo(() => {
    if (!data) return { signups: 0, notes: 0, sessions: 0, subs: 0 }
    const sum = (s: Series[]) => s.reduce((a, b) => a + b.count, 0)
    return {
      signups: sum(data.signups),
      notes: sum(data.notes),
      sessions: sum(data.readingSessions),
      subs: sum(data.newSubscribers),
    }
  }, [data])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground no-underline mb-1.5">
              <ArrowLeft size={12} /> Terug naar overzicht
            </Link>
            <h1 className="text-xl font-bold text-foreground">Inzichten & analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Trends in groei en activiteit
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {([7, 30, 90] as const).map(opt => {
              const active = opt === range
              return (
                <button
                  key={opt}
                  onClick={() => setRange(opt)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                    active
                      ? "border-transparent text-white"
                      : "border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-secondary text-foreground",
                  ].join(" ")}
                  style={active ? { backgroundColor: TEAL } : undefined}
                >
                  {opt} dagen
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 xl:px-10 py-6 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="Nieuwe gebruikers" value={sums.signups} icon={TrendingUp} color={TEAL} loading={loading} />
            <SummaryCard label="Nieuwe Pro abonnees" value={sums.subs} icon={Sparkles} color="#D97706" loading={loading} />
            <SummaryCard label="Notities gemaakt" value={sums.notes} icon={StickyNote} color="#0EA5E9" loading={loading} />
            <SummaryCard label="Leessessies" value={sums.sessions} icon={BookOpen} color="#16A34A" loading={loading} />
          </div>

          {/* Line charts */}
          <LineCard
            title="Gebruikersgroei"
            subtitle={`Aanmeldingen per dag · ${range} dagen`}
            series={data?.signups || []}
            color={TEAL}
            loading={loading}
          />
          <LineCard
            title="Pro conversies"
            subtitle={`Nieuwe abonnees per dag · ${range} dagen`}
            series={data?.newSubscribers || []}
            color="#D97706"
            loading={loading}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <LineCard
              title="Notities"
              subtitle={`Aangemaakt per dag · ${range} dagen`}
              series={data?.notes || []}
              color="#0EA5E9"
              loading={loading}
              compact
            />
            <LineCard
              title="Leessessies"
              subtitle={`Sessies per dag · ${range} dagen`}
              series={data?.readingSessions || []}
              color="#16A34A"
              loading={loading}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label, value, icon: Icon, color, loading,
}: { label: string; value: number; icon: React.ElementType; color: string; loading: boolean }) {
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
          {label}
        </p>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-2/3 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
      ) : (
        <p className="text-2xl font-bold text-foreground leading-tight">{value.toLocaleString("nl-NL")}</p>
      )}
    </div>
  )
}

function LineCard({
  title, subtitle, series, color, loading, compact = false,
}: {
  title: string
  subtitle: string
  series: Series[]
  color: string
  loading: boolean
  compact?: boolean
}) {
  const width = 800
  const height = compact ? 140 : 200
  const padding = { top: 10, right: 10, bottom: 24, left: 32 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const max = Math.max(1, ...series.map(s => s.count))
  const niceMax = Math.ceil(max / 5) * 5 || 5

  const points = series.map((s, i) => {
    const x = series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW
    const y = innerH - (s.count / niceMax) * innerH
    return { x, y, d: s.date, c: s.count }
  })

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
  const area = points.length > 0
    ? `${path} L ${points[points.length - 1].x.toFixed(1)} ${innerH} L 0 ${innerH} Z`
    : ""

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    value: Math.round(niceMax * t),
    y: innerH - t * innerH,
  }))

  const xTickIndices = points.length > 6
    ? [0, Math.floor(points.length / 3), Math.floor((2 * points.length) / 3), points.length - 1]
    : points.map((_, i) => i)

  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-foreground">{title}</p>
          <p className="text-xs text-gray-500 dark:text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {loading ? (
        <div className="h-[200px] rounded animate-pulse bg-gray-100 dark:bg-secondary" />
      ) : series.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Geen data.</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
            <defs>
              <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <g transform={`translate(${padding.left} ${padding.top})`}>
              {yTicks.map((t, i) => (
                <g key={i}>
                  <line x1={0} x2={innerW} y1={t.y} y2={t.y} stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray={i === yTicks.length - 1 ? "0" : "3 4"} />
                  <text x={-6} y={t.y + 3} fontSize="9" textAnchor="end" className="fill-muted-foreground">
                    {t.value}
                  </text>
                </g>
              ))}
              <path d={area} fill={`url(#grad-${color.replace("#", "")})`} />
              <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color}>
                  <title>{`${formatDate(p.d, false)}: ${p.c}`}</title>
                </circle>
              ))}
              {xTickIndices.map(i => {
                const p = points[i]
                if (!p) return null
                return (
                  <text key={i} x={p.x} y={innerH + 14} fontSize="9" textAnchor="middle" className="fill-muted-foreground">
                    {formatDate(p.d)}
                  </text>
                )
              })}
            </g>
          </svg>
        </div>
      )}
    </div>
  )
}
