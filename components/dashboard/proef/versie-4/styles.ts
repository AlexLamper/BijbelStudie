/**
 * The surface vocabulary of versie 4 - "Werkbank".
 *
 * Every colour here is a literal. The whole dashboard floats over the reader's
 * own scene, which can be a noon sky or a midnight one, so a theme token as a
 * background would be a coin flip: these panels carry their own contrast, in
 * both themes, over any weather. They are near-opaque on purpose - the
 * atmosphere is allowed to cost nothing in legibility.
 */

export const TEAL = "#0D9488"

/** Teal as text. The dark value is lifted so it still clears on a dark panel. */
export const TEAL_TEXT = "text-[#0D9488] dark:text-teal-300"

export const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"

/** The workbench surface: the numbers on it read exactly as fast as on a white page. */
export const PANEL =
  "rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_20px_45px_-32px_rgba(2,6,23,0.8)] dark:border-white/10 dark:bg-slate-950/85"

export const TEXT = "text-slate-900 dark:text-slate-100"
export const MUTED = "text-slate-500 dark:text-slate-400"
/** Border colour only - combine with `border-t`, `border-l-4`, … */
export const HAIRLINE = "border-slate-200/80 dark:border-white/10"
/** The same hairline for a `divide-y` list, where the colour lands on the children. */
export const DIVIDER = "divide-slate-200/80 dark:divide-white/10"
export const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
