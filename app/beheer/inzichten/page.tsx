"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import SceneShell from "../../../components/scene/SceneShell"
import { SceneSkeleton, SectionHeading } from "../../../components/scene/pieces"
import { EYEBROW, TEAL_DEEP, TEAL_ON_DARK } from "../../../components/scene/tokens"
import {
  ADMIN_CHIP,
  ADMIN_CHIP_ACTIVE,
  DANGER,
  DATA_PANEL,
  DATA_TILE,
  GOOD,
  ROW_LINE,
  SERIES_SKY,
  SERIES_VIOLET,
  TABLE_HEAD,
  WARN,
} from "../../../components/admin/adminSurface"

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

/*
 * The five series colours, on a dark plate.
 *
 * The light-page set (#0D9488, #D97706, #0EA5E9, #16A34A, #7C3AED) was drawn to
 * sit on white; three of the five drop under 3:1 on the plate these charts now
 * live on, and a line you cannot follow is not a chart. These are the same five
 * hues one step up - see components/admin/adminSurface.ts.
 */
const TEAL_SERIES = TEAL_ON_DARK
const AMBER = WARN
const SKY = SERIES_SKY
const GREEN = GOOD
const VIOLET = SERIES_VIOLET

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

/**
 * Inzichten & analytics, in the immersive shell.
 *
 * Same shell as the dashboard, far less picture: the landscape carries the
 * heading and the period switch, and every chart, ranking and table below it
 * sits on a near-opaque plate. A line chart drawn over a moving sky is a chart
 * nobody can read a value off, and reading values off it is the entire point of
 * the screen.
 *
 * Restyle only: the request, the one retry, the range switch, the cancellation
 * guard and every derived figure are exactly as they were.
 */
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
    <SceneShell backdrop="reader" header rail>
      {/* -- The sky --------------------------------------------------- */}
      <section aria-labelledby="inzichten-titel" className="pb-8 pt-6">
        <div className="scene-sky flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 max-w-[42rem]">
            <Link
              href="/admin"
              className="text-xs font-medium text-white/70 no-underline outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              ← Terug naar overzicht
            </Link>
            <p className={`${EYEBROW} mt-4`} style={{ color: TEAL_ON_DARK }}>
              Admin
            </p>
            <h1
              id="inzichten-titel"
              className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Inzichten &amp; analytics
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Groei, gedrag en studiegebruik over de gekozen periode
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Periode">
            {([7, 30, 90] as const).map(opt => {
              const active = opt === range
              return (
                <button
                  key={opt}
                  onClick={() => setRange(opt)}
                  aria-pressed={active}
                  className={active ? ADMIN_CHIP_ACTIVE : ADMIN_CHIP}
                  style={active ? { backgroundColor: TEAL_DEEP } : undefined}
                >
                  {opt} dagen
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* -- The desk: opaque from here down --------------------------- */}
      <div className="space-y-10 pb-20">

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-start justify-between gap-4 rounded-xl px-4 py-3"
            style={{ backgroundColor: "rgba(248,113,113,0.16)", boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.35)" }}
          >
            <p className="text-sm leading-relaxed" style={{ color: DANGER }}>
              Inzichten konden niet worden geladen. {error}
            </p>
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="flex-none rounded-md text-sm font-semibold underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-white"
              style={{ color: DANGER }}
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* ---- Bereik ---- */}
        <section aria-labelledby="inzichten-bereik">
          <SectionHeading
            id="inzichten-bereik"
            title="Bereik"
            subtitle="Wie de site bezocht en hoeveel pagina's zijn bekeken"
            rule
          />
          <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Paginaweergaven" value={sums.views} color={TEAL_SERIES} loading={loading} />
            <SummaryCard label="Unieke bezoekers" value={data?.traffic.uniqueVisitors ?? 0} color={SKY} loading={loading} />
            <SummaryCard label="Weergaven ingelogd" value={data?.traffic.loggedInViews ?? 0} color={GREEN} loading={loading} />
            <SummaryCard label="Weergaven uitgelogd" value={data?.traffic.loggedOutViews ?? 0} color={VIOLET} loading={loading} />
          </dl>

          <div className="mt-3">
            <LineCard
              id="inzichten-paginaweergaven"
              title="Paginaweergaven"
              subtitle={`Per dag · ${range} dagen`}
              series={data?.pageViews || []}
              color={TEAL_SERIES}
              loading={loading}
              compact
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <RankCard
              id="inzichten-paginas"
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
              color={TEAL_SERIES}
            />
            <RankCard
              id="inzichten-kliks"
              title="Waar wordt geklikt"
              subtitle="Geregistreerde knoppen en links"
              loading={loading}
              empty="Nog geen kliks vastgelegd."
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
        <section aria-labelledby="inzichten-studie">
          <SectionHeading
            id="inzichten-studie"
            title="Studiegebruik"
            subtitle="Hoeveel mensen daadwerkelijk bijbelstudie doen"
            rule
          />
          <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Actieve studenten" value={data?.study.activeStudents ?? 0} color={TEAL_SERIES} loading={loading} hint={`Raakten een les aan in ${range} dagen`} />
            <SummaryCard label="Lopende studies" value={data?.study.enrollmentsActive ?? 0} color={SKY} loading={loading} />
            <SummaryCard label="Afgeronde studies" value={data?.study.enrollmentsCompleted ?? 0} color={AMBER} loading={loading} />
            <SummaryCard label="Lessen afgerond" value={sums.lessons} color={GREEN} loading={loading} hint="In deze periode" />
          </dl>

          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Reflecties geschreven" value={data?.study.reflectionsWritten ?? 0} color={VIOLET} loading={loading} />
            <SummaryCard label="Quizzen nagekeken" value={data?.study.quizzesGraded ?? 0} color={AMBER} loading={loading} />
            <SummaryCard label="Quizpogingen" value={data?.study.quizAttempts ?? 0} color={AMBER} loading={loading} />
            <SummaryCard
              label="Gemiddelde quizscore"
              value={data?.study.quizAccuracy ?? 0}
              suffix="%"
              color={GREEN}
              loading={loading}
              hint={data?.study.quizAccuracy == null ? "Nog geen quizzen gemaakt" : undefined}
            />
          </dl>

          <div className="mt-3">
            <LineCard
              id="inzichten-lessen"
              title="Afgeronde lessen"
              subtitle={`Per dag · ${range} dagen`}
              series={data?.lessonsCompleted || []}
              color={GREEN}
              loading={loading}
              compact
            />
          </div>

          <div className={`mt-3 p-5 ${DATA_PANEL}`}>
            <CardHead
              id="inzichten-per-studie"
              title="Per studie"
              subtitle="Inschrijvingen, afgeronde studies en afgeronde lessen - over de hele looptijd"
            />
            {loading ? (
              <SceneSkeleton className="mt-4 h-32 w-full rounded-lg" />
            ) : (data?.study.perStudy.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-white/70">Nog niemand ingeschreven.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${ROW_LINE} ${TABLE_HEAD}`}>
                      <th scope="col" className="pb-2 pr-3 font-semibold">Studie</th>
                      <th scope="col" className="pb-2 text-right font-semibold">Ingeschreven</th>
                      <th scope="col" className="pb-2 text-right font-semibold">Afgerond</th>
                      <th scope="col" className="pb-2 text-right font-semibold">Lessen</th>
                      <th scope="col" className="pb-2 text-right font-semibold">Voltooiing</th>
                    </tr>
                  </thead>
                  {/* `divide-white/10`, not ROW_LINE: divide-* takes its own
                      colour utility, and without one Tailwind falls back to the
                      theme's border token - which flips with light/dark while
                      this plate does not. */}
                  <tbody className="divide-y divide-white/10">
                    {data!.study.perStudy.map(row => {
                      const rate = row.enrollments > 0 ? Math.round((row.completed / row.enrollments) * 100) : 0
                      return (
                        <tr key={row.studyId}>
                          <td className="py-2.5 pr-3 font-medium text-white">{row.title}</td>
                          <td className="py-2.5 text-right tabular-nums text-white/85">{n(row.enrollments)}</td>
                          <td className="py-2.5 text-right tabular-nums text-white/85">{n(row.completed)}</td>
                          <td className="py-2.5 text-right tabular-nums text-white/85">{n(row.lessonsCompleted)}</td>
                          <td className="py-2.5 text-right">
                            <span className="inline-flex items-center justify-end gap-2">
                              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
                                <span
                                  className="block h-full rounded-full"
                                  style={{ width: `${rate}%`, backgroundColor: TEAL_SERIES }}
                                />
                              </span>
                              <span className="w-9 text-right text-xs tabular-nums text-white/70">{rate}%</span>
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
        <section aria-labelledby="inzichten-groei">
          <SectionHeading
            id="inzichten-groei"
            title="Groei"
            subtitle="Aanmeldingen, abonnementen en inhoud"
            rule
          />
          <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Nieuwe gebruikers" value={sums.signups} color={TEAL_SERIES} loading={loading} />
            <SummaryCard label="Nieuwe Pro abonnees" value={sums.subs} color={AMBER} loading={loading} />
            <SummaryCard label="Notities gemaakt" value={sums.notes} color={SKY} loading={loading} />
            <SummaryCard label="Leessessies" value={sums.sessions} color={GREEN} loading={loading} />
          </dl>

          <div className="mt-3 space-y-3">
            <LineCard
              id="inzichten-groei-gebruikers"
              title="Gebruikersgroei"
              subtitle={`Aanmeldingen per dag · ${range} dagen`}
              series={data?.signups || []}
              color={TEAL_SERIES}
              loading={loading}
            />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <LineCard
                id="inzichten-conversies"
                title="Pro conversies"
                subtitle={`Nieuwe abonnees per dag · ${range} dagen`}
                series={data?.newSubscribers || []}
                color={AMBER}
                loading={loading}
                compact
              />
              <LineCard
                id="inzichten-opzeggingen"
                title="Opzeggingen"
                subtitle={`Per dag · ${range} dagen`}
                series={data?.cancellations || []}
                color={DANGER}
                loading={loading}
                compact
              />
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <LineCard
                id="inzichten-notities"
                title="Notities"
                subtitle={`Aangemaakt per dag · ${range} dagen`}
                series={data?.notes || []}
                color={SKY}
                loading={loading}
                compact
              />
              <LineCard
                id="inzichten-sessies"
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

        <p className="text-[11px] leading-relaxed text-white/55">
          Paginaweergaven en kliks worden geregistreerd als vaste route- en knopnamen, zonder
          IP-adres, muispositie of tekst. Telemetrie wordt na 400 dagen automatisch verwijderd.
        </p>
      </div>
    </SceneShell>
  )
}

/**
 * A card's own heading, one level below the section it sits in.
 *
 * `SectionHeading` from components/scene/pieces always renders an h2, which is
 * right for "Bereik" and "Groei" but would put a chart title on the same level
 * as the section that contains it. Same type treatment, an h3.
 */
function CardHead({
  id, title, subtitle, action,
}: {
  id: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={id} className="text-sm font-semibold tracking-tight text-white">{title}</h3>
        {action}
      </div>
      {subtitle && <p className="mt-1 text-xs leading-relaxed text-white/65">{subtitle}</p>}
    </div>
  )
}

function SummaryCard({
  label, value, color, loading, hint, suffix,
}: {
  label: string
  value: number
  color: string
  loading: boolean
  hint?: string
  suffix?: string
}) {
  return (
    <div className={`p-4 ${DATA_TILE}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
        {label}
      </dt>
      {loading ? (
        <dd className="mt-2">
          <SceneSkeleton className="h-7 w-2/3" />
        </dd>
      ) : (
        <dd className="content-in mt-1">
          <span className="block text-2xl font-semibold leading-tight tabular-nums" style={{ color }}>
            {n(value)}{suffix}
          </span>
          {hint && <span className="mt-1 block text-[11px] leading-snug text-white/55">{hint}</span>}
        </dd>
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
  id, title, subtitle, rows, color, loading, empty,
}: {
  id: string
  title: string
  subtitle: string
  rows: { key: string; label: string; value: number; hint?: string; ratio: number }[]
  color: string
  loading: boolean
  empty: string
}) {
  return (
    <section className={`p-5 ${DATA_PANEL}`} aria-labelledby={id}>
      <CardHead id={id} title={title} subtitle={subtitle} />

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map(i => (
            <SceneSkeleton key={i} className="h-7 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/70">{empty}</p>
      ) : (
        <ol className="mt-4 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
          {rows.map(row => (
            <li key={row.key} className="relative overflow-hidden rounded-lg">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-lg"
                style={{ width: `${Math.max(row.ratio * 100, 2)}%`, backgroundColor: `${color}2E` }}
              />
              <span className="relative flex items-center justify-between gap-3 px-2.5 py-1.5">
                <span className="truncate text-[12.5px] font-medium text-white/90">{row.label}</span>
                <span className="flex flex-none items-center gap-2">
                  {row.hint && (
                    <span className="text-[11px] tabular-nums text-white/55">{row.hint}</span>
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
    </section>
  )
}

function LineCard({
  id, title, subtitle, series, color, loading, compact = false,
}: {
  id: string
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
    <section className={`p-5 ${DATA_PANEL}`} aria-labelledby={id}>
      <CardHead
        id={id}
        title={title}
        subtitle={subtitle}
        action={
          !loading && series.length > 0 ? (
            <p className="text-lg font-semibold tabular-nums" style={{ color }}>
              {n(series.reduce((a, b) => a + b.count, 0))}
            </p>
          ) : undefined
        }
      />
      {loading ? (
        <SceneSkeleton className="mt-4 h-[140px] w-full rounded-lg" />
      ) : series.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/70">Geen data.</p>
      ) : (
        <div className="mt-4 w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <g transform={`translate(${padding.left} ${padding.top})`}>
              {yTicks.map((t, i) => (
                <g key={i}>
                  {/* Literal whites: `text-border` is a theme token and would
                      flip with the reader's light/dark setting while this plate
                      stays dark either way. */}
                  <line
                    x1={0}
                    x2={innerW}
                    y1={t.y}
                    y2={t.y}
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1"
                    strokeDasharray={i === yTicks.length - 1 ? "0" : "3 4"}
                  />
                  <text x={-6} y={t.y + 3} fontSize="9" textAnchor="end" fill="rgba(255,255,255,0.6)">
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
                  <text key={i} x={p.x} y={innerH + 14} fontSize="9" textAnchor="middle" fill="rgba(255,255,255,0.6)">
                    {formatDate(p.d)}
                  </text>
                )
              })}
            </g>
          </svg>
        </div>
      )}
    </section>
  )
}
