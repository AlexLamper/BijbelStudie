"use client"

import Link from "next/link"
import { Button } from "../../components/ui/button"
import { ArrowRight, BookOpen, Users, BarChart2 } from "lucide-react"

function BibleIllustration() {
  return (
    <svg viewBox="0 0 480 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Background glow */}
      <ellipse cx="240" cy="200" rx="200" ry="170" fill="url(#glow)" opacity="0.15" />

      {/* Open book base */}
      <rect x="80" y="160" width="320" height="180" rx="4" fill="url(#bookBase)" />

      {/* Left page */}
      <rect x="82" y="162" width="156" height="176" rx="3" fill="#EFF6FF" />
      {/* Left page lines */}
      {[180, 196, 212, 228, 244, 260, 276, 292, 308].map((y, i) => (
        <rect key={i} x="102" y={y} width={i % 3 === 2 ? 80 : 116} height="3" rx="1.5" fill="#BFDBFE" />
      ))}
      {/* Left page small cross decoration */}
      <rect x="126" y="172" width="3" height="12" rx="1.5" fill="#3B82F6" opacity="0.6" />
      <rect x="121" y="177" width="13" height="3" rx="1.5" fill="#3B82F6" opacity="0.6" />

      {/* Right page */}
      <rect x="242" y="162" width="156" height="176" rx="3" fill="#EFF6FF" />
      {/* Right page lines */}
      {[180, 196, 212, 228, 244, 260, 276, 292, 308].map((y, i) => (
        <rect key={i} x="262" y={y} width={i % 3 === 0 ? 76 : 116} height="3" rx="1.5" fill="#BFDBFE" />
      ))}

      {/* Book spine */}
      <rect x="236" y="162" width="8" height="176" fill="#DBEAFE" />
      <line x1="240" y1="162" x2="240" y2="338" stroke="#93C5FD" strokeWidth="1" />

      {/* Book cover shadow bottom */}
      <rect x="90" y="336" width="300" height="8" rx="4" fill="url(#bookShadow)" opacity="0.3" />

      {/* Floating badge: Scripture */}
      <g filter="url(#shadow1)">
        <rect x="36" y="120" width="120" height="44" rx="8" fill="white" />
        <rect x="36" y="120" width="120" height="44" rx="8" stroke="#DBEAFE" strokeWidth="1" />
        <rect x="52" y="134" width="20" height="20" rx="5" fill="#EFF6FF" />
        <rect x="58" y="140" width="3" height="8" rx="1.5" fill="#3B82F6" />
        <rect x="54" y="143" width="11" height="3" rx="1.5" fill="#3B82F6" />
        <text x="80" y="140" fontFamily="system-ui" fontSize="9" fontWeight="600" fill="#1D4ED8">Bijbellezen</text>
        <text x="80" y="153" fontFamily="system-ui" fontSize="8" fill="#64748B">Dagelijks vers</text>
      </g>

      {/* Floating badge: Progress */}
      <g filter="url(#shadow2)">
        <rect x="324" y="100" width="130" height="48" rx="8" fill="white" />
        <rect x="324" y="100" width="130" height="48" rx="8" stroke="#DBEAFE" strokeWidth="1" />
        <rect x="340" y="113" width="20" height="20" rx="5" fill="#EFF6FF" />
        {/* Mini bar chart */}
        <rect x="345" y="127" width="4" height="4" rx="1" fill="#3B82F6" />
        <rect x="351" y="122" width="4" height="9" rx="1" fill="#3B82F6" />
        <rect x="357" y="118" width="4" height="13" rx="1" fill="#3B82F6" />
        <text x="369" y="122" fontFamily="system-ui" fontSize="9" fontWeight="600" fill="#1D4ED8">Voortgang</text>
        <text x="369" y="135" fontFamily="system-ui" fontSize="8" fill="#64748B">7 dagen streak 🔥</text>
        {/* Progress bar */}
        <rect x="340" y="140" width="100" height="4" rx="2" fill="#EFF6FF" />
        <rect x="340" y="140" width="70" height="4" rx="2" fill="#3B82F6" />
      </g>

      {/* Floating badge: Notes */}
      <g filter="url(#shadow3)">
        <rect x="140" y="62" width="120" height="40" rx="8" fill="white" />
        <rect x="140" y="62" width="120" height="40" rx="8" stroke="#DBEAFE" strokeWidth="1" />
        <circle cx="158" cy="82" r="10" fill="#EFF6FF" />
        <text x="172" y="78" fontFamily="system-ui" fontSize="9" fontWeight="600" fill="#1D4ED8">Notities</text>
        <text x="172" y="91" fontFamily="system-ui" fontSize="8" fill="#64748B">12 aantekeningen</text>
      </g>

      {/* Floating dots decoration */}
      <circle cx="60" cy="260" r="6" fill="#BFDBFE" />
      <circle cx="420" cy="300" r="8" fill="#BFDBFE" />
      <circle cx="400" cy="160" r="5" fill="#93C5FD" />
      <circle cx="80" cy="340" r="4" fill="#DBEAFE" />

      {/* Gradient definitions */}
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bookBase" x1="80" y1="160" x2="400" y2="340" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="bookShadow" x1="90" y1="336" x2="390" y2="344" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#1D4ED8" stopOpacity="0" />
        </linearGradient>
        <filter id="shadow1" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1D4ED8" floodOpacity="0.12" />
        </filter>
        <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1D4ED8" floodOpacity="0.12" />
        </filter>
        <filter id="shadow3" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1D4ED8" floodOpacity="0.12" />
        </filter>
      </defs>
    </svg>
  )
}

const STATS = [
  { icon: BookOpen, label: "Bijbelboeken", value: "66" },
  { icon: BarChart2, label: "Studiemethoden", value: "4" },
  { icon: Users, label: "Gebruikers", value: "500+" },
]

export function HeroSection() {
  return (
    <section className="relative bg-white dark:bg-background overflow-hidden">
      {/* Subtle blue gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 dark:from-background dark:via-background dark:to-background pointer-events-none" />

      <div className="relative container mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-64px)] py-16 lg:py-24">

          {/* Left: Content */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
              Online Bijbelstudie Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
              Bestudeer de{" "}
              <span className="text-primary">Bijbel</span>{" "}
              op een nieuwe manier
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Interactieve bijbelstudie met commentaren, leesplannen en bewezen studiemethoden.
              Verdiep je kennis van Gods Woord — gratis te beginnen.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/auth/signin">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base font-semibold">
                  Gratis beginnen
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#about">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-base border-border hover:bg-secondary">
                  Meer weten
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 pt-2">
              {STATS.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Illustration */}
          <div className="order-1 lg:order-2 flex items-center justify-center">
            <div className="w-full max-w-md lg:max-w-none">
              <BibleIllustration />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
