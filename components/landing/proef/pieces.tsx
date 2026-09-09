import {
  CTA_BRAND as SCENE_CTA_BRAND,
  CTA_PRIMARY as SCENE_CTA_PRIMARY,
  CTA_QUIET as SCENE_CTA_QUIET,
  PANEL as SCENE_PANEL,
  SCENE_X_EDGE,
  SECTION_Y as SCENE_SECTION_Y,
  TEAL as SCENE_TEAL,
  TEAL_DEEP as SCENE_TEAL_DEEP,
  TEAL_ON_DARK as SCENE_TEAL_ON_DARK,
  TILE as SCENE_TILE,
} from "../../scene/tokens"

/**
 * The small parts the /proeflanding experiment is assembled from.
 *
 * The colours, the surfaces and the calls to action are not defined here any
 * more: they come from components/scene/tokens.ts, where the scene design
 * system lives. This file re-exports them under the names the page already
 * uses, so there is one import site to fix if that vocabulary moves, and adds
 * only what is genuinely local to a marketing page - the scrim, the section
 * heading and the figures on the horizon.
 *
 * The rule those tokens encode still governs everything here: every surface on
 * this page sits ON a landscape, so every colour is a literal white or black
 * and never a theme token. A token flips with the visitor's light/dark setting;
 * the picture underneath does not.
 *
 * No "use client" - nothing in this file holds state, so it renders on the
 * server and the marketing copy inside it is in the served HTML. tokens.ts is
 * plain strings with no imports of its own, so reading from it pulls no client
 * module into this graph.
 */

export const TEAL = SCENE_TEAL
export const TEAL_DEEP = SCENE_TEAL_DEEP
export const TEAL_ON_DARK = SCENE_TEAL_ON_DARK

/**
 * One surface for everything below the hero: `bg-black/40` behind a blur, the
 * dashboard's tile unchanged.
 *
 * The page used to carry two more. A `bg-black/80` panel for the long ledgers,
 * and a light `#F9FAFB` plate under the two demos that are drawn for a white
 * page. Both are gone: a light rectangle laid over a night landscape reads as a
 * hole punched in the picture, and the content that needed the heavier panel -
 * an eight-row library, a plan matrix, a twelve-question accordion - is not on
 * the page any more either.
 */
export const PANEL = SCENE_PANEL
export const TILE = SCENE_TILE

/** One vertical rhythm for every section below the fold. */
export const SECTION_Y = SCENE_SECTION_Y

/**
 * The full-bleed gutter, for the two things that run edge to edge: the navbar
 * and the first screen. No `max-width` and no `mx-auto` - the copy is capped at
 * its own reading measure and anchored to the left scrim instead, so a wide
 * monitor gets more landscape rather than more margin.
 */
export const EDGE_X = SCENE_X_EDGE

export const CTA_PRIMARY = SCENE_CTA_PRIMARY
export const CTA_BRAND = SCENE_CTA_BRAND
export const CTA_QUIET = SCENE_CTA_QUIET

/**
 * The element whose visibility decides whether the live canvas runs behind the
 * page. The hero carries it; SceneBackdrop looks it up by id, the way
 * components/landing/ScrollEffects.tsx already looks up its own sentinel.
 */
export const HERO_GATE_ID = "proefland-scene-gate"

/**
 * The container the sections below the hero sit in.
 *
 * Narrower than the live landing page's shell on purpose: there is no ledger
 * and no three-column carousel left to carry, and four short sections read
 * better at one measure than spread across a wide monitor.
 */
export const SHELL = "mx-auto w-full max-w-5xl px-5 sm:px-6 lg:px-8"

/**
 * The eyebrow, one step brighter than the scene system's default.
 *
 * The dashboard's eyebrows sit inside a panel; every eyebrow on this page sits
 * on the picture itself, on a scrim, where `text-white/60` is thin.
 */
export const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80"

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
