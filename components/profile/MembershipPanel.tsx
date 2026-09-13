"use client"

import Link from "next/link"

/**
 * Het lidmaatschapspaneel dat de Abonnement-kaart vervangt.
 *
 * Dezelfde kaart als de andere kaarten in de rail van /profiel (Je boom,
 * Badges, Account): lichte ondergrond, haarlijn, 14.5 px titel met een lijn
 * eronder. Pro onderscheidt zich alleen met een teal accent op het woord "Pro"
 * en de status rechtsboven, niet met een donkere ondergrond.
 */

export interface BillingInfo {
  source: "stripe" | "apple" | "google" | "admin" | null
  interval: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  storeExpiresAt: string | null
  isPaused: boolean
  pausedUntil: string | null
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : null

function planLabel(b: BillingInfo | null, isAdmin: boolean): string {
  if (isAdmin || b?.source === "admin") return "Beheerderstoegang"
  const via = b?.source === "apple" ? " · App Store" : b?.source === "google" ? " · Google Play" : ""
  if (b?.interval === "annual" || b?.interval === "yearly") return `Jaarlijks${via}`
  if (b?.interval === "monthly") return `Maandelijks${via}`
  return via ? `Pro${via}` : "Pro"
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-baseline gap-3 py-2 ${last ? "" : "border-b border-line-soft"}`}>
      <dt className="flex-1 text-[13px] text-ink-muted">{label}</dt>
      <dd className="text-right text-[13px] font-bold text-ink">{value}</dd>
    </div>
  )
}

const CARD = "flex-none rounded-card border border-line bg-surface p-[15px]"

function Header({ status, statusAccent }: { status: string; statusAccent: boolean }) {
  return (
    <>
      <div className="flex items-baseline gap-2">
        <span className="flex-1 text-[14.5px] font-bold text-ink">Lidmaatschap</span>
        <span className={`text-[12.5px] ${statusAccent ? "font-semibold text-teal" : "text-ink-faint"}`}>{status}</span>
      </div>
      <div className="mt-3 h-px bg-line" />
    </>
  )
}

export function ProMembershipPanel({
  memberSince,
  billing,
  isAdmin,
}: {
  memberSince: string | null
  billing: BillingInfo | null
  isAdmin: boolean
}) {
  const renew = billing?.storeExpiresAt ?? billing?.currentPeriodEnd ?? null
  const renewLabel = billing?.isPaused
    ? "Gepauzeerd tot"
    : billing?.cancelAtPeriodEnd
      ? "Loopt af op"
      : "Verlengt op"
  const renewValue = billing?.isPaused ? fmtDate(billing.pausedUntil) : fmtDate(renew)

  const showRenew = !isAdmin && !!renewValue

  return (
    <section aria-label="Lidmaatschap" className={CARD}>
      <Header status={isAdmin ? "Beheerder" : "Actief"} statusAccent />

      <div className="mt-[13px] text-[17px] font-bold leading-tight tracking-[-0.3px] text-ink">
        BijbelStudie <span className="text-teal">Pro</span>
      </div>
      <p className="mt-[5px] text-[12.5px] leading-[1.55] text-ink-body">
        {isAdmin
          ? "Als beheerder heb je toegang tot alle Pro-functies."
          : "Commentaren, de grondtekst en alle studiehulpmiddelen staan voor je open."}
      </p>

      <dl className="mt-[6px]">
        <Row label="Lid sinds" value={memberSince ?? "-"} />
        <Row label="Abonnement" value={planLabel(billing, isAdmin)} last={!showRenew} />
        {showRenew && renewValue && <Row label={renewLabel} value={renewValue} last />}
      </dl>

      {!isAdmin && (
        <>
          <div className="mt-[6px] h-px bg-line" />
          <div className="mt-[13px] text-center">
            <Link
              href="/abonnement"
              className="text-[13px] font-semibold text-teal no-underline hover:text-teal-dark dark:hover:text-teal-bright"
            >
              Abonnement beheren →
            </Link>
          </div>
        </>
      )}
    </section>
  )
}

export function FreeMembershipPanel({ memberSince }: { memberSince: string | null }) {
  return (
    <section aria-label="Lidmaatschap" className={CARD}>
      <Header status="Gratis" statusAccent={false} />

      <div className="mt-[13px] text-[17px] font-bold leading-tight tracking-[-0.3px] text-ink">
        BijbelStudie <span className="font-semibold text-ink-muted">Gratis</span>
      </div>
      <p className="mt-[5px] text-[12.5px] leading-[1.55] text-ink-body">
        Upgrade naar Pro voor commentaren, de grondtekst en meer studiehulpmiddelen.
      </p>

      <dl className="mt-[6px]">
        <Row label="Lid sinds" value={memberSince ?? "-"} last />
      </dl>

      <Link
        href="/abonnement"
        className="mt-[10px] flex h-10 items-center justify-center rounded-btn bg-teal text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
      >
        Upgrade naar Pro
      </Link>
    </section>
  )
}
