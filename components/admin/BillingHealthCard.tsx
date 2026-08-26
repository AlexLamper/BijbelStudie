"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Wrench } from "lucide-react"

/**
 * Stripe <-> database health, on the admin dashboard.
 *
 * The incident this was built for: a live subscriber sat at `subscribed: false`
 * for days because the write that grants access threw, and no screen anywhere in
 * the product compared what Stripe was billing against what the database
 * believed. The cheap signal (`possiblyMissedWebhooks`) is therefore always
 * visible; the full Stripe reconciliation is a button, because it walks the
 * Stripe API and should not run on every dashboard render.
 */

const TEAL = "#0D9488"
const AMBER = "#D97706"
const RED = "#DC2626"

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
  const appWebhook = report?.webhookEndpoints.find(e => e.pointsAtThisApp)

  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: missed > 0 ? "rgba(220,38,38,0.08)" : "rgba(13,148,136,0.08)" }}
          >
            <ShieldAlert size={14} style={{ color: missed > 0 ? RED : TEAL }} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-foreground">Abonnementen &amp; Stripe</p>
            <p className="text-xs text-gray-500 dark:text-muted-foreground">
              Vergelijkt wat Stripe factureert met wat de database toekent
            </p>
          </div>
        </div>
        <button
          onClick={check}
          disabled={checking || applying}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-secondary text-foreground disabled:opacity-50"
        >
          <RefreshCw size={12} className={checking ? "animate-spin" : undefined} />
          {checking ? "Bezig…" : "Controleer Stripe"}
        </button>
      </div>

      {/* Always-on cheap signals, straight from the stats endpoint. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label="Actief"
          value={billing?.byStatus?.active}
          loading={loading}
          color={TEAL}
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
      </div>

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
          <CheckCircle2 size={12} className="inline mr-1 -mt-0.5" />
          {applied}
        </Banner>
      )}

      {report && (
        <div className="mt-4 space-y-4">
          {/* Webhook configuration */}
          <div className="rounded-lg border border-border p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-muted-foreground mb-2">
              Webhook-configuratie ({report.stripeMode})
            </p>
            {report.webhookEndpointError ? (
              <p className="text-xs text-muted-foreground">
                Kon endpoints niet uitlezen: {report.webhookEndpointError}
              </p>
            ) : appWebhook ? (
              <p className="text-xs text-foreground">
                <span
                  className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] mr-1.5"
                  style={{
                    backgroundColor: appWebhook.status === "enabled" ? "rgba(13,148,136,0.1)" : "rgba(220,38,38,0.1)",
                    color: appWebhook.status === "enabled" ? TEAL : RED,
                  }}
                >
                  {appWebhook.status}
                </span>
                {appWebhook.url}
                <span className="text-muted-foreground"> · {appWebhook.enabledEvents.length} events</span>
              </p>
            ) : (
              <p className="text-xs" style={{ color: RED }}>
                <AlertTriangle size={12} className="inline mr-1 -mt-0.5" />
                Geen webhook-endpoint gevonden dat naar deze app wijst. Zonder endpoint wordt een
                betaling nooit omgezet in toegang.
              </p>
            )}
          </div>

          {/* Findings */}
          {problemCount === 0 ? (
            <Banner tone="ok">
              <CheckCircle2 size={12} className="inline mr-1 -mt-0.5" />
              Stripe en de database zijn het eens. {report.stripeSubscriptions.total} abonnement(en)
              gecontroleerd, waarvan {report.stripeSubscriptions.entitled} met toegang.
            </Banner>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400 dark:text-muted-foreground border-b border-border">
                      <th className="py-1.5 pr-3 font-semibold">Account</th>
                      <th className="py-1.5 pr-3 font-semibold">Stripe</th>
                      <th className="py-1.5 pr-3 font-semibold">Database</th>
                      <th className="py-1.5 font-semibold">Wordt gezet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.mismatches.map((m, i) => (
                      <tr key={i} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-3">
                          <p className="font-semibold text-foreground">{m.email ?? "onbekend"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {m.stripeCustomerId ?? "-"}
                          </p>
                          {m.note && (
                            <p className="text-[10px] mt-0.5" style={{ color: AMBER }}>{m.note}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <Pill
                            text={m.stripeStatus ?? "geen"}
                            color={m.stripeEntitled ? TEAL : AMBER}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Pill
                            text={m.localSubscribed ? "pro" : m.localStatus ?? "geen"}
                            color={m.localSubscribed ? TEAL : RED}
                          />
                        </td>
                        <td className="py-2 text-[10px] text-muted-foreground">
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

              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={repairDocuments}
                    onChange={e => setRepairDocuments(e.target.checked)}
                  />
                  Ongeldige <code>readChapters</code>-sleutels ook opschonen
                </label>
                <button
                  onClick={apply}
                  disabled={applying || report.mismatches.every(m => !m.userId)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: TEAL }}
                >
                  <Wrench size={12} />
                  {applying ? "Bezig…" : "Herstel op basis van Stripe"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
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
    <div className="rounded-lg border border-border p-3" title={hint}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <div className="h-6 w-10 mt-1 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
      ) : (
        <p className="text-xl font-bold leading-tight" style={color ? { color } : undefined}>
          {(value ?? 0).toLocaleString("nl-NL")}
        </p>
      )}
    </div>
  )
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px]"
      style={{ backgroundColor: `${color}1A`, color }}
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
  const color = tone === "ok" ? TEAL : tone === "warn" ? AMBER : RED
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs mt-3"
      style={{ backgroundColor: `${color}14`, color }}
    >
      {children}
    </div>
  )
}
