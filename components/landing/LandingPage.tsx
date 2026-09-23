import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check, Menu, X, ChevronDown } from "lucide-react"
import { Footer } from "./footer"
import { FAQItem } from "./FAQItem"
import { ScrollEffects } from "./ScrollEffects"
import { LandingSeenMarker } from "./LandingSeenMarker"
import { StudyDiscovery } from "./StudyDiscovery"
import { HOME_FAQS } from "../../lib/content/homeFaq"
import { APP_STORE_URL } from "../../lib/appStore"
import { opstandingLessons } from "../../lib/data/study-lessons/opstanding"
import { buildLessonContext } from "../../lib/lessonContext"
import { chapterStudyTemplate } from "../../lib/chapterStudyTemplate"
import StudyFlowDemo, { type DemoLesson } from "./StudyFlowDemo"
import { renderTreeSvg } from "../../lib/levensboom/svg"
import { LP_THEME_VARS } from "./studyLandingShared"
import { PLANS, euro } from "../../lib/pricing"
import { getBibleBook } from "../../lib/content/bibleBooks"
import { PromoBanner } from "./PromoBanner"
import { HeroVisual } from "./HeroVisual"
import { HeroMobileCard } from "./HeroMobileCard"
import { ReviewsRow, type ReviewsData } from "./ReviewsRow"
import { FREE_AI_DAILY_CAP, FREE_NOTE_LIMIT, PRO_AI_DAILY_CAP } from "../../lib/entitlements"

/* ─── Design tokens ──────────────────────────────────────────── */
/* The neutrals are CSS variables so the page follows dark mode: the global
   tokens where one exists, otherwise the `--lp-*` set from LP_THEME_VARS on the
   root element. Light values are unchanged (noted beside each). */
const T = {
  sidebar:  "#1F2937",
  teal:     "#0D9488",
  tealDark: "#0F766E",
  tealLight:"var(--lp-teal-light)",   // #CCFBF1
  tealText: "var(--lp-teal-text)",    // #0F766E
  // For type on the teal-tinted pills: #0F766E only reaches 4.43:1 there.
  tealDeep: "var(--lp-teal-deep)",    // #115E59
  bg:       "#F3F4F6",
  // Section and page ground (#FFFFFF); cards sit on `card`, which in dark mode
  // is one step lighter than the page.
  page:     "var(--lp-page)",
  card:     "var(--surface)",         // #FFFFFF
  border:   "var(--line)",            // #E5E7EB
  text:     "var(--ink)",             // #111827
  // Passes 4.5:1 on white *and* on the #F3F4F6 section background; #6B7280
  // reached only 4.39:1 on the latter.
  muted:    "var(--lp-muted)",        // #4B5563
  light:    "var(--surface-sunken)",  // #F9FAFB
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

/**
 * A link inside running copy: the teal text colour, underlined. No prefetch -
 * next/link prefetches every link that scrolls into view, and each of these is
 * a page most visitors never open; prefetching it would still cost a render.
 */
function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="font-semibold underline underline-offset-2"
      style={{ color: T.tealText }}
    >
      {children}
    </Link>
  )
}

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
      className="nav-shadow sticky top-0 z-50 bg-white/[0.88] dark:bg-neutral-900/[0.88] [.dark.is-stuck_&]:border-b-line"
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className={`${SHELL} h-16 flex items-center justify-between gap-3 md:grid md:grid-cols-3`}>
        {/* Logo - links uitgelijnd */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 md:justify-self-start">
          <Image src="/images/icon-192.png" alt="" width={26} height={26} className="rounded-md" priority />
          <span className="font-bold text-base tracking-tight" style={{ color: T.text }}>
            Bijbel<span style={{ color: "#0D9488" }}>Studie</span>
          </span>
        </Link>

        {/* Navigatie - exact gecentreerd. Alleen het product zelf: de
            content-hubs (/bijbelstudie, /bijbelboeken) blijven online en in de
            sitemap, maar horen niet in de hoofdnavigatie van de app. */}
        <nav className="hidden md:flex items-center justify-center gap-1">
          {[
            { href: "/studies",       label: "Studies" },
            { href: "#prijzen",       label: "Prijzen" },
            { href: "#faq",           label: "FAQ" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-line-soft"
              style={{ color: T.muted }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Knoppen - rechts uitgelijnd */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 md:justify-self-end">
          <Link href="/inloggen"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-line-soft sm:block"
            style={{ color: T.muted }}>
            Inloggen
          </Link>
          <Link href="/inloggen"
            className="press inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 transition-colors whitespace-nowrap max-[380px]:px-3">
            Gratis beginnen
            <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 max-[380px]:hidden" />
          </Link>
          {/* Phone menu. A native <details> so the header stays a server
              component; hidden from md up, where the centred nav shows. */}
          <details id="landing-mobile-menu" className="group md:hidden">
            <summary
              aria-label="Menu"
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg transition-colors hover:bg-line-soft [&::-webkit-details-marker]:hidden"
              style={{ color: T.text }}
            >
              <Menu className="h-5 w-5 group-open:hidden" />
              <X className="hidden h-5 w-5 group-open:block" />
            </summary>
            <nav
              className="absolute inset-x-0 top-16 border-b px-4 py-2 shadow-lg"
              style={{ borderColor: T.border, backgroundColor: T.page }}
            >
              {[
                { href: "/studies",    label: "Studies" },
                { href: "#prijzen",    label: "Prijzen" },
                { href: "#faq",        label: "FAQ" },
                { href: "/inloggen",   label: "Inloggen" },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium transition-colors hover:bg-line-soft"
                  style={{ color: T.text }}>
                  {label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}

/** One fixed seed for every tree on this page, so the build output is stable. */
const LANDING_SEED = "bijbelstudie-levensboom"

/* ─── Hero ───────────────────────────────────────────────────── */
/**
 * `reviews` is the real, imported App Store summary, handed down from
 * app/page.tsx - this file stays a non-async component, so it never touches
 * the database itself. Undefined until the first import, and ReviewsRow then
 * renders nothing rather than a placeholder number or a stock face.
 */
function Hero({ reviews }: { reviews?: ReviewsData }) {
  return (
    <section
      className="relative overflow-x-clip"
      style={{ backgroundColor: "#fbfbf8" }}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[18px] px-5 py-7 sm:px-6 lg:min-h-[calc(100vh-112px)] lg:flex-row lg:items-center lg:gap-16 lg:py-0 lg:pl-[120px] lg:pr-0">
        {/* Left column: fixed 540px from 1280px up, ~460px between 1024-1279. */}
        <div className="flex flex-col items-start gap-[18px] lg:w-[460px] lg:flex-shrink-0 lg:gap-6 xl:w-[540px]">
          <p
            className="text-[11px] font-bold uppercase leading-normal lg:text-[13px]"
            style={{ letterSpacing: "0.12em", color: "#0b5f52" }}
          >
            Voor iedereen die de Bijbel dieper wil leren kennen
          </p>

          {/* The only h1 on the page - the LCP element, so it is never
              inside a `.reveal` and always painted from the served HTML. */}
          <h1
            className="text-balance font-extrabold"
            style={{
              fontSize: "clamp(2.625rem, 2rem + 3vw, 4rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              color: "#0f172a",
            }}
          >
            <span style={{ color: "#0d7a66" }}>Begrijp</span> wat je leest in de Bijbel.
          </h1>

          <p
            className="text-pretty text-[17px] lg:max-w-[520px] lg:text-xl"
            style={{ lineHeight: 1.55, color: "#475569" }}
          >
            Lees de tekst en het commentaar naast elkaar, met de grondtekst en je eigen notities één klik verder.
          </p>

          {/* Two buttons, exactly 202x60 from 1024px up; a 2-column grid of
              equal 52px-high buttons below that. */}
          <div className="grid w-full grid-cols-2 gap-2.5 pt-0.5 sm:flex sm:w-auto sm:gap-3">
            <Link
              href="/inloggen"
              data-track="hero_cta_signup"
              className="hero-cta-primary flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-[10px] text-[16px] font-bold text-white transition-colors lg:h-[60px] lg:w-[202px] lg:text-[17px]"
              style={{
                letterSpacing: "-0.01em",
                boxShadow: "0 10px 24px -8px rgba(13,122,102,0.55)",
              }}
            >
              Start gratis
              <ArrowRight className="h-[15px] w-[15px] flex-shrink-0 lg:h-[17px] lg:w-[17px]" />
            </Link>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download BijbelStudie in de App Store"
              data-track="hero_cta_appstore"
              className="flex h-[52px] w-full items-center justify-center rounded-[10px] lg:h-[60px] lg:w-[202px]"
            >
              {/* The badge artwork carries its own wordmark and glyph, so it is
                  drawn a little inside the 52/60px button box rather than
                  filling it - at full bleed the lettering reads larger than the
                  "Start gratis" label beside it. w-auto keeps Apple's ratio;
                  the old w-full stretched the PNG in the 2-column mobile grid. */}
              <Image
                src="/images/hero/app-store-badge.png"
                alt="Download on the App Store"
                width={202}
                height={60}
                className="block h-[46px] w-auto max-w-full object-contain lg:h-[53px]"
              />
            </a>
          </div>

          <ReviewsRow data={reviews} />
        </div>

        {/* Right side: the product visual. Fixed-size inner box, scaled down
            with a transform between 1024 and 1279px so the composition keeps
            its proportions; hidden below 1024px in favour of HeroMobileCard. */}
        <div className="relative hidden h-[500px] flex-grow items-center lg:flex xl:h-[600px]">
          <div className="origin-left scale-[0.83] xl:scale-100">
            <HeroVisual />
          </div>
        </div>

        {/* Mobile: one compact lesson card instead of the two screenshots. */}
        <div className="lg:hidden">
          <HeroMobileCard />
        </div>
      </div>

      {/* Scroll hint - desktop/tablet only. */}
      <a
        href="#in-actie"
        aria-label="Scroll naar: zo werkt een les"
        className="group absolute bottom-[22px] left-1/2 hidden -translate-x-1/2 lg:flex lg:flex-col lg:items-center"
      >
        <span
          className="bs-bob flex h-8 w-8 items-center justify-center rounded-full"
          style={{ border: "1.5px solid #cfd8d4" }}
        >
          <ChevronDown className="h-[14px] w-[14px]" style={{ color: "#475569" }} />
        </span>
      </a>
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
const ENGLISH_TRANSLATIONS = 6

/**
 * Named in the library's closing line as examples of a book introduction. Read
 * from the dataset, so the names are spelled the way the pages spell them and
 * a slug that ever stops existing drops out instead of linking to a 404.
 */
const LIBRARY_BOOKS = ["genesis", "psalmen", "jesaja", "johannes", "romeinen"].flatMap(
  (slug) => getBibleBook(slug) ?? [],
)

/** `free` is not rendered per row - four access badges next to eight names was
 *  more furniture than information - but it is what the group's closing line
 *  says out loud, so it stays here as the source of that claim. */
const COMMENTARIES = [
  { name: "KingComments",        author: "Ger de Koning", note: "Eigentijds Nederlandstalig commentaar op de hele Bijbel, vers voor vers",  free: true  },
  { name: "Matthew Henry",       author: "1662-1714",     note: "Het bekendste commentaar op de hele Bijbel, in Nederlandse vertaling",     free: false },
  { name: "Johannes Calvijn",    author: "1509-1564",     note: "Het commentaar van de reformator op de meeste bijbelboeken, in Nederlandse vertaling", free: false },
  { name: "Karl August Dachsel", author: "1818-1893",     note: "Uitvoerig vers-voor-vers commentaar met veel aandacht voor de grondtekst", free: false },
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
    <section id="bibliotheek" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.page, ...EDGE }}>
      <div className={SHELL}>
        <SectionHeader
          label="Bibliotheek"
          title="Vertalingen en commentaren op één plek"
          subtitle="Vier Nederlandse vertalingen, en bij elk vers de uitleg van vier commentaren."
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

          {/* The third thing in the library, and the one a visitor can read
              right now without an account: an introduction per book. */}
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-pretty" style={{ color: T.muted }}>
            En bij elk van de <InlineLink href="/bijbelboeken">66 bijbelboeken</InlineLink> een
            inleiding met schrijver, ontstaanstijd, thema en hoofdlijn, zoals bij{" "}
            {LIBRARY_BOOKS.map((book, i) => (
              <span key={book.slug}>
                {i > 0 && (i === LIBRARY_BOOKS.length - 1 ? " en " : ", ")}
                <InlineLink href={`/bijbelboeken/${book.slug}`}>{book.name}</InlineLink>
              </span>
            ))}
            .
          </p>

          {/* Anchors for what the homepage already appears for in search
              ("bijbel met uitleg online", "wat zegt de bijbel", "bijbelstudie met
              vragen en antwoorden"), pointing at the pages written for them. */}
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-pretty" style={{ color: T.muted }}>
            Lees ook hoe je de <InlineLink href="/bijbelstudie/bijbel-met-uitleg">Bijbel met uitleg</InlineLink> leest,
            hoe een <InlineLink href="/bijbelstudie/vragen-en-antwoorden">bijbelstudie met vragen en antwoorden</InlineLink> werkt,
            en <InlineLink href="/bijbel-over">wat de Bijbel zegt</InlineLink> over onderwerpen als{" "}
            <InlineLink href="/bijbel-over/angst">angst</InlineLink>,{" "}
            <InlineLink href="/bijbel-over/vergeving">vergeving</InlineLink> en{" "}
            <InlineLink href="/bijbel-over/rouw">rouw</InlineLink>.
          </p>

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
  // The context step, off the same builder the real lesson uses, so what the
  // landing page shows about Johannes is what a reader actually gets.
  const context = buildLessonContext(
    { book: "Johannes", chapter: 20, verseStart: 1, verseEnd: 18 },
    authored,
  )
  return {
    studyTitle: "De opstanding van Jezus",
    lessonsTotal: 3,
    lesson: { day: 1, title: "Het lege graf", reference: "Johannes 20:1–18", minutes: 15 },
    intro: {
      headline: authored.intro?.headline ?? "Het lege graf",
      body: authored.intro?.body ?? [],
      watchFor: authored.intro?.watchFor ?? [],
    },
    context: {
      bookName: context?.book?.name ?? "Johannes",
      body: context?.body[0] ?? "",
      // Four facts is a grid of two by two; the step itself shows the rest.
      facts: (context?.facts ?? []).slice(0, 4),
      outline: (context?.outline ?? []).map((section) => ({
        range: section.range,
        title: section.title,
        current: section.current,
      })),
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
      // The same fallback the flow applies: an evangelie lesson with no
      // authored practices gets the genre template.
      practices: authored.reflection?.practices ?? [...chapterStudyTemplate("Evangelie").practices],
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
          title="Zes stappen, een kwartier per dag"
          subtitle="Elke les leidt je in dezelfde zes stappen door één bijbelgedeelte: inleiding, bijbelse context, lezen, verdieping, toetsing en toepassing. Hieronder speelt de eerste les van De opstanding van Jezus vanzelf af - de echte les, geen schermafbeelding."
        />
        <FadeUp>
          <StudyFlowDemo lesson={demoLesson()} />
        </FadeUp>
        <FadeUp className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-sm leading-relaxed text-pretty" style={{ color: T.muted }}>
            De stappen volgen de volgorde van elke goede bijbelstudie: eerst waarnemen, dan
            uitleggen, dan toepassen. Meer daarover in de{" "}
            <InlineLink href="/bijbelstudie">gids over bijbelstudie</InlineLink> en bij de{" "}
            <InlineLink href="/bijbelstudie/methoden">zes bijbelstudiemethoden</InlineLink>.
          </p>
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
    `${FREE_AI_DAILY_CAP} vragen per dag aan de AI-assistent`,
    `Markeringen, en ${FREE_NOTE_LIMIT} notities bij verzen`,
    "Meedoen met studiegroepen",
    "Historische context per hoofdstuk",
    "Voortgang bijhouden",
  ]
  const pro = [
    "Alles in het gratis plan",
    `${PRO_AI_DAILY_CAP} AI-vragen per dag, i.p.v. ${FREE_AI_DAILY_CAP}`,
    "Onbeperkt notities, op de website en in de app",
    "Matthew Henry commentaar (NL)",
    "Calvijn en Dachsel",
    "Grondtekst: Hebreeuws en Grieks bij elk vers",
    "Voorlezen met natuurlijke stemmen",
    "Zoveel studiegroepen leiden als je wilt",
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
                className="flex h-full flex-col rounded-2xl border p-8 max-md:p-6"
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
                  className="press block rounded-xl border py-3 text-center text-sm font-semibold transition-colors hover:bg-sunken"
                  style={{ borderColor: T.border, color: T.text }}>
                  Gratis beginnen
                </Link>
              </div>
            </FadeUp>

            <FadeUp className="h-full">
              <div
                className="relative flex h-full flex-col overflow-hidden rounded-2xl p-8 max-md:p-6"
                style={{
                  backgroundColor: T.sidebar,
                  boxShadow: "0 24px 48px -24px rgba(15,23,42,0.45)",
                }}
              >
                <div aria-hidden className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
                  style={{ background: `radial-gradient(circle, ${T.teal}, transparent)`, transform: "translate(30%, -30%)" }} />
                <div className="absolute -top-px left-8 max-md:left-6">
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

          <FadeUp className="mt-8 text-center">
            <p className="text-sm leading-relaxed text-pretty" style={{ color: T.muted }}>
              Wat u zonder abonnement kunt gebruiken, hier en elders, staat op een rij in{" "}
              <InlineLink href="/bijbelstudie/gratis">gratis bijbelstudie</InlineLink>.
            </p>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ ────────────────────────────────────────────────────── */
function FAQ() {
  return (
    <section id="faq" className={`${SECTION_Y} scroll-mt-16`} style={{ backgroundColor: T.page, ...EDGE }}>
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
              Staat uw vraag er niet bij? Kijk in het{" "}
              <InlineLink href="/help">helpcentrum</InlineLink> of{" "}
              <InlineLink href="/contact">neem contact op</InlineLink>.
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
              {/* Plain eyebrow, matching every other section label on the page
                  (SectionHeader, LibraryGroup) - no pill background, no dot.
                  The rounded chip-with-bullet-dot treatment this replaced was
                  the only badge like it on the page and read as a marketing
                  gimmick rather than as this site's own design language. */}
              <p className="text-[0.6875rem] font-bold uppercase" style={{ color: T.tealText, letterSpacing: "0.16em" }}>
                Begin vandaag nog
              </p>

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
                <Link href="#faq"
                  className="press inline-flex items-center justify-center gap-2 rounded-xl border bg-surface px-8 py-3.5 font-semibold transition-colors hover:bg-sunken"
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


/* ─── Page ───────────────────────────────────────────────────── */
export default function LandingPage({ reviews }: { reviews?: ReviewsData }) {
  return (
    <div className={`relative min-h-screen ${LP_THEME_VARS}`} style={{ backgroundColor: T.page }}>
      {/* The header's stuck state is "is this pixel still on screen". A
          sentinel answers that with an observer instead of a scroll listener
          running a React state update on every frame. */}
      <div id="landing-top-sentinel" aria-hidden className="absolute left-0 top-0 h-px w-px" />
      <LandingSeenMarker />
      <ScrollEffects />
      <PromoBanner />
      <Navbar />
      <main>
        <Hero reviews={reviews} />
        <StudyFlowSection />
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
