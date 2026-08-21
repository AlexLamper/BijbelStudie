"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Home } from "lucide-react"
import "./globals.css"

export default function NotFound() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#F9FAFB", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="w-full max-w-md text-center space-y-8">

        {/* Icon */}
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: "rgba(13,148,136,0.08)" }}
        >
          <BookOpen className="h-8 w-8" style={{ color: "#0D9488" }} />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#0D9488" }}
          >
            404
          </p>
          <h1
            className="text-2xl font-extrabold"
            style={{ color: "#111827" }}
          >
            Pagina niet gevonden
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "#6B7280" }}
          >
            De pagina die je zoekt bestaat niet of is verplaatst.
            Hieronder staan een paar plekken om verder te gaan.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              border: "1px solid #E5E7EB",
              backgroundColor: "#FFFFFF",
              color: "#374151",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F3F4F6")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
          >
            <ArrowLeft className="h-4 w-4" />
            Ga terug
          </button>

          {/* Home, not /dashboard: an anonymous visitor who lands on a 404 gets
              bounced straight back by the middleware if we send them into a
              protected route. */}
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#0D9488" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = "#0F766E")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = "#0D9488")}
          >
            <Home className="h-4 w-4" />
            Naar de homepage
          </Link>
        </div>

        {/* Publicly reachable landing spots, so a 404 still has somewhere to
            send both a visitor and a crawler. */}
        <nav aria-label="Suggesties" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
          {[
            { href: "/bijbelstudie", label: "Gids bijbelstudie" },
            { href: "/bijbelboeken", label: "De 66 bijbelboeken" },
            { href: "/studies", label: "Begeleide studies" },
            { href: "/hulpbronnen", label: "Bibliotheek" },
            { href: "/help", label: "Help" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{ color: "#0D9488", fontWeight: 600 }}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
