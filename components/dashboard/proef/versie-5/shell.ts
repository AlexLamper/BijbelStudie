/**
 * Shared measurements and tokens for ontwerp 5 - "Geen rail".
 *
 * The candidate has no sidebar, so nothing holds the left edge for it. What
 * replaces the rail as the thing that keeps the page from drifting is a single
 * centred measure: the navigation belt, the greeting and the two-panel slab all
 * sit in the same container, so they share one left edge and one right edge and
 * the landscape shows through in equal margins on both sides.
 *
 * Plain constants, no client code, so every piece of the candidate can import
 * them without dragging a component along.
 */

export const TEAL = "#0D9488"
export const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
export const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em]"

/** The one measure. Everything on the page is inside this, nothing outside it. */
export const SHELL = "mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-12 xl:px-16"

/**
 * The composition's surface: a literal white (or a literal near-black at
 * night), never a theme token. It is laid over a live sky that can be noon or
 * midnight, so its own opacity - not the theme - has to be what the text
 * inside it is read against. 90% plus a heavy blur leaves the landscape as a
 * tint of the room rather than as a competitor to the words.
 */
export const SLAB =
  "rounded-3xl border border-white/50 bg-white/90 shadow-2xl shadow-black/25 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0A1120]/90"

/** Focus ring for controls on the page surface. */
export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0A1120]"

/** Focus ring for controls that sit directly on the sky. */
export const FOCUS_ON_SCENE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"

export const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")

/** The live dashboard's five-step heat scale for the 66 books, kept verbatim. */
export function progressColor(ratio: number): string {
  if (ratio === 0) return "var(--progress-empty)"
  if (ratio < 0.25) return "rgba(13,148,136,0.22)"
  if (ratio < 0.5) return "rgba(13,148,136,0.45)"
  if (ratio < 1) return "rgba(13,148,136,0.72)"
  return TEAL
}
