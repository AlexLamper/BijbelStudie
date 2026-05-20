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
            Ga terug naar het dashboard om verder te studeren.
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

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#0D9488" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = "#0F766E")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = "#0D9488")}
          >
            <Home className="h-4 w-4" />
            Naar dashboard
          </Link>
        </div>

        {/* Footer hint */}
        <p className="text-xs" style={{ color: "#9CA3AF" }}>
          Of ga direct naar{" "}
          <Link href="/study" style={{ color: "#0D9488", fontWeight: 600 }}>
            Bijbelstudie
          </Link>
        </p>
      </div>
    </div>
  )
}
