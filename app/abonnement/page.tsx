import Link from "next/link"
import { Suspense } from "react"
import AppShell from "../../components/shell/AppShell"
import { Card, Pill } from "../../components/kit/primitives"
import PricingPlans, { PricingSkeleton } from "./PricingPlans"
import {
  ABONNEMENT_FAQ,
  ABONNEMENT_LINKS,
  COMPARISON,
  PRICING_INTRO,
  PRO_EXPLAINED,
  WHO_IS_PRO_FOR,
} from "./content"

/**
 * /abonnement - a server component around one client island.
 *
 * Only the plan cards need the browser (session, checkout, the promo clock), so
 * only they are in PricingPlans.tsx. The heading, the comparison, the FAQ and
 * the links are rendered here, on the server, from app/abonnement/content.ts:
 * they reach the HTML for every visitor and crawler, they are not replaced by
 * the skeleton while a signed-in session is checked, and they cost no client
 * JavaScript. The FAQ is the same data the FAQPage node in layout.tsx is built
 * from, so the markup can never describe text the page does not show.
 *
 * Static copy only - no fetch, no per-request work beyond what the layout
 * already does.
 */

/** Teal type on white needs #0F766E for AA; teal-400 on dark. Same pair as the guides. */
const TEAL_TEXT = "text-teal-dark dark:text-teal-400"

const GOOD_TO_KNOW = [
  { title: "Altijd opzegbaar", body: "Zeg op wanneer je wil. Je houdt toegang tot het einde van de periode." },
  { title: "Veilig betalen", body: "Betaling via Stripe met iDEAL, Bancontact, SEPA of creditcard." },
  { title: "Even pauzeren kan", body: "Geen tijd? Pauzeer je abonnement tot drie maanden in plaats van opzeggen." },
]

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[20px] font-bold leading-[1.25] tracking-[-0.3px] text-ink">
      {children}
    </h2>
  )
}

function Comparison() {
  return (
    <section aria-labelledby="vergelijking" className="mt-12">
      <SectionTitle id="vergelijking">Gratis en Pro naast elkaar</SectionTitle>
      <p className="mt-2 text-[14px] leading-[1.7] text-ink-muted">
        Wat een gratis account kan en wat Pro daaraan toevoegt, per onderdeel. Wat in beide
        kolommen staat, blijft gratis: Pro neemt niets weg uit het gratis account.
      </p>
      <Card className="mt-4 overflow-hidden">
        <table className="w-full border-collapse text-left text-[13.5px] leading-[1.5]">
          <caption className="sr-only">Vergelijking van het gratis account en BijbelStudie Pro</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="w-[34%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[1.1px] text-ink-faint max-md:px-3">
                Onderdeel
              </th>
              <th scope="col" className="w-[33%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[1.1px] text-ink-faint max-md:px-3">
                Gratis
              </th>
              <th scope="col" className={`w-[33%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[1.1px] max-md:px-3 ${TEAL_TEXT}`}>
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map(row => (
              <tr key={row.feature} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-4 py-3 align-top font-semibold text-ink max-md:px-3">
                  {row.feature}
                </th>
                <td className="px-4 py-3 align-top text-ink-muted max-md:px-3">{row.free}</td>
                <td className="px-4 py-3 align-top text-ink max-md:px-3">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  )
}

function WhoIsItFor() {
  return (
    <section aria-labelledby="voor-wie" className="mt-12">
      <SectionTitle id="voor-wie">Heb je Pro nodig?</SectionTitle>
      <div className="mt-4 grid grid-cols-1 gap-[14px] md:grid-cols-2">
        {WHO_IS_PRO_FOR.map(item => (
          <Card key={item.title} className="px-[18px] py-4">
            <p className="text-[14px] font-bold text-ink">{item.title}</p>
            <p className="mt-[5px] text-[13.5px] leading-[1.65] text-ink-muted">{item.text}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function ProExplained() {
  return (
    <section aria-labelledby="wat-pro-toevoegt" className="mt-12">
      <SectionTitle id="wat-pro-toevoegt">Wat Pro precies toevoegt</SectionTitle>
      <div className="mt-4 space-y-5">
        {PRO_EXPLAINED.map(item => (
          <div key={item.title}>
            <h3 className="text-[15px] font-bold text-ink">{item.title}</h3>
            <p className="mt-1 text-[14px] leading-[1.7] text-ink-body">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section aria-labelledby="veelgestelde-vragen" className="mt-12">
      <SectionTitle id="veelgestelde-vragen">Veelgestelde vragen over het abonnement</SectionTitle>
      <div className="mt-4 space-y-5">
        {ABONNEMENT_FAQ.map(faq => (
          <div key={faq.q}>
            {/* h3 + visible answer, not a <details>: the FAQPage markup in
                layout.tsx must describe text the page actually shows. */}
            <h3 className="text-[15px] font-bold text-ink">{faq.q}</h3>
            <p className="mt-1 text-[14px] leading-[1.7] text-ink-body">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function MoreReading() {
  return (
    <nav aria-labelledby="verder-lezen" className="mt-12">
      <h2 id="verder-lezen" className="text-[11px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
        Verder lezen
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-[10px] md:grid-cols-2">
        {ABONNEMENT_LINKS.map(link => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block h-full rounded-card border border-line bg-surface px-[17px] py-[14px] no-underline transition-colors hover:border-line-strong"
            >
              <span className={`block text-[14px] font-semibold ${TEAL_TEXT}`}>{link.label}</span>
              <span className="mt-[3px] block text-[12.5px] leading-[1.55] text-ink-muted">{link.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function SubscribePage() {
  return (
    <AppShell title="BijbelStudie Pro" active="" ownHeading>
      <div className="min-h-full bg-line-soft px-[28px] py-[26px] max-md:px-4 max-md:py-5 -m-[28px] max-md:-m-4">
        <div className="mx-auto max-w-[992px]">
          <section aria-labelledby="abonnement-titel" className="mx-auto max-w-[660px] text-center">
            <Pill label="BIJBELSTUDIE PRO" className="mx-auto" />
            <h1 id="abonnement-titel" className="mt-[10px] text-[30px] font-bold leading-[1.15] tracking-[-0.6px] text-ink [text-wrap:balance] max-md:text-[26px]">
              BijbelStudie Pro: prijzen en wat gratis blijft
            </h1>
            <p className="mt-[10px] text-[14.5px] leading-[1.6] text-ink-muted">{PRICING_INTRO}</p>
          </section>

          <Suspense fallback={<PricingSkeleton />}>
            <PricingPlans />
          </Suspense>

          <div className="mt-[22px] grid grid-cols-1 gap-[14px] md:grid-cols-3">
            {GOOD_TO_KNOW.map(({ title, body }) => (
              <Card key={title} className="px-[17px] py-[15px]">
                <p className="text-[14px] font-bold text-ink">{title}</p>
                <p className="mt-[5px] text-[12.5px] leading-[1.6] text-ink-muted">{body}</p>
              </Card>
            ))}
          </div>

          <p className="mt-[22px] text-center text-[12px] text-ink-faint">
            Prijzen inclusief btw &nbsp;·&nbsp; Je abonnement verlengt automatisch en is opzegbaar via Instellingen &rsaquo; Abonnement
          </p>

          <div className="mx-auto max-w-[760px] pb-6">
            <Comparison />
            <WhoIsItFor />
            <ProExplained />
            <Faq />
            <MoreReading />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
