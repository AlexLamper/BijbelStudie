"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { BrandIcon } from "../ui/BrandIcon"
import { ModeToggle } from "../dark-mode-toggle"

/**
 * The header of the public content pages (components/content/ContentShell.tsx:
 * /bijbelstudie and its guides, /bijbelboeken and the 66 book pages).
 *
 * Its links used to be "#features", "#about", "#faq" and "#pricing" - landing
 * page anchors, three of which never existed even there, and which on
 * /bijbelboeken/genesis resolved to /bijbelboeken/genesis#features: a menu
 * that went nowhere. It now does what a section header should: the two hubs
 * of the reading material the visitor is in, the studies, and the prices.
 *
 * The landing page's own navbar deliberately leaves the two hubs out (it sells
 * the product); this one is where they belong. No prefetch: the header is on
 * every content page, and a prefetched /studies is a server render per view.
 */
const NAV_LINKS = [
  { href: "/bijbelstudie", label: "Bijbelstudie" },
  { href: "/bijbelboeken", label: "Bijbelboeken" },
  { href: "/studies", label: "Studies" },
  { href: "/#prijzen", label: "Prijzen" },
]

/**
 * `frame` replaces the inner row's centred `container` with the caller's own
 * horizontal frame. ContentShell passes its full-width CONTENT_FRAME so the
 * logo lines up with the breadcrumbs and the page below it on a wide screen;
 * without it the header keeps the default container.
 */
export function Header({ frame }: { frame?: string } = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="border-b border-border bg-white/90 dark:bg-background/95 backdrop-blur-md sticky top-0 z-50">
      <div className={frame ?? "container mx-auto px-4 md:px-6 lg:px-8"}>
        <div className="relative flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <BrandIcon
              src="/images/icon-192.png"
              alt="BijbelStudie"
              size={28}
              className="rounded-md"
              priority
            />
            <span className="font-bold text-lg text-foreground tracking-tight">
              Bijbel<span style={{ color: "#0D9488" }}>Studie</span>
            </span>
          </Link>

          {/* Centered nav */}
          <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-6 lg:gap-8">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <ModeToggle />
            <div className="hidden sm:block">
              <Link href="/inloggen">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground px-5">
                  Inloggen
                </Button>
              </Link>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-10 w-10 px-2"
              aria-label="Menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border py-4 bg-white dark:bg-background">
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} prefetch={false} onClick={() => setIsMenuOpen(false)} className="flex min-h-10 items-center text-base text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border">
                <Link href="/inloggen">
                  <Button size="sm" className="bg-primary text-primary-foreground w-full">
                    Inloggen
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
