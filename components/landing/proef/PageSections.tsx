import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PLANS, euro } from "../../../lib/pricing"
import {
  FREE_FEATURES,
  LESSON_STEPS,
  LICENSE_NOTE,
  PRO_FEATURES,
  REASONS,
} from "./content"
import {
  CTA_BRAND,
  CTA_PRIMARY,
  CTA_QUIET,
  EYEBROW,
  PANEL,
  SECTION_Y,
  SHELL,
  Scrim,
  SectionHead,
  TEAL_DEEP,
  TEAL_ON_DARK,
  TYPE,
} from "./pieces"

/**
 * Everything below the hero: what this is, what a lesson looks like, what it
 * costs, and one way in. Four short sections and the footer.
 *
 * The previous version of this file was five times as long and put a light
 * `#F9FAFB` plate under every one of them, because the components it reused are
 * drawn for a white page. Over a night landscape that reads as a hole punched
 * in the picture. Nothing here sits on a light surface any more: a section is
 * either type on the scene behind its own scrim, or one panel of the same dark
 * glass the dashboard uses (`bg-black/40` behind a blur, from
 * components/scene/tokens.ts). The scene is the design; these are captions on
 * it.
 *
 * What was cut, and where it still lives: the eight-row library ledger and the
 * mock reader (/bijbelstudie and the reader itself), three study cards
 * (/studies), the plan comparison matrix (/abonnement), the twelve-question
 * accordion (the FAQ on the live landing page and /contact), and both live
 * demos - the lesson player and the growth demo - which are 900 lines of
 * white-page component between them and could not survive here without the
 * plate. None of it is what a visitor needs before deciding to sign up.
 *
 * A server component, like the rest of the page: no state, no session, no
 * database. Every word below is in the served HTML.
 */

/* ── Wat het is ───────────────────────────────────────────────── */

/**
 * Three things that are true, one line each, on three quiet tiles.
 *
 * Deliberately not a feature grid: each line names something checkable - the
 * four translations by name, what the commentary and the grondtekst actually
 * are, where a note is kept - so there is nothing here to take on trust. No
 * figure on this page is invented and there is no testimonial anywhere on it.
 */
export function OverviewSection() {
  return (
    <section
      id="wat-het-is"
      className={`relative z-10 scroll-mt-20 ${SECTION_Y}`}
      aria-labelledby="proefland-overzicht"
    >
      <div className={SHELL}>
        <SectionHead
          id="proefland-overzicht"
          label="Wat het is"
          title="Vertalingen en commentaren op één plek"
          subtitle="Voor wie de Bijbel serieus wil lezen: de tekst, de uitleg en uw eigen aantekeningen in één scherm."
        />

        <ul className="grid gap-4 sm:grid-cols-3">
          {REASONS.map(reason => (
            <li key={reason.title} className={`p-5 ${PANEL}`}>
              <h3 className="text-sm font-semibold tracking-tight text-white">{reason.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/75">{reason.body}</p>
            </li>
          ))}
        </ul>

        {/* Licensing, not marketing: KingComments may not be redistributed and
            the NBG-vertaling 1951 is used under licence. The sentence stays
            wherever those sources are named. */}
        <div className="relative mt-7">
          <Scrim />
          <p className="relative mx-auto max-w-2xl text-center text-xs leading-relaxed text-white/70">
            {LICENSE_NOTE}
          </p>
        </div>
      </div>
    </section>
  )
}

/* ── Zo werkt een les ─────────────────────────────────────────── */

/**
 * The five steps of a lesson, as one row of type.
 *
 * This replaces the 743-line lesson player that used to autoplay here. The
 * player is the better argument once someone is interested; on a landing page
 * it was a whole application laid on a white plate over a landscape. Five short
 * lines say the same thing about the shape of a lesson, cost nothing to render,
 * and read on the scene.
 *
 * `id="in-actie"` is load-bearing: the hero's second link points at it.
 */
export function LessonSection() {
  return (
    <section
      id="in-actie"
      className={`relative z-10 scroll-mt-20 ${SECTION_Y}`}
      aria-labelledby="proefland-les"
    >
      <div className={SHELL}>
        <SectionHead
          id="proefland-les"
          label="Zo werkt een les"
          title="Vijf stappen, een kwartier per dag"
          subtitle="Elke les leidt u in dezelfde vijf stappen door één bijbelgedeelte."
        />

        {/* Five columns only from `md`. Below it the steps are one column of
            five rows: at 640px a fifth of the shell is narrower than the words
            in it, and a five-column row there would either clip or push the
            document sideways. */}
        <ol
          className={`grid overflow-hidden divide-y divide-white/10 md:grid-cols-5 md:divide-x md:divide-y-0 ${PANEL}`}
        >
          {LESSON_STEPS.map((step, index) => (
            <li key={step.name} className="px-5 py-5">
              <p className="text-[11px] font-semibold tabular-nums" style={{ color: TEAL_ON_DARK }}>
                Stap {index + 1}
              </p>
              <p className="mt-1.5 text-sm font-semibold tracking-tight text-white">{step.name}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/75">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="relative mt-8 text-center">
          <Scrim />
          <div className="relative">
            <Link href="/studies" data-track="proefland_studies_all" className={CTA_QUIET}>
              Bekijk alle studies
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Prijzen ──────────────────────────────────────────────────── */

/** Four lines per plan, on a hairline ledger. No tick marks: a checkmark next
 *  to a line that is already in a list of what you get identifies nothing. */
function PlanLines({ items }: { items: string[] }) {
  return (
    <ul className="mb-7 mt-6 flex-1 divide-y divide-white/10 border-y border-white/10">
      {items.map(item => (
        <li key={item} className="py-2.5 text-[13px] leading-relaxed text-white/85">
          {item}
        </li>
      ))}
    </ul>
  )
}

/**
 * What it costs, in two short columns.
 *
 * Not the comparison matrix this used to be - four lines a side, not six with
 * a tick beside each. Both amounts come from lib/pricing.ts, which is what
 * Stripe is actually charged against, and both name their own billing period:
 * the price-indication rules do not allow one tariff to be quoted through the
 * other's period. "Meest populair" is the badge the live page carries and its
 * wording is constrained by the EU Omnibus rules - do not turn it into a
 * discount claim. No app-store link anywhere near it: StoreKit pricing is its
 * own truth and the app must never point at web checkout.
 */
export function PricingSection() {
  return (
    <section
      id="prijzen"
      className={`relative z-10 scroll-mt-20 ${SECTION_Y}`}
      aria-labelledby="proefland-prijzen"
    >
      <div className={SHELL}>
        <SectionHead
          id="proefland-prijzen"
          label="Prijzen"
          title="Begin gratis, groei verder"
          subtitle="Wat gratis is, blijft gratis. Pro voegt de overige commentaren, de grondtekst en meer AI-vragen toe."
        />

        <div className="mx-auto grid max-w-3xl items-stretch gap-5 md:grid-cols-2">
          <div className={`flex h-full flex-col p-7 ${PANEL}`}>
            {/* `mt-3` on both columns, so the two prices sit on one line: the
                Pro column needs it to clear its badge. */}
            <h3 className={`mt-3 ${EYEBROW}`}>Gratis</h3>
            <div className="mt-3 flex items-baseline gap-1">
              {/* Not a Stripe price and not in lib/pricing: the free plan has
                  no amount to read from. Everything that IS charged is read
                  from PLANS below. */}
              <span className="text-4xl font-semibold tracking-tight text-white">€0</span>
              <span className="text-sm text-white/70">/maand</span>
            </div>
            <p className="mt-2 text-xs text-white/70">Voor altijd.</p>

            <PlanLines items={FREE_FEATURES} />

            <Link
              href="/inloggen"
              data-track="proefland_pricing_free"
              className="press block rounded-xl border border-white/25 py-3 text-center text-sm font-semibold text-white no-underline outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
            >
              Gratis beginnen
            </Link>
          </div>

          {/* The recommended column is told apart by a teal hairline inside its
              own edge, not by a different surface: a price comparison in two
              different materials reads as two different products. */}
          <div
            className={`relative flex h-full flex-col overflow-hidden p-7 ${PANEL}`}
            style={{ boxShadow: "inset 0 0 0 1px rgba(45,212,191,0.35)" }}
          >
            <div className="absolute -top-px left-7">
              <span
                className="rounded-b-lg px-3 py-1 text-[11px] font-bold text-white"
                style={{ backgroundColor: TEAL_DEEP }}
              >
                Meest populair
              </span>
            </div>

            <h3 className={`mt-3 ${EYEBROW}`} style={{ color: TEAL_ON_DARK }}>
              Pro
            </h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-white">
                {euro(PLANS.monthly.amountCents)}
              </span>
              <span className="text-sm text-white/70">/maand</span>
            </div>
            <p className="mt-2 text-xs text-white/70">of {euro(PLANS.annual.amountCents)} per jaar</p>

            <PlanLines items={PRO_FEATURES} />

            <Link
              href="/abonnement"
              data-track="proefland_pricing_pro"
              className={`w-full ${CTA_BRAND}`}
              style={{ backgroundColor: TEAL_DEEP }}
            >
              Pro proberen
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── De slotoproep ────────────────────────────────────────────── */

/**
 * The one ask, with no panel around it at all - type on the landscape, on its
 * own scrim. It is the last thing before the footer and the only place on the
 * page where the scene is uninterrupted behind a heading.
 */
export function ClosingSection() {
  return (
    <section className={`relative z-10 ${SECTION_Y}`} aria-labelledby="proefland-slot">
      <div className={SHELL}>
        <div className="relative mx-auto max-w-2xl text-center">
          <Scrim />
          <div className="relative">
            <h2
              id="proefland-slot"
              className="font-semibold text-balance text-white"
              style={{ fontSize: TYPE.h2, lineHeight: 1.15, letterSpacing: "-0.02em" }}
            >
              Klaar om de Bijbel te bestuderen?
            </h2>

            <p
              className="mt-4 text-pretty text-white/90"
              style={{ fontSize: TYPE.lead, lineHeight: 1.65 }}
            >
              Maak in minder dan een minuut een gratis account aan en begin vandaag nog.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/inloggen"
                data-track="proefland_closing_signup"
                className={`w-full sm:w-auto ${CTA_PRIMARY}`}
              >
                Gratis beginnen
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>

            <p className="mt-6 text-xs text-white/70">
              Geen creditcard vereist · Gratis te gebruiken · Altijd opzegbaar
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
