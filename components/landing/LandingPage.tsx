"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import {
  BookOpen, BookMarked, StickyNote, Library, Search,
  ArrowRight, Check, ChevronDown, Users, Shield,
  Layers, FileText, Heart, Lightbulb, BarChart2,
  Clock, Star, MessageSquare, ChevronLeft, ChevronRight,
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

/* ─── Bible Study Illustration ───────────────────────────────── */
const VERSES = [
  { num: 1, text: "De HEERE is mijn Herder, mij zal niets ontbreken.", highlight: false },
  { num: 2, text: "Hij doet mij neerliggen in grazige weiden; Hij leidt mij zachtjes naar stille wateren.", highlight: true },
  { num: 3, text: "Hij verkwikt mijn ziel; Hij leidt mij in het spoor der gerechtigheid, om Zijns Naams wil.", highlight: false },
  { num: 4, text: "Al ging ik ook door een dal der schaduw des doods, ik zou geen kwaad vrezen, want Gij zijt met mij...", highlight: false },
]

function BibleStudyIllustration() {
  return (
    <div className="relative select-none" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Main reading panel ── */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border bg-white"
        style={{ borderColor: T.border }}>

        {/* Toolbar */}
        <div className="h-11 px-4 flex items-center justify-between border-b"
          style={{ borderColor: T.border, backgroundColor: T.light }}>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: T.teal }}>
              <span className="text-white font-extrabold" style={{ fontSize: 9 }}>B</span>
            </div>
            <span className="font-semibold text-xs" style={{ color: T.text }}>Psalm 23</span>
            <span className="text-xs" style={{ color: T.muted }}>·</span>
            <span className="text-xs" style={{ color: T.muted }}>Statenvertaling</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="h-6 w-6 rounded flex items-center justify-center"
              style={{ backgroundColor: T.bg }}>
              <ChevronLeft size={11} color={T.muted} />
            </button>
            <button className="h-6 w-6 rounded flex items-center justify-center"
              style={{ backgroundColor: T.bg }}>
              <ChevronRight size={11} color={T.muted} />
            </button>
          </div>
        </div>

        {/* Chapter heading */}
        <div className="px-6 pt-5 pb-3 text-center border-b"
          style={{ borderColor: T.border + "80" }}>
          <p className="text-xs font-bold uppercase tracking-widest"
            style={{ color: T.teal, letterSpacing: "0.1em" }}>
            Psalmen
          </p>
          <h3 className="text-2xl font-bold mt-1"
            style={{ color: T.text, fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Psalm 23
          </h3>
          <p className="text-xs mt-0.5" style={{ color: T.muted }}>Een psalm van David</p>
        </div>

        {/* Verses */}
        <div className="px-6 py-4 space-y-3.5">
          {VERSES.map(v => (
            <div key={v.num}
              className="flex gap-3 rounded-lg px-2.5 py-2 -mx-2.5 transition-colors"
              style={{
                backgroundColor: v.highlight
                  ? "rgba(13,148,136,0.07)"
                  : "transparent",
                borderLeft: v.highlight ? `2px solid ${T.teal}` : "2px solid transparent",
              }}>
              <span className="text-xs font-bold flex-shrink-0 mt-0.5 w-3 text-right"
                style={{ color: T.teal }}>
                {v.num}
              </span>
              <p className="text-sm leading-relaxed"
                style={{
                  color: T.text,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                }}>
                {v.text}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom fade */}
        <div className="h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </div>

      {/* ── Commentary card (bottom-right overlay) ── */}
      <div className="absolute -bottom-6 -right-6 w-60 bg-white rounded-xl shadow-xl border p-4"
        style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: T.tealLight }}>
            <BookOpen className="h-3.5 w-3.5" style={{ color: T.teal }} />
          </div>
          <div>
            <p className="text-xs font-bold leading-none" style={{ color: T.teal }}>Commentaar</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: T.muted }}>Matthew Henry (NL)</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed"
          style={{ color: T.text, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
          &ldquo;Een schitterende belijdenis van vertrouwen. God als Herder voorziet in alle noden van Zijn schapen...&rdquo;
        </p>
      </div>

      {/* ── Notes badge (top-left overlay) ── */}
      <div className="absolute -top-9 -left-4 bg-white rounded-full shadow-lg border px-3 py-2
        flex items-center gap-2"
        style={{ borderColor: T.border }}>
        <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: T.tealLight }}>
          <PenLine className="h-3 w-3" style={{ color: T.teal }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: T.text }}>Notitie opgeslagen</span>
      </div>

      {/* ── Streak pill (right side, mid-height) ── */}
      <div className="absolute top-1/2 -right-14 -translate-y-1/2 bg-white rounded-full shadow-lg
        border px-3 py-2 flex items-center gap-1.5"
        style={{ borderColor: T.border }}>
        <Flame className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#EA580C" }} />
        <span className="text-xs font-bold" style={{ color: T.text }}>12</span>
        <span className="text-xs" style={{ color: T.muted }}>dagen</span>
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
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-6 h-16 grid grid-cols-3 items-center">
        {/* Logo - links uitgelijnd */}
        <Link href="/" className="flex items-center gap-2 justify-self-start">
          <Image src="/images/favicon.ico" alt="" width={26} height={26} className="rounded-md" priority />
          <span className="font-bold text-base" style={{ color: T.text }}>BijbelStudie</span>
        </Link>

        {/* Navigatie - exact gecentreerd */}
        <nav className="hidden md:flex items-center justify-center gap-8">
          {[
            { href: "#functies", label: "Functies" },
            { href: "#methoden", label: "Methoden" },
            { href: "#prijzen",  label: "Prijzen" },
            { href: "#faq",      label: "FAQ" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        {/* Knoppen - rechts uitgelijnd */}
        <div className="flex items-center gap-3 justify-self-end">
          <Link href="/auth/signin"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
            Inloggen
          </Link>
          <Link href="/auth/signin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors">
            Gratis beginnen
            <ArrowRight className="h-3.5 w-3.5" />
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
            <Link href="/auth/signin"
              className="inline-flex items-center justify-center gap-2 font-semibold text-white px-7 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors">
              Begin gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#functies"
              className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl border border-gray-200 text-gray-900 bg-white hover:bg-gray-50 transition-colors">
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
              { icon: Star,       label: "Gratis basisplan" },
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
          className="relative pr-16"
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
function Features() {
  const features = [
    { icon: BookOpen,   title: "Meerdere bijbelvertalingen",    desc: "Lees de Statenvertaling, BasisBijbel en andere vertalingen. Vergelijk verzen naast elkaar voor dieper begrip." },
    { icon: Lightbulb,  title: "10 begeleide bijbelstudies",    desc: "Verdiep je in samengestelde studies over bijbelse personen (Abraham, David, Paulus), gebeurtenissen en thema's - met per les een gerichte passagevraag." },
    { icon: StickyNote, title: "Persoonlijke notities",         desc: "Maak aantekeningen bij verzen, markeer tekst en organiseer uw bijbelstudienotities op één plek." },
    { icon: Library,    title: "Bijbelcommentaren",             desc: "Toegang tot gerenommeerde commentaren zoals Matthew Henry en Karl August Dachsel bij elk bijbelgedeelte." },
    { icon: Users,      title: "Bijbelgroepen",                 desc: "Studeer samen met anderen in een bijbelgroep. Deel notities, bespreek teksten en groei samen in Bijbelkennis." },
    { icon: BarChart2,  title: "Voortgang bijhouden",           desc: "Houd bij hoeveel u gelezen heeft, bouw een leestreeks op en zie uw studiegewoonten groeien." },
  ]

  return (
    <section id="functies" className="py-20" style={{ backgroundColor: T.card }}>
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-6">
        <SectionHeader
          label="Functies"
          title="Alles wat u nodig heeft voor bijbelstudie"
          subtitle="Van bijbeltekst tot studiehulpmiddelen - BijbelStudie brengt alles samen in één overzichtelijk platform."
        />

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              variants={{
                hidden:  { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-6 rounded-xl border cursor-default"
              style={{
                borderColor: T.border,
                backgroundColor: T.light,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: T.tealLight }}>
                <Icon className="h-5 w-5" style={{ color: T.teal }} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: T.text }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: T.muted }}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Methods ────────────────────────────────────────────────── */
function Methods() {
  const methods = [
    { icon: Layers,    name: "Inductieve methode", tag: "Grondig",       steps: ["Observeer de tekst nauwkeurig", "Interpreteer de betekenis", "Pas toe op uw leven"],             tagColor: T.teal },
    { icon: FileText,  name: "SOAP methode",        tag: "Dagelijks",     steps: ["Schrift - schrijf het vers op", "Observatie - wat zegt het?", "Toepassing & Gebed"],             tagColor: "#6366F1" },
    { icon: Lightbulb, name: "SOLVAT methode",      tag: "Systematisch",  steps: ["Selecteer · Observeer · Lees context", "Verken de achtergrond", "Analyseer · Toepassen"],       tagColor: "#0284C7" },
    { icon: Heart,     name: "Lectio Divina",        tag: "Contemplatief", steps: ["Lectio - lees langzaam", "Meditatio - overweeg", "Oratio · Contemplatio"],                      tagColor: "#DB2777" },
  ]

  return (
    <section id="methoden" className="py-20" style={{ backgroundColor: T.bg }}>
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-6">
        <SectionHeader
          label="Studiemethoden"
          title="Bewezen methoden voor diepere bijbelstudie"
          subtitle="Kies de methode die past bij uw doel en beschikbare tijd."
        />

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {methods.map(({ icon: Icon, name, tag, steps, tagColor }) => (
            <motion.div
              key={name}
              variants={{
                hidden:  { opacity: 0, y: 32 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
              }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white rounded-xl border p-5 flex flex-col cursor-default"
              style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: tagColor + "18" }}>
                  <Icon className="h-5 w-5" style={{ color: tagColor }} />
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: tagColor + "15", color: tagColor }}>
                  {tag}
                </span>
              </div>
              <h3 className="font-bold text-sm mb-3" style={{ color: T.text }}>{name}</h3>
              <ul className="space-y-2 mt-auto">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: T.muted }}>
                    <span className="font-bold mt-px flex-shrink-0" style={{ color: tagColor }}>{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <FadeUp delay={0.1} className="text-center mt-8">
          <Link href="/auth/signin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            Bekijk alle methoden in detail
            <ArrowRight className="h-4 w-4" />
          </Link>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─── How it works ───────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { num: "01", icon: Users,        title: "Maak een gratis account aan",      desc: "Registreer u met uw e-mailadres of log in met Google. Uw voortgang en notities worden automatisch opgeslagen." },
    { num: "02", icon: BookOpen,     title: "Kies een bijbelboek of leesplan",  desc: "Begin direct met lezen of schrijf u in voor een leesplan. Kies uw favoriete bijbelvertaling." },
    { num: "03", icon: MessageSquare, title: "Studeer met bewezen methoden",    desc: "Gebruik de inductieve methode, SOAP of een andere methode om dieper in de tekst door te dringen." },
  ]

  return (
    <section className="py-20" style={{ backgroundColor: T.card }}>
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-6">
        <SectionHeader label="Hoe het werkt" title="In drie stappen aan de slag" />

        <div className="grid lg:grid-cols-3 gap-8">
          {steps.map(({ num, icon: Icon, title, desc }, i) => (
            <FadeUp key={num} delay={i * 0.12}>
              <div className="relative">
                {i < 2 && (
                  <div className="hidden lg:block absolute top-5 left-full w-full h-px -translate-x-8 z-0"
                    style={{ backgroundColor: T.border }} />
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: T.teal }}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-black tracking-widest" style={{ color: T.teal }}>STAP {num}</span>
                  </div>
                  <h3 className="font-bold text-base mb-2" style={{ color: T.text }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: T.muted }}>{desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
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
              <Link href="/subscribe"
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
    { q: "Welke bijbelvertalingen zijn beschikbaar?",  a: "Wij ondersteunen de Statenvertaling, Herziene Statenvertaling, Elberfelder 1905, Luther 1912, Schlachter 2000 en meer. Het aanbod groeit regelmatig." },
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
            Geen creditcard vereist · Gratis basisplan · Altijd opzegbaar
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
        <Features />
        <Methods />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
