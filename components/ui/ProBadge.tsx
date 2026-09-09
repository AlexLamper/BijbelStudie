import { cn } from "../../lib/utils"

/** The three sizes the call sites actually need, smallest first. */
const SIZES = {
  xs: "px-1.5 py-0.5 text-[9px]",
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-[11px]",
} as const

export type ProBadgeSize = keyof typeof SIZES

/**
 * The one Pro badge in the web app.
 *
 * Gold, and specifically the gradient of the gouden ring in
 * `lib/levensboom/ring.ts` (#F6D77A → #B8860B), so a Pro label and a Pro
 * cosmetic read as the same thing. It carries no `dark:` variant on purpose:
 * white on gold holds up on both the light and the dark surface, where a teal
 * pill needed a separate dark tint. No icon either - this is an identity
 * label, not a control.
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
        "inline-flex items-center rounded-full font-bold uppercase tracking-wide text-white whitespace-nowrap",
        SIZES[size],
        className,
      )}
      style={{ background: "linear-gradient(135deg, #F6D77A, #B8860B)" }}
    >
      {label}
    </span>
  )
}

export default ProBadge
