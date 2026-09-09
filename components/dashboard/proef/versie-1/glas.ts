import type { CSSProperties } from "react"

/**
 * The surface recipe for dashboard candidate 1, "Glas".
 *
 * Everything on this page floats on the reader's own landscape, so every colour
 * here is a literal white or black - never a theme token. The scene is drawn
 * from the reader's time of day, not from the app theme, so a token that flips
 * with light/dark mode would be right over half the scenes and invisible over
 * the other half.
 *
 * The glass is smoked rather than milky: a black tint under a blur, with a
 * white hairline along the top edge and a white border. Milky glass lightens
 * whatever is behind it, which over a noon sky pushes white text below a usable
 * contrast ratio; a black tint darkens the ground instead, so white text holds
 * over a noon sky and a midnight one alike.
 *
 * Three weights, in the order the eye should read them:
 *   PANEL  - the reader panel, the most present thing on the page
 *   CARD   - the work column's cards, one step lighter
 *   CHROME - the navigation rail, the most transparent of the three
 */

/** Brand teal, hardcoded. */
export const TEAL = "#0D9488"

/** The reader panel: the densest glass. */
export const GLASS_PANEL = "rounded-2xl border border-white/25 bg-black/35 backdrop-blur-2xl"
/** A card in the work column. */
export const GLASS_CARD = "rounded-2xl border border-white/15 bg-black/25 backdrop-blur-xl"
/** The rail and the switcher pill: barely there. */
export const GLASS_CHROME = "rounded-2xl border border-white/15 bg-black/20 backdrop-blur-xl"

/**
 * Box shadows live in `style` rather than in a class because each one carries
 * two layers - the inset hairline that makes the slab read as an edge of glass,
 * and the drop shadow that lifts it off the landscape. A Tailwind `shadow-*`
 * class would overwrite the inset half.
 */
export const PANEL_SHADOW: CSSProperties = {
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.20), 0 28px 64px -22px rgba(0,0,0,0.62)",
}
export const CARD_SHADOW: CSSProperties = {
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 20px 44px -20px rgba(0,0,0,0.55)",
}
export const CHROME_SHADOW: CSSProperties = {
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.13), 0 22px 52px -24px rgba(0,0,0,0.6)",
}

export const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70"
/** Every focusable thing on the glass gets the same ring. */
export const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85"

/**
 * A progress track is always black-tinted and the fill is always brand teal.
 *
 * The obvious choice - a white track with a teal fill - inverts over a dark
 * scrim: #0D9488 is less luminous than white at 15% over the same ground, so
 * the "filled" part would read as the empty part. Darkening the track keeps the
 * fill the brighter of the two on every scene.
 */
export const TRACK = "rgba(0,0,0,0.35)"

/**
 * One book's tile in the 66-book grid, coloured by the share of it already
 * read. Same five steps as the live dashboard, re-anchored for a dark ground:
 * an unread book is a hole punched in the glass, and the ramp climbs from a dim
 * teal to the full brand colour.
 */
export function heatColor(ratio: number): string {
  if (ratio <= 0) return "rgba(0,0,0,0.34)"
  if (ratio < 0.25) return "rgba(13,148,136,0.45)"
  if (ratio < 0.5) return "rgba(13,148,136,0.7)"
  if (ratio < 1) return "rgba(13,148,136,0.88)"
  return TEAL
}

/** The five steps above, for the "Minder … Meer" legend. */
export const HEAT_LEGEND = [0, 0.15, 0.37, 0.75, 1]

export function dayWord(n: number): string {
  return n === 1 ? "dag" : "dagen"
}
