"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import { LanguageSwitcher } from "../language-switcher"
import { ModeToggle } from "../dark-mode-toggle"
import { useTranslation } from "../../app/i18n/client"

export function Header() {
  const { t } = useTranslation("landing-navbar")
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="border-b border-gray-100/70 dark:border-border bg-white/70 dark:bg-background/90 backdrop-blur-md sticky top-0 z-50 shadow-sm dark:shadow-none">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 z-10">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative w-28 h-10 sm:w-32 sm:h-12">
                <Image
                  src="/images/logo-text.svg"
                  alt="BijbelStudie"
                  fill
                  className="object-contain rounded-md group-hover:scale-102 transition-transform dark:invert"
                />
              </div>
            </Link>
          </div>

          {/* Centered nav */}
          <nav className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-600 dark:text-muted-foreground hover:text-brand dark:hover:text-foreground transition-colors">
              {t("features")}
            </Link>
            <Link href="#about" className="text-gray-600 dark:text-muted-foreground hover:text-brand dark:hover:text-foreground transition-colors">
              {t("about")}
            </Link>
            <Link href="#faq" className="text-gray-600 dark:text-muted-foreground hover:text-brand dark:hover:text-foreground transition-colors">
              {t("faq")}
            </Link>
            <Link href="#pricing" className="text-gray-600 dark:text-muted-foreground hover:text-brand dark:hover:text-foreground transition-colors">
              {t("pricing")}
            </Link>
          </nav>

          {/* Right controls */}
          <div className="flex items-center space-x-3 z-10">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <LanguageSwitcher />
              <ModeToggle />
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <Link href={`/auth/signin`} className="hover:cursor-pointer">
                <Button size="sm" variant="dark" className="px-4 sm:px-6 text-xs sm:text-sm">
                  {t("signup")}
                </Button>
              </Link>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground px-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-border py-4 bg-white dark:bg-background">
            <nav className="flex flex-col space-y-3">
              <Link href="#about" className="text-gray-600 dark:text-muted-foreground dark:hover:text-foreground">
                {t("about")}
              </Link>
              <Link href="#features" className="text-gray-600 dark:text-muted-foreground dark:hover:text-foreground">
                {t("features")}
              </Link>
              <Link href="#testimonials" className="text-gray-600 dark:text-muted-foreground dark:hover:text-foreground">
                {t("testimonials")}
              </Link>
              <Link href="#pricing" className="text-gray-600 dark:text-muted-foreground dark:hover:text-foreground">
                {t("pricing")}
              </Link>
              <Link href="#faq" className="text-gray-600 dark:text-muted-foreground dark:hover:text-foreground">
                {t("faq")}
              </Link>
              <div className="flex flex-col space-y-2 pt-3 border-t border-gray-100 dark:border-border">
                <Link href={`/auth/signin`} className="hover:cursor-pointer">
                  <Button size="sm" variant="dark" className="px-6">
                    {t("login")}
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
