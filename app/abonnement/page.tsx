import Link from "next/link"
import { Suspense } from "react"
import AppShell from "../../components/shell/AppShell"
import { Card, Pill } from "../../components/kit/primitives"
import PricingPlans, { PricingSkeleton } from "./PricingPlans"
import FaqAccordion from "./FaqAccordion"
import { ABONNEMENT_FAQ, ABONNEMENT_LINKS, PRICING_INTRO } from "./content"

/**
 * /abonnement - a server component around one client island.
 *
 * Only the plan cards need the browser (session, checkout, the promo clock), so
 * only they are in PricingPlans.tsx. The heading, the FAQ and the links are
 * rendered here, on the server, from app/abonnement/content.ts: they reach the
 * HTML for every visitor and crawler, they are not replaced by the skeleton
 * while a signed-in session is checked, and they cost no client JavaScript
 * beyond the accordion's own toggle. The FAQ is the same data the FAQPage node
 * in layout.tsx is built from, so the markup can never describe text the page
 * does not show.
 *
 * No `max-w` wrapper around the body: the page fills the AppShell column edge
 * to edge, the same width every other dashboard route (`/dashboard`,
 * `/notities`) uses.
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

function Faq() {
  return (
    <section aria-labelledby="veelgestelde-vragen" className="mt-12">
      <SectionTitle id="veelgestelde-vragen">Veelgestelde vragen over het abonnement</SectionTitle>
      <div className="mt-4">
        <FaqAccordion items={ABONNEMENT_FAQ} />
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
      <ul className="mt-3 grid grid-cols-1 gap-[10px] md:grid-cols-2 lg:grid-cols-3">
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
      <div className="bg-line-soft px-[28px] py-[26px] max-md:px-4 max-md:py-5 -m-[28px] max-md:-m-4">
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

        <div className="pb-6">
          <Faq />
          <MoreReading />
        </div>
      </div>
    </AppShell>
  )
}
