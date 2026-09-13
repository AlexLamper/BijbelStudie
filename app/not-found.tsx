"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Home } from "lucide-react"
import "./globals.css"

export default function NotFound() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-sunken dark:bg-background"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="w-full max-w-md text-center space-y-8">

        {/* Icon */}
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto bg-[var(--teal-wash-2)]">
          <BookOpen className="h-8 w-8 text-teal dark:text-teal-400" />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-teal dark:text-teal-400">
            404
          </p>
          <h1 className="text-2xl font-extrabold text-ink">
            Pagina niet gevonden
          </h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            De pagina die je zoekt bestaat niet of is verplaatst.
            Hieronder staan een paar plekken om verder te gaan.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-line bg-surface text-ink-body hover:bg-line-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Ga terug
          </button>

          {/* Home, not /dashboard: an anonymous visitor who lands on a 404 gets
              bounced straight back by the middleware if we send them into a
              protected route. */}
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors bg-teal hover:bg-teal-dark"
          >
            <Home className="h-4 w-4" />
            Naar de homepage
          </Link>
        </div>

        {/* Publicly reachable landing spots, so a 404 still has somewhere to
            send both a visitor and a crawler. */}
        <nav aria-label="Suggesties" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
          {[
            { href: "/studies", label: "Begeleide studies" },
            { href: "/abonnement", label: "Prijzen" },
            { href: "/help", label: "Help" },
            { href: "/contact", label: "Contact" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="font-semibold text-teal dark:text-teal-400">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
