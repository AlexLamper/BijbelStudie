"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ChevronLeft } from "lucide-react"
import AppShell from "../../../components/shell/AppShell"
import { Skeleton } from "../../../components/kit/primitives"
import {
  ADMIN_BUTTON,
  BACK_LINK,
  CARD_SUBTITLE,
  CARD_TITLE,
  DANGER,
  GOOD,
  HUE_VARS,
  PANEL,
  ROW_LINE,
  SEG_ITEM,
  SEG_OFF,
  SEG_ON,
  SEG_TRACK,
  SERIES_SKY,
  SERIES_TEAL,
  SERIES_VIOLET,
  TABLE_HEAD,
  WARN,
  tint,
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
 * The five series colours. Each is a custom property with a light value drawn
 * for white and a dark value one step up the scale (HUE_VARS in
 * components/admin/adminSurface.ts), so a line stays followable in either theme.
 */
const TEAL_SERIES = SERIES_TEAL
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
  reading_tab_crossrefs: "Tab: verwijzingen",
  reading_tab_original: "Tab: grondtekst",
  reading_tab_historical: "Tab: algemene info",
  reading_tab_notes: "Tab: notities",
  reading_tab_ai: "Tab: AI-assistent",
  ai_open: "AI-assistent geopend",
  ai_ask: "Vraag aan AI",
  onboarding_complete: "Onboarding afgerond",
  onboarding_guest_register: "Onboarding: account maken (gast)",
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
 * Inzichten & analytics, in the AppShell.
 *
 * Three sections - Bereik, Studiegebruik, Groei - each a heading, a row of
 * figure cards and the charts under it, drawn from the same Card and type scale
 * as /profiel and /dashboard. Card pairs stack below `lg`; the per-study table
 * scrolls sideways inside its card, never the page.
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
    <AppShell title="Inzichten" active="/beheer">
      <div className={`flex flex-col gap-4 ${HUE_VARS}`}>
        {/* -- The way back, and the period switch ------------------------- */}
        <div className="flex flex-none flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <Link href="/beheer" className={BACK_LINK}>
              <ChevronLeft size={15} aria-hidden /> Beheer
            </Link>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Groei, gedrag en studiegebruik over de gekozen periode
            </p>
          </div>
          <div className={SEG_TRACK} role="group" aria-label="Periode">
            {([7, 30, 90] as const).map(opt => {
              const active = opt === range
              return (
                <button
                  key={opt}
                  onClick={() => setRange(opt)}
                  aria-pressed={active}
                  className={`${SEG_ITEM} ${active ? SEG_ON : SEG_OFF}`}
                >
                  {opt} dagen
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-none flex-wrap items-center justify-between gap-3 rounded-card border border-danger/40 bg-surface p-4"
          >
            <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed" style={{ color: DANGER }}>
              Inzichten konden niet worden geladen. {error}
            </p>
            <button onClick={() => setReloadKey(k => k + 1)} className={ADMIN_BUTTON}>
              Opnieuw proberen
            </button>
          </div>
        )}

        <div className="flex flex-col gap-8 pb-4">
          {/* ---- Bereik ---- */}
          <section aria-labelledby="inzichten-bereik">
            <SectionTitle
              id="inzichten-bereik"
              title="Bereik"
              subtitle="Wie de site bezocht en hoeveel pagina's zijn bekeken"
            />
            <dl className="mt-3 grid grid-cols-2 gap-[13px] lg:grid-cols-4">
              <SummaryCard label="Paginaweergaven" value={sums.views} color={TEAL_SERIES} loading={loading} />
              <SummaryCard label="Unieke bezoekers" value={data?.traffic.uniqueVisitors ?? 0} color={SKY} loading={loading} />
              <SummaryCard label="Weergaven ingelogd" value={data?.traffic.loggedInViews ?? 0} color={GREEN} loading={loading} />
              <SummaryCard label="Weergaven uitgelogd" value={data?.traffic.loggedOutViews ?? 0} color={VIOLET} loading={loading} />
            </dl>

            <div className="mt-[13px]">
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

            <div className="mt-[13px] grid grid-cols-1 gap-[13px] lg:grid-cols-2">
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
            <SectionTitle
              id="inzichten-studie"
              title="Studiegebruik"
              subtitle="Hoeveel mensen daadwerkelijk bijbelstudie doen"
            />
            <dl className="mt-3 grid grid-cols-2 gap-[13px] lg:grid-cols-4">
              <SummaryCard label="Actieve studenten" value={data?.study.activeStudents ?? 0} color={TEAL_SERIES} loading={loading} hint={`Raakten een les aan in ${range} dagen`} />
              <SummaryCard label="Lopende studies" value={data?.study.enrollmentsActive ?? 0} color={SKY} loading={loading} />
              <SummaryCard label="Afgeronde studies" value={data?.study.enrollmentsCompleted ?? 0} color={AMBER} loading={loading} />
              <SummaryCard label="Lessen afgerond" value={sums.lessons} color={GREEN} loading={loading} hint="In deze periode" />
            </dl>

            <dl className="mt-[13px] grid grid-cols-2 gap-[13px] lg:grid-cols-4">
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

            <div className="mt-[13px]">
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

            <div className={`mt-[13px] p-4 sm:p-[17px] ${PANEL}`}>
              <CardHead
                id="inzichten-per-studie"
                title="Per studie"
                subtitle="Inschrijvingen, afgeronde studies en afgeronde lessen - over de hele looptijd"
              />
              {loading ? (
                <Skeleton className="mt-4 h-32 w-full" />
              ) : (data?.study.perStudy.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink-muted">Nog niemand ingeschreven.</p>
              ) : (
                <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:-mx-[17px] sm:px-[17px]">
                  <table className="w-full min-w-[520px] text-[12.5px]">
                    <thead>
                      <tr className={`border-b ${ROW_LINE} ${TABLE_HEAD}`}>
                        <th scope="col" className="pb-2 pr-3 font-semibold">Studie</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Ingeschreven</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Afgerond</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Lessen</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Voltooiing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-soft">
                      {data!.study.perStudy.map(row => {
                        const rate = row.enrollments > 0 ? Math.round((row.completed / row.enrollments) * 100) : 0
                        return (
                          <tr key={row.studyId}>
                            <td className="py-2.5 pr-3 font-semibold text-ink">{row.title}</td>
                            <td className="py-2.5 text-right tabular-nums text-ink-body">{n(row.enrollments)}</td>
                            <td className="py-2.5 text-right tabular-nums text-ink-body">{n(row.completed)}</td>
                            <td className="py-2.5 text-right tabular-nums text-ink-body">{n(row.lessonsCompleted)}</td>
                            <td className="py-2.5 text-right">
                              <span className="inline-flex items-center justify-end gap-2">
                                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                                  <span
                                    className="block h-full rounded-full"
                                    style={{ width: `${rate}%`, backgroundColor: TEAL_SERIES }}
                                  />
                                </span>
                                <span className="w-9 text-right text-[12px] tabular-nums text-ink-muted">{rate}%</span>
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
            <SectionTitle
              id="inzichten-groei"
              title="Groei"
              subtitle="Aanmeldingen, abonnementen en inhoud"
            />
            <dl className="mt-3 grid grid-cols-2 gap-[13px] lg:grid-cols-4">
              <SummaryCard label="Nieuwe gebruikers" value={sums.signups} color={TEAL_SERIES} loading={loading} />
              <SummaryCard label="Nieuwe Pro abonnees" value={sums.subs} color={AMBER} loading={loading} />
              <SummaryCard label="Notities gemaakt" value={sums.notes} color={SKY} loading={loading} />
              <SummaryCard label="Leessessies" value={sums.sessions} color={GREEN} loading={loading} />
            </dl>

            <div className="mt-[13px] space-y-[13px]">
              <LineCard
                id="inzichten-groei-gebruikers"
                title="Gebruikersgroei"
                subtitle={`Aanmeldingen per dag · ${range} dagen`}
                series={data?.signups || []}
                color={TEAL_SERIES}
                loading={loading}
              />
              <div className="grid grid-cols-1 gap-[13px] lg:grid-cols-2">
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
              <div className="grid grid-cols-1 gap-[13px] lg:grid-cols-2">
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

          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            Paginaweergaven en kliks worden geregistreerd als vaste route- en knopnamen, zonder
            IP-adres, muispositie of tekst. Telemetrie wordt na 400 dagen automatisch verwijderd.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

/** A section heading, in the kit's SectionHeading type (16 px bold). */
function SectionTitle({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div>
      <h2 id={id} className="text-[16px] font-bold text-ink">{title}</h2>
      {subtitle && <p className="mt-[2px] text-[12.5px] text-ink-muted">{subtitle}</p>}
    </div>
  )
}

/** A card's own heading, one level below the section it sits in. */
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
        <h3 id={id} className={CARD_TITLE}>{title}</h3>
        {action}
      </div>
      {subtitle && <p className={CARD_SUBTITLE}>{subtitle}</p>}
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
    <div className={`min-w-0 px-[15px] py-[13px] sm:px-[17px] sm:py-[15px] ${PANEL}`}>
      <dt className="flex items-center gap-[7px] text-[12px] text-ink-muted">
        {/* The dot ties the figure to its series colour in the charts below. */}
        <span aria-hidden className="h-[7px] w-[7px] flex-none rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 truncate">{label}</span>
      </dt>
      {loading ? (
        <dd className="mt-2">
          <Skeleton className="h-7 w-2/3" />
        </dd>
      ) : (
        <dd className="content-in mt-[6px]">
          <span className="block text-[22px] font-bold leading-tight tracking-[-0.5px] text-ink tabular-nums sm:text-[25px]">
            {n(value)}{suffix}
          </span>
          {hint && <span className="mt-1 block text-[11.5px] leading-snug text-ink-faint">{hint}</span>}
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
    <section className={`min-w-0 p-4 sm:p-[17px] ${PANEL}`} aria-labelledby={id}>
      <CardHead id={id} title={title} subtitle={subtitle} />

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-muted">{empty}</p>
      ) : (
        <ol className="mt-3 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
          {rows.map(row => (
            <li key={row.key} className="relative overflow-hidden rounded-[7px]">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-[7px]"
                style={{ width: `${Math.max(row.ratio * 100, 2)}%`, backgroundColor: tint(color, 16) }}
              />
              <span className="relative flex items-center justify-between gap-3 px-2.5 py-1.5">
                <span className="min-w-0 truncate text-[12.5px] font-medium text-ink-body">{row.label}</span>
                <span className="flex flex-none items-center gap-2">
                  {row.hint && (
                    <span className="hidden text-[11px] tabular-nums text-ink-faint min-[420px]:inline">{row.hint}</span>
                  )}
                  <span className="text-[12.5px] font-bold tabular-nums text-ink">
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

  const gradientId = `grad-${title.replace(/[^a-z]/gi, "")}-${color.replace(/[^a-z0-9]/gi, "")}`

  return (
    <section className={`min-w-0 p-4 sm:p-[17px] ${PANEL}`} aria-labelledby={id}>
      <CardHead
        id={id}
        title={title}
        subtitle={subtitle}
        action={
          !loading && series.length > 0 ? (
            <p className="text-[18px] font-bold tabular-nums text-ink">
              {n(series.reduce((a, b) => a + b.count, 0))}
            </p>
          ) : undefined
        }
      />
      {loading ? (
        <Skeleton className="mt-4 h-[140px] w-full" />
      ) : series.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-ink-muted">Geen data.</p>
      ) : (
        <div className="mt-4 w-full overflow-hidden">
          {/* Colours go through `style`, not presentation attributes: they are
              custom properties that flip with the theme, and var() is only
              reliable in the CSS cascade. */}
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.22 }} />
                <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <g transform={`translate(${padding.left} ${padding.top})`}>
              {yTicks.map((t, i) => (
                <g key={i}>
                  <line
                    x1={0}
                    x2={innerW}
                    y1={t.y}
                    y2={t.y}
                    style={{ stroke: "var(--line)" }}
                    strokeWidth="1"
                    strokeDasharray={i === yTicks.length - 1 ? "0" : "3 4"}
                  />
                  <text x={-6} y={t.y + 3} fontSize="9" textAnchor="end" style={{ fill: "var(--ink-faint)" }}>
                    {t.value}
                  </text>
                </g>
              ))}
              <path d={area} style={{ fill: `url(#${gradientId})` }} />
              <path d={path} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} style={{ fill: color }}>
                  <title>{`${formatDate(p.d, false)}: ${p.c}`}</title>
                </circle>
              ))}
              {xTickIndices.map(i => {
                const p = points[i]
                if (!p) return null
                return (
                  <text key={i} x={p.x} y={innerH + 14} fontSize="9" textAnchor="middle" style={{ fill: "var(--ink-faint)" }}>
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
