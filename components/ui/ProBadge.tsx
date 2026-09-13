import { cn } from "../../lib/utils"

/**
 * The three sizes the call sites actually need, smallest first.
 *
 * Nothing drops below 10 px - TOKENS.md says "Niets onder 10 px. Ook badges
 * niet."
 */
const SIZES = {
  xs: "px-[7px] py-[2px] text-[10px] tracking-[0.7px]",
  sm: "px-[9px] py-[3px] text-[10.5px] tracking-[0.8px]",
  md: "px-[12px] py-[5px] text-[11px] tracking-[0.9px]",
} as const

export type ProBadgeSize = keyof typeof SIZES

/**
 * `solid` - "Midnight": slate-900 plate, teal-200 type, teal hairline border.
 *           The default, and the one that works on every ground: white cards,
 *           the dark /abonnement hero, dark admin cards.
 * `soft`  - teal-faint plate, deep teal type, hairline teal border. For a Pro
 *           marker that stands in a row of quiet chips.
 */
const TONES = {
  solid: { backgroundColor: "#0F172A", borderColor: "rgba(45,212,191,.45)", color: "#99F6E4" },
  soft: { backgroundColor: "#F0FDFA", borderColor: "rgba(13,148,136,.32)", color: "#0F766E" },
} as const

export type ProBadgeTone = keyof typeof TONES

/**
 * The one Pro badge in the web app, and the same mark as the PRO pill on the
 * account avatar (components/kit/AccountAvatar).
 *
 * Slate-and-teal, no gold, no gradient, no glow, no icon: a compact small-caps
 * word is the whole mark. Teal-200 on slate-900 holds well above 4.5:1 for
 * these 10-11 px words. The soft tone's ink is #0F766E on #F0FDFA.
 */
export function ProBadge({
  size = "sm",
  tone = "solid",
  label = "Pro",
  className,
}: {
  size?: ProBadgeSize
  tone?: ProBadgeTone
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold uppercase leading-none whitespace-nowrap",
        SIZES[size],
        className,
      )}
      style={TONES[tone]}
    >
      {label}
    </span>
  )
}

export default ProBadge
