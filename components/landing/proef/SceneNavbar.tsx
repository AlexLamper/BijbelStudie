"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { EDGE_X, TEAL_DEEP } from "./pieces"

/**
 * The navigation, as part of the scene.
 *
 * components/landing/navbar.tsx is the reference for what is in it; it cannot
 * be reused as it stands, because it is a white bar with `bg-white/90`, theme
 * tokens for its type and a theme toggle - all three of which disappear on a
 * landscape. This is that bar rebuilt in the dashboard candidate's scene
 * variant: transparent, one white hairline, light type, and the picture running
 * straight through it. components/layout/header.tsx cannot be used either - it
 * returns null without a session, and a landing page has none.
 *
 * Destinations are the shipped landing page's, unchanged: the progress
 * section, the prices and the FAQ, with Inloggen and Gratis beginnen on the
 * right. Both calls to action point at /inloggen, exactly as they do today.
 *
 * Sticky rather than fixed, at h-14, so the hero's `min-h-[calc(100vh-3.5rem)]`
 * fills precisely the rest of the first screen.
 */

const LINKS = [
  { href: "#voortgang", label: "Voortgang" },
  { href: "#prijzen", label: "Prijzen" },
  { href: "#faq", label: "FAQ" },
]

export default function SceneNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-white/10 bg-transparent backdrop-blur-sm">
      <div className={`${EDGE_X} flex h-14 items-center justify-between gap-3 md:grid md:grid-cols-3`}>
        {/* The dark-mode wordmark: a light tile and light lettering, drawn for
            exactly this kind of ground. The light one vanishes on a dusk sky. */}
        <Link
          href="/proeflanding"
          className="flex flex-shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white md:justify-self-start"
          aria-label="BijbelStudie"
        >
          <Image
            src="/images/Logo-text-dark-mode.svg"
            alt="BijbelStudie"
            width={118}
            height={26}
            className="h-[26px] w-auto"
            priority
          />
        </Link>

        <nav aria-label="Hoofdnavigatie" className="hidden items-center justify-center gap-1 md:flex">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white/85 no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2 md:justify-self-end">
          <Link
            href="/inloggen"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/85 no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white sm:block"
          >
            Inloggen
          </Link>
          <Link
            href="/inloggen"
            data-track="proefland_nav_signup"
            className="press whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold text-white no-underline outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white"
            style={{ backgroundColor: TEAL_DEEP }}
          >
            Gratis beginnen
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="proefland-mobiel-menu"
            aria-label={open ? "Menu sluiten" : "Menu openen"}
            className="rounded-lg p-2 text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white md:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* The sheet is opaque black rather than a film of it: it lands on top of
          whatever part of the landscape happens to be under the bar. */}
      <div
        id="proefland-mobiel-menu"
        hidden={!open}
        className="border-b border-white/10 bg-black/90 backdrop-blur-md md:hidden"
      >
        <nav aria-label="Hoofdnavigatie, mobiel" className={`${EDGE_X} flex flex-col gap-1 py-3`}>
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/inloggen"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white sm:hidden"
          >
            Inloggen
          </Link>
        </nav>
      </div>
    </header>
  )
}
