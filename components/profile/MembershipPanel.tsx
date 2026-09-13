"use client"

import Link from "next/link"

/**
 * Ontwerp A - het lidmaatschapspaneel dat de Abonnement-kaart vervangt.
 *
 * Pro: een donker paneel (slate-900 naar diep teal), een teal haarlijn aan de
 * binnenkant, een zachte grote schaduw en één statisch lichtvlak in de
 * rechterbovenhoek. Geen animatie, geen icoon, geen goud.
 * Gratis: dezelfde opbouw op een witte kaart, met een donkere knop die het
 * Pro-paneel aankondigt in plaats van een teal vlak.
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

function Row({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-[7px]">
      <dt className={`flex-1 text-[12.5px] ${dark ? "text-slate-400" : "text-ink-muted"}`}>{label}</dt>
      <dd className={`text-right text-[13px] font-semibold ${dark ? "text-slate-100" : "text-ink"}`}>{value}</dd>
    </div>
  )
}

const EYEBROW = "text-[10.5px] font-semibold uppercase tracking-[0.18em]"

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

  return (
    <section
      aria-label="Lidmaatschap"
      className="relative flex-none overflow-hidden rounded-card p-[18px] text-white"
      style={{
        backgroundImage: "linear-gradient(158deg, #0F172A 0%, #0C1F2A 52%, #042F2E 100%)",
        boxShadow: "0 22px 44px -22px rgba(2,6,23,.55), 0 6px 14px -8px rgba(4,47,46,.35)",
      }}
    >
      {/* Statisch lichtvlak rechtsboven. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(120% 80% at 100% 0%, rgba(94,234,212,.13) 0%, rgba(94,234,212,0) 55%)" }}
      />
      {/* Binnenste haarlijn. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-card"
        style={{ boxShadow: "inset 0 0 0 1px rgba(45,212,191,.18), inset 0 1px 0 rgba(255,255,255,.06)" }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className={`${EYEBROW} text-teal-200/70`}>Lidmaatschap</span>
          <span className="text-[10.5px] font-medium text-slate-400">{isAdmin ? "Beheerder" : "Actief"}</span>
        </div>

        <div className="mt-[10px] text-[21px] font-semibold leading-tight tracking-[-0.3px]">
          BijbelStudie <span className="font-medium text-teal-200">Pro</span>
        </div>
        <p className="mt-[6px] text-[12.5px] leading-[1.55] text-slate-300">
          {isAdmin
            ? "Als beheerder heb je toegang tot alle Pro-functies."
            : "Commentaren, de grondtekst en alle studiehulpmiddelen staan voor je open."}
        </p>

        <div className="mt-[14px] h-px" style={{ backgroundColor: "rgba(148,163,184,.16)" }} />

        <dl className="mt-[4px]">
          <Row dark label="Lid sinds" value={memberSince ?? "-"} />
          <Row dark label="Abonnement" value={planLabel(billing, isAdmin)} />
          {!isAdmin && renewValue && <Row dark label={renewLabel} value={renewValue} />}
        </dl>

        {!isAdmin && (
          <>
            <div className="mt-[6px] h-px" style={{ backgroundColor: "rgba(148,163,184,.16)" }} />
            <Link
              href="/abonnement"
              className="mt-[12px] inline-flex text-[13px] font-semibold text-teal-200 no-underline transition-colors hover:text-white"
            >
              Abonnement beheren →
            </Link>
          </>
        )}
      </div>
    </section>
  )
}

export function FreeMembershipPanel({ memberSince }: { memberSince: string | null }) {
  return (
    <section aria-label="Lidmaatschap" className="flex-none rounded-card border border-line bg-white p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <span className={`${EYEBROW} text-ink-faint`}>Lidmaatschap</span>
        <span className="text-[10.5px] font-medium text-ink-faint">Gratis</span>
      </div>

      <div className="mt-[10px] text-[19px] font-semibold leading-tight tracking-[-0.3px] text-ink">
        BijbelStudie <span className="font-medium text-ink-muted">Gratis</span>
      </div>
      <p className="mt-[6px] text-[12.5px] leading-[1.55] text-ink-muted">
        Upgrade naar Pro voor commentaren, de grondtekst en meer studiehulpmiddelen.
      </p>

      <div className="mt-[14px] h-px bg-line" />
      <dl className="mt-[4px]">
        <Row dark={false} label="Lid sinds" value={memberSince ?? "-"} />
      </dl>

      <Link
        href="/abonnement"
        className="relative mt-[10px] flex h-10 items-center justify-center overflow-hidden rounded-btn text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-95"
        style={{
          backgroundImage: "linear-gradient(158deg, #0F172A 0%, #042F2E 100%)",
          boxShadow: "inset 0 0 0 1px rgba(45,212,191,.28), 0 8px 18px -10px rgba(2,6,23,.5)",
        }}
      >
        Upgrade naar <span className="ml-1 text-teal-200">Pro</span>
      </Link>
    </section>
  )
}
