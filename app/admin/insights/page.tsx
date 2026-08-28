"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  BookOpen,
  Eye,
  GraduationCap,
  MousePointerClick,
  PenLine,
  Sparkles,
  StickyNote,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react"

interface Series { date: string; count: number }

interface TopPage { key: string; label: string; views: number; visitors: number }
interface TopClick { target: string; count: number }

interface PerStudy {
  studyId: string
  title: string
  enrollments: number
  completed: number
  lessonsCompleted: number
}

interface InsightsResponse {
  range: number
  signups: Series[]
  notes: Series[]
  readingSessions: Series[]
  newSubscribers: Series[]
  cancellations: Series[]
  pageViews: Series[]
  lessonsCompleted: Series[]
  traffic: { uniqueVisitors: number; loggedInViews: number; loggedOutViews: number }
  topPages: TopPage[]
  topClicks: TopClick[]
  study: {
    enrollmentsActive: number
    enrollmentsCompleted: number
    enrollmentsTotal: number
    activeStudents: number
    reflectionsWritten: number
    quizAttempts: number
    quizzesGraded: number
    quizAccuracy: number | null
    perStudy: PerStudy[]
  }
}

const TEAL = "#0D9488"
const AMBER = "#D97706"
const SKY = "#0EA5E9"
const GREEN = "#16A34A"
const VIOLET = "#7C3AED"

/**
 * Dutch labels for the click targets in lib/analyticsRoutes.ts.
 *
 * A raw slug in a report is a slug the reader has to decode. Anything missing
 * falls back to the slug itself, so adding a target does not break this page -
 * it just shows up unprettified until it is named here.
 */
const CLICK_LABELS: Record<string, string> = {
  hero_cta_signup: "Hero: gratis beginnen",
  hero_cta_appstore: "Hero: App Store",
  hero_cta_learn_more: "Hero: meer weten",
  nav_signin: "Inloggen (nav)",
  nav_register: "Registreren (nav)",
  sidebar_dashboard: "Zijbalk: Dashboard",
  sidebar_studie: "Zijbalk: Lezen",
  sidebar_lezen: "Zijbalk: Lezen",
  sidebar_studies: "Zijbalk: Studies",
  sidebar_groepen: "Zijbalk: Groepen",
  sidebar_notities: "Zijbalk: Notities",
  sidebar_profiel: "Zijbalk: Profiel",
  sidebar_instellingen: "Zijbalk: Instellingen",
  sidebar_feedback: "Zijbalk: Feedback",
  sidebar_pro_cta: "Zijbalk: Pro-CTA",
  study_card: "Studiekaart geopend",
  study_start: "Studie gestart",
  study_resume: "Studie hervat",
  study_settings_open: "Studie-instellingen",
  study_lesson_open: "Les geopend",
  study_step_next: "Volgende stap",
  study_step_previous: "Vorige stap",
  study_lesson_complete: "Les afgerond",
  study_quiz_submit: "Quiz nagekeken",
  reading_note_create: "Notitie gemaakt",
  reading_speak: "Voorlezen",
  reading_preferences: "Leesvoorkeuren",
  reading_tab_commentary: "Tab: commentaar",
  reading_tab_original: "Tab: grondtekst",
  reading_tab_historical: "Tab: algemene info",
  reading_tab_notes: "Tab: notities",
  reading_tab_ai: "Tab: AI-assistent",
  ai_open: "AI-assistent geopend",
  ai_ask: "Vraag aan AI",
  tour_start: "Rondleiding gestart",
  tour_complete: "Rondleiding afgerond",
  onboarding_complete: "Onboarding afgerond",
}

function formatDate(d: string, short = true): string {
  return new Date(d).toLocaleDateString(
    "nl-NL",
    short ? { day: "numeric", month: "short" } : { day: "numeric", month: "long", year: "numeric" }
  )
}

function n(value: number | null | undefined): string {
  if (value == null) return "-"
  return value.toLocaleString("nl-NL")
}

export default function AdminInsightsPage() {
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // One retry: the route fires ~17 aggregations at once and the first hit
    // after an idle period also pays for the Mongo connect, so a cold call can
    // time out where the next one succeeds.
    const load = async (attempt = 0): Promise<void> => {
      try {
        const res = await fetch(`/api/admin/insights?days=${range}`)
        const body = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          if (attempt < 1) return load(attempt + 1)
          setError(
            (body && typeof body.error === 'string' && body.error) ||
              `Verzoek mislukt (${res.status}). Controleer je admin-sessie of vernieuw de pagina.`,
          )
          return
        }
        setData(body)
      } catch {
        if (cancelled) return
        if (attempt < 1) return load(attempt + 1)
        setError('Netwerkfout bij het laden van de inzichten.')
      }
    }

    load().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range, reloadKey])

  const sums = useMemo(() => {
    const sum = (s?: Series[]) => (s ?? []).reduce((a, b) => a + b.count, 0)
    return {
      signups: sum(data?.signups),
      notes: sum(data?.notes),
      sessions: sum(data?.readingSessions),
      subs: sum(data?.newSubscribers),
      views: sum(data?.pageViews),
      lessons: sum(data?.lessonsCompleted),
    }
  }, [data])

  const maxPageViews = Math.max(1, ...(data?.topPages ?? []).map(p => p.views))
  const maxClicks = Math.max(1, ...(data?.topClicks ?? []).map(c => c.count))

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground no-underline mb-1.5">
              <ArrowLeft size={12} /> Terug naar overzicht
            </Link>
            <h1 className="text-xl font-bold text-foreground">Inzichten &amp; analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Groei, gedrag en studiegebruik over de gekozen periode
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
        <div className="px-6 xl:px-10 py-6 space-y-8">

          {error && (
            <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                Inzichten konden niet worden geladen. {error}
              </p>
              <button
                onClick={() => setReloadKey(k => k + 1)}
                className="flex-none text-sm font-semibold text-red-800 dark:text-red-200 underline underline-offset-2 hover:no-underline"
              >
                Opnieuw proberen
              </button>
            </div>
          )}

          {/* ---- Bereik ---- */}
          <section>
            <SectionTitle icon={Eye} title="Bereik" subtitle="Wie de site bezocht en hoeveel pagina's zijn bekeken" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard label="Paginaweergaven" value={sums.views} icon={Eye} color={TEAL} loading={loading} />
              <SummaryCard label="Unieke bezoekers" value={data?.traffic.uniqueVisitors ?? 0} icon={Users} color={SKY} loading={loading} />
              <SummaryCard label="Weergaven ingelogd" value={data?.traffic.loggedInViews ?? 0} icon={Users} color={GREEN} loading={loading} />
              <SummaryCard label="Weergaven uitgelogd" value={data?.traffic.loggedOutViews ?? 0} icon={Users} color={VIOLET} loading={loading} />
            </div>

            <div className="mt-3">
              <LineCard
                title="Paginaweergaven"
                subtitle={`Per dag · ${range} dagen`}
                series={data?.pageViews || []}
                color={TEAL}
                loading={loading}
                compact
              />
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <RankCard
                title="Meest bezochte pagina's"
                subtitle="Weergaven, met unieke bezoekers erachter"
                loading={loading}
                empty="Nog geen paginaweergaven vastgelegd."
                rows={(data?.topPages ?? []).map(p => ({
                  key: p.key,
                  label: p.label,
                  value: p.views,
                  hint: `${n(p.visitors)} bezoekers`,
                  ratio: p.views / maxPageViews,
                }))}
                color={TEAL}
              />
              <RankCard
                title="Waar wordt geklikt"
                subtitle="Geregistreerde knoppen en links"
                loading={loading}
                empty="Nog geen kliks vastgelegd."
                icon={MousePointerClick}
                rows={(data?.topClicks ?? []).map(c => ({
                  key: c.target,
                  label: CLICK_LABELS[c.target] ?? c.target,
                  value: c.count,
                  ratio: c.count / maxClicks,
                }))}
                color={SKY}
              />
            </div>
          </section>

          {/* ---- Studiegebruik ---- */}
          <section>
            <SectionTitle icon={GraduationCap} title="Studiegebruik" subtitle="Hoeveel mensen daadwerkelijk bijbelstudie doen" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard label="Actieve studenten" value={data?.study.activeStudents ?? 0} icon={GraduationCap} color={TEAL} loading={loading} hint={`Raakten een les aan in ${range} dagen`} />
              <SummaryCard label="Lopende studies" value={data?.study.enrollmentsActive ?? 0} icon={BookOpen} color={SKY} loading={loading} />
              <SummaryCard label="Afgeronde studies" value={data?.study.enrollmentsCompleted ?? 0} icon={Trophy} color={AMBER} loading={loading} />
              <SummaryCard label="Lessen afgerond" value={sums.lessons} icon={Target} color={GREEN} loading={loading} hint="In deze periode" />
            </div>

            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard label="Reflecties geschreven" value={data?.study.reflectionsWritten ?? 0} icon={PenLine} color={VIOLET} loading={loading} />
              <SummaryCard label="Quizzen nagekeken" value={data?.study.quizzesGraded ?? 0} icon={Trophy} color={AMBER} loading={loading} />
              <SummaryCard label="Quizpogingen" value={data?.study.quizAttempts ?? 0} icon={Trophy} color={AMBER} loading={loading} />
              <SummaryCard
                label="Gemiddelde quizscore"
                value={data?.study.quizAccuracy ?? 0}
                suffix="%"
                icon={Target}
                color={GREEN}
                loading={loading}
                hint={data?.study.quizAccuracy == null ? "Nog geen quizzen gemaakt" : undefined}
              />
            </div>

            <div className="mt-3">
              <LineCard
                title="Afgeronde lessen"
                subtitle={`Per dag · ${range} dagen`}
                series={data?.lessonsCompleted || []}
                color={GREEN}
                loading={loading}
                compact
              />
            </div>

            <div className="mt-3 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
              <p className="text-sm font-bold text-gray-900 dark:text-foreground">Per studie</p>
              <p className="text-xs text-gray-500 dark:text-muted-foreground mb-4">
                Inschrijvingen, afgeronde studies en afgeronde lessen - over de hele looptijd
              </p>
              {loading ? (
                <div className="h-32 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
              ) : (data?.study.perStudy.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nog niemand ingeschreven.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
                        <th className="pb-2 font-semibold">Studie</th>
                        <th className="pb-2 font-semibold text-right">Ingeschreven</th>
                        <th className="pb-2 font-semibold text-right">Afgerond</th>
                        <th className="pb-2 font-semibold text-right">Lessen</th>
                        <th className="pb-2 font-semibold text-right">Voltooiing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-border">
                      {data!.study.perStudy.map(row => {
                        const rate = row.enrollments > 0 ? Math.round((row.completed / row.enrollments) * 100) : 0
                        return (
                          <tr key={row.studyId}>
                            <td className="py-2.5 pr-3 font-medium text-foreground">{row.title}</td>
                            <td className="py-2.5 text-right tabular-nums text-foreground">{n(row.enrollments)}</td>
                            <td className="py-2.5 text-right tabular-nums text-foreground">{n(row.completed)}</td>
                            <td className="py-2.5 text-right tabular-nums text-foreground">{n(row.lessonsCompleted)}</td>
                            <td className="py-2.5 text-right">
                              <span className="inline-flex items-center gap-2 justify-end">
                                <span className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
                                  <span className="block h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: TEAL }} />
                                </span>
                                <span className="tabular-nums text-xs text-muted-foreground w-9 text-right">{rate}%</span>
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* ---- Groei ---- */}
          <section>
            <SectionTitle icon={TrendingUp} title="Groei" subtitle="Aanmeldingen, abonnementen en inhoud" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard label="Nieuwe gebruikers" value={sums.signups} icon={TrendingUp} color={TEAL} loading={loading} />
              <SummaryCard label="Nieuwe Pro abonnees" value={sums.subs} icon={Sparkles} color={AMBER} loading={loading} />
              <SummaryCard label="Notities gemaakt" value={sums.notes} icon={StickyNote} color={SKY} loading={loading} />
              <SummaryCard label="Leessessies" value={sums.sessions} icon={BookOpen} color={GREEN} loading={loading} />
            </div>

            <div className="mt-3 space-y-3">
              <LineCard
                title="Gebruikersgroei"
                subtitle={`Aanmeldingen per dag · ${range} dagen`}
                series={data?.signups || []}
                color={TEAL}
                loading={loading}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <LineCard
                  title="Pro conversies"
                  subtitle={`Nieuwe abonnees per dag · ${range} dagen`}
                  series={data?.newSubscribers || []}
                  color={AMBER}
                  loading={loading}
                  compact
                />
                <LineCard
                  title="Opzeggingen"
                  subtitle={`Per dag · ${range} dagen`}
                  series={data?.cancellations || []}
                  color="#DC2626"
                  loading={loading}
                  compact
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <LineCard
                  title="Notities"
                  subtitle={`Aangemaakt per dag · ${range} dagen`}
                  series={data?.notes || []}
                  color={SKY}
                  loading={loading}
                  compact
                />
                <LineCard
                  title="Leessessies"
                  subtitle={`Sessies per dag · ${range} dagen`}
                  series={data?.readingSessions || []}
                  color={GREEN}
                  loading={loading}
                  compact
                />
              </div>
            </div>
          </section>

          <p className="text-[11px] text-gray-400 dark:text-muted-foreground pb-4">
            Paginaweergaven en kliks worden geregistreerd als vaste route- en knopnamen, zonder
            IP-adres, muispositie of tekst. Telemetrie wordt na 400 dagen automatisch verwijderd.
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({
  icon: Icon, title, subtitle,
}: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="h-8 w-8 rounded-lg flex items-center justify-center flex-none" style={{ backgroundColor: "rgba(13,148,136,0.10)" }}>
        <Icon size={15} style={{ color: TEAL }} />
      </span>
      <div>
        <h2 className="text-base font-bold text-foreground leading-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

function SummaryCard({
  label, value, icon: Icon, color, loading, hint, suffix,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  loading: boolean
  hint?: string
  suffix?: string
}) {
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
          {label}
        </p>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-none" style={{ backgroundColor: `${color}14` }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-2/3 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
      ) : (
        <p className="text-2xl font-bold text-foreground leading-tight tabular-nums">
          {n(value)}{suffix}
        </p>
      )}
      {hint && !loading && (
        <p className="mt-1 text-[11px] text-gray-400 dark:text-muted-foreground leading-snug">{hint}</p>
      )}
    </div>
  )
}

/**
 * A ranked bar list. Chosen over a pie or a donut on purpose: the question is
 * "which is biggest and by how much", and a bar answers that at a glance where
 * a pie needs the reader to compare angles.
 */
function RankCard({
  title, subtitle, rows, color, loading, empty, icon: Icon,
}: {
  title: string
  subtitle: string
  rows: { key: string; label: string; value: number; hint?: string; ratio: number }[]
  color: string
  loading: boolean
  empty: string
  icon?: React.ElementType
}) {
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={14} style={{ color }} />}
        <p className="text-sm font-bold text-gray-900 dark:text-foreground">{title}</p>
      </div>
      <p className="text-xs text-gray-500 dark:text-muted-foreground mb-4">{subtitle}</p>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="h-7 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{empty}</p>
      ) : (
        <ol className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
          {rows.map(row => (
            <li key={row.key} className="relative rounded-lg overflow-hidden">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-lg"
                style={{ width: `${Math.max(row.ratio * 100, 2)}%`, backgroundColor: `${color}1F` }}
              />
              <span className="relative flex items-center justify-between gap-3 px-2.5 py-1.5">
                <span className="text-[12.5px] font-medium text-foreground truncate">{row.label}</span>
                <span className="flex items-center gap-2 flex-none">
                  {row.hint && (
                    <span className="text-[11px] text-gray-400 dark:text-muted-foreground">{row.hint}</span>
                  )}
                  <span className="text-[12.5px] font-bold tabular-nums" style={{ color }}>
                    {n(row.value)}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ol>
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

  const gradientId = `grad-${title.replace(/[^a-z]/gi, "")}-${color.replace("#", "")}`

  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-foreground">{title}</p>
          <p className="text-xs text-gray-500 dark:text-muted-foreground">{subtitle}</p>
        </div>
        {!loading && series.length > 0 && (
          <p className="text-lg font-bold tabular-nums" style={{ color }}>
            {n(series.reduce((a, b) => a + b.count, 0))}
          </p>
        )}
      </div>
      {loading ? (
        <div className="h-[140px] rounded animate-pulse bg-gray-100 dark:bg-secondary" />
      ) : series.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Geen data.</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
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
              <path d={area} fill={`url(#${gradientId})`} />
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
