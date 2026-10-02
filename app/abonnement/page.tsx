import { Suspense } from "react"
import { Check } from "lucide-react"
import AppShell from "../../components/shell/AppShell"
import { PRO_FEATURES_SHORT } from "../../lib/pricing"
import PricingPlans, { PricingSkeleton } from "./PricingPlans"
import FaqAccordion from "./FaqAccordion"
import { ABONNEMENT_FAQ } from "./content"

/**
 * /abonnement - a server component around one client island.
 *
 * Two columns that together fill the body beside the sidebar, so on a desktop
 * the whole offer is on screen without scrolling: what Pro is on the left
 * (server-rendered, in the HTML for every visitor and crawler), the plan
 * choice and the one button on the right (PricingPlans.tsx, the only part
 * that needs the browser). Under 1100 px the columns stack with the choice
 * first.
 *
 * The FAQ sits below that first screen, out of the offer itself. It stays on
 * the page because it is the copy Google indexes this URL for and the text the
 * FAQPage node in layout.tsx describes (app/abonnement/content.ts) - the
 * markup must never describe text the page does not show.
 *
 * `padded={false}`: the columns touch the sidebar, the top bar and the screen
 * edge, like /lezen, and this page owns its own scrolling.
 */

/** Teal type on white needs #0F766E for AA; teal-400 on dark. Same pair as the guides. */
const TEAL_TEXT = "text-teal-dark dark:text-teal-400"

const LABEL = "text-[11px] font-semibold uppercase tracking-[1.1px]"

/** Same gutters for both columns and the FAQ under them. */
const GUTTER = "px-16 max-xl:px-10 max-md:px-4"
const COLUMN = `${GUTTER} pb-[50px] pt-[60px] max-[1099px]:py-10 max-md:py-7`

function AboutPro() {
  return (
    <section
      aria-labelledby="abonnement-titel"
      className={`flex flex-col bg-surface ${COLUMN} min-[1100px]:w-[52%] min-[1100px]:border-r min-[1100px]:border-line`}
    >
      <p className={`${LABEL} ${TEAL_TEXT}`}>BijbelStudie Pro</p>
      <h1
        id="abonnement-titel"
        className="mt-7 max-w-[400px] font-serif text-[46px] font-normal leading-[1.1] tracking-[-0.5px] text-ink [text-wrap:balance] max-md:text-[34px]"
      >
        Onderzoek de Schriften met meer diepgang.
      </h1>

      <h2 className={`mt-7 ${LABEL} text-ink-faint`}>Alles in Pro</h2>
      {/* Column-first: five on the left, four on the right. One column once
          two no longer fit a line each. */}
      <ul className="mt-[14px] grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-6 gap-y-3 max-[520px]:grid-flow-row max-[520px]:grid-cols-1 max-[520px]:grid-rows-none">
        {PRO_FEATURES_SHORT.map(feature => (
          <li key={feature} className="flex items-start gap-2 text-[14px] leading-[1.4] text-ink-body">
            <Check size={16} strokeWidth={2.4} aria-hidden className="mt-[2px] flex-none text-teal" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Pinned to the foot of the column; the free space sits above it. */}
      <figure className="mt-auto pt-12">
        <div className="border-l-2 border-teal pl-4">
          <blockquote className="font-serif text-[16px] italic leading-[1.6] text-ink-body">
            &ldquo;Zij onderzochten dagelijks de Schriften, of deze dingen zo waren.&rdquo;
          </blockquote>
          <figcaption className={`mt-2 ${LABEL} text-ink-faint`}>Handelingen 17:11</figcaption>
        </div>
      </figure>
    </section>
  )
}

function Faq() {
  return (
    <section
      aria-labelledby="veelgestelde-vragen"
      className={`border-t border-line bg-line-soft py-12 dark:bg-background ${GUTTER} max-md:py-8`}
    >
      <h2 id="veelgestelde-vragen" className="text-[20px] font-bold leading-[1.25] tracking-[-0.3px] text-ink">
        Veelgestelde vragen over het abonnement
      </h2>
      <div className="mt-4">
        <FaqAccordion items={ABONNEMENT_FAQ} />
      </div>
    </section>
  )
}

export default function SubscribePage() {
  return (
    <AppShell title="Abonnement" active="" ownHeading padded={false}>
      <div className="min-w-0 flex-1 overflow-auto">
        <div className="flex flex-col min-[1100px]:min-h-full min-[1100px]:flex-row">
          <AboutPro />
          {/* Second in the document, first on a narrow screen: the choice and
              the button come before the reading. */}
          <div
            className={`flex flex-col justify-center bg-line-soft dark:bg-background ${COLUMN} max-[1099px]:order-first max-[1099px]:border-b max-[1099px]:border-line min-[1100px]:w-[48%]`}
          >
            <Suspense fallback={<PricingSkeleton />}>
              <PricingPlans />
            </Suspense>
          </div>
        </div>

        <Faq />
      </div>
    </AppShell>
  )
}
