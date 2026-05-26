"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen, BookMarked, StickyNote, Library,
  ArrowRight, Check, ChevronDown, Users, Shield,
  Lightbulb, BarChart2,
  Star, MessageSquare, ChevronLeft, ChevronRight,
  Flame, PenLine,
} from "lucide-react"
import { Footer } from "./footer"

/* ─── Design tokens ──────────────────────────────────────────── */
const T = {
  sidebar:  "#1F2937",
  teal:     "#0D9488",
  tealDark: "#0F766E",
  tealLight:"#CCFBF1",
  tealText: "#0F766E",
  bg:       "#F3F4F6",
  card:     "#FFFFFF",
  border:   "#E5E7EB",
  text:     "#111827",
  muted:    "#6B7280",
  light:    "#F9FAFB",
}

/* ─── Reusable animation primitives ─────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as const

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function SectionHeader({
  label,
  title,
  subtitle,
}: {
  label: string
  title: React.ReactNode
  subtitle?: string
}) {
  return (
    <div className="text-center mb-14 max-w-2xl mx-auto">
      <FadeUp>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: T.teal }}>
          {label}
        </p>
      </FadeUp>
      <FadeUp delay={0.08}>
        <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>
          {title}
        </h2>
      </FadeUp>
      {subtitle && (
        <FadeUp delay={0.16}>
          <p className="mt-4 text-base" style={{ color: T.muted }}>{subtitle}</p>
        </FadeUp>
      )}
    </div>
  )
}

/* ─── Bible Study Illustration — looks like an actual app screenshot ─── */
const HERO_VERSES = [
  { num: 1, text: "De HEERE is mijn Herder, mij zal niets ontbreken.",                                                                       highlight: false },
  { num: 2, text: "Hij doet mij nederliggen in grazige weiden; Hij voert mij zachtjes aan zeer stille wateren.",                            highlight: true  },
  { num: 3, text: "Hij verkwikt mijn ziel; Hij leidt mij in het spoor der gerechtigheid, om Zijns Naams wil.",                               highlight: false },
  { num: 4, text: "Al ging ik ook in een dal der schaduw des doods, ik zou geen kwaad vrezen, want Gij zijt met mij; Uw stok en Uw staf, die vertroosten mij.",   highlight: false },
]

function BibleStudyIllustration() {
  return (
    <div className="relative select-none" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Browser window frame */}
      <div className="rounded-xl overflow-hidden border bg-white"
        style={{
          borderColor: T.border,
          boxShadow:
            "0 30px 60px -20px rgba(15,23,42,0.25), 0 18px 36px -18px rgba(15,23,42,0.20), 0 0 0 1px rgba(15,23,42,0.04)",
        }}>

        {/* macOS-style chrome with traffic lights + URL bar */}
        <div className="h-9 px-3 flex items-center gap-3 border-b"
          style={{ backgroundColor: "#F3F4F6", borderColor: T.border }}>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF5F57" }} />
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FEBC2E" }} />
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#28C840" }} />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="text-[10px] font-medium px-3 py-0.5 rounded-md border bg-white inline-flex items-center gap-1.5"
              style={{ color: T.muted, borderColor: T.border }}>
              <Shield className="h-2.5 w-2.5" style={{ color: T.teal }} />
              bijbel-studie.com/studie
            </div>
          </div>
          <div className="w-12" />
        </div>

        {/* App tab/chapter bar */}
        <div className="h-10 px-4 flex items-center justify-between border-b"
          style={{ borderColor: T.border, backgroundColor: "white" }}>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: T.teal }}>
              <BookOpen className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-xs" style={{ color: T.text }}>Psalm 23</span>
            <span className="text-xs" style={{ color: T.muted }}>·</span>
            <span className="text-xs" style={{ color: T.muted }}>Statenvertaling</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="h-6 w-6 rounded flex items-center justify-center" style={{ backgroundColor: T.bg }}>
              <ChevronLeft size={11} color={T.muted} />
            </button>
            <button className="h-6 w-6 rounded flex items-center justify-center" style={{ backgroundColor: T.bg }}>
              <ChevronRight size={11} color={T.muted} />
            </button>
          </div>
        </div>

        {/* Split-screen app interior: Bible left · Commentary right */}
        <div className="grid grid-cols-5">

          {/* Bible reading pane (3 cols) */}
          <div className="col-span-3 border-r" style={{ borderColor: T.border }}>
            <div className="px-5 pt-4 pb-3 text-center border-b" style={{ borderColor: T.border + "80" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.teal }}>
                Psalmen
              </p>
              <h3 className="text-xl font-bold mt-0.5"
                style={{ color: T.text, fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Psalm 23
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>Een psalm van David</p>
            </div>

            <div className="px-5 py-4 space-y-3">
              {HERO_VERSES.map(v => (
                <div key={v.num}
                  className="flex gap-2.5 rounded-md px-2 py-1.5 -mx-2"
                  style={{
                    backgroundColor: v.highlight ? "rgba(13,148,136,0.07)" : "transparent",
                    borderLeft: v.highlight ? `2px solid ${T.teal}` : "2px solid transparent",
                  }}>
                  <span className="text-[10px] font-bold flex-shrink-0 mt-0.5 w-3 text-right"
                    style={{ color: T.teal }}>
                    {v.num}
                  </span>
                  <p className="text-[11px] leading-relaxed"
                    style={{ color: T.text, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                    {v.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Commentary pane (2 cols) */}
          <div className="col-span-2" style={{ backgroundColor: "#FAFAFA" }}>
            {/* Tabs row */}
            <div className="h-9 px-3 flex items-center gap-3 border-b text-[10px]"
              style={{ borderColor: T.border }}>
              <span className="font-bold pb-0.5 border-b-2"
                style={{ color: T.teal, borderColor: T.teal }}>
                Commentaar
              </span>
              <span style={{ color: T.muted }}>Grondtekst</span>
              <span style={{ color: T.muted }}>Notities</span>
            </div>

            {/* Source pill */}
            <div className="px-4 py-2.5 border-b flex items-center justify-between"
              style={{ borderColor: T.border + "80" }}>
              <span className="text-[10px] font-medium" style={{ color: T.muted }}>Bron</span>
              <div className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-white inline-flex items-center gap-1"
                style={{ borderColor: T.border, color: T.text }}>
                King Comments
                <ChevronDown className="h-2.5 w-2.5" style={{ color: T.muted }} />
              </div>
            </div>

            {/* Verse 1 commentary */}
            <div className="px-4 py-4 space-y-3">
              <div className="inline-flex items-center gap-1">
                <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(13,148,136,0.10)", color: T.tealText }}>
                  Vers 1
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: T.text }}>
                Deze psalm is de bekendste en meest geliefde van alle psalmen. In de{" "}
                <span style={{ color: T.teal, fontStyle: "italic" }}>Ps 23:1-4</span>
                {" "}geeft hij ons een volledig beeld van de volcontinu bezigheden van de herder, in wie
                we zonder enige moeite het beeld van de Heer Jezus herkennen.
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: T.text }}>
                In de <span style={{ color: T.teal, fontStyle: "italic" }}>Ps 23:5-6</span> wordt daaraan het beeld van een feestmaal toegevoegd. Deze psalm
                geeft ons een complete beschrijving van de herder-relatie met onze Heer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating "Notitie opgeslagen" badge (top-left) ── */}
      <div className="absolute -top-5 -left-4 bg-white rounded-full shadow-lg border px-3 py-1.5 hidden sm:flex items-center gap-2"
        style={{ borderColor: T.border }}>
        <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: T.tealLight }}>
          <PenLine className="h-3 w-3" style={{ color: T.teal }} />
        </div>
        <span className="text-[11px] font-semibold" style={{ color: T.text }}>Notitie opgeslagen</span>
      </div>

      {/* ── Floating streak pill (bottom-right) ── */}
      <div className="absolute -bottom-4 -right-4 bg-white rounded-full shadow-lg border px-3 py-1.5 hidden sm:flex items-center gap-1.5"
        style={{ borderColor: T.border }}>
        <Flame className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#EA580C" }} />
        <span className="text-[11px] font-bold" style={{ color: T.text }}>12</span>
        <span className="text-[11px]" style={{ color: T.muted }}>dagen streak</span>
      </div>

    </div>
  )
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])

  return (
    <header
      className="sticky top-0 z-50 border-b transition-shadow duration-300"
      style={{
        borderColor: T.border,
        backgroundColor: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        boxShadow: scrolled ? "0 1px 16px rgba(0,0,0,0.07)" : "none",
      }}
    >
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 md:grid md:grid-cols-3">
        {/* Logo - links uitgelijnd */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 md:justify-self-start">
          <Image src="/images/favicon.ico" alt="" width={26} height={26} className="rounded-md" priority />
          <span className="font-bold text-base" style={{ color: T.text }}>BijbelStudie</span>
        </Link>

        {/* Navigatie - exact gecentreerd */}
        <nav className="hidden md:flex items-center justify-center gap-8">
          {[
            { href: "#functies",    label: "Functies" },
            { href: "#in-actie",    label: "In actie" },
            { href: "#bibliotheek", label: "Bibliotheek" },
            { href: "#prijzen",     label: "Prijzen" },
            { href: "#faq",         label: "FAQ" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        {/* Knoppen - rechts uitgelijnd */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 md:justify-self-end">
          <Link href="/auth/signin"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
            Inloggen
          </Link>
          <Link href="/auth/signin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white px-3.5 sm:px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors whitespace-nowrap">
            Gratis beginnen
            <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
          </Link>
        </div>
      </div>
    </header>
  )
}

/* ─── Hero ───────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden" style={{ backgroundColor: T.light }}>
      {/* Ambient glow behind mockup */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 55% 60% at 80% 50%, rgba(13,148,136,0.09), transparent)",
        }}
      />
      {/* Top-left subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 40% 50% at 10% 20%, rgba(13,148,136,0.05), transparent)",
        }}
      />

      <div className="relative max-w-6xl 2xl:max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        {/* Text column */}
        <div className="space-y-7">
          <motion.h1
            className="text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight"
            style={{ color: T.text }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease }}
          >
            De #1 Nederlandse<br />
            <motion.span
              style={{ color: T.teal }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease }}
            >
              Bijbelstudie tool
            </motion.span>
          </motion.h1>

          <motion.p
            className="text-lg leading-relaxed"
            style={{ color: T.muted }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease }}
          >
            BijbelStudie geeft u de tools om de Bijbel diep en persoonlijk te bestuderen.
            Met bewezen methoden, meerdere vertalingen en persoonlijke notities.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 pt-1"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease }}
          >
            <motion.div
              className="rounded-xl w-full sm:w-auto"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(13,148,136,0.45)",
                  "0 0 0 10px rgba(13,148,136,0)",
                  "0 0 0 0 rgba(13,148,136,0)",
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 1 }}
            >
              <Link href="/auth/signin"
                className="group w-full inline-flex items-center justify-center gap-2 font-semibold text-white px-7 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors">
                Start gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
            <Link href="#functies"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl border border-gray-200 text-gray-900 bg-white hover:bg-gray-50 transition-colors">
              Bekijk functies
            </Link>
          </motion.div>

          <motion.div
            className="flex items-center gap-6 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.44, ease }}
          >
            {[
              { icon: BookMarked, label: "10 begeleide studies" },
              { icon: Star,       label: "Gratis te gebruiken" },
              { icon: Shield,     label: "Privacy-first" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-sm" style={{ color: T.muted }}>
                <Icon className="h-4 w-4" style={{ color: T.teal }} />
                {label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Illustration column - floats continuously */}
        <motion.div
          className="relative w-full max-w-md mx-auto lg:max-w-none lg:mx-0"
          initial={{ opacity: 0, x: 40, y: 16 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.75, delay: 0.2, ease }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <BibleStudyIllustration />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Features ───────────────────────────────────────────────── */
function FeatureCard({
  num, icon: Icon, title, desc, className = "", children,
}: {
  num: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  desc: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <motion.div
      variants={{
        hidden:  { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative bg-white rounded-2xl border overflow-hidden cursor-default transition-shadow hover:shadow-lg flex flex-col ${className}`}
      style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="p-6 lg:p-7 flex flex-col h-full">
        <div className="flex items-start justify-between mb-5">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: T.tealLight,
              backgroundImage: `linear-gradient(135deg, ${T.tealLight}, rgba(13,148,136,0.05))`,
            }}>
            <Icon className="h-5 w-5" style={{ color: T.teal }} />
          </div>
          <span className="text-[10px] font-bold tracking-widest tabular-nums" style={{ color: T.muted }}>
            {num}
          </span>
        </div>

        <h3 className="font-bold text-base lg:text-lg mb-2" style={{ color: T.text }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: T.muted }}>{desc}</p>

        {children && <div className="mt-5">{children}</div>}
      </div>
    </motion.div>
  )
}

function Features() {
  return (
    <section id="functies" className="py-20" style={{ backgroundColor: T.bg }}>
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-6">
        <SectionHeader
          label="Functies"
          title="Alles wat u nodig heeft voor bijbelstudie"
          subtitle="Van bijbeltekst tot studiehulpmiddelen - alles samengebracht in één overzichtelijk platform."
        />

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {/* Featured: Begeleide studies (large, spans 2 columns on lg) */}
          <FeatureCard
            num="01"
            icon={Lightbulb}
            title="10 begeleide bijbelstudies"
            desc="Studies over personen, gebeurtenissen en thema's - met gerichte vragen per les, opgebouwd voor diepere reflectie."
            className="lg:col-span-2"
          >
            <div className="flex flex-wrap gap-1.5">
              {["Het leven van David", "De Bergrede", "Brieven van Paulus", "Profeten", "Genesis"].map(s => (
                <span key={s}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                  style={{ borderColor: T.border, color: T.text, backgroundColor: T.light }}>
                  {s}
                </span>
              ))}
            </div>
          </FeatureCard>

          {/* Persoonlijke notities */}
          <FeatureCard
            num="02"
            icon={StickyNote}
            title="Persoonlijke notities"
            desc="Noteer gedachten bij verzen en bewaar alles op één plek - automatisch gesynchroniseerd."
          />

          {/* Row 2: 3 equal cards */}
          <FeatureCard
            num="03"
            icon={BookOpen}
            title="Meerdere vertalingen"
            desc="Lees en vergelijk Nederlandse bijbelvertalingen direct naast elkaar."
          />

          <FeatureCard
            num="04"
            icon={Library}
            title="Bijbelcommentaren"
            desc="Lees klassieke en hedendaagse commentaren - Matthew Henry, King Comments en meer."
          />

          <FeatureCard
            num="05"
            icon={Users}
            title="Bijbelgroepen"
            desc="Studeer samen, deel notities en bespreek teksten in een privégroep."
          />

          {/* Row 3: Voortgang - wide */}
          <motion.div
            variants={{
              hidden:  { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
            }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group lg:col-span-3 relative rounded-2xl border overflow-hidden cursor-default transition-shadow hover:shadow-lg"
            style={{
              borderColor: T.border,
              backgroundColor: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="px-6 lg:px-7 py-5 lg:py-6 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
              <div className="flex items-start gap-5 flex-1 min-w-0">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: T.tealLight,
                    backgroundImage: `linear-gradient(135deg, ${T.tealLight}, rgba(13,148,136,0.05))`,
                  }}>
                  <BarChart2 className="h-5 w-5" style={{ color: T.teal }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base lg:text-lg" style={{ color: T.text }}>Voortgang bijhouden</h3>
                    <span className="text-[10px] font-bold tracking-widest tabular-nums" style={{ color: T.muted }}>06</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: T.muted }}>
                    Zie hoeveel u gelezen heeft, houd uw leestreeks bij en blijf gemotiveerd met dagelijkse statistieken.
                  </p>
                </div>
              </div>
              {/* Mini stat strip */}
              <div className="flex items-center gap-6 lg:gap-8 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4" style={{ color: "#EA580C" }} />
                    <span className="text-2xl font-extrabold tabular-nums" style={{ color: T.text }}>12</span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>dagen streak</p>
                </div>
                <div className="h-10 w-px" style={{ backgroundColor: T.border }} />
                <div>
                  <div className="text-2xl font-extrabold tabular-nums" style={{ color: T.text }}>847</div>
                  <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>verzen gelezen</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Bibles & Commentaries ──────────────────────────────────── */
function BibleLibrary() {
  const translations = [
    { name: "Statenvertaling",        year: "1637", note: "De klassieke Nederlandse vertaling",                      badge: "Standaard" },
    { name: "De Heilige Schrift",     year: "1917", note: "NBG-vertaling, lange tijd standaard in kerken",           badge: null },
    { name: "Canisiusbijbel",         year: "1939", note: "Rooms-katholieke vertaling met deuterocanonieke boeken", badge: null },
  ]

  const commentaries = [
    { name: "Matthew Henry",       author: "Vertaald naar Nederlands", note: "Klassiek Engels commentaar uit 1706, devotionele insteek" },
    { name: "King Comments",       author: "Ger de Koning",            note: "Eigentijds Nederlandstalig commentaar, vers-voor-vers" },
    { name: "Karl August Dachsel", author: "19e eeuws",                note: "Duits piëtistisch commentaar, in het Nederlands beschikbaar" },
  ]

  return (
    <section id="bibliotheek" className="py-20" style={{ backgroundColor: T.light }}>
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-6">
        <SectionHeader
          label="Bibliotheek"
          title="Vertalingen en commentaren op één plek"
          subtitle="Vergelijk Nederlandse bijbelvertalingen en lees gerenommeerde commentaren naast de tekst."
        />

        {/* Translations */}
        <FadeUp className="mb-5">
          <div className="flex items-baseline gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" style={{ color: T.teal }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T.tealText }}>
                Vertalingen
              </p>
            </div>
            <div className="h-px flex-1" style={{ backgroundColor: T.border }} />
            <p className="text-xs font-semibold" style={{ color: T.muted }}>
              {translations.length} Nederlandse vertalingen
            </p>
          </div>
        </FadeUp>
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {translations.map(({ name, year, note, badge }) => (
            <motion.div
              key={name}
              variants={{
                hidden:  { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative bg-white rounded-2xl border overflow-hidden cursor-default transition-shadow hover:shadow-lg"
              style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              {/* Teal accent bar */}
              <div className="h-1" style={{ backgroundColor: T.teal }} />

              <div className="p-6">
                {/* Top row: year + optional badge */}
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[11px] font-bold tracking-widest"
                    style={{ color: T.muted, fontVariantNumeric: "tabular-nums" }}>
                    ANNO {year}
                  </span>
                  {badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: T.tealLight, color: T.tealText }}>
                      {badge}
                    </span>
                  )}
                </div>

                {/* Name in serif - feels like a book */}
                <h3 className="text-xl leading-tight mb-3"
                  style={{
                    color: T.text,
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontWeight: 700,
                  }}>
                  {name}
                </h3>

                <p className="text-sm leading-relaxed" style={{ color: T.muted }}>{note}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Commentaries */}
        <FadeUp className="mb-5">
          <div className="flex items-baseline gap-3">
            <div className="flex items-center gap-2">
              <Library className="h-4 w-4" style={{ color: T.teal }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T.tealText }}>
                Commentaren
              </p>
            </div>
            <div className="h-px flex-1" style={{ backgroundColor: T.border }} />
            <p className="text-xs font-semibold" style={{ color: T.muted }}>
              {commentaries.length} Nederlandstalige commentaren
            </p>
          </div>
        </FadeUp>
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {commentaries.map(({ name, author, note }) => (
            <motion.div
              key={name}
              variants={{
                hidden:  { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative bg-white rounded-2xl border overflow-hidden cursor-default transition-shadow hover:shadow-lg"
              style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="p-6">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: T.tealLight }}>
                  <Library className="h-5 w-5" style={{ color: T.teal }} />
                </div>

                <h3 className="text-xl leading-tight mb-1"
                  style={{
                    color: T.text,
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontWeight: 700,
                  }}>
                  {name}
                </h3>

                <p className="text-xs font-semibold mb-3" style={{ color: T.tealText }}>{author}</p>

                <p className="text-sm leading-relaxed" style={{ color: T.muted }}>{note}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <FadeUp delay={0.1} className="text-center mt-10">
          <p className="text-xs" style={{ color: T.muted }}>
            Alle vertalingen en commentaren direct beschikbaar in de webapp.
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─── Showcase: see the real product in action ───────────────── */
const HEBREW_STACK = "'SBL Hebrew','Ezra SIL','David CLM','Frank Ruhl CLM','Times New Roman','Noto Serif Hebrew',serif"

function GrondtekstMockup() {
  // Genesis 1:1 — בְּרֵאשִׁית בָּרָא אֱלֹהִים
  const words = [
    { h: "בְּרֵאשִׁית",  t: "bere'shit", e: "in het begin", s: "H7225" },
    { h: "בָּרָא",        t: "bara",      e: "schiep",        s: "H1254" },
    { h: "אֱלֹהִים",      t: "Elohim",    e: "God",           s: "H430"  },
  ]
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border bg-white"
      style={{ borderColor: T.border }}>
      {/* Header bar */}
      <div className="h-11 px-4 flex items-center justify-between border-b bg-gray-50"
        style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold" style={{ color: T.text }}>Genesis 1:1</span>
          <span style={{ color: T.muted }}>·</span>
          <span style={{ color: T.muted }}>Grondtekst</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(13,148,136,0.10)", color: T.tealText }}>
            Hebreeuws
          </span>
        </div>
        <span className="text-[10px] tabular-nums" style={{ color: T.muted }}>OT</span>
      </div>

      {/* Intro */}
      <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: T.border + "80" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
          De originele woorden van Genesis 1 in het Hebreeuws, met transliteratie,
          betekenis en Strong-nummer.
        </p>
      </div>

      {/* Word cards */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums"
            style={{ backgroundColor: "rgba(13,148,136,0.10)", color: T.tealText }}>
            1
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>
            3 woorden
          </span>
        </div>
        <div className="flex flex-wrap gap-x-1 gap-y-3 justify-end" dir="rtl">
          {words.map(w => (
            <div key={w.s} className="flex flex-col items-center text-center min-w-[64px] px-2 py-1.5 rounded-md hover:bg-teal-50 transition-colors"
              dir="ltr">
              <div className="text-2xl leading-snug font-medium"
                dir="rtl" lang="he"
                style={{ color: T.text, fontFamily: HEBREW_STACK }}>
                {w.h}
              </div>
              <div className="text-[10px] italic mt-0.5" style={{ color: T.muted }}>{w.t}</div>
              <div className="text-[11px] mt-0.5 leading-tight" style={{ color: T.text }}>{w.e}</div>
              <span className="mt-1 text-[9.5px] tabular-nums tracking-wide px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-0.5"
                style={{ backgroundColor: "rgba(13,148,136,0.10)", color: T.tealText }}>
                {w.s}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CommentaryMockup() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border bg-white"
      style={{ borderColor: T.border }}>
      {/* Header */}
      <div className="h-11 px-4 flex items-center justify-between border-b bg-gray-50"
        style={{ borderColor: T.border }}>
        <span className="text-xs font-medium" style={{ color: T.muted }}>Commentaarbron</span>
        <div className="text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-white"
          style={{ borderColor: T.border, color: T.text }}>
          King Comments (NL)
          <ChevronDown className="h-3 w-3" style={{ color: T.muted }} />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        <div className="inline-flex items-center gap-1.5 mb-3">
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(13,148,136,0.10)", color: T.tealText }}>
            Vers 1
          </span>
        </div>
        <p className="text-sm leading-relaxed mb-3" style={{ color: T.text }}>
          Genesis is rond 1450 v.Chr. geschreven door Mozes, in de Sinaï woestijn.
        </p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: T.text }}>
          In het Hebreeuws heet dit boek <em style={{ color: T.tealText, fontStyle: "italic" }}>Bereshith</em>, dat
          betekent &apos;in het begin&apos;, naar de eerste woorden waarmee dit boek begint. In het Grieks heet het Genesis, dat
          &apos;geboorte&apos;, of &apos;ontstaan&apos;, of &apos;wording&apos; betekent.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: T.text }}>
          Het is terecht het boek van het begin. We vinden er de oorsprong van alle dingen in. Dit boek vertelt ons onder
          andere over het ontstaan van de hemel en de aarde, de instelling van huwelijk en gezin, de eerste zonde en als
          gevolg daarvan de dood, het eerste offer, het oordeel, het ontstaan van volken, de oorsprong van het volk Israël,
          het verbond en de besnijdenis.
        </p>

        {/* Subtle fade hint that there's more */}
        <div className="mt-4 h-8 -mb-5 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Author footer */}
      <div className="px-5 py-3 border-t flex items-center gap-2.5 bg-gray-50"
        style={{ borderColor: T.border }}>
        <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: T.tealLight }}>
          <Library className="h-3.5 w-3.5" style={{ color: T.teal }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold leading-none" style={{ color: T.text }}>King Comments</p>
          <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>Ger de Koning · vers-voor-vers</p>
        </div>
      </div>
    </div>
  )
}

function Showcase() {
  return (
    <section id="in-actie" className="py-20" style={{ backgroundColor: T.bg }}>
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-6">
        <SectionHeader
          label="In de praktijk"
          title="Verdiep je in de Schrift"
          subtitle="Zie hoe BijbelStudie u helpt om de Schrift te begrijpen zoals de oorspronkelijke schrijvers het bedoelden."
        />

        {/* Block 1: Grondtekst — text left, mockup right */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24">
          <FadeUp>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full mb-4"
                style={{ backgroundColor: "rgba(13,148,136,0.10)" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.teal }} />
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: T.tealText }}>
                  Grondtekst
                </p>
              </div>
              <h3 className="text-2xl lg:text-3xl font-extrabold mb-4 leading-tight" style={{ color: T.text }}>
                Lees de Bijbel in de oorspronkelijke taal
              </h3>
              <p className="text-base leading-relaxed mb-5" style={{ color: T.muted }}>
                Bestudeer elk Hebreeuws of Grieks woord met transliteratie, Nederlandse betekenis en
                Strong-nummers. Klik door naar de lexicon voor diepere studie - geen taalkennis vereist.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Volledige Hebreeuwse OT en Griekse NT (STEPBible)",
                  "Per-woord betekenis en uitspraak",
                  "Strong-nummers met directe lexicon-koppeling",
                ].map(line => (
                  <li key={line} className="flex items-start gap-2.5 text-sm" style={{ color: T.text }}>
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: T.teal }} />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <div className="relative">
              {/* Ambient glow */}
              <div className="absolute -inset-8 -z-10"
                style={{ background: "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(13,148,136,0.10), transparent)" }} />
              <GrondtekstMockup />
            </div>
          </FadeUp>
        </div>

        {/* Block 2: Commentary — mockup left, text right */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeUp delay={0.15} className="lg:order-2">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full mb-4"
                style={{ backgroundColor: "rgba(13,148,136,0.10)" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.teal }} />
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: T.tealText }}>
                  Commentaren
                </p>
              </div>
              <h3 className="text-2xl lg:text-3xl font-extrabold mb-4 leading-tight" style={{ color: T.text }}>
                Leer van erkende Bijbelcommentaren
              </h3>
              <p className="text-base leading-relaxed mb-5" style={{ color: T.muted }}>
                Lees vers-voor-vers commentaar van Ger de Koning (King Comments), Matthew Henry,
                Karl August Dachsel en anderen - direct naast de tekst die u bestudeert.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Nederlandstalige en vertaalde klassieke commentaren",
                  "Direct gekoppeld aan het vers dat u leest",
                  "Wissel eenvoudig tussen verschillende auteurs",
                ].map(line => (
                  <li key={line} className="flex items-start gap-2.5 text-sm" style={{ color: T.text }}>
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: T.teal }} />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>

          <FadeUp delay={0.05} className="lg:order-1">
            <div className="relative">
              <div className="absolute -inset-8 -z-10"
                style={{ background: "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(13,148,136,0.10), transparent)" }} />
              <CommentaryMockup />
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

/* ─── How it works ───────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { num: "01", icon: Users,        title: "Maak een gratis account aan",      desc: "Registreer u met uw e-mailadres of log in met Google. Uw voortgang en notities worden automatisch opgeslagen." },
    { num: "02", icon: BookOpen,     title: "Kies een bijbelboek of leesplan",  desc: "Begin direct met lezen of schrijf u in voor een leesplan. Kies uw favoriete bijbelvertaling." },
    { num: "03", icon: MessageSquare, title: "Ontdek grondteksten en commentaren",    desc: "Verken de oorspronkelijke teksten met commentaren van erkende Bijbelgeleerden en verdiep je begrip." },
  ]

  return (
    <section className="py-20" style={{ backgroundColor: T.card }}>
      <div className="max-w-5xl 2xl:max-w-6xl mx-auto px-6">
        <SectionHeader label="Hoe het werkt" title="In drie stappen aan de slag" />

        <div className="relative">
          {/* Single connecting line - spans from icon-1 center to icon-3 center (desktop only) */}
          <div
            aria-hidden
            className="hidden lg:block absolute top-7 h-px z-0 pointer-events-none"
            style={{
              backgroundColor: T.border,
              left: '16.67%',   // center of first column (3-col grid: each col = 33.33%, center = 16.67%)
              right: '16.67%',  // center of third column
            }}
          />

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 relative">
            {steps.map(({ num, icon: Icon, title, desc }, i) => (
              <FadeUp key={num} delay={i * 0.12}>
                <div className="relative z-10 text-center">
                  {/* Icon centered with white ring to cleanly mask the connecting line */}
                  <div
                    className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                    style={{
                      backgroundColor: T.teal,
                      boxShadow: `0 0 0 8px ${T.card}, 0 4px 14px rgba(13,148,136,0.25)`,
                    }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="mt-5 text-[11px] font-black tracking-widest" style={{ color: T.teal }}>
                    STAP {num}
                  </p>
                  <h3 className="font-bold text-base mt-2" style={{ color: T.text }}>{title}</h3>
                  <p className="text-sm leading-relaxed mt-2 max-w-xs mx-auto" style={{ color: T.muted }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Pricing ────────────────────────────────────────────────── */
function Pricing() {
  const free = [
    "Bijbel lezen (meerdere vertalingen)",
    "Persoonlijke notities bij verzen",
    "Bijbelleesplannen volgen",
    "Studiemethoden gebruiken",
    "Voortgang bijhouden",
  ]
  const pro = [
    "Alles in het gratis plan",
    "Matthew Henry commentaar (NL)",
    "Karl August Dachsel commentaar",
    "Historische context per hoofdstuk",
    "Prioriteitsondersteuning",
  ]

  return (
    <section id="prijzen" className="py-20" style={{ backgroundColor: T.bg }}>
      <div className="max-w-4xl mx-auto px-6">
        <SectionHeader
          label="Prijzen"
          title="Begin gratis, groei verder"
          subtitle="Geen creditcard vereist voor het gratis plan."
        />

        <div className="grid md:grid-cols-2 gap-6">
          <FadeUp delay={0.05}>
            <div className="bg-white rounded-2xl border p-8 h-full" style={{ borderColor: T.border }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Gratis</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold" style={{ color: T.text }}>€0</span>
                <span className="text-sm" style={{ color: T.muted }}>/maand</span>
              </div>
              <ul className="space-y-3 mb-8">
                {free.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm" style={{ color: T.text }}>
                    <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: T.tealLight }}>
                      <Check className="h-3 w-3" style={{ color: T.teal }} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signin"
                className="block text-center font-semibold py-3 rounded-xl border text-sm transition-colors hover:bg-gray-50"
                style={{ borderColor: T.border, color: T.text }}>
                Gratis beginnen
              </Link>
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <motion.div
              className="rounded-2xl p-8 relative overflow-hidden h-full"
              style={{ backgroundColor: T.sidebar }}
              whileHover={{ scale: 1.01, transition: { duration: 0.25 } }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
                style={{ background: `radial-gradient(circle, ${T.teal}, transparent)`, transform: "translate(30%, -30%)" }} />
              <div className="absolute -top-px left-8">
                <span className="text-xs font-bold px-3 py-1 rounded-b-lg"
                  style={{ backgroundColor: T.teal, color: "white" }}>
                  Meest populair
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2 mt-3" style={{ color: "#9CA3AF" }}>Pro</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">€9,99</span>
                <span className="text-sm" style={{ color: "#9CA3AF" }}>/maand</span>
              </div>
              <ul className="space-y-3 mb-8">
                {pro.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-white">
                    <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(13,148,136,0.3)" }}>
                      <Check className="h-3 w-3" style={{ color: "#2DD4BF" }} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/abonnement"
                className="block text-center font-semibold py-3 rounded-xl text-sm transition-colors hover:opacity-90"
                style={{ backgroundColor: T.teal, color: "white" }}>
                Pro proberen
              </Link>
            </motion.div>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ ────────────────────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b" style={{ borderColor: T.border }}>
      <button
        className="w-full flex items-center justify-between gap-4 py-4 text-left font-semibold text-sm select-none"
        style={{ color: T.text }}
        onClick={() => setOpen(!open)}
      >
        <span>{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease }}
          className="flex-shrink-0"
        >
          <ChevronDown className="h-4 w-4" style={{ color: T.muted }} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease }}
            style={{ overflow: "hidden" }}
          >
            <p className="pb-5 text-sm leading-relaxed" style={{ color: T.muted }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FAQ() {
  const faqs = [
    { q: "Is BijbelStudie helemaal gratis?",           a: "Het gratis plan geeft volledige toegang tot bijbellezen, notities, leesplannen en studiemethoden. De Pro versie (€9,99/maand) voegt commentaren en geavanceerde functies toe." },
    { q: "Welke bijbelvertalingen zijn beschikbaar?",  a: "In het Nederlands ondersteunen wij de Statenvertaling, Canisiusvertaling 1939 en De Heilige Schrift 1917. Daarnaast bieden wij zes Engelse vertalingen aan: King James Version, American Standard Version, NET Bible, World English Bible, Geneva Bible (1599) en Coverdale Bible (1535)." },
    { q: "Worden mijn notities opgeslagen?",           a: "Ja. Al uw notities en voortgang worden automatisch opgeslagen in uw persoonlijke account en zijn op elk apparaat beschikbaar." },
    { q: "Hoe werkt een leesplan?",                    a: "U schrijft zich in voor een leesplan en ontvangt dagelijkse leesporties. Uw voortgang wordt bijgehouden en u kunt op elk moment verdergaan waar u gebleven was." },
    { q: "Is mijn persoonlijke data veilig?",          a: "Ja. Wij gebruiken beveiligde verbindingen (HTTPS/TLS) en slaan uw gegevens versleuteld op. Uw data wordt nooit verkocht aan derden." },
  ]

  return (
    <section id="faq" className="py-20" style={{ backgroundColor: T.card }}>
      <div className="max-w-3xl mx-auto px-6">
        <SectionHeader label="FAQ" title="Veelgestelde vragen" />
        <FadeUp>
          <div>
            {faqs.map(item => <FAQItem key={item.q} {...item} />)}
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─── CTA ────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section className="py-20 relative overflow-hidden" style={{ backgroundColor: T.bg }}>
      {/* Subtle teal top border */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ backgroundColor: T.border }} />

      <div className="relative max-w-3xl mx-auto px-6 text-center space-y-7">
        <FadeUp>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-2"
            style={{ backgroundColor: T.tealLight, color: T.tealText }}>
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.teal }} />
            Begin vandaag nog
          </div>
        </FadeUp>
        <FadeUp delay={0.08}>
          <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight" style={{ color: T.text }}>
            Klaar om de Bijbel te bestuderen?
          </h2>
        </FadeUp>
        <FadeUp delay={0.14}>
          <p className="text-base" style={{ color: T.muted }}>
            Maak in minder dan een minuut een gratis account aan en begin vandaag nog.
          </p>
        </FadeUp>
        <FadeUp delay={0.2}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signin"
              className="inline-flex items-center justify-center gap-2 font-semibold text-white px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors">
              Gratis beginnen
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#functies"
              className="inline-flex items-center justify-center gap-2 font-semibold px-8 py-3.5 rounded-xl border text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              style={{ borderColor: T.border }}>
              Meer informatie
            </Link>
          </div>
        </FadeUp>
        <FadeUp delay={0.28}>
          <p className="text-xs" style={{ color: T.muted }}>
            Geen creditcard vereist · Gratis te gebruiken · Altijd opzegbaar
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: T.light }}>
      <Navbar />
      <main>
        <Hero />
        <Showcase />
        <Features />
        <BibleLibrary />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
