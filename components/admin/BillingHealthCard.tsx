"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw, Wrench } from "lucide-react"
import { SceneSkeleton, SectionHeading } from "../scene/pieces"
import { TEAL_DEEP, TEAL_ON_DARK } from "../scene/tokens"
import { ADMIN_BUTTON, DANGER, DATA_INSET, DATA_PANEL, GOOD, ROW_LINE, TABLE_HEAD, WARN } from "./adminSurface"

/**
 * Stripe <-> database health, on the admin dashboard.
 *
 * The incident this was built for: a live subscriber sat at `subscribed: false`
 * for days because the write that grants access threw, and no screen anywhere in
 * the product compared what Stripe was billing against what the database
 * believed. The cheap signal (`possiblyMissedWebhooks`) is therefore always
 * visible; the full Stripe reconciliation is a button, because it walks the
 * Stripe API and should not run on every dashboard render.
 *
 * Restyled for the immersive shell and nothing more: the card is a near-opaque
 * plate so a mismatch table stays exactly as readable as it was on white, the
 * status hues moved one step up the scale to clear 4.5:1 on that plate, and the
 * confirmation before `apply()` is unchanged - same wording, same endpoint,
 * same disabled rules.
 */

const AMBER = WARN
const RED = DANGER

export interface BillingStats {
  byStatus: Record<string, number>
  withBillingIssue: number
  cancelAtPeriodEnd: number
  paused: number
  possiblyMissedWebhooks: number
  monthlySubscribers: number
  annualSubscribers: number
  unknownInterval: number
}

interface Mismatch {
  userId: string | null
  email: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeStatus: string | null
  stripeEntitled: boolean
  localSubscribed: boolean
  localStatus: string | null
  wouldChange: string[]
  note?: string
}

interface DocumentProblem {
  userId: string
  email: string | null
  invalidReadChapterKeys: string[]
}

interface Report {
  checkedAt: string
  stripeMode: "live" | "test" | "unknown"
  webhookEndpoints: {
    id: string
    url: string
    status: string
    apiVersion: string | null
    enabledEvents: string[]
    pointsAtThisApp: boolean
  }[]
  webhookHealth: {
    status: "ok" | "warn" | "fail"
    message: string
    requiredEvents: string[]
    missingEvents: string[]
    endpointCount: number
    matchedEndpointIds: string[]
  }
  webhookEndpointError?: string
  stripeSubscriptions: { total: number; entitled: number; unmatched: number }
  mismatches: Mismatch[]
  documentProblems: DocumentProblem[]
}

export default function BillingHealthCard({
  billing,
  loading,
}: {
  billing?: BillingStats
  loading: boolean
}) {
  const [report, setReport] = useState<Report | null>(null)
  const [checking, setChecking] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)
  const [repairDocuments, setRepairDocuments] = useState(true)

  async function check() {
    setChecking(true)
    setError(null)
    setApplied(null)
    try {
      const res = await fetch("/api/admin/reconcile-subscriptions")
      const data = await res.json()
      if (!res.ok) throw new Error(data?.details || data?.error || "Controle mislukt")
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Controle mislukt")
    } finally {
      setChecking(false)
    }
  }

  async function apply() {
    const repairable = report?.mismatches.filter(m => m.userId) ?? []
    const docs = repairDocuments ? report?.documentProblems.length ?? 0 : 0
    if (
      !confirm(
        `${repairable.length} account(s) worden bijgewerkt naar de status die Stripe doorgeeft` +
          (docs > 0 ? `, en ${docs} document(en) worden opgeschoond` : "") +
          ".\n\nDoorgaan?"
      )
    ) {
      return
    }

    setApplying(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/reconcile-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repairDocuments }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.details || data?.error || "Herstel mislukt")
      setApplied(
        `${data.billingRepairs.length} abonnement(en) hersteld` +
          (data.documentRepairs.length > 0
            ? `, ${data.documentRepairs.length} document(en) opgeschoond`
            : "")
      )
      await check()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Herstel mislukt")
    } finally {
      setApplying(false)
    }
  }

  const missed = billing?.possiblyMissedWebhooks ?? 0
  const problemCount = (report?.mismatches.length ?? 0) + (report?.documentProblems.length ?? 0)
  const appWebhook =
    report?.webhookEndpoints.find(e => e.pointsAtThisApp && e.status === "enabled") ??
    report?.webhookEndpoints.find(e => e.pointsAtThisApp)
  const webhookHealth = report?.webhookHealth

  return (
    <section className={`p-5 ${DATA_PANEL}`} aria-labelledby="beheer-stripe">
      <SectionHeading
        id="beheer-stripe"
        title="Abonnementen & Stripe"
        subtitle="Vergelijkt wat Stripe factureert met wat de database toekent"
        action={
          <button onClick={check} disabled={checking || applying} className={ADMIN_BUTTON}>
            <RefreshCw size={12} className={checking ? "animate-spin" : undefined} aria-hidden />
            {checking ? "Bezig…" : "Controleer Stripe"}
          </button>
        }
      />

      {/* Always-on cheap signals, straight from the stats endpoint. */}
      <dl className="mb-4 mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Actief"
          value={billing?.byStatus?.active}
          loading={loading}
          color={TEAL_ON_DARK}
        />
        <Stat
          label="Betaalprobleem"
          value={billing?.withBillingIssue}
          loading={loading}
          color={billing?.withBillingIssue ? AMBER : undefined}
        />
        <Stat
          label="Zegt op"
          value={billing?.cancelAtPeriodEnd}
          loading={loading}
          color={billing?.cancelAtPeriodEnd ? AMBER : undefined}
        />
        <Stat
          label="Betaald, geen Pro"
          value={missed}
          loading={loading}
          color={missed > 0 ? RED : undefined}
          hint="Stripe-klant aangemaakt, maar nooit een abonnementsstatus teruggeschreven"
        />
      </dl>

      {missed > 0 && (
        <Banner tone="danger">
          {missed} account(s) hebben een Stripe-klant maar geen abonnementsstatus. Dat is een
          afgeronde afrekening waarvan het resultaat nooit is verwerkt. Klik op{" "}
          <strong>Controleer Stripe</strong> om te zien wat Stripe voor deze klanten zegt.
        </Banner>
      )}

      {error && <Banner tone="danger">{error}</Banner>}
      {applied && (
        <Banner tone="ok">
          <CheckCircle2 size={12} className="-mt-0.5 mr-1 inline" aria-hidden />
          {applied}
        </Banner>
      )}

      {report && (
        <div className="mt-4 space-y-4">
          {/* Webhook configuration */}
          <div className={`p-3 ${DATA_INSET}`}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
              Webhook-configuratie ({report.stripeMode})
            </p>
            {report.webhookEndpointError ? (
              <p className="text-xs text-white/70">
                Kon endpoints niet uitlezen: {report.webhookEndpointError}
              </p>
            ) : appWebhook && webhookHealth ? (
              <div className="space-y-1.5">
                <p className="break-all text-xs text-white/85">
                  <span
                    className="mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      backgroundColor:
                        webhookHealth.status === "ok"
                          ? "rgba(45,212,191,0.18)"
                          : webhookHealth.status === "warn"
                            ? "rgba(251,191,36,0.18)"
                            : "rgba(248,113,113,0.18)",
                      color:
                        webhookHealth.status === "ok"
                          ? TEAL_ON_DARK
                          : webhookHealth.status === "warn"
                            ? AMBER
                            : RED,
                    }}
                  >
                    {webhookHealth.status}
                  </span>
                  {appWebhook.url}
                  <span className="text-white/60"> · {appWebhook.enabledEvents.length} events</span>
                </p>
                <p
                  className="text-xs"
                  style={{
                    color:
                      webhookHealth.status === "ok"
                        ? TEAL_ON_DARK
                        : webhookHealth.status === "warn"
                          ? AMBER
                          : RED,
                  }}
                >
                  {webhookHealth.message}
                </p>
                {webhookHealth.missingEvents.length > 0 && (
                  <p className="text-[11px] leading-relaxed text-white/65">
                    Ontbrekende events: {webhookHealth.missingEvents.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ color: RED }}>
                <AlertTriangle size={12} className="-mt-0.5 mr-1 inline" aria-hidden />
                Geen webhook-endpoint gevonden dat naar deze app wijst. Zonder endpoint wordt een
                betaling nooit omgezet in toegang.
              </p>
            )}
          </div>

          {/* Findings */}
          {problemCount === 0 ? (
            <Banner tone="ok">
              <CheckCircle2 size={12} className="-mt-0.5 mr-1 inline" aria-hidden />
              Stripe en de database zijn het eens. {report.stripeSubscriptions.total} abonnement(en)
              gecontroleerd, waarvan {report.stripeSubscriptions.entitled} met toegang.
            </Banner>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={`border-b ${ROW_LINE} ${TABLE_HEAD}`}>
                      <th scope="col" className="py-1.5 pr-3 font-semibold">Account</th>
                      <th scope="col" className="py-1.5 pr-3 font-semibold">Stripe</th>
                      <th scope="col" className="py-1.5 pr-3 font-semibold">Database</th>
                      <th scope="col" className="py-1.5 font-semibold">Wordt gezet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.mismatches.map((m, i) => (
                      <tr key={i} className={`border-b align-top ${ROW_LINE}`}>
                        <td className="py-2 pr-3">
                          <p className="font-semibold text-white">{m.email ?? "onbekend"}</p>
                          <p className="text-[10px] text-white/55">
                            {m.stripeCustomerId ?? "-"}
                          </p>
                          {m.note && (
                            <p className="mt-0.5 text-[10px]" style={{ color: AMBER }}>{m.note}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <Pill
                            text={m.stripeStatus ?? "geen"}
                            color={m.stripeEntitled ? TEAL_ON_DARK : AMBER}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Pill
                            text={m.localSubscribed ? "pro" : m.localStatus ?? "geen"}
                            color={m.localSubscribed ? TEAL_ON_DARK : RED}
                          />
                        </td>
                        <td className="py-2 text-[10px] text-white/65">
                          {m.wouldChange.length > 0 ? m.wouldChange.join(", ") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {report.documentProblems.length > 0 && (
                <Banner tone="warn">
                  {report.documentProblems.length} gebruiker(s) hebben een ongeldige sleutel in
                  <code className="mx-1">readChapters</code>. Zo&apos;n sleutel laat elke volledige
                  opslag van dat document mislukken, waardoor profielbewerkingen en leesvoortgang
                  stukgaan.{" "}
                  {report.documentProblems.map(p => p.email ?? p.userId).join(", ")}
                </Banner>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-white/75">
                  <input
                    type="checkbox"
                    checked={repairDocuments}
                    onChange={e => setRepairDocuments(e.target.checked)}
                    className="accent-[#0D9488]"
                  />
                  Ongeldige <code>readChapters</code>-sleutels ook opschonen
                </label>
                <button
                  onClick={apply}
                  disabled={applying || report.mismatches.every(m => !m.userId)}
                  className="press inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                  style={{ backgroundColor: TEAL_DEEP }}
                >
                  <Wrench size={12} aria-hidden />
                  {applying ? "Bezig…" : "Herstel op basis van Stripe"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

function Stat({
  label,
  value,
  loading,
  color,
  hint,
}: {
  label: string
  value?: number
  loading: boolean
  color?: string
  hint?: string
}) {
  return (
    <div className={`p-3 ${DATA_INSET}`} title={hint}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">
        {label}
      </dt>
      {loading ? (
        <dd className="mt-1">
          <SceneSkeleton className="h-6 w-10" />
        </dd>
      ) : (
        <dd
          className="text-xl font-semibold leading-tight tabular-nums text-white"
          style={color ? { color } : undefined}
        >
          {(value ?? 0).toLocaleString("nl-NL")}
        </dd>
      )}
    </div>
  )
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: `${color}2E`, color }}
    >
      {text}
    </span>
  )
}

function Banner({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "danger"
  children: React.ReactNode
}) {
  const color = tone === "ok" ? GOOD : tone === "warn" ? AMBER : RED
  return (
    <div
      className="mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed"
      style={{ backgroundColor: `${color}1F`, color }}
    >
      {children}
    </div>
  )
}
