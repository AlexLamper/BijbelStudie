"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import { ModeToggle } from "../dark-mode-toggle"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="border-b border-border bg-white/90 dark:bg-background/95 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/favicon.ico"
              alt="BijbelStudie"
              width={28}
              height={28}
              className="rounded-md"
              priority
            />
            <span className="font-bold text-lg text-foreground tracking-tight">BijbelStudie</span>
          </Link>

          {/* Centered nav */}
          <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-8">
            {[
              { href: "#features", label: "Functies" },
              { href: "#about", label: "Over ons" },
              { href: "#faq", label: "FAQ" },
              { href: "#pricing", label: "Prijzen" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
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
              <Link href="/auth/signin">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground px-5">
                  Inloggen
                </Button>
              </Link>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden px-2"
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
              {[
                { href: "#about", label: "Over ons" },
                { href: "#features", label: "Functies" },
                { href: "#pricing", label: "Prijzen" },
                { href: "#faq", label: "FAQ" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-sm text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border">
                <Link href="/auth/signin">
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
