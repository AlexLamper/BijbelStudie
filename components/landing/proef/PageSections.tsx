import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { FAQItem } from "../FAQItem"
import { ProBadge } from "../../ui/ProBadge"
import { HOME_FAQS } from "../../../lib/content/homeFaq"
import { PLANS, euro } from "../../../lib/pricing"
import {
  COMMENTARIES,
  ENGLISH_TRANSLATIONS,
  FEATURED_STUDIES,
  FREE_FEATURES,
  KIND_LABEL,
  PRO_FEATURES,
  TRANSLATIONS,
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
  TEAL,
  TEAL_DEEP,
  TEAL_ON_DARK,
  TYPE,
} from "./pieces"

/**
 * The reading sections: the studies, the library, the prices, the questions and
 * the closing ask.
 *
 * None of these reuses its counterpart from components/landing/LandingPage.tsx.
 * Every one of them is built on hardcoded light greys (#F9FAFB grounds,
 * #E5E7EB hairlines, #4B5563 body copy) that are invisible or illegible over a
 * landscape, so they are rebuilt here on the dark-glass panel instead. What is
 * carried over verbatim is everything that matters: the same library, checked
 * against what the app actually serves; the same licensing sentences; the same
 * plan lists; the same questions; and the prices straight out of lib/pricing.
 */

/* ── Uitgelichte studies ──────────────────────────────────────── */

export function StudiesSection() {
  return (
    <section id="studies" className={`relative z-10 scroll-mt-20 ${SECTION_Y}`} aria-labelledby="proefland-studies">
      <div className={SHELL}>
        <SectionHead
          id="proefland-studies"
          label="Om mee te beginnen"
          title="Uitgelichte studies"
          subtitle="Een studie is een reeks korte lessen door één bijbelgedeelte, één persoon of één thema. U kiest er een en begint vandaag."
        />

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_STUDIES.map(study => (
            <li key={study.id}>
              <Link
                href={`/studies/${study.id}`}
                data-track="proefland_study_card"
                className={`group flex h-full flex-col overflow-hidden no-underline outline-none transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white ${PANEL}`}
              >
                {/* A raw img, not next/image: these covers are hand-authored
                    SVGs, and the image optimiser refuses SVG unless the project
                    turns on dangerouslyAllowSVG. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={study.image}
                  alt=""
                  loading="lazy"
                  className="aspect-[16/6] w-full object-cover"
                  style={{ backgroundColor: "rgba(13,148,136,0.25)" }}
                />
                <div className="flex flex-1 flex-col p-5">
                  <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
                    {KIND_LABEL[study.type]}
                  </p>
                  <h3 className="mt-2 text-base font-semibold tracking-tight text-white">{study.title}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-white/75">
                    {study.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold tabular-nums text-white/65">
                      {study.lessons.length} {study.lessons.length === 1 ? "les" : "lessen"}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: TEAL_ON_DARK }}>
                      Bekijk studie
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

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

/* ── Bibliotheek ──────────────────────────────────────────────── */

/** Two states only: free, or part of Pro. */
function AccessPill({ free }: { free: boolean }) {
  if (!free) return <ProBadge />
  return (
    <span
      className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: "rgba(45,212,191,0.16)", color: TEAL_ON_DARK }}
    >
      Gratis
    </span>
  )
}

/**
 * One verse the way the reader shows it: the translation tabs, the text, the
 * commentaries underneath. Static - nothing here is a control, so the tabs are
 * spans and the active states are fixed.
 *
 * Only the Statenvertaling is quoted, because it is the one translation here
 * that is public domain. The NBG 1951 is licensed and the HSV and BasisBijbel
 * never ship at all, so none of them may ever appear as text on this page; the
 * other tabs carry a name and nothing else. The commentaries are named, not
 * quoted, for the same reason - KingComments may not be redistributed.
 */
function ReadingPane() {
  return (
    <div className={`overflow-hidden ${PANEL}`}>
      <div className="flex overflow-x-auto border-b border-white/10 px-2">
        {TRANSLATIONS.map((translation, i) => {
          const active = i === 0
          return (
            <span
              key={translation.name}
              className="relative inline-flex h-10 flex-none items-center whitespace-nowrap px-3 text-[12px] font-semibold"
              style={{ color: active ? TEAL_ON_DARK : "rgba(255,255,255,0.7)" }}
            >
              {translation.short}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                  style={{ backgroundColor: TEAL_ON_DARK }}
                />
              )}
            </span>
          )
        })}
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-bold tracking-tight text-white">Psalm 1:3</p>
          <p className="text-[11px] text-white/70">Statenvertaling · 1637</p>
        </div>
        <p className="mt-3 font-serif text-[15.5px] leading-[1.75] text-white">
          <sup className="mr-1.5 font-sans text-[10px] font-bold" style={{ color: TEAL_ON_DARK }}>3</sup>
          Want hij zal zijn als een boom, geplant aan waterbeken, die zijn vrucht geeft op zijn tijd, en
          welks blad niet afvalt; en al wat hij doet, zal wel gelukken.
        </p>
      </div>

      <div className="border-t border-white/10 bg-white/[0.04] px-5 py-4 sm:px-7">
        <p className={EYEBROW}>Commentaar bij dit vers</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {COMMENTARIES.map((commentary, i) => {
            const active = i === 0
            return (
              <span
                key={commentary.name}
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={
                  active
                    ? { borderColor: TEAL_DEEP, backgroundColor: TEAL_DEEP, color: "#FFFFFF" }
                    : { borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.75)" }
                }
              >
                {commentary.name}
              </span>
            )
          })}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-white/75">
          Vers voor vers uitgelegd door Ger de Koning - voor iedereen gratis en volledig te lezen.
        </p>
      </div>
    </div>
  )
}

/** The label above a group of ledger rows: eyebrow, rule, count. */
function GroupLabel({ label, meta }: { label: string; meta: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <h3 className={EYEBROW} style={{ color: TEAL_ON_DARK }}>{label}</h3>
      <div className="h-px flex-1 bg-white/15" />
      <p className="text-xs font-semibold tabular-nums text-white/70">{meta}</p>
    </div>
  )
}

export function LibrarySection() {
  return (
    <section id="bibliotheek" className={`relative z-10 scroll-mt-20 ${SECTION_Y}`} aria-labelledby="proefland-bibliotheek">
      <div className={SHELL}>
        <SectionHead
          id="proefland-bibliotheek"
          label="Bibliotheek"
          title="Vertalingen en commentaren op één plek"
          subtitle="Vier Nederlandse vertalingen naast elkaar, en bij elk vers de uitleg van vier commentaren."
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-x-12">
          <div className="lg:sticky lg:top-24">
            <ReadingPane />
          </div>

          <div className={`p-6 sm:p-7 ${PANEL}`}>
            <GroupLabel
              label="Vertalingen"
              meta={`${TRANSLATIONS.length} Nederlandse · ${ENGLISH_TRANSLATIONS} Engelse`}
            />
            <ol className="border-t border-white/10">
              {TRANSLATIONS.map(({ name, year, note, tag }) => (
                <li
                  key={name}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 border-b border-white/10 py-4 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto]"
                >
                  <p className="pt-0.5 text-xs font-semibold tabular-nums text-white/65">{year}</p>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-snug tracking-tight text-white">{name}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/75">{note}</p>
                  </div>
                  {tag && (
                    <p
                      className="col-start-2 mt-1.5 text-[11px] font-semibold sm:col-start-3 sm:mt-0 sm:pt-0.5"
                      style={{ color: tag === "Standaard" ? TEAL_ON_DARK : "rgba(255,255,255,0.65)" }}
                    >
                      {tag}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-white/70">
              Daarnaast de King James Version, American Standard Version, World English Bible,
              Geneva Bible en Coverdale Bible - per vers naast een Nederlandse vertaling te leggen.
            </p>

            <div className="mt-10">
              <GroupLabel
                label="Commentaren"
                meta={`${COMMENTARIES.length} commentaren · ${COMMENTARIES.filter(c => c.free).length} gratis`}
              />
              <ol className="border-t border-white/10">
                {COMMENTARIES.map(({ name, author, note, free }) => (
                  <li key={name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-white/10 py-4">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold leading-snug tracking-tight text-white">
                        {name}
                        <span className="ml-2 text-xs font-semibold tabular-nums text-white/65">{author}</span>
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-white/75">{note}</p>
                    </div>
                    <div className="pt-0.5">
                      <AccessPill free={free} />
                    </div>
                  </li>
                ))}
              </ol>
              {/* Both sentences are licensing obligations, not marketing copy.
                  KingComments may not be redistributed and the NBG-vertaling
                  1951 is used under licence - neither line may be dropped. */}
              <p className="mt-4 text-xs leading-relaxed text-white/70">
                KingComments is voor iedereen gratis en volledig te lezen. De overige drie horen bij Pro.
                De NBG-vertaling 1951 wordt gebruikt onder licentie van het Nederlands-Vlaams Bijbelgenootschap.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Prijzen ──────────────────────────────────────────────────── */

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed text-white/90">
      <span
        aria-hidden
        className="mt-px flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(13,148,136,0.30)" }}
      >
        <Check className="h-3 w-3" style={{ color: TEAL_ON_DARK }} />
      </span>
      {children}
    </li>
  )
}

export function PricingSection() {
  return (
    <section id="prijzen" className={`relative z-10 scroll-mt-20 ${SECTION_Y}`} aria-labelledby="proefland-prijzen">
      <div className={SHELL}>
        <div className="mx-auto max-w-4xl">
          <SectionHead
            id="proefland-prijzen"
            label="Prijzen"
            title="Begin gratis, groei verder"
            subtitle="Wat gratis is, blijft gratis. Pro voegt de overige commentaren, de grondtekst en meer AI-vragen toe."
          />

          <div className="grid items-stretch gap-6 md:grid-cols-2">
            <div className={`flex h-full flex-col p-8 ${PANEL}`}>
              <h3 className={EYEBROW}>Gratis</h3>
              <div className="mt-3 flex items-baseline gap-1">
                {/* Not a Stripe price and not in lib/pricing: the free plan has
                    no amount to read from. Everything that IS charged is read
                    from PLANS below. */}
                <span className="text-4xl font-semibold tracking-tight text-white">€0</span>
                <span className="text-sm text-white/70">/maand</span>
              </div>
              <p className="mt-2 text-xs text-white/70">Voor altijd.</p>

              <ul className="mb-8 mt-7 flex-1 space-y-3">
                {FREE_FEATURES.map(feature => (
                  <PlanFeature key={feature}>{feature}</PlanFeature>
                ))}
              </ul>

              <Link
                href="/inloggen"
                data-track="proefland_pricing_free"
                className="press block rounded-xl border border-white/25 py-3 text-center text-sm font-semibold text-white no-underline outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
              >
                Gratis beginnen
              </Link>
            </div>

            {/* The recommended column is told apart by a teal hairline inside
                its own edge and a soft brand glow, not by a different surface:
                a pricing table is a comparison, and two different materials
                make it read as two different products. */}
            <div
              className={`relative flex h-full flex-col overflow-hidden p-8 ${PANEL}`}
              style={{
                boxShadow: "inset 0 0 0 1px rgba(45,212,191,0.35), 0 24px 48px -24px rgba(0,0,0,0.7)",
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full opacity-25"
                style={{ background: `radial-gradient(circle, ${TEAL}, transparent)`, transform: "translate(30%, -30%)" }}
              />
              {/* "Meest populair" is the badge the live page carries. The
                  wording of anything next to a price is constrained by the EU
                  Omnibus rules - do not turn it into a discount claim. */}
              <div className="absolute -top-px left-8">
                <span className="rounded-b-lg px-3 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: TEAL_DEEP }}>
                  Meest populair
                </span>
              </div>

              <h3 className={`mt-3 ${EYEBROW}`} style={{ color: TEAL_ON_DARK }}>Pro</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">
                  {euro(PLANS.monthly.amountCents)}
                </span>
                <span className="text-sm text-white/70">/maand</span>
              </div>
              {/* Both amounts come from lib/pricing, which is what Stripe is
                  actually charged against, and both name their own billing
                  period - the price-indication rules do not allow one tariff to
                  be quoted through the other's period. */}
              <p className="mt-2 text-xs text-white/70">
                of {euro(PLANS.annual.amountCents)} per jaar
              </p>

              <ul className="mb-8 mt-7 flex-1 space-y-3">
                {PRO_FEATURES.map(feature => (
                  <PlanFeature key={feature}>{feature}</PlanFeature>
                ))}
              </ul>

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
      </div>
    </section>
  )
}

/* ── FAQ ──────────────────────────────────────────────────────── */

export function FaqSection() {
  return (
    <section id="faq" className={`relative z-10 scroll-mt-20 ${SECTION_Y}`} aria-labelledby="proefland-faq">
      <div className={SHELL}>
        <div className="mx-auto max-w-3xl">
          <SectionHead
            id="proefland-faq"
            label="FAQ"
            title="Veelgestelde vragen over bijbelstudie"
          />
          {/* The answers are always in the HTML - FAQItem collapses them with a
              grid row rather than unmounting them - so the accordion is
              readable to a crawler and to anyone whose bundle never arrives.
              The colours are passed in as literals because the component takes
              them as props; on this ground they have to be white, not tokens. */}
          <div className={`px-5 sm:px-7 [&>div:last-child]:border-b-0 ${PANEL}`}>
            {HOME_FAQS.map((item, i) => (
              <FAQItem
                key={item.q}
                q={item.q}
                a={item.a}
                id={`proefland-faq-${i}`}
                borderColor="rgba(255,255,255,0.12)"
                textColor="#FFFFFF"
                mutedColor="rgba(255,255,255,0.78)"
              />
            ))}
          </div>
          <div className="relative mt-6 text-center">
            <Scrim />
            <p className="relative text-sm text-white/85">
              Staat uw vraag er niet bij?{" "}
              <Link
                href="/contact"
                className="rounded font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ color: TEAL_ON_DARK }}
              >
                Neem contact op
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── De slotoproep ────────────────────────────────────────────── */

export function ClosingSection() {
  return (
    <section className={`relative z-10 ${SECTION_Y}`} aria-labelledby="proefland-slot">
      <div className={SHELL}>
        <div className={`relative mx-auto max-w-4xl overflow-hidden px-6 py-14 text-center sm:px-12 ${PANEL}`}>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 70% 90% at 50% 0%, rgba(13,148,136,0.22), transparent 70%)" }}
          />
          <div className="relative mx-auto max-w-2xl">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ backgroundColor: "rgba(45,212,191,0.14)", color: TEAL_ON_DARK }}
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TEAL_ON_DARK }} />
              Begin vandaag nog
            </span>

            <h2
              id="proefland-slot"
              className="mt-6 font-semibold text-balance text-white"
              style={{ fontSize: TYPE.h2, lineHeight: 1.15, letterSpacing: "-0.02em" }}
            >
              Klaar om de Bijbel te bestuderen?
            </h2>

            <p className="mt-4 text-pretty text-white/85" style={{ fontSize: TYPE.lead, lineHeight: 1.65 }}>
              Maak in minder dan een minuut een gratis account aan en begin vandaag nog.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/inloggen" data-track="proefland_closing_signup" className={`w-full sm:w-auto ${CTA_PRIMARY}`}>
                Gratis beginnen
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link href="#voortgang" className={CTA_QUIET}>
                Meer informatie
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
