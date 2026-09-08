import Link from "next/link"
import Image from "next/image"
import {
  BookOpen, Library,
  ArrowRight, Check, ChevronDown, Users,
  MessageSquare,
} from "lucide-react"
import { Footer } from "./footer"
import { FAQItem } from "./FAQItem"
import { ScrollEffects } from "./ScrollEffects"
import { StudyDiscovery } from "./StudyDiscovery"
import { HOME_FAQS } from "../../lib/content/homeFaq"
import { HOW_IT_WORKS_STEPS } from "../../lib/content/howItWorks"
import { ALL_STUDIES } from "../../lib/bookStudies"
import { PLANS, euro } from "../../lib/pricing"
import LandingTree from "./LandingTree"
import HeroLevensboom from "./HeroLevensboom"
import LevensboomGroeiDemo from "./LevensboomGroeiDemo"
import { renderTreeSvg } from "../../lib/levensboom/svg"
import { STAGES } from "../../lib/levensboom/stages"
import { CATALOG, catalogItem } from "../../lib/levensboom/catalog"

/* ─── Design tokens ──────────────────────────────────────────── */
const T = {
  sidebar:  "#1F2937",
  teal:     "#0D9488",
  tealDark: "#0F766E",
  tealLight:"#CCFBF1",
  tealText: "#0F766E",
  // For type on the teal-tinted pills: #0F766E only reaches 4.43:1 there.
  tealDeep: "#115E59",
  bg:       "#F3F4F6",
  card:     "#FFFFFF",
  border:   "#E5E7EB",
  text:     "#111827",
  // Passes 4.5:1 on white *and* on the #F3F4F6 section background; #6B7280
  // reached only 4.39:1 on the latter.
  muted:    "#4B5563",
  light:    "#F9FAFB",
}

/**
 * Elevation, in exactly two steps. Cards get theirs from `.lp-card` in
 * globals.css because they need a hover state; these two are for surfaces that
 * only ever rest. The page previously invented a new rgba per component, which
 * is why the feature cards, the pricing table and the product shots all looked
 * like they had been designed by different people.
 */
const SHADOW = {
  card:   "0 1px 2px rgba(15,23,42,0.04)",
  raised: "0 28px 56px -28px rgba(15,23,42,0.30), 0 10px 22px -14px rgba(15,23,42,0.12)",
}

/**
 * Fluid type. The page used to step from `text-4xl` to `text-5xl` at the `lg`
 * breakpoint and then never change again, so a 1024px laptop and a 2560px
 * monitor were both served a 48px headline while the column around it grew by
 * 400px. clamp() interpolates continuously, which is most of what made the
 * hero feel wrong on laptop-sized screens.
 */
const TYPE = {
  h1:   "clamp(2rem, 1.25rem + 1.5vw, 2.75rem)",
  h2:   "clamp(1.75rem, 1.15rem + 1.5vw, 2.5rem)",
  h3:   "clamp(1.375rem, 1.1rem + 0.85vw, 1.875rem)",
  lead: "clamp(1rem, 0.95rem + 0.2vw, 1.125rem)",
}

/**
 * One container and one vertical rhythm for every section. The page previously
 * mixed max-w-6xl, max-w-5xl, max-w-4xl and max-w-3xl with two different
 * horizontal paddings, so no two section edges lined up down the page. Narrow
 * reading measures still exist - they are nested inside this shell rather than
 * used instead of it, so the outer margin never moves.
 */
const SHELL = "mx-auto w-full max-w-6xl xl:max-w-[76rem] px-5 sm:px-6 lg:px-8"
const SECTION_Y = "py-[clamp(3.5rem,6vw,6.5rem)]"

/**
 * A hairline on top of every section. With it, the tinted and white sections
 * can alternate freely - two neighbours of the same colour still read as two
 * sections instead of merging into one long block.
 */
const EDGE = { borderTop: `1px solid ${T.border}` }

/* ─── Reusable animation primitives ─────────────────────────── */
/**
 * The scroll-reveal wrapper. It is a plain server-rendered div: the class means
 * nothing at all until ScrollEffects picks it up in the browser, which is what
 * keeps the served HTML fully visible for crawlers and for anyone whose bundle
 * never arrives.
 *
 * It always wraps a block. Never the hero copy, which LCP is measured against,
 * and never an element that also wants a hover transform - the reveal's
 * `transform: none` is the more specific rule and would silently win.
 */
function FadeUp({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={className ? `reveal ${className}` : "reveal"}>{children}</div>
}

/**
 * One reveal for the whole header rather than one per line. Three stacked
 * reveals meant the eyebrow, the heading and the subtitle each crossed the
 * observer threshold at a slightly different moment and arrived as three
 * separate movements, which reads as jitter rather than as an entrance.
 */
function SectionHeader({
  label,
  title,
  subtitle,
}: {
  label: string
  title: React.ReactNode
  subtitle?: string
}) {
  return (
    <FadeUp className="mx-auto mb-[clamp(2.5rem,4vw,4rem)] max-w-2xl text-center">
      <p
        className="text-[0.6875rem] font-bold uppercase"
        style={{ color: T.tealText, letterSpacing: "0.16em" }}
      >
        {label}
      </p>
      <h2
        className="mt-3 font-extrabold text-balance"
        style={{ color: T.text, fontSize: TYPE.h2, lineHeight: 1.15, letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="mt-4 text-pretty"
          style={{ color: T.muted, fontSize: TYPE.lead, lineHeight: 1.65 }}
        >
          {subtitle}
        </p>
      )}
    </FadeUp>
  )
}

/** The label above a group of cards: eyebrow, rule, count. */
function GroupLabel({
  icon: Icon,
  label,
  meta,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  meta: string
}) {
  return (
    <FadeUp className="mb-6">
      <div className="flex items-baseline gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: T.teal }} />
          <p
            className="text-[0.6875rem] font-bold uppercase"
            style={{ color: T.tealText, letterSpacing: "0.16em" }}
          >
            {label}
          </p>
        </div>
        <div className="h-px flex-1" style={{ backgroundColor: T.border }} />
        <p className="text-xs font-semibold" style={{ color: T.muted }}>{meta}</p>
      </div>
    </FadeUp>
  )
}

/* ─── Bible Study Illustration - looks like an actual app screenshot ─── */

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar() {
  return (
    <header
      /* `.nav-shadow` owns the bottom border as well as the shadow: both are
         transparent while the page sits at the top and appear together once
         ScrollEffects sees content pass underneath. A permanent hairline under
         a header that is flush with a white hero just draws a line for no
         reason. */
      className="nav-shadow sticky top-0 z-50"
      style={{
        backgroundColor: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className={`${SHELL} h-16 flex items-center justify-between gap-3 md:grid md:grid-cols-3`}>
        {/* Logo - links uitgelijnd */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 md:justify-self-start">
          <Image src="/images/icon-192.png" alt="" width={26} height={26} className="rounded-md" priority />
          <span className="font-bold text-base tracking-tight" style={{ color: T.text }}>BijbelStudie</span>
        </Link>

        {/* Navigatie - exact gecentreerd. Alleen het product zelf: de
            content-hubs (/bijbelstudie, /bijbelboeken) blijven online en in de
            sitemap, maar horen niet in de hoofdnavigatie van de app. */}
        <nav className="hidden md:flex items-center justify-center gap-1">
          {[
            { href: "#levensboom",    label: "Levensboom" },
            { href: "#prijzen",       label: "Prijzen" },
            { href: "#faq",           label: "FAQ" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-gray-100"
              style={{ color: T.muted }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Knoppen - rechts uitgelijnd */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 md:justify-self-end">
          <Link href="/inloggen"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 sm:block"
            style={{ color: T.muted }}>
            Inloggen
          </Link>
          <Link href="/inloggen"
            className="press inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 transition-colors whitespace-nowrap">
            Gratis beginnen
            <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
          </Link>
        </div>
      </div>
    </header>
  )
}

/** Live on the App Store since August 2026. */
const APP_STORE_URL = "https://apps.apple.com/us/app/bijbelstudie-lees-leer/id6800668187"

/** Apple's mark. Inlined rather than an <img>: it is one path and must stay crisp. */
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" aria-hidden focusable="false" className={className} fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}

/** One fixed seed for every tree on this page, so the build output is stable. */
const LANDING_SEED = "bijbelstudie-levensboom"

/* ─── Hero ───────────────────────────────────────────────────── */
function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundColor: T.card,
        /* The laptop fix. This block was `py-20 lg:py-28`, so a 1440x800 laptop
           and a 1440x1080 desktop got the same 112px top and bottom - and the
           laptop, which also loses 64px to the sticky header, ended up with the
           CTA row sitting on the fold and the trust line under it. A width-only
           clamp cannot tell those two viewports apart because their vw is
           identical, so the middle term takes whichever of a width- and a
           height-derived value is smaller. On a short laptop the vh term wins
           and the hero compresses; on a tall desktop the vw term wins and it
           breathes. */
        paddingTop: "clamp(3.5rem, min(6.5vw, 8vh), 5.5rem)",
        paddingBottom: "clamp(3rem, min(6vw, 8vh), 6rem)",
      }}
    >
      {/* Ambient glow behind mockup */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 80% 45%, rgba(13,148,136,0.10), transparent 70%)",
        }}
      />
      {/* Top-left subtle glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 45% 55% at 5% 10%, rgba(13,148,136,0.06), transparent 70%)",
        }}
      />

      {/* An explicit two-track template instead of `lg:grid-cols-12` with a
          7/5 span. In a twelve-column grid the gap sits between all twelve
          tracks, so `gap-14` was spending 616px of a 1104px row on gutters and
          the ratio the spans described was not the ratio that rendered - the
          illustration column came out around 427px, which is where the mockup
          started looking undersized next to a much taller text column. Two
          tracks and one gutter make the split mean what it says. */}
      <div
        className={`relative ${SHELL} grid items-center gap-y-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-x-[clamp(2rem,3vw,3.5rem)]`}
      >
        <div className="lg:max-w-[32rem]">
          {/* The h1 carries the head term verbatim ("online bijbelstudie") and
              is the only h1 on the page. Nothing here is inside a `.reveal`:
              this is the LCP element and it must be painted from the served
              HTML, not waiting on an observer. */}
          <h1
            className="font-extrabold text-balance"
            style={{
              color: T.text,
              fontSize: TYPE.h1,
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
            }}
          >
            De Nederlandse tool voor online{" "}
            <span style={{ color: T.tealText }}>bijbelstudie</span>
          </h1>

          {/* The claim leads, the evidence follows in the same sentence, so the
              four items after the colon are doing the work of backing it up.
              "#1" is a ranking claim and the owner's to stand behind: under the
              Dutch/EU rules on misleading commercial practices the burden of
              proof sits with us if it is ever challenged. Don't soften it
              without asking - it is deliberate. */}
          <p
            className="mt-5 max-w-xl text-pretty"
            style={{ color: T.muted, fontSize: TYPE.lead, lineHeight: 1.65 }}
          >
            <strong style={{ color: T.text, fontWeight: 600 }}>
              De #1 bijbelstudietool van Nederland
            </strong>
            : vier vertalingen, bijbelcommentaar per vers, de Hebreeuwse en
            Griekse grondtekst en uw eigen notities - naast elkaar in één scherm.
          </p>

          {/* Two CTAs, not three. A "Bekijk functies" outline button used to sit
              at the end of this row: it pushed the row wider than the column,
              wrapped, and split attention across three equally-weighted choices.
              The header nav already links to #functies, so nothing is lost.
              Both survivors are h-14 with padding on the x-axis only - the teal
              button and Apple's pill were previously sized by different vertical
              padding around different content, so they never matched height.

              The teal button no longer sits in a pulsing ring. A CTA that
              throbs forever is the single loudest thing on the page and reads
              as an ad; a solid button with a soft teal cast under it carries the
              same emphasis without the noise. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/inloggen"
              data-track="hero_cta_signup"
              className="press group h-14 w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold text-white px-7 rounded-xl bg-teal-700 hover:bg-teal-800 transition-colors"
              style={{
                boxShadow: "0 12px 28px -14px rgba(13,148,136,0.9)",
              }}
            >
              Start gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {/* Apple's own black pill rather than another outline button: this
                is the shape people recognise as "this app is really in the
                store", and the app went live in August 2026. */}
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download BijbelStudie in de App Store"
              data-track="hero_cta_appstore"
              className="press h-14 w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-xl bg-black px-6 text-white no-underline transition-colors hover:bg-gray-800"
            >
              <AppleLogo className="h-7 w-7 shrink-0" />
              <span className="text-left leading-none">
                <span className="block text-[10px] font-medium opacity-80">
                  Download in de
                </span>
                <span className="block text-lg font-semibold tracking-tight">
                  App Store
                </span>
              </span>
            </a>
          </div>

          {/* Was a row of five icon-and-label chips. Every one of those icons was
              decorative - a star next to "gratis", sparkles next to "AI" - and
              five chips wrapped to three ragged lines on a laptop. One quiet
              line of facts under a rule does the same job and looks like a
              product rather than a banner. */}
          <div
            className="mt-8 border-t pt-6"
            style={{ borderColor: T.border }}
          >
            <p
              className="text-[0.8125rem] leading-relaxed"
              style={{ color: T.muted }}
            >
              {[
                `${ALL_STUDIES.length} bijbelstudies`,
                "Bijbelcommentaren per vers",
                "Hebreeuwse en Griekse grondtekst",
                "AI-assistent",
                "Ook als iOS-app",
              ].join("  ·  ")}
            </p>
          </div>
        </div>

        {/* The product's face: a grown levensboom at dusk that grows in from a
            kiem when the page lands, with the reader's own numbers laid over
            it. Everything in the picture is the real generator. */}
        <div className="relative w-full mx-auto max-w-[34rem] lg:max-w-none lg:w-full lg:mx-0 lg:justify-self-end">
          <div
            className="relative overflow-hidden rounded-[2rem] aspect-[4/3] lg:aspect-[5/4]"
            style={{ boxShadow: SHADOW.raised, backgroundColor: "#4B3B6B" }}
          >
            <HeroLevensboom
              svg={renderTreeSvg({ seed: LANDING_SEED, level: 14, frac: 0.7, species: "eik", scene: "waterbeken", framing: "scene", width: 800, height: 640, season: "summer", timeOfDay: "dusk", rootAttributes: 'aria-hidden="true"' })}
              seed={LANDING_SEED}
              level={14}
            />

            {/* Who this is */}
            <div className="absolute left-4 top-4 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/85 py-2 pl-2 pr-4 backdrop-blur-md"
              style={{ boxShadow: "0 10px 24px -14px rgba(15,23,42,0.35)" }}>
              <LandingTree
                svg={renderTreeSvg({ seed: LANDING_SEED, level: 14, frac: 0.7, species: "eik", framing: "portrait", width: 96, height: 96, rootAttributes: 'aria-hidden="true"' })}
                seed={LANDING_SEED}
                level={14}
                species="eik"
                framing="portrait"
                className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-teal-600/40"
              />
              <div>
                <p className="text-[12px] font-bold leading-none" style={{ color: T.text }}>Jouw levensboom</p>
                <p className="mt-1 text-[11px] leading-none" style={{ color: T.muted }}>Volwassen boom · niveau 14</p>
              </div>
            </div>

            {/* What just happened */}
            <div className="absolute right-4 top-4 rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-[12px] font-bold backdrop-blur-md"
              style={{ color: T.tealText, boxShadow: "0 10px 24px -14px rgba(15,23,42,0.35)" }}>
              +25 XP · Les 3 afgerond
            </div>

            {/* Where it is going */}
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-4 rounded-2xl border border-white/60 bg-white/85 px-4 py-3 backdrop-blur-md"
              style={{ boxShadow: "0 10px 24px -14px rgba(15,23,42,0.35)" }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12px] font-bold" style={{ color: T.text }}>Nog 340 XP tot de amandelboom</p>
                  <p className="text-[11px] tabular-nums" style={{ color: T.muted }}>62%</p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(15,23,42,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: "62%", backgroundColor: T.teal }} />
                </div>
              </div>
              <div className="flex-shrink-0 border-l pl-4" style={{ borderColor: T.border }}>
                <p className="text-[12px] font-bold leading-none tabular-nums" style={{ color: T.text }}>12 dagen</p>
                <p className="mt-1 text-[11px] leading-none" style={{ color: T.muted }}>reeks</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Bibles & Commentaries ──────────────────────────────────── */
/** The access pill on a library row. Two states only: free, or part of Pro. */
function AccessPill({ free }: { free: boolean }) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
      style={
        free
          ? { backgroundColor: T.tealLight, color: T.tealDeep }
          : { backgroundColor: "#F3F4F6", color: T.muted, border: `1px solid ${T.border}` }
      }
    >
      {free ? "Gratis" : "Pro"}
    </span>
  )
}

/**
 * What is actually in the library, checked against what the app serves:
 * `hooks/useBibleData.ts` for the translations and
 * `lib/mobileAttribution.ts` for the commentaries. It had drifted - the
 * NBG-vertaling 1951 and Heinrich Meyer were missing, and the section claimed
 * three translations when there are four Dutch ones plus five English.
 *
 * Presentation changed with it. Three big serif cards per row, each opening
 * with the same teal Library tile, was a lot of furniture around six short
 * facts; a reader comparing sources wants them in a column they can run their
 * eye down. Translations stay as cards because the year is the thing being
 * compared. Commentaries became rows in one panel, each carrying whether it is
 * free or Pro - the question people actually have about a commentary list.
 */
function BibleLibrary() {
  const translations = [
    { name: "Statenvertaling",       year: "1637", note: "De klassieke Nederlandse vertaling",                        badge: "Standaard" },
    { name: "NBG-vertaling",         year: "1951", note: "Decennialang de kanselbijbel van de protestantse kerken",   badge: "Onder licentie" },
    { name: "De Heilige Schrift",    year: "1917", note: "De eerste NBG-vertaling, in de taal van haar tijd",         badge: null },
    { name: "Canisiusbijbel",        year: "1939", note: "Rooms-katholieke vertaling met deuterocanonieke boeken",    badge: null },
  ]

  const commentaries = [
    { name: "KingComments",        author: "Ger de Koning",       note: "Eigentijds Nederlandstalig commentaar op de hele Bijbel, vers voor vers", free: true  },
    { name: "Matthew Henry",       author: "1662-1714",           note: "Het bekendste commentaar op de hele Bijbel, in Nederlandse vertaling",    free: false },
    { name: "Karl August Dachsel", author: "1818-1893",           note: "Uitvoerig vers-voor-vers commentaar met veel aandacht voor de grondtekst", free: false },
    { name: "Heinrich Meyer",      author: "1800-1873",           note: "Kritisch-exegetisch commentaar op het Nieuwe Testament",                   free: false },
  ]

  return (
    <section id="bibliotheek" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.light, ...EDGE }}>
      <div className={SHELL}>
        <SectionHeader
          label="Bibliotheek"
          title="Vertalingen en commentaren op één plek"
          subtitle="Vier Nederlandse vertalingen naast elkaar, en bij elk vers de uitleg van vier commentaren."
        />

        {/* Translations */}
        <GroupLabel
          icon={BookOpen}
          label="Vertalingen"
          meta={`${translations.length} Nederlandse · 5 Engelse`}
        />
        <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {translations.map(({ name, year, note, badge }) => (
            <FadeUp key={name}>
              <div className="lp-card h-full overflow-hidden rounded-2xl">
                <div className="h-1" style={{ backgroundColor: T.teal }} />

                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[11px] font-bold tracking-widest tabular-nums"
                      style={{ color: T.muted }}>
                      ANNO {year}
                    </span>
                    {badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: T.tealLight, color: T.tealDeep }}>
                        {badge}
                      </span>
                    )}
                  </div>

                  {/* Serif - a translation is a book, and the name should read like one. */}
                  <h3 className="text-lg leading-tight mb-2"
                    style={{
                      color: T.text,
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontWeight: 700,
                    }}>
                    {name}
                  </h3>

                  <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>{note}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp className="mb-14">
          <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
            Daarnaast de King James Version, American Standard Version, World English Bible,
            Geneva Bible en Coverdale Bible - per vers naast een Nederlandse vertaling te leggen.
          </p>
        </FadeUp>

        {/* Commentaries - one panel of rows rather than a row of cards. */}
        <GroupLabel
          icon={Library}
          label="Commentaren"
          meta={`${commentaries.length} commentaren · 1 gratis`}
        />
        <FadeUp>
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: T.border, backgroundColor: T.card, boxShadow: SHADOW.card }}
          >
            {commentaries.map(({ name, author, note, free }, i) => (
              <div
                key={name}
                className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6 sm:px-6 sm:py-5"
                style={i > 0 ? { borderTop: `1px solid ${T.border}` } : undefined}
              >
                <div className="sm:w-56 sm:flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-[17px] leading-tight"
                      style={{
                        color: T.text,
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontWeight: 700,
                      }}>
                      {name}
                    </h3>
                    <AccessPill free={free} />
                  </div>
                  <p className="mt-0.5 text-xs font-semibold tabular-nums" style={{ color: T.tealText }}>
                    {author}
                  </p>
                </div>
                <p className="text-[13.5px] leading-relaxed sm:flex-1" style={{ color: T.muted }}>
                  {note}
                </p>
              </div>
            ))}
          </div>
        </FadeUp>

        <FadeUp className="mt-5">
          <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
            KingComments is voor iedereen gratis en volledig te lezen. De overige drie horen bij Pro.
            De NBG-vertaling 1951 wordt gebruikt onder licentie van het Nederlands-Vlaams Bijbelgenootschap.
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─── Showcase: see the real product in action ───────────────── */
const HEBREW_STACK = "'SBL Hebrew','Ezra SIL','David CLM','Frank Ruhl CLM','Times New Roman','Noto Serif Hebrew',serif"

function GrondtekstMockup() {
  // Genesis 1:1 - בְּרֵאשִׁית בָּרָא אֱלֹהִים
  const words = [
    { h: "בְּרֵאשִׁית",  t: "bere'shit", e: "in het begin", s: "H7225" },
    { h: "בָּרָא",        t: "bara",      e: "schiep",        s: "H1254" },
    { h: "אֱלֹהִים",      t: "Elohim",    e: "God",           s: "H430"  },
  ]
  return (
    <div className="rounded-2xl overflow-hidden border bg-white"
      style={{ borderColor: T.border, boxShadow: SHADOW.raised }}>
      {/* Header bar */}
      <div className="h-11 px-4 flex items-center justify-between border-b"
        style={{ borderColor: T.border, backgroundColor: T.light }}>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold" style={{ color: T.text }}>Genesis 1:1</span>
          <span style={{ color: T.muted }}>·</span>
          <span style={{ color: T.muted }}>Grondtekst</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(13,148,136,0.10)", color: T.tealDeep }}>
            Hebreeuws
          </span>
        </div>
        <span className="text-[10px] tabular-nums" style={{ color: T.muted }}>OT</span>
      </div>

      {/* Intro */}
      <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: T.border + "80" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
          De originele woorden van Genesis 1 in het Hebreeuws, met transliteratie,
          betekenis en Strong-nummer.
        </p>
      </div>

      {/* Word cards */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums"
            style={{ backgroundColor: "rgba(13,148,136,0.10)", color: T.tealDeep }}>
            1
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>
            3 woorden
          </span>
        </div>
        <div className="flex flex-wrap gap-x-1 gap-y-3 justify-end" dir="rtl">
          {words.map(w => (
            <div key={w.s} className="flex flex-col items-center text-center min-w-[64px] px-2 py-1.5 rounded-md hover:bg-teal-50 transition-colors"
              dir="ltr">
              <div className="text-2xl leading-snug font-medium"
                dir="rtl" lang="he"
                style={{ color: T.text, fontFamily: HEBREW_STACK }}>
                {w.h}
              </div>
              <div className="text-[10px] italic mt-0.5" style={{ color: T.muted }}>{w.t}</div>
              <div className="text-[11px] mt-0.5 leading-tight" style={{ color: T.text }}>{w.e}</div>
              <span className="mt-1 text-[9.5px] tabular-nums tracking-wide px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-0.5"
                style={{ backgroundColor: "rgba(13,148,136,0.10)", color: T.tealDeep }}>
                {w.s}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CommentaryMockup() {
  return (
    <div className="rounded-2xl overflow-hidden border bg-white"
      style={{ borderColor: T.border, boxShadow: SHADOW.raised }}>
      {/* Header */}
      <div className="h-11 px-4 flex items-center justify-between border-b"
        style={{ borderColor: T.border, backgroundColor: T.light }}>
        <span className="text-xs font-medium" style={{ color: T.muted }}>Commentaarbron</span>
        <div className="text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-white"
          style={{ borderColor: T.border, color: T.text }}>
          KingComments (NL)
          <ChevronDown className="h-3 w-3" style={{ color: T.muted }} />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        <div className="inline-flex items-center gap-1.5 mb-3">
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(13,148,136,0.10)", color: T.tealDeep }}>
            Vers 1
          </span>
        </div>
        <p className="text-sm leading-relaxed mb-3" style={{ color: T.text }}>
          Genesis is rond 1450 v.Chr. geschreven door Mozes, in de Sinaï woestijn.
        </p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: T.text }}>
          In het Hebreeuws heet dit boek <em style={{ color: T.tealText, fontStyle: "italic" }}>Bereshith</em>, dat
          betekent &apos;in het begin&apos;, naar de eerste woorden waarmee dit boek begint. In het Grieks heet het Genesis, dat
          &apos;geboorte&apos;, of &apos;ontstaan&apos;, of &apos;wording&apos; betekent.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: T.text }}>
          Het is terecht het boek van het begin. We vinden er de oorsprong van alle dingen in. Dit boek vertelt ons onder
          andere over het ontstaan van de hemel en de aarde, de instelling van huwelijk en gezin, de eerste zonde en als
          gevolg daarvan de dood, het eerste offer, het oordeel, het ontstaan van volken, de oorsprong van het volk Israël,
          het verbond en de besnijdenis.
        </p>

        {/* Subtle fade hint that there's more */}
        <div className="mt-4 h-8 -mb-5 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Author footer */}
      <div className="px-5 py-3 border-t flex items-center gap-2.5"
        style={{ borderColor: T.border, backgroundColor: T.light }}>
        <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: T.tealLight }}>
          <Library className="h-3.5 w-3.5" style={{ color: T.teal }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold leading-none" style={{ color: T.text }}>KingComments</p>
          <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>Ger de Koning · vers-voor-vers</p>
        </div>
      </div>
    </div>
  )
}

/** The eyebrow pill that opens each showcase block. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full"
      style={{ backgroundColor: "rgba(13,148,136,0.10)" }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.teal }} />
      <p className="text-[11px] font-bold uppercase" style={{ color: T.tealDeep, letterSpacing: "0.14em" }}>
        {children}
      </p>
    </div>
  )
}

function ShowcaseBlock({
  eyebrow, title, body, bullets, mockup, flip = false,
}: {
  eyebrow: string
  title: string
  body: string
  bullets: string[]
  mockup: React.ReactNode
  flip?: boolean
}) {
  return (
    <div className="grid lg:grid-cols-2 items-center gap-10 lg:gap-16">
      <FadeUp className={flip ? "lg:order-2" : undefined}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3
          className="mt-4 font-extrabold text-balance"
          style={{ color: T.text, fontSize: TYPE.h3, lineHeight: 1.2, letterSpacing: "-0.02em" }}
        >
          {title}
        </h3>
        <p className="mt-4 leading-relaxed" style={{ color: T.muted, fontSize: "1rem" }}>
          {body}
        </p>
        <ul className="mt-6 space-y-3">
          {bullets.map(line => (
            <li key={line} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: T.text }}>
              <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: T.teal }} />
              {line}
            </li>
          ))}
        </ul>
      </FadeUp>

      <FadeUp className={flip ? "lg:order-1" : undefined}>
        <div className="relative">
          {/* Ambient glow */}
          <div aria-hidden className="absolute -inset-8 -z-10"
            style={{ background: "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(13,148,136,0.10), transparent 70%)" }} />
          {mockup}
        </div>
      </FadeUp>
    </div>
  )
}

function Showcase() {
  return (
    <section id="in-actie" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.card, ...EDGE }}>
      <div className={SHELL}>
        <SectionHeader
          label="In de praktijk"
          title="Verdiep u in de Schrift"
          subtitle="Zie hoe BijbelStudie u helpt om de Schrift te begrijpen zoals de oorspronkelijke schrijvers het bedoelden."
        />

        <div className="space-y-[clamp(3.5rem,6vw,6rem)]">
          <ShowcaseBlock
            eyebrow="Grondtekst"
            title="Lees de Bijbel in de oorspronkelijke taal"
            body="Bestudeer elk Hebreeuws of Grieks woord met transliteratie, Nederlandse betekenis en Strong-nummers. Klik door naar de lexicon voor diepere studie - geen taalkennis vereist."
            bullets={[
              "Volledige Hebreeuwse OT en Griekse NT (STEPBible)",
              "Per-woord betekenis en uitspraak",
              "Strong-nummers met directe lexicon-koppeling",
            ]}
            mockup={<GrondtekstMockup />}
          />

          <ShowcaseBlock
            flip
            eyebrow="Commentaren"
            title="Leer van erkende bijbelcommentaren"
            body="Lees vers-voor-vers commentaar van Ger de Koning (KingComments), Matthew Henry, Karl August Dachsel en Heinrich Meyer - direct naast de tekst die u bestudeert."
            bullets={[
              "Nederlandstalige en vertaalde klassieke commentaren",
              "Direct gekoppeld aan het vers dat u leest",
              "Wissel eenvoudig tussen verschillende auteurs",
            ]}
            mockup={<CommentaryMockup />}
          />
        </div>
      </div>
    </section>
  )
}

/* ─── How it works ───────────────────────────────────────────── */
const STEP_ICONS = {
  account: Users,
  book: BookOpen,
  commentary: MessageSquare,
} as const

function HowItWorks() {
  // Copy lives in lib/content so the HowTo JSON-LD on app/page.tsx describes
  // exactly these steps.
  const steps = HOW_IT_WORKS_STEPS.map(s => ({ ...s, icon: STEP_ICONS[s.icon] }))

  return (
    <section className={SECTION_Y} style={{ backgroundColor: T.card, ...EDGE }}>
      <div className={SHELL}>
        <div className="mx-auto max-w-5xl">
          <SectionHeader label="Hoe het werkt" title="In drie stappen aan de slag" />

          <div className="relative">
            {/* The connecting line fades out at both ends instead of stopping
                at a hardcoded 16.67%. That percentage assumed a gapless
                three-column grid, so the true column centre moved every time
                the gutter changed and the line ended slightly off each icon;
                a gradient has no endpoint to misalign. */}
            <div
              aria-hidden
              className="hidden lg:block absolute inset-x-0 top-7 h-px z-0 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${T.border} 18%, ${T.border} 82%, transparent)`,
              }}
            />

            <div className="reveal-stagger grid lg:grid-cols-3 gap-10 lg:gap-12 relative">
              {steps.map(({ num, icon: Icon, title, desc }) => (
                <FadeUp key={num}>
                  <div className="relative z-10 text-center">
                    {/* Icon centered with white ring to cleanly mask the connecting line */}
                    <div
                      className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                      style={{
                        backgroundColor: T.teal,
                        boxShadow: `0 0 0 8px ${T.card}, 0 8px 20px -8px rgba(13,148,136,0.55)`,
                      }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <p className="mt-5 text-[11px] font-bold" style={{ color: T.tealText, letterSpacing: "0.16em" }}>
                      STAP {num}
                    </p>
                    <h3 className="font-bold text-base mt-2 tracking-tight" style={{ color: T.text }}>{title}</h3>
                    <p className="text-sm leading-relaxed mt-2 max-w-xs mx-auto" style={{ color: T.muted }}>{desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Pricing ────────────────────────────────────────────────── */
/** One row of a plan's feature list, so both columns space identically. */
function PlanFeature({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: dark ? "#FFFFFF" : T.text }}>
      <span className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-px"
        style={{ backgroundColor: dark ? "rgba(13,148,136,0.30)" : T.tealLight }}>
        <Check className="h-3 w-3" style={{ color: dark ? "#2DD4BF" : T.teal }} />
      </span>
      {children}
    </li>
  )
}

function Pricing() {
  // Both columns are checked against the enforcement code, not against what
  // would be nice to claim. Historical context moved from the Pro column to
  // the free one because that is where the code puts it.
  const free = [
    "Bijbel lezen (vier Nederlandse vertalingen)",
    "KingComments commentaar, volledig",
    "5 vragen per dag aan de AI-assistent",
    "Persoonlijke notities bij verzen",
    "Historische context per hoofdstuk",
    "Voortgang bijhouden",
  ]
  const pro = [
    "Alles in het gratis plan",
    "200 AI-vragen per dag, i.p.v. 5",
    "Matthew Henry commentaar (NL)",
    "Karl August Dachsel en Heinrich Meyer",
    "Grondtekst: Hebreeuws en Grieks",
    "Prioriteitsondersteuning",
  ]

  return (
    <section id="prijzen" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.light, ...EDGE }}>
      <div className={SHELL}>
        <div className="mx-auto max-w-4xl">
          <SectionHeader
            label="Prijzen"
            title="Begin gratis, groei verder"
            subtitle="Wat gratis is, blijft gratis. Pro voegt de overige commentaren, de grondtekst en meer AI-vragen toe."
          />

          {/* `items-stretch` plus a column layout inside each card, so the two
              buttons sit on the same line even though the Pro list is one item
              longer. They used to float at whatever height their own list
              ended at. */}
          <div className="reveal-stagger grid md:grid-cols-2 gap-6 items-stretch">
            {/* Deliberately not `.lp-card`: a pricing table is a comparison, and
                only one of the two columns lifting under the cursor makes the
                pair look unbalanced. Both cards sit still. */}
            <FadeUp className="h-full">
              <div
                className="flex h-full flex-col rounded-2xl border p-8"
                style={{ borderColor: T.border, backgroundColor: T.card, boxShadow: SHADOW.card }}
              >
                <p className="text-[0.6875rem] font-bold uppercase" style={{ color: T.muted, letterSpacing: "0.16em" }}>
                  Gratis
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>€0</span>
                  <span className="text-sm" style={{ color: T.muted }}>/maand</span>
                </div>
                <p className="mt-2 text-xs" style={{ color: T.muted }}>Voor altijd.</p>

                <ul className="mt-7 mb-8 space-y-3 flex-1">
                  {free.map(f => <PlanFeature key={f}>{f}</PlanFeature>)}
                </ul>

                <Link href="/inloggen"
                  className="press block rounded-xl border py-3 text-center text-sm font-semibold transition-colors hover:bg-gray-50"
                  style={{ borderColor: T.border, color: T.text }}>
                  Gratis beginnen
                </Link>
              </div>
            </FadeUp>

            <FadeUp className="h-full">
              <div
                className="relative flex h-full flex-col overflow-hidden rounded-2xl p-8"
                style={{
                  backgroundColor: T.sidebar,
                  boxShadow: "0 24px 48px -24px rgba(15,23,42,0.45)",
                }}
              >
                <div aria-hidden className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
                  style={{ background: `radial-gradient(circle, ${T.teal}, transparent)`, transform: "translate(30%, -30%)" }} />
                <div className="absolute -top-px left-8">
                  <span className="text-[11px] font-bold px-3 py-1 rounded-b-lg"
                    style={{ backgroundColor: T.tealDark, color: "white" }}>
                    Meest populair
                  </span>
                </div>

                <p className="mt-3 text-[0.6875rem] font-bold uppercase" style={{ color: "#9CA3AF", letterSpacing: "0.16em" }}>
                  Pro
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-white">
                    {euro(PLANS.monthly.amountCents)}
                  </span>
                  <span className="text-sm" style={{ color: "#9CA3AF" }}>/maand</span>
                </div>
                {/* Both amounts come from lib/pricing, which is what Stripe is
                    actually charged against, and both name their own billing
                    period - the price-indication rules do not allow one tariff
                    to be quoted through the other's period. */}
                <p className="mt-2 text-xs" style={{ color: "#9CA3AF" }}>
                  of {euro(PLANS.annual.amountCents)} per jaar
                </p>

                <ul className="mt-7 mb-8 space-y-3 flex-1">
                  {pro.map(f => <PlanFeature key={f} dark>{f}</PlanFeature>)}
                </ul>

                <Link href="/abonnement"
                  className="press block rounded-xl py-3 text-center text-sm font-semibold text-white transition-colors bg-teal-700 hover:bg-teal-800">
                  Pro proberen
                </Link>
              </div>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ ────────────────────────────────────────────────────── */
function FAQ() {
  return (
    <section id="faq" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.card, ...EDGE }}>
      <div className={SHELL}>
        <div className="mx-auto max-w-3xl">
          <SectionHeader label="FAQ" title="Veelgestelde vragen over bijbelstudie" />
          <FadeUp>
            {/* The questions sit in one bordered panel rather than as bare
                underlined rows: the accordion then has an edge to open inside
                of, which is what stops the last answer from looking like it
                belongs to the section below. */}
            <div
              className="rounded-2xl border px-5 sm:px-7 [&>div:last-child]:border-b-0"
              style={{ borderColor: T.border, backgroundColor: T.card, boxShadow: SHADOW.card }}
            >
              {HOME_FAQS.map((item, i) => (
                <FAQItem
                  key={item.q}
                  q={item.q}
                  a={item.a}
                  id={`faq-${i}`}
                  borderColor={T.border}
                  textColor={T.text}
                  mutedColor={T.muted}
                />
              ))}
            </div>
          </FadeUp>
          <FadeUp className="mt-6 text-center">
            <p className="text-sm" style={{ color: T.muted }}>
              Staat uw vraag er niet bij?{" "}
              <Link href="/contact" className="font-semibold underline underline-offset-2" style={{ color: T.tealText }}>
                Neem contact op
              </Link>
            </p>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

/* ─── CTA ────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section className={SECTION_Y} style={{ backgroundColor: T.light, ...EDGE }}>
      <div className={SHELL}>
        {/* Narrower than the shell on purpose: a closing panel that runs the
            full 1216px reads as another section rather than as one thing to
            act on, and the eye has to travel too far from the heading to the
            button. */}
        <FadeUp className="mx-auto max-w-5xl">
          {/* A single panel rather than five loose centred blocks on the section
              background. The closing ask should look like one object you can
              act on, and it also keeps the page from fading straight from a
              flat tint into the dark footer. */}
          <div
            className="relative overflow-hidden rounded-3xl border px-6 py-14 text-center sm:px-12"
            style={{ borderColor: T.border, backgroundColor: T.card, boxShadow: SHADOW.card }}
          >
            <div aria-hidden className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 65% 85% at 50% 0%, rgba(13,148,136,0.10), transparent 70%)" }} />

            <div className="relative mx-auto max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase"
                style={{ backgroundColor: T.tealLight, color: T.tealDeep, letterSpacing: "0.14em" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.teal }} />
                Begin vandaag nog
              </div>

              <h2
                className="mt-6 font-extrabold text-balance"
                style={{ color: T.text, fontSize: TYPE.h2, lineHeight: 1.15, letterSpacing: "-0.02em" }}
              >
                Klaar om de Bijbel te bestuderen?
              </h2>

              <p className="mt-4 text-pretty" style={{ color: T.muted, fontSize: TYPE.lead, lineHeight: 1.65 }}>
                Maak in minder dan een minuut een gratis account aan en begin vandaag nog.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/inloggen"
                  className="press inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-8 py-3.5 font-semibold text-white transition-colors hover:bg-teal-800"
                  style={{ boxShadow: "0 12px 28px -14px rgba(13,148,136,0.9)" }}>
                  Gratis beginnen
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#levensboom"
                  className="press inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-8 py-3.5 font-semibold transition-colors hover:bg-gray-50"
                  style={{ borderColor: T.border, color: T.text }}>
                  Meer informatie
                </Link>
              </div>

              <p className="mt-6 text-xs" style={{ color: T.muted }}>
                Geen creditcard vereist · Gratis te gebruiken · Altijd opzegbaar
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}


/* ─── Levensboom ─────────────────────────────────────────────── */
/**
 * The avatar as a section. Left, one tree walking through every level from
 * kiem to eeuwenoude boom on its own (or under the visitor's thumb on the
 * slider); right, the five stages with what each one brings; below, three
 * trees the reader can grow into. Every picture is the product's own
 * generator, rendered to SVG at build time and swapped for the live canvas on
 * screen - so the page keeps its static HTML and the trees still move.
 */
const LEVENSBOOM_EXAMPLES = [
  { species: "olijf", scene: "meer", animal: "vogel", level: 12 },
  { species: "palm", scene: "woestijn", animal: "schaap", level: 10 },
  { species: "ceder", scene: "sterrennacht", animal: "vuurvliegjes", level: 16 },
] as const

function LevensboomSection() {
  const levelItems = CATALOG.filter(item => item.unlock.kind === "level")
  return (
    <section id="levensboom" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.card, ...EDGE }}>
      <div className={SHELL}>
        <SectionHeader
          label="Jouw levensboom"
          title="Elk niveau een nieuwe boom"
          subtitle="Iedere lezer plant een boom. Hij begint als kiem en groeit met elke les, elk hoofdstuk en elke aantekening - op de website en in de app dezelfde boom. Schuif door de niveaus en zie hem groeien."
        />

        <FadeUp>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-start">
            <LevensboomGroeiDemo
              seed={LANDING_SEED}
              initialSvg={renderTreeSvg({ seed: LANDING_SEED, level: 6, frac: 0.6, species: "eik", scene: "waterbeken", framing: "scene", width: 720, height: 450, rootAttributes: 'aria-hidden="true"' })}
            />

            <ol className="relative space-y-2">
              {STAGES.map((stage, index) => {
                const next = STAGES[index + 1]
                const to = next ? next.from - 1 : null
                const range = to === null ? `niveau ${stage.from}+` : stage.from === to ? `niveau ${stage.from}` : `niveau ${stage.from}–${to}`
                const inBand = (at: number) => at >= stage.from && (to === null || at <= to)
                const brings = [
                  ...(inBand(8) ? ["de eerste vrucht van de Geest"] : []),
                  ...(inBand(16) ? ["een tweede stam"] : []),
                  ...levelItems.filter(item => inBand((item.unlock as { level: number }).level)).map(item => item.name.toLowerCase()),
                ]
                const sample = to === null ? stage.from + 2 : Math.round((stage.from + to) / 2)
                return (
                  <li key={stage.id} className="lp-card flex items-center gap-4 rounded-2xl p-3">
                    <LandingTree
                      svg={renderTreeSvg({ seed: LANDING_SEED, level: sample, frac: 0.6, species: "eik", framing: "portrait", width: 120, height: 120, rootAttributes: 'aria-hidden="true"' })}
                      seed={LANDING_SEED}
                      level={sample}
                      species="eik"
                      framing="portrait"
                      className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-black/5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-bold" style={{ color: T.text }}>{stage.name}</p>
                        <p className="flex-shrink-0 text-[11px] tabular-nums" style={{ color: T.muted }}>{range}</p>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: T.muted }}>
                        {stage.blurb}
                        {brings.length > 0 ? ` Brengt ${brings.join(", ")}.` : ""}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </FadeUp>

        <FadeUp className="mt-14">
          <div className="grid gap-4 sm:grid-cols-3">
            {LEVENSBOOM_EXAMPLES.map((example) => {
              const species = catalogItem("species", example.species)
              const scene = catalogItem("scene", example.scene)
              return (
                <div key={example.species} className="lp-card overflow-hidden rounded-2xl">
                  <LandingTree
                    svg={renderTreeSvg({ seed: LANDING_SEED, level: example.level, frac: 0.6, species: example.species, scene: example.scene, framing: "scene", width: 480, height: 300, rootAttributes: 'aria-hidden="true"' })}
                    seed={LANDING_SEED}
                    level={example.level}
                    species={example.species}
                    scene={example.scene}
                    animal={example.animal}
                    framing="scene"
                    className="aspect-[16/10] w-full"
                    ariaLabel={`${species?.name ?? ""} in ${scene?.name ?? ""}`}
                  />
                  <div className="p-4">
                    <p className="text-sm font-bold" style={{ color: T.text }}>
                      {species?.name}
                      <span className="font-normal" style={{ color: T.muted }}> · {scene?.name}</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: T.muted }}>
                      {species?.blurb} {species?.verse ? `(${species.verse})` : ""}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-6 text-center text-sm" style={{ color: T.muted }}>
            Zes boomsoorten, acht omgevingen en dieren die je ontgrendelt met je voortgang. Een ceder,
            de hof en de sterrennacht zijn er voor Pro-leden.
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen" style={{ backgroundColor: T.card }}>
      {/* The header's stuck state is "is this pixel still on screen". A
          sentinel answers that with an observer instead of a scroll listener
          running a React state update on every frame. */}
      <div id="landing-top-sentinel" aria-hidden className="absolute left-0 top-0 h-px w-px" />
      <ScrollEffects />
      <Navbar />
      <main>
        <Hero />
        <StudyDiscovery />
        <LevensboomSection />
        <Showcase />
        <BibleLibrary />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
