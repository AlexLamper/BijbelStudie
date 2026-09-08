"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

/**
 * Hop between the dashboard designs under review. Text links only, so it
 * never competes with the page it sits on; the design being viewed is bold
 * and teal. Remove together with the /dashboard/versie-* routes once a
 * direction is chosen.
 */
const VARIANTS = [
  { href: "/dashboard", label: "Huidig" },
  { href: "/dashboard/versie-1", label: "Versie 1" },
  { href: "/dashboard/versie-2", label: "Versie 2" },
  { href: "/dashboard/versie-3", label: "Versie 3" },
]

export default function VariantSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Dashboardontwerpen"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-none ${className}`}
    >
      <span className="text-muted-foreground">Ontwerp</span>
      {VARIANTS.map(variant => {
        const current = pathname === variant.href
        return (
          <Link
            key={variant.href}
            href={variant.href}
            aria-current={current ? "page" : undefined}
            className={
              current
                ? "font-bold text-[#0D9488] no-underline dark:text-teal-400"
                : "text-muted-foreground no-underline transition-colors hover:text-foreground"
            }
          >
            {variant.label}
          </Link>
        )
      })}
    </nav>
  )
}
