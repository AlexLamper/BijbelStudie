/**
 * The admin section's surfaces, controls and status colours, in one file.
 *
 * The four admin screens sit in the same AppShell as /profiel, /instellingen and
 * /dashboard, and they are drawn from the same token names (ink, line, surface,
 * sunken - see tailwind.config.ts and app/globals.css). Those tokens flip with
 * the reader's light/dark setting, so nothing here needs a `dark:` variant of
 * its own except the status and series hues, which are literals and therefore
 * carry an explicit dark step (HUE_VARS).
 *
 * No imports and no "use client": plain strings.
 */

/* -- Surfaces -------------------------------------------------- */

/** A card: a table, a chart, a block of figures. Same as kit `Card`. */
export const PANEL = "rounded-card border border-line bg-surface"

/** An inset block INSIDE a panel - a mini stat, a webhook readout. */
export const INSET = "rounded-[10px] border border-line bg-sunken"

/** A table header cell's type. */
export const TABLE_HEAD =
  "text-left text-[10.5px] font-semibold uppercase tracking-[0.8px] text-ink-faint"

/** The hairline between two rows of data. */
export const ROW_LINE = "border-line-soft"

/** A card title inside a panel. */
export const CARD_TITLE = "text-[14.5px] font-bold text-ink"

/** The line of explanation under a card title. */
export const CARD_SUBTITLE = "mt-1 text-[12.5px] leading-relaxed text-ink-muted"

/* -- Controls -------------------------------------------------- */

/** A secondary control: refresh, export, a link to another admin screen. */
export const ADMIN_BUTTON =
  "inline-flex h-[34px] flex-none items-center justify-center gap-2 rounded-[9px] border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-body no-underline outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"

/** The one filled control on a screen. */
export const ADMIN_PRIMARY =
  "inline-flex h-[34px] flex-none items-center justify-center gap-2 rounded-[9px] bg-teal px-[14px] text-[12.5px] font-semibold text-white no-underline outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:opacity-50"

/** A select or text field, 34 px like the buttons beside it. */
export const ADMIN_FIELD =
  "h-[34px] rounded-[9px] border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-body outline-none transition-colors hover:border-line-strong focus-visible:border-teal disabled:opacity-60"

/** A segmented row of options (filters, the period switch) - as /instellingen. */
export const SEG_TRACK = "inline-flex max-w-full flex-wrap items-center gap-[2px] rounded-[9px] border border-line bg-surface p-[3px]"
export const SEG_ITEM =
  "flex h-[28px] items-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal"
export const SEG_ON = "bg-teal font-semibold text-white"
export const SEG_OFF = "text-ink-muted hover:bg-line-soft hover:text-ink-body"

/** The small back link above a sub-screen. */
export const BACK_LINK =
  "inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-muted no-underline transition-colors hover:text-ink"

/* -- Status and series colours ---------------------------------- */

/*
 * Literal hues cannot follow the token flip, so each is a custom property with
 * a light value (drawn for white) and a dark value (one step up the scale, so
 * it still clears 4.5:1 on the dark surface). Put HUE_VARS on the page's (or
 * card's) outer element; everything inside reads the variables.
 */
export const HUE_VARS =
  "[--ad-warn:#B45309] [--ad-danger:#DC2626] [--ad-good:#047857] [--ad-teal:#0D9488] [--ad-sky:#0284C7] [--ad-violet:#7C3AED] dark:[--ad-warn:#FBBF24] dark:[--ad-danger:#F87171] dark:[--ad-good:#34D399] dark:[--ad-teal:#2DD4BF] dark:[--ad-sky:#38BDF8] dark:[--ad-violet:#C4B5FD]"

/** Something needs attention but nothing is broken: "zegt op", a paused plan. */
export const WARN = "var(--ad-warn)"

/** Something is wrong and costs money or access: a missed webhook, a mismatch. */
export const DANGER = "var(--ad-danger)"

/** Confirmed good, money in: reconciled, entitled, revenue. */
export const GOOD = "var(--ad-good)"

/** The brand series in a chart. */
export const SERIES_TEAL = "var(--ad-teal)"

/** A neutral second series in a chart, never a status. */
export const SERIES_SKY = "var(--ad-sky)"

/** A neutral third series in a chart, never a status. */
export const SERIES_VIOLET = "var(--ad-violet)"

/** `color` at the given alpha, for a tinted ground behind that same hue. */
export const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`

/**
 * "Laatst actief" wording, shared by the users card on /beheer and the table on
 * /beheer/gebruikers so both read the same: minutes, hours, days, then a date.
 */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "nu"
  if (m < 60) return `${m} min geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} u geleden`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} dag${d === 1 ? "" : "en"} geleden`
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
}

/** Active "now" is anything inside the last day - the green dot next to "Laatst actief". */
export function isRecentlyActive(iso: string | null | undefined): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000
}
