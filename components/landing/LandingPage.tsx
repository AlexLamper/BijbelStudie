import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check } from "lucide-react"
import { Footer } from "./footer"
import { FAQItem } from "./FAQItem"
import { ScrollEffects } from "./ScrollEffects"
import { StudyDiscovery } from "./StudyDiscovery"
import { HOME_FAQS } from "../../lib/content/homeFaq"
import { opstandingLessons } from "../../lib/data/study-lessons/opstanding"
import { ALL_STUDIES } from "../../lib/bookStudies"
import { PLANS, euro } from "../../lib/pricing"
import LandingTree from "./LandingTree"
import HeroLevensboom from "./HeroLevensboom"
import LevensboomGroeiDemo from "./LevensboomGroeiDemo"
import StudyFlowDemo, { type DemoLesson } from "./StudyFlowDemo"
import CountUp from "./CountUp"
import { renderTreeSvg } from "../../lib/levensboom/svg"
import { STAGES } from "../../lib/levensboom/stages"
import { CATALOG } from "../../lib/levensboom/catalog"

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
            { href: "#levensboom",    label: "Voortgang" },
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

/**
 * The four facts under the hero copy. Every figure is counted from the data
 * the page is built from, so none of them is a claim to defend: the studies
 * and lessons from the catalogue, the translations and commentaries from the
 * library section further down.
 */
const LESSONS_TOTAL = ALL_STUDIES.reduce((sum, study) => sum + study.lessons.length, 0)
const HERO_STATS = [
  { value: ALL_STUDIES.length, label: "begeleide bijbelstudies", count: true },
  { value: LESSONS_TOTAL, label: "lessen van een kwartier", count: true },
  { value: 4, label: "Nederlandse vertalingen", count: false },
  { value: 4, label: "commentaren, per vers", count: false },
]

/**
 * The light behind the hero frame: the dusk sky and ground of the scene it
 * shows (`waterbeken` at `dusk`, lib/levensboom/scenes.ts), blurred and laid
 * under the picture at low opacity. The frame then looks lit by its own
 * scene instead of cut out of the white page. The sky value doubles as the
 * frame's backdrop for the instant before the SVG paints.
 */
const HERO_GLOW = { sky: "#5A3E6E", ground: "#F0A56B" }

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

          {/* Four counted facts under a rule. The two catalogue figures count
              up the first time they scroll into view; the server renders the
              final number, so the served HTML is complete without the bundle. */}
          <ul
            className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6 sm:grid-cols-4"
            style={{ borderColor: T.border }}
            aria-label="In cijfers"
          >
            {HERO_STATS.map(stat => (
              <li key={stat.label}>
                <p
                  className="text-2xl font-extrabold leading-none tabular-nums"
                  style={{ color: T.text, letterSpacing: "-0.02em" }}
                >
                  {stat.count ? <CountUp value={stat.value} /> : stat.value}
                </p>
                <p className="mt-1.5 text-xs leading-snug" style={{ color: T.muted }}>
                  {stat.label}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* The product's face: a grown tree at dusk that grows in from a kiem
            when the page lands, with the reader's own numbers laid over it.
            Everything in the picture is the real generator.

            A framed picture, lit from behind. Two earlier treatments were
            rejected: a rounded box on a solid purple backdrop under a heavy
            shadow (a hard rectangle cut out of a white hero), and a picture
            that dissolved into the page on all four sides (a blur with no edge
            to hold on to). This one keeps a real edge - a generous radius and
            a hairline ring - and rests on a soft wash of its own dusk colours,
            so it reads as an object lit by the scene rather than a cut-out.
            `slice` keeps the SVG, drawn at 5:4, covering the 4:3 box on phones,
            so the frame never shows a letterbox band. */}
        <div className="relative w-full mx-auto max-w-[34rem] lg:max-w-none lg:w-full lg:mx-0 lg:justify-self-end">
          {/* Ambient glow. Sits behind the frame, a little larger and offset
              down-right, so the light seems to fall out of the picture onto
              the page. Purely decorative and invisible to assistive tech. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-6 -bottom-8 -top-4 rounded-[3rem] blur-3xl"
            style={{
              background: `radial-gradient(60% 55% at 35% 30%, ${HERO_GLOW.sky}, transparent 70%), radial-gradient(55% 45% at 72% 88%, ${HERO_GLOW.ground}, transparent 70%)`,
              opacity: 0.3,
            }}
          />
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] ring-1 ring-black/[0.06] lg:aspect-[5/4]"
            style={{
              backgroundColor: HERO_GLOW.sky,
              boxShadow: "0 30px 60px -32px rgba(15,23,42,0.35), 0 10px 20px -14px rgba(15,23,42,0.18)",
            }}
          >
            <HeroLevensboom
              svg={renderTreeSvg({ seed: LANDING_SEED, level: 14, frac: 0.7, species: "eik", scene: "waterbeken", framing: "scene", width: 800, height: 640, season: "summer", timeOfDay: "dusk", rootAttributes: 'aria-hidden="true" preserveAspectRatio="xMidYMid slice"' })}
              seed={LANDING_SEED}
              level={14}
            />

            {/* Two cards, not three. The "+25 XP" pill that sat top-right went:
                three floating labels read as clutter, and the progress card
                already says what the XP is for. */}
            <div
              className="absolute left-4 top-4 flex items-center gap-3 rounded-2xl border bg-white/85 py-2 pl-2 pr-4 backdrop-blur-md"
              style={{ borderColor: "rgba(15,23,42,0.08)", boxShadow: "0 10px 24px -14px rgba(15,23,42,0.35)" }}
            >
              <LandingTree
                svg={renderTreeSvg({ seed: LANDING_SEED, level: 14, frac: 0.7, species: "eik", framing: "portrait", width: 96, height: 96, rootAttributes: 'aria-hidden="true"' })}
                seed={LANDING_SEED}
                level={14}
                species="eik"
                framing="portrait"
                className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-teal-600/40"
              />
              <div>
                <p className="text-[12px] font-bold leading-none" style={{ color: T.text }}>Jouw voortgang</p>
                <p className="mt-1 text-[11px] leading-none" style={{ color: T.muted }}>Volwassen boom · niveau 14</p>
              </div>
            </div>

            {/* Where it is going. The streak cell that used to share this card
                came off: one line and one bar is the calmer composition. */}
            <div
              className="absolute inset-x-4 bottom-4 rounded-2xl border bg-white/85 px-4 py-3 backdrop-blur-md"
              style={{ borderColor: "rgba(15,23,42,0.08)", boxShadow: "0 10px 24px -14px rgba(15,23,42,0.35)" }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] font-bold" style={{ color: T.text }}>Nog 340 XP tot de amandelboom</p>
                <p className="text-[11px] tabular-nums" style={{ color: T.muted }}>62%</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(15,23,42,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: "62%", backgroundColor: T.teal }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Bibles & Commentaries ──────────────────────────────────── */
/**
 * What is actually in the library, checked against what the app serves:
 * `hooks/useBibleData.ts` for the translations and `lib/mobileAttribution.ts`
 * for the commentaries.
 *
 * Nothing in here may be quoted on this page. Only the Statenvertaling is
 * public domain; the NBG 1951 is licensed and the HSV and BasisBijbel never
 * ship at all, so every source is named and nothing more. The commentaries are
 * named for the same reason - KingComments may not be redistributed.
 */
const TRANSLATIONS = [
  { name: "Statenvertaling",    year: "1637", note: "De klassieke Nederlandse vertaling" },
  { name: "NBG-vertaling",      year: "1951", note: "Decennialang de kanselbijbel van de protestantse kerken" },
  { name: "De Heilige Schrift", year: "1917", note: "De eerste NBG-vertaling, in de taal van haar tijd" },
  { name: "Canisiusbijbel",     year: "1939", note: "Rooms-katholieke vertaling met deuterocanonieke boeken" },
]
const ENGLISH_TRANSLATIONS = 5

/** `free` is not rendered per row - four access badges next to eight names was
 *  more furniture than information - but it is what the group's closing line
 *  says out loud, so it stays here as the source of that claim. */
const COMMENTARIES = [
  { name: "KingComments",        author: "Ger de Koning", note: "Eigentijds Nederlandstalig commentaar op de hele Bijbel, vers voor vers",  free: true  },
  { name: "Matthew Henry",       author: "1662-1714",     note: "Het bekendste commentaar op de hele Bijbel, in Nederlandse vertaling",     free: false },
  { name: "Karl August Dachsel", author: "1818-1893",     note: "Uitvoerig vers-voor-vers commentaar met veel aandacht voor de grondtekst", free: false },
  { name: "Heinrich Meyer",      author: "1800-1873",     note: "Kritisch-exegetisch commentaar op het Nieuwe Testament",                   free: false },
]

/**
 * One group in the library: an eyebrow, four named sources, one closing line.
 * Rows are separated by space instead of by a rule - the ledger this replaced
 * drew a border under all eight of them, which is what turned two short lists
 * into a wall.
 */
function LibraryGroup({
  label,
  items,
  footnote,
}: {
  label: string
  items: { name: string; meta: string; note: string }[]
  footnote: string
}) {
  return (
    <div>
      <p
        className="text-[0.6875rem] font-bold uppercase"
        style={{ color: T.tealText, letterSpacing: "0.16em" }}
      >
        {label}
      </p>
      <ul className="mt-6 space-y-6">
        {items.map(({ name, meta, note }) => (
          <li key={name}>
            <p className="text-[15px] font-bold leading-snug tracking-tight" style={{ color: T.text }}>
              {name}
              <span className="ml-2 text-xs font-semibold" style={{ color: T.muted }}>{meta}</span>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: T.muted }}>{note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs leading-relaxed" style={{ color: T.muted }}>{footnote}</p>
    </div>
  )
}

/**
 * The library: what you can read, in two groups, on one quiet surface.
 *
 * It replaced a mock reading pane beside a two-part ledger: four translation
 * tabs, a quoted verse, four commentary chips, eight bordered rows, four access
 * badges and four captions, all competing in one section - and the pane named
 * every source the ledger next to it already named. What is left is the heading,
 * one supporting line, the eight sources grouped and spaced, one link and the
 * licence note. The reader's own screen is already shown by the lesson demo
 * further up the page, so nothing is lost by not mocking it twice.
 *
 * Only the source names carry teal, so the section has one accent and no
 * borders of its own beyond the section hairline.
 */
function BibleLibrary() {
  return (
    <section id="bibliotheek" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.card, ...EDGE }}>
      <div className={SHELL}>
        <SectionHeader
          label="Bibliotheek"
          title="Vertalingen en commentaren op één plek"
          subtitle="Vier Nederlandse vertalingen naast elkaar, en bij elk vers de uitleg van vier commentaren."
        />

        <FadeUp className="mx-auto max-w-4xl">
          <div
            className="grid gap-y-12 rounded-3xl px-6 py-9 md:grid-cols-2 md:gap-x-16 md:px-12 md:py-12"
            style={{ backgroundColor: T.light }}
          >
            <LibraryGroup
              label="Vertalingen"
              items={TRANSLATIONS.map(({ name, year, note }) => ({ name, meta: year, note }))}
              footnote={`Plus ${ENGLISH_TRANSLATIONS} Engelse vertalingen: King James Version, American Standard Version, World English Bible, Geneva Bible en Coverdale Bible.`}
            />
            <LibraryGroup
              label="Commentaren"
              items={COMMENTARIES.map(({ name, author, note }) => ({ name, meta: author, note }))}
              footnote="KingComments is voor iedereen gratis en volledig te lezen; de overige drie horen bij Pro."
            />
          </div>

          <p className="mt-8 text-center">
            <Link
              href="/inloggen"
              data-track="landing_library_cta"
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: T.tealText }}
            >
              Gratis beginnen
            </Link>
          </p>

          {/* Contractual, and reproduced as agreed with the Nederlands-Vlaams
              Bijbelgenootschap. Do not reword or drop it. */}
          <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: T.muted }}>
            De NBG-vertaling 1951 wordt gebruikt onder licentie van het Nederlands-Vlaams Bijbelgenootschap.
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─── Zo werkt een les ───────────────────────────────────────── */
/**
 * The lesson the demo plays: les 1 of "De opstanding van Jezus", built from the
 * same authored prose the real flow serves (lib/data/study-lessons/opstanding)
 * and the Statenvertaling text of Johannes 20:1-3. Assembled on the server at
 * build time - the page is static - so the browser receives finished copy and
 * an SVG of the tree, and only the playback runs on the client.
 */
function demoLesson(): DemoLesson {
  const authored = opstandingLessons[1]
  return {
    studyTitle: "De opstanding van Jezus",
    lessonsTotal: 3,
    lesson: { day: 1, title: "Het lege graf", reference: "Johannes 20:1–18", minutes: 12 },
    intro: {
      headline: authored.intro?.headline ?? "Het lege graf",
      body: authored.intro?.body ?? [],
      watchFor: authored.intro?.watchFor ?? [],
    },
    readingCue: authored.word?.readingCue ?? "Lees rustig.",
    translation: "Statenvertaling",
    verses: [
      { n: 1, text: "En op den eersten dag der week ging Maria Magdalena vroeg, als het nog duister was, naar het graf; en zag den steen van het graf weggenomen." },
      { n: 2, text: "Zij liep dan, en kwam tot Simon Petrus en tot den anderen discipel, welken Jezus liefhad, en zeide tot hen: Zij hebben den Heere weggenomen uit het graf, en wij weten niet, waar zij Hem gelegd hebben." },
      { n: 3, text: "Petrus dan ging uit, en de andere discipel, en zij kwamen tot het graf." },
    ],
    depth: {
      body: authored.depth?.body ?? [],
      terms: authored.depth?.terms ?? [],
    },
    greek: [
      { word: "μιᾷ", translit: "mia", meaning: "eerste", strong: "G1520" },
      { word: "σαββάτων", translit: "sabbatōn", meaning: "van de week", strong: "G4521" },
      { word: "πρωΐ", translit: "prōi", meaning: "vroeg", strong: "G4404" },
      { word: "σκοτίας", translit: "skotias", meaning: "duisternis", strong: "G4653" },
      { word: "μνημεῖον", translit: "mnēmeion", meaning: "graf", strong: "G3419" },
      { word: "λίθον", translit: "lithon", meaning: "steen", strong: "G3037" },
    ],
    reflection: {
      question: authored.reflection?.question ?? "",
      prompts: authored.reflection?.prompts ?? [],
      placeholder: authored.reflection?.placeholder ?? "Schrijf op wat je opviel...",
      sample: "Maria zoekt een lichaam en vindt een stem. Ik herken Hem ook vaker in wat ik lees dan in wat ik zie.",
    },
    quiz: {
      question: "Wie komt in Johannes 20 als eerste bij het graf?",
      answers: ["Maria Magdalena", "Simon Petrus", "De andere discipel", "Thomas"],
      correct: 0,
    },
    xp: 25,
    nextLesson: { day: 2, title: "\u201cMijn Heer en mijn God\u201d", reference: "Johannes 20:19–31" },
    tree: {
      svg: renderTreeSvg({ seed: LANDING_SEED, level: 7, frac: 0.7, species: "eik", framing: "portrait", width: 176, height: 176, rootAttributes: 'aria-hidden="true"' }),
      seed: LANDING_SEED,
      level: 7,
      species: "eik",
    },
  }
}

/**
 * The product, doing what it does. This replaced two static mockups
 * (grondtekst, commentaar) and a three-step "hoe het werkt": one lesson that
 * plays itself shows the same things - the Greek, the commentary, the note,
 * the quiz, the XP on the tree - in the order a reader meets them.
 */
function StudyFlowSection() {
  return (
    <section id="in-actie" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.light, ...EDGE }}>
      <div className={SHELL}>
        <SectionHeader
          label="Zo werkt een les"
          title="Vijf stappen, een kwartier per dag"
          subtitle="Elke les leidt je in dezelfde vijf stappen door één bijbelgedeelte: intro, het Woord, verdieping, reflectie en toetsing. Hieronder speelt de eerste les van De opstanding van Jezus vanzelf af - de echte les, geen schermafbeelding."
        />
        <FadeUp>
          <StudyFlowDemo lesson={demoLesson()} />
        </FadeUp>
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
 * The avatar as a section - "voortgang" to the reader, never "levensboom".
 * Left, one tree walking through every level from kiem to eeuwenoude boom on
 * its own (or under the visitor's thumb on the slider); right, the five stages
 * with what each one brings. Every picture is the product's own generator,
 * rendered to SVG at build time and swapped for the live canvas on screen - so
 * the page keeps its static HTML and the trees still move. A gallery of three
 * grown trees used to close the section; the growth demo already makes the
 * point, and a second row of pictures only made the section run on.
 */
function LevensboomSection() {
  const levelItems = CATALOG.filter(item => item.unlock.kind === "level")
  return (
    <section id="levensboom" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.card, ...EDGE }}>
      <div className={SHELL}>
        <SectionHeader
          label="Jouw voortgang"
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
        <StudyFlowSection />
        <LevensboomSection />
        <StudyDiscovery />
        <BibleLibrary />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
