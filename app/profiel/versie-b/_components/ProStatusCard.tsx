"use client";

import Link from "next/link";
import { Skeleton } from "../../../../components/kit/primitives";
import { PLANS, PRO_FEATURES, effectivePerMonth } from "../../../../lib/pricing";
import { CHAMPAGNE, TEAL, TOP_RULE_GRADIENT } from "./champagne";

/** De velden van GET /api/subscription/billing-state die deze kaart leest. */
export interface BillingState {
  source: "stripe" | "apple" | "google" | "admin" | null;
  interval: "monthly" | "annual" | string | null;
  currentPeriodEnd: string | null;
  storeExpiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingIssue: boolean;
  isPaused: boolean;
  pausedUntil: string | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

/** Kleine kapitalen, ruim gespatieerd: het label boven beide kaarten. */
function Eyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="text-[10.5px] font-semibold uppercase leading-none tracking-[1.8px]" style={{ color }}>
      {children}
    </div>
  );
}

function Row({ label, value, rule, last = false }: { label: string; value: string; rule: string; last?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-[9px]" style={last ? undefined : { borderBottom: `1px solid ${rule}` }}>
      <span className="flex-1 text-[12.5px] text-ink-muted">{label}</span>
      <span className="text-right text-[13px] font-semibold text-ink">{value}</span>
    </div>
  );
}

/**
 * Wat er over het abonnement te zeggen valt, uit billing-state. Zonder gegevens
 * (de voorbeeldschakelaar op "Pro" bij een gratis account) staan er
 * voorbeeldregels, en die zeggen dat ze een voorbeeld zijn.
 */
function planRows(billing: BillingState | null, isAdmin: boolean, sample: boolean) {
  if (sample || !billing) {
    const inAYear = new Date();
    inAYear.setFullYear(inAYear.getFullYear() + 1);
    return [
      { label: "Plan", value: "Jaarabonnement" },
      { label: "Verlengt op", value: fmtDate(inAYear.toISOString()) },
    ];
  }
  const rows: { label: string; value: string }[] = [];
  if (billing.source === "admin" || (isAdmin && !billing.source)) {
    rows.push({ label: "Plan", value: "Beheerderstoegang" }, { label: "Geldig", value: "Onbeperkt" });
    return rows;
  }
  if (billing.source === "apple" || billing.source === "google") {
    rows.push({ label: "Plan", value: billing.source === "apple" ? "Via de App Store" : "Via Google Play" });
    if (billing.storeExpiresAt) rows.push({ label: "Loopt tot", value: fmtDate(billing.storeExpiresAt) });
    return rows;
  }
  rows.push({
    label: "Plan",
    value: billing.interval === "annual" ? "Jaarabonnement" : billing.interval === "monthly" ? "Maandabonnement" : "Pro",
  });
  if (billing.isPaused && billing.pausedUntil) {
    rows.push({ label: "Gepauzeerd tot", value: fmtDate(billing.pausedUntil) });
  } else if (billing.currentPeriodEnd) {
    rows.push({
      label: billing.cancelAtPeriodEnd ? "Loopt af op" : "Verlengt op",
      value: fmtDate(billing.currentPeriodEnd),
    });
  }
  return rows;
}

/**
 * De Abonnement-kaart van ontwerp B.
 *
 * Pro: warm gebroken wit, een champagne haarlijn die bovenaan naar de randen
 * uitloopt, "Pro-lid" in gespatieerde kleine kapitalen, de titel in Lora (de
 * serif die de app al voor schrift gebruikt), plan en verlenging in slate, en
 * teal als enige actiekleur.
 *
 * Gratis: dezelfde bouw in wit en slate - grijze haarlijn, geen champagne - zodat
 * het metaal iets blijft dat je krijgt, niet iets dat de upsell al draagt.
 */
export function ProStatusCard({
  pro,
  waiting,
  isAdmin,
  billing,
  billingLoading,
  sample,
}: {
  pro: boolean;
  waiting: boolean;
  isAdmin: boolean;
  billing: BillingState | null;
  billingLoading: boolean;
  /** Voorbeeldmodus: Pro getoond zonder dat het account Pro is. */
  sample: boolean;
}) {
  if (waiting) {
    return (
      <div className="flex-none rounded-card border border-line bg-white p-[15px]">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-6 w-40" />
        <Skeleton className="mt-4 h-16 w-full" />
      </div>
    );
  }

  if (pro) {
    const rows = planRows(billing, isAdmin, sample);
    const needsAttention = !sample && billing?.hasBillingIssue;
    return (
      <div
        className="relative flex-none overflow-hidden rounded-card border border-line p-[18px]"
        style={{ backgroundColor: CHAMPAGNE.paper }}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ backgroundImage: TOP_RULE_GRADIENT }} />

        <div className="flex items-center gap-2">
          <Eyebrow color={CHAMPAGNE.ink}>Pro-lid</Eyebrow>
          {sample && <span className="ml-auto text-[11px] text-ink-faint">Voorbeeldgegevens</span>}
        </div>
        <div className="mt-[9px] font-serif text-[21px] font-semibold leading-tight tracking-[-0.2px] text-ink">
          BijbelStudie Pro
        </div>
        <p className="mt-[6px] text-[12.5px] leading-[1.55] text-ink-muted">
          {isAdmin && !sample
            ? "Als beheerder heb je toegang tot alle Pro-functies."
            : "Alle commentaren, de grondtekst en ruim meer AI-vragen."}
        </p>

        <div className="mt-[12px]" style={{ borderTop: `1px solid ${CHAMPAGNE.rule}` }}>
          {billingLoading ? (
            <Skeleton className="my-3 h-10 w-full" />
          ) : (
            rows.map((r, i) => (
              <Row key={r.label} label={r.label} value={r.value} rule={CHAMPAGNE.rule} last={i === rows.length - 1} />
            ))
          )}
        </div>

        {needsAttention && (
          <p className="mt-2 text-[12.5px] font-semibold text-danger">Er is een probleem met je betaling.</p>
        )}

        <Link
          href="/abonnement"
          className="mt-[12px] flex h-10 items-center justify-center rounded-btn text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
          style={{ backgroundColor: TEAL }}
        >
          Abonnement beheren
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex-none overflow-hidden rounded-card border border-line bg-white p-[18px]">
      <Eyebrow color="#64748B">Gratis account</Eyebrow>
      <div className="mt-[9px] font-serif text-[21px] font-semibold leading-tight tracking-[-0.2px] text-ink">
        BijbelStudie Pro
      </div>
      <p className="mt-[6px] text-[12.5px] leading-[1.55] text-ink-muted">
        Voor wie dieper wil studeren. Vanaf {effectivePerMonth(PLANS.annual)} per maand bij jaarbetaling.
      </p>
      <ul className="mt-[12px] border-t border-line-soft">
        {PRO_FEATURES.slice(0, 3).map(f => (
          <li key={f} className="border-b border-line-soft py-[9px] text-[12.5px] text-ink-body last:border-b-0">
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/abonnement"
        className="mt-[12px] flex h-10 items-center justify-center rounded-btn text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
        style={{ backgroundColor: TEAL }}
      >
        Upgrade naar Pro
      </Link>
    </div>
  );
}

/**
 * De Pro-chip in de kopregel, naast reeks en lid-sinds. Zelfde hoogte als die
 * pills, maar wit met een champagne haarlijn en gespatieerde kapitalen - status
 * uit typografie, niet uit een gekleurd vlak.
 */
export function ProChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full border bg-white px-3 py-[6px] text-[10.5px] leading-[18.75px] font-semibold uppercase tracking-[1.6px]"
      style={{ borderColor: CHAMPAGNE.hairline, color: CHAMPAGNE.ink }}
    >
      {label}
    </span>
  );
}
