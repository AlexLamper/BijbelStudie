"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

/**
 * Hop between the dashboard designs under review. Text links only, so it never
 * competes with the page it sits on; the design being viewed is bold and teal.
 * At ten candidates the names no longer fit on one line, so the links are
 * numbers and the name is the tooltip. Remove together with the
 * /dashboard/versie-* routes once a direction is chosen.
 */
const VARIANTS = [
  { href: "/dashboard", label: "Huidig", name: "Het huidige dashboard" },
  { href: "/dashboard/versie-1", label: "1", name: "Vandaag - leeskamer, één kolom" },
  { href: "/dashboard/versie-2", label: "2", name: "Overzicht - werkbank, bento-raster" },
  { href: "/dashboard/versie-3", label: "3", name: "Reis - pad vooruit, boeken als weg" },
  { href: "/dashboard/versie-4", label: "4", name: "Kaarten - mobiel eerst, grote kaarten" },
  { href: "/dashboard/versie-5", label: "5", name: "Week - de zeven dagen als kalender" },
  { href: "/dashboard/versie-6", label: "6", name: "Boekenplank - 66 boeken als ruggen" },
  { href: "/dashboard/versie-7", label: "7", name: "Krant - ochtendblad met kolommen" },
  { href: "/dashboard/versie-8", label: "8", name: "Paneel - donkere band met meters" },
  { href: "/dashboard/versie-9", label: "9", name: "Rust - één handeling, verder niets" },
  { href: "/dashboard/versie-10", label: "10", name: "Tweeluik - vast linkerpaneel" },
]

export default function VariantSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Dashboardontwerpen"
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs leading-none ${className}`}
    >
      <span className="text-muted-foreground">Ontwerp</span>
      {VARIANTS.map(variant => {
        const current = pathname === variant.href
        return (
          <Link
            key={variant.href}
            href={variant.href}
            title={variant.name}
            aria-current={current ? "page" : undefined}
            className={
              current
                ? "font-bold text-[#0D9488] no-underline dark:text-teal-400"
                : "text-muted-foreground no-underline transition-colors hover:text-foreground"
            }
          >
            {variant.label}
            <span className="sr-only"> — {variant.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
