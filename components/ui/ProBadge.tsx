import { cn } from "../../lib/utils"

/**
 * The three sizes the call sites actually need, smallest first.
 *
 * `md` is deliberately identical to the PRO ACTIEF badge in the Abonnement card
 * on /profiel (11 px / 700 / ls 0.8 / padding 6-13), so the shared badge and the
 * one the profile page draws inline are the same object and not two cousins.
 * Nothing drops below 10 px - TOKENS.md says "Niets onder 10 px. Ook badges
 * niet.", and the old `xs` was 9 px, which is why one call site was already
 * overriding it back up to 10.
 */
const SIZES = {
  xs: "px-[7px] py-[2px] text-[10px] tracking-[0.7px]",
  sm: "px-[9px] py-[3px] text-[10.5px] tracking-[0.8px]",
  md: "px-[13px] py-[6px] text-[11px] tracking-[0.8px]",
} as const

export type ProBadgeSize = keyof typeof SIZES

/**
 * The one Pro badge in the web app.
 *
 * A small struck plate, not a decoration: gold is the single warm accent this
 * slate-and-teal system allows, so it is spent on a mark the size of a word.
 *
 * Three things do the work, and none of them is an icon (a crown or a sparkle
 * would identify nothing - this project only ships icons that name a control or
 * a data type). The plate is `--grad-pro-badge`, a top-down metal ramp rather
 * than a flat mustard fill. The rim is `--pro-badge-border`, the same hue two
 * steps darker, which is what turns a coloured rectangle into an edge. The type
 * is `--gold-ink`, never white: white on gold measures 2.6:1, and gold-ink
 * holds 4.75:1 even on the darkest stop of the ramp.
 *
 * Dark ink on a light plate is also what lets one badge work on every ground it
 * lands on - the dark hero on /abonnement and the dark cards in /hulpbronnen and
 * /admin as readily as the white upsell card in the sidebar - so it still needs
 * no `dark:` variant, for a better reason than the old one.
 */
export function ProBadge({
  size = "sm",
  label = "Pro",
  className,
}: {
  size?: ProBadgeSize
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold uppercase whitespace-nowrap",
        SIZES[size],
        className,
      )}
      style={{
        backgroundImage: "var(--grad-pro-badge)",
        borderColor: "var(--pro-badge-border)",
        color: "var(--gold-ink)",
        // The one shadow this mark gets, matched to the Abonnement badge. Just
        // enough to sit on the page rather than be printed on it; TOKENS.md
        // keeps real elevation for the FAB and the streak badge.
        boxShadow: "0 1px 2px rgba(74,53,6,.12)",
      }}
    >
      {label}
    </span>
  )
}

export default ProBadge
