/**
 * The admin section's surfaces and status colours, in one file.
 *
 * The three admin screens sit in the same immersive shell as the dashboard, but
 * they carry something no other screen does: dense operational data. A revenue
 * figure, a Stripe status and a table of accounts have to be read exactly, and
 * a landscape running behind a table of accounts is actively hostile to that.
 *
 * So admin keeps the world and gives up the picture. `DATA_PANEL` is a
 * near-opaque plate in the shell's own ground colour (SCENE_BG): the scene is
 * still there at the edges of the page and behind the heading, but the moment
 * a figure or a row appears it sits on something the reader can trust. That is
 * a deliberate departure from PANEL/PANEL_DEEP in components/scene/tokens.ts,
 * which are tuned to let the landscape through - here it must not.
 *
 * Everything is a literal value for the same reason the scene tokens are: a
 * theme token flips with the reader's light/dark setting and the landscape does
 * not. The teal values are NOT restated here - import them from
 * components/scene/tokens.ts.
 *
 * `8, 26, 29` in the two plate values IS `SCENE_BG`. Tailwind reads class names
 * as literal text and never generates a class built from a constant, so this is
 * the one place the ground is written out - and it moves by hand the day
 * SCENE_BG moves.
 *
 * No imports and no "use client": plain strings.
 */

/* -- Surfaces -------------------------------------------------- */

/**
 * The working plate for a table, a chart or a block of figures. 92% of the
 * shell's ground: white type measures well over 12:1 on it against any sky, and
 * a hairline of the landscape still shows through the edges so the page has not
 * left the world it belongs to.
 */
export const DATA_PANEL =
  "rounded-2xl bg-[rgba(8,26,29,0.92)] ring-1 ring-white/15 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.9)]"

/**
 * The lighter plate, for a figure that only has to hold two lines - a KPI, a
 * counter. Still opaque enough that a number never sits on moving colour.
 */
export const DATA_TILE = "rounded-xl bg-[rgba(8,26,29,0.82)] ring-1 ring-white/15"

/**
 * An inset block INSIDE a DATA_PANEL - a mini stat, a webhook readout. A film
 * of white rather than a second plate, so a panel does not become a box of
 * boxes.
 */
export const DATA_INSET = "rounded-lg bg-white/[0.04] ring-1 ring-white/10"

/** A table header row on the plate. */
export const TABLE_HEAD =
  "text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55"

/** The hairline between two rows of data. */
export const ROW_LINE = "border-white/10"

/* -- Controls -------------------------------------------------- */

/**
 * A secondary control on the plate: refresh, a filter that is not active, a
 * link to another admin screen. Outlined rather than filled, so the one filled
 * control on a screen is the one that matters.
 */
export const ADMIN_BUTTON =
  "inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/40 px-3 py-2 text-xs font-medium text-white no-underline outline-none transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"

/**
 * The same control at chip size, for a row of filters. A separate constant
 * rather than ADMIN_BUTTON with the padding overridden: two padding utilities
 * on one element are resolved by the order Tailwind emits them, not by the
 * order they are written, so overriding is a coin toss.
 */
export const ADMIN_CHIP =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-black/40 px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white"

/** The chip in its selected state: the one filled thing in the row. */
export const ADMIN_CHIP_ACTIVE =
  "inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white"

/* -- Status colours on a dark ground ---------------------------- */

/*
 * The light-page palette this section used - #D97706, #16A34A, #DC2626, #0EA5E9
 * - is drawn for #4B5563-on-white and drops under 3:1 on a dark plate, which is
 * exactly the wrong place to lose a warning. These are the same hues one step
 * up, each measured to clear 4.5:1 on DATA_PANEL.
 */

/** Something needs attention but nothing is broken: "zegt op", a paused plan. */
export const WARN = "#FBBF24"

/** Something is wrong and costs money or access: a missed webhook, a mismatch. */
export const DANGER = "#F87171"

/** Confirmed good, money in: reconciled, entitled, revenue. */
export const GOOD = "#4ADE80"

/** A neutral second series in a chart, never a status. */
export const SERIES_SKY = "#38BDF8"

/** A neutral third series in a chart, never a status. */
export const SERIES_VIOLET = "#C4B5FD"
