"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

/**
 * Hop between the five dashboard candidates under /proefdashboard, and back to
 * the dashboard that is actually live.
 *
 * These sit over a full-bleed scene rather than on a white page, so unlike the
 * switcher this replaces, it takes a `tone`: `light` for a candidate whose
 * chrome is dark, `auto` for one that keeps the normal surface. Remove together
 * with app/proefdashboard once a direction is chosen.
 */

export const PROEF_VARIANTS = [
  { n: 1, name: "1" },
  { n: 2, name: "2" },
  { n: 3, name: "3" },
  { n: 4, name: "4" },
  { n: 5, name: "5" },
] as const

export default function ProefdashboardSwitcher({
  className = "",
  tone = "auto",
}: {
  className?: string
  /** `light` when the switcher sits on a dark scene rather than on the page. */
  tone?: "auto" | "light"
}) {
  const pathname = usePathname()

  const muted = tone === "light" ? "text-white/55" : "text-muted-foreground"
  const off =
    tone === "light"
      ? "text-white/70 hover:text-white"
      : "text-muted-foreground hover:text-foreground"
  const on = tone === "light" ? "font-bold text-white" : "font-bold text-[#0D9488] dark:text-teal-400"

  return (
    <nav
      aria-label="Dashboardontwerpen"
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs leading-none ${className}`}
    >
      <span className={muted}>Ontwerp</span>
      {PROEF_VARIANTS.map(variant => {
        const href = `/proefdashboard/versie-${variant.n}`
        const current = pathname === href
        return (
          <Link
            key={variant.n}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`no-underline transition-colors ${current ? on : off}`}
          >
            {variant.name}
            <span className="sr-only"> — ontwerp {variant.n}</span>
          </Link>
        )
      })}
      <Link href="/dashboard" className={`no-underline transition-colors ${off}`}>
        Huidig
      </Link>
    </nav>
  )
}
