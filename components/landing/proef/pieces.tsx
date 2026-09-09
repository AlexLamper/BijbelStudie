/**
 * The small parts the /proeflanding experiment is assembled from.
 *
 * Same rule as the dashboard candidate this page takes its language from
 * (components/dashboard/scene/pieces.tsx): everything here is drawn to
 * sit ON a landscape, so every colour is a literal white or black and never a
 * theme token. A token flips with the visitor's theme; the thing underneath
 * these is a picture, and it does not.
 *
 * No "use client" - nothing in this file holds state, so it renders on the
 * server and the marketing copy inside it is in the served HTML.
 */

/**
 * The element whose visibility decides whether the live canvas runs behind the
 * page. The hero carries it; SceneBackdrop looks it up by id, the way
 * components/landing/ScrollEffects.tsx already looks up its own sentinel.
 */
export const HERO_GATE_ID = "proefland-scene-gate"

/** Brand teal, hardcoded. Fills that carry no type: bars, dots, rings. */
export const TEAL = "#0D9488"
/**
 * The brand one step down, for a solid button that carries white type. White on
 * #0D9488 measures 3.74:1 and does not clear 4.5:1 at button-label size; on
 * #0F766E it measures 5.5:1. This is the same value the live landing page's
 * buttons already use (`bg-teal-700`), so nothing about the brand shifts.
 */
export const TEAL_DEEP = "#0F766E"
/** The same brand on a dark ground, as the dashboard's dark branch uses it. */
export const TEAL_ON_DARK = "#2DD4BF"

/**
 * The container the reading sections sit in, matching the live landing page's
 * shell exactly so the two pages are comparable side by side. Below the fold a
 * measure is a kindness; above it, it is a box.
 */
export const SHELL = "mx-auto w-full max-w-6xl xl:max-w-[76rem] px-5 sm:px-6 lg:px-8"

/**
 * The full-bleed gutter, for the two things that must run edge to edge: the
 * navbar and the first screen. No `max-width` and no `mx-auto` - the copy is
 * capped at its own reading measure and anchored to the left scrim instead, so
 * a wide monitor gets more landscape rather than more margin. The navbar shares
 * it so the wordmark lines up with the headline underneath it.
 */
export const EDGE_X = "px-5 sm:px-8 lg:px-14 xl:px-20"

/** One vertical rhythm for every section below the fold. */
export const SECTION_Y = "py-[clamp(3.5rem,6vw,6rem)]"

export const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80"

/**
 * A working panel: dark enough to read a paragraph on, translucent enough that
 * the landscape is still visibly the thing underneath.
 *
 * The promoted dashboard has since unified its panel with its tile at
 * `bg-black/40`. That holds there, where a panel carries a label and a number;
 * this page's panels carry a ledger of eight sources, a plan comparison and a
 * twelve-question accordion, and the veil that protects them is 0 for a
 * reduced-motion visitor by design (see useSceneScroll). At black/80 the copy
 * clears 12:1 no matter what is behind it. If the lighter glass is wanted here
 * too, this one line is the whole change: `PANEL = TILE`.
 */
export const PANEL = "rounded-2xl bg-black/80 ring-1 ring-white/10 backdrop-blur-md"

/** Smoked glass, for the figures that break the fold. A frosted *white* tile
 *  over a bright horizon measures around 2.8:1 for white type; turning the same
 *  tile dark keeps the landscape running through it and puts the figures back
 *  above 4.5:1. */
export const TILE = "rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md"

/**
 * The light plate.
 *
 * The two live demos on this page (the lesson player and the growth demo) are
 * the product itself, and both are drawn for a white page: their captions,
 * sliders and chips are #4B5563 on white and would fail outright on a dark
 * panel. Rather than fork them, they are laid on the scene as lit objects -
 * the same move the accepted dashboard makes with the daily-verse card. It also
 * puts the two things that prove the product works in the only light surfaces
 * on the page, which is where the eye goes first.
 */
export const PLATE =
  "rounded-3xl bg-[#F9FAFB] ring-1 ring-black/5 shadow-[0_40px_80px_-32px_rgba(0,0,0,0.85)]"

export const TYPE = {
  h1: "clamp(2.25rem, 1.35rem + 2.6vw, 4rem)",
  h2: "clamp(1.75rem, 1.15rem + 1.5vw, 2.5rem)",
  lead: "clamp(1rem, 0.95rem + 0.25vw, 1.1875rem)",
}

/* ── Scrims ───────────────────────────────────────────────────── */

/**
 * A literal scrim behind a block of copy that sits directly on the scene.
 *
 * Never a theme token and never a colour picked to look right on this
 * particular sky. It is sized against the worst case there is - a pure white
 * pixel underneath - and the copy only ever sits in the inner half of it, where
 * it is 82% to 68% black. Measured there against white: white type clears 12:1,
 * white/90 body copy 6:1, and the teal eyebrow (#2DD4BF, the lightest thing on
 * it) 4.8:1. Over this page's actual dusk sky every one of those roughly
 * doubles, and over a midnight one it is not close. The gradient is wide and
 * soft so that margin costs a wash of depth rather than a dark rectangle.
 *
 * `inset-x-0` on purpose: a negative horizontal inset would push past the
 * page's gutter on a phone and give the document a horizontal scrollbar.
 */
export function Scrim({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 -top-10 -bottom-8 ${className}`}
      style={{
        background:
          "radial-gradient(75% 140% at 50% 50%, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.68) 45%, rgba(0,0,0,0.34) 75%, rgba(0,0,0,0) 100%)",
      }}
    />
  )
}

/* ── A section's heading block ────────────────────────────────── */

/**
 * Eyebrow, heading and one line of subtitle, on their own scrim.
 *
 * The heading is always an h2 - the page has exactly one h1, in the hero - and
 * always carries the id the section labels itself by, so no section is ever an
 * unlabelled region.
 */
export function SectionHead({
  id,
  label,
  title,
  subtitle,
}: {
  id: string
  label: string
  title: React.ReactNode
  subtitle?: string
}) {
  return (
    <div className="relative mx-auto mb-[clamp(2rem,3.5vw,3.25rem)] max-w-2xl text-center">
      <Scrim />
      <div className="relative">
        <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
          {label}
        </p>
        <h2
          id={id}
          className="mt-3 font-semibold tracking-tight text-white"
          style={{ fontSize: TYPE.h2, lineHeight: 1.12, letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mt-4 text-pretty text-white/90"
            style={{ fontSize: TYPE.lead, lineHeight: 1.65 }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

/* ── The figures on the horizon ───────────────────────────────── */

export function GlassStat({
  value,
  label,
}: {
  value: React.ReactNode
  label: string
}) {
  // `flex-col-reverse`, not a repeated label: the figure reads first and the
  // words sit under it, while the DOM keeps the term before its description so
  // a screen reader still gets them in the order the markup promises. One
  // wrapping div per pair is exactly what a `dl` allows; a second would not be.
  return (
    <div className={`flex flex-col-reverse px-4 py-4 shadow-lg shadow-black/30 sm:px-5 ${TILE}`}>
      <dt className="mt-2 text-xs leading-snug text-white/75">{label}</dt>
      <dd className="text-2xl font-semibold leading-none tabular-nums text-white xl:text-3xl">
        {value}
      </dd>
    </div>
  )
}

/* ── Calls to action ──────────────────────────────────────────── */

/**
 * The primary action on the scene: white, because white on a photograph is the
 * only fill that is guaranteed to separate from whatever is behind it. The
 * focus ring is brand teal, which reads against the white pill.
 */
export const CTA_PRIMARY =
  "press group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-gray-900 no-underline shadow-xl shadow-black/40 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 focus-visible:ring-offset-black"

/** The same action inside a panel, where the brand fill has a dark ground to
 *  sit on. Callers set `backgroundColor: TEAL_DEEP`; the hover is teal-800. The
 *  ring flips to white, which is the only thing that reads on the fill. */
export const CTA_BRAND =
  "press inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white"

/** A quiet second action: type only, underlined on hover, with a real focus
 *  ring rather than a removed outline. */
export const CTA_QUIET =
  "inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-white/85 no-underline underline-offset-4 outline-none transition-colors hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white"
