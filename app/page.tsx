import Link from "next/link"
import Image from "next/image"
import {
  BookOpen, BookMarked, StickyNote, Library, Search,
  ArrowRight, Check, ChevronDown, Users, Shield,
  Layers, FileText, Heart, Lightbulb, BarChart2,
  Clock, Star, MessageSquare,
} from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "BijbelStudie — Online Bijbelstudie Platform",
  description:
    "Bestudeer de Bijbel systematisch met commentaren, leesplannen en bewezen studiemethoden. Gratis beginnen.",
}

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

/* ─── App UI Mockup (hero illustration) ─────────────────────── */
function AppMockup() {
  const rows = ["Genesis 1", "Johannes 3", "Psalm 23", "Mattheüs 5"]
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl border"
      style={{ borderColor: T.border, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Titlebar */}
      <div className="flex items-center gap-1.5 px-4 py-3" style={{ backgroundColor: "#111827" }}>
        <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>bijbel-studie.com</span>
      </div>

      {/* App shell */}
      <div className="flex" style={{ backgroundColor: T.bg }}>
        {/* Mini sidebar */}
        <div className="w-36 flex-shrink-0 py-3 px-2" style={{ backgroundColor: T.sidebar }}>
          <div className="flex items-center gap-1.5 px-2 mb-4">
            <div className="h-4 w-4 rounded flex items-center justify-center" style={{ backgroundColor: T.teal }}>
              <span className="text-white text-xs font-bold" style={{ fontSize: 8 }}>B</span>
            </div>
            <span className="text-white font-semibold" style={{ fontSize: 10 }}>BijbelStudie</span>
          </div>
          {[
            { label: "Dashboard", active: true },
            { label: "Bijbelstudie", active: false },
            { label: "Leesplannen", active: false },
            { label: "Notities", active: false },
          ].map(({ label, active }) => (
            <div
              key={label}
              className="px-2 py-1.5 rounded-lg mb-0.5"
              style={{
                backgroundColor: active ? "rgba(13,148,136,0.2)" : "transparent",
                color: active ? "#2DD4BF" : "rgba(255,255,255,0.45)",
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                borderLeft: active ? "2px solid #0D9488" : "2px solid transparent",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 space-y-2.5">
          {/* Header row */}
          <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2" style={{ border: `1px solid ${T.border}` }}>
            <span className="font-semibold" style={{ fontSize: 11, color: T.text }}>Dashboard</span>
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-14 rounded" style={{ backgroundColor: T.bg }} />
              <div className="h-5 w-5 rounded-full" style={{ backgroundColor: T.teal }} />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "Dagreeks",     val: "12 d." },
              { label: "Notities",     val: "34" },
              { label: "Leesplan",     val: "68%" },
              { label: "Hoofdstukken", val: "142" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg p-2 border" style={{ borderColor: T.border }}>
                <p className="font-bold" style={{ fontSize: 11, color: T.text }}>{s.val}</p>
                <p style={{ fontSize: 8, color: T.muted }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Verse card */}
          <div className="bg-white rounded-lg p-3 border" style={{ borderColor: T.border }}>
            <p style={{ fontSize: 8, color: T.teal, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Vers van de dag</p>
            <p style={{ fontSize: 9, color: T.text, fontStyle: "italic", fontFamily: "Georgia, serif", lineHeight: 1.5 }}>
              &ldquo;Uw woord is een lamp voor mijn voet...&rdquo;
            </p>
            <p style={{ fontSize: 8, color: T.teal, marginTop: 4, fontWeight: 600 }}>Psalm 119:105</p>
          </div>

          {/* Recent chapters */}
          <div className="bg-white rounded-lg p-2 border" style={{ borderColor: T.border }}>
            <p style={{ fontSize: 8, color: T.muted, fontWeight: 600, marginBottom: 4 }}>Recent gelezen</p>
            <div className="space-y-1">
              {rows.map(r => (
                <div key={r} className="flex items-center justify-between">
                  <span style={{ fontSize: 9, color: T.text }}>{r}</span>
                  <div className="h-1 w-10 rounded-full" style={{ backgroundColor: T.tealLight }}>
                    <div className="h-1 rounded-full" style={{ width: "60%", backgroundColor: T.teal }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white" style={{ borderColor: T.border }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/favicon.ico" alt="" width={26} height={26} className="rounded-md" priority />
          <span className="font-bold text-base" style={{ color: T.text }}>BijbelStudie</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { href: "#functies",  label: "Functies" },
            { href: "#methoden",  label: "Methoden" },
            { href: "#prijzen",   label: "Prijzen" },
            { href: "#faq",       label: "FAQ" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
    <section className="py-20 lg:py-28" style={{ backgroundColor: T.light }}>
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">

        {/* Text */}
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 border text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ borderColor: "#99F6E4", backgroundColor: T.tealLight, color: T.tealText }}>
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.teal }} />
            Online Bijbelstudie Platform — Gratis starten
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight"
            style={{ color: T.text }}>
            Bestudeer de Bijbel<br />
            <span style={{ color: T.teal }}>grondig en systematisch</span>
          </h1>

          <p className="text-lg leading-relaxed" style={{ color: T.muted }}>
            BijbelStudie geeft u de tools om de Bijbel diep en persoonlijk te bestuderen.
            Met bewezen methoden, meerdere vertalingen en persoonlijke notities.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Link href="/auth/signin"
              className="inline-flex items-center justify-center gap-2 font-semibold text-white px-7 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors">
              Begin gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#functies"
              className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl border border-gray-200 text-gray-900 bg-white hover:bg-gray-50 transition-colors">
              Bekijk functies
            </Link>
          </div>

          {/* Trust row */}
          <div className="flex items-center gap-6 pt-2">
            {[
              { icon: Users,  label: "500+ gebruikers" },
              { icon: Star,   label: "Gratis basisplan" },
              { icon: Shield, label: "Privacy-first" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-sm" style={{ color: T.muted }}>
                <Icon className="h-4 w-4" style={{ color: T.teal }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* App mockup */}
        <div className="relative">
          <AppMockup />
        </div>
      </div>
    </section>
  )
}

/* ─── Features ───────────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: BookOpen,
      title: "Meerdere bijbelvertalingen",
      desc: "Lees en vergelijk de Statenvertaling, Herziene Statenvertaling, King James Version en meer vertalingen naast elkaar.",
    },
    {
      icon: BookMarked,
      title: "Gestructureerde leesplannen",
      desc: "Lees de Bijbel systematisch door met begeleide leesplannen. Houd uw voortgang bij en ontvang dagelijkse leesporties.",
    },
    {
      icon: StickyNote,
      title: "Persoonlijke notities",
      desc: "Maak aantekeningen bij verzen, markeer tekst en organiseer uw bijbelstudienotities op één plek.",
    },
    {
      icon: Library,
      title: "Bijbelcommentaren",
      desc: "Toegang tot gerenommeerde commentaren zoals Matthew Henry en King's Comments bij elk bijbelgedeelte.",
    },
    {
      icon: Search,
      title: "Zoeken en vergelijken",
      desc: "Doorzoek de hele Bijbel op woord of thema. Bekijk verzen in meerdere vertalingen tegelijk.",
    },
    {
      icon: BarChart2,
      title: "Voortgang bijhouden",
      desc: "Houd bij hoeveel u gelezen heeft, bouw een leestreeks op en zie uw studiegewoonten groeien.",
    },
  ]

  return (
    <section id="functies" className="py-20" style={{ backgroundColor: T.card }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: T.teal }}>Functies</p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>
            Alles wat u nodig heeft voor bijbelstudie
          </h2>
          <p className="mt-4 text-base" style={{ color: T.muted }}>
            Van bijbeltekst tot studiehulpmiddelen — BijbelStudie brengt alles samen in één overzichtelijk platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl border transition-shadow hover:shadow-sm"
              style={{ borderColor: T.border, backgroundColor: T.light }}>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: T.tealLight }}>
                <Icon className="h-5 w-5" style={{ color: T.teal }} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: T.text }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: T.muted }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Methods ────────────────────────────────────────────────── */
function Methods() {
  const methods = [
    {
      icon: Layers,
      name: "Inductieve methode",
      tag: "Grondig",
      steps: ["Observeer de tekst nauwkeurig", "Interpreteer de betekenis", "Pas toe op uw leven"],
      tagColor: T.teal,
    },
    {
      icon: FileText,
      name: "SOAP methode",
      tag: "Dagelijks",
      steps: ["Schrift — schrijf het vers op", "Observatie — wat zegt het?", "Toepassing & Gebed"],
      tagColor: "#6366F1",
    },
    {
      icon: Lightbulb,
      name: "SOLVAT methode",
      tag: "Systematisch",
      steps: ["Selecteer · Observeer · Lees context", "Verken de achtergrond", "Analyseer · Toepassen"],
      tagColor: "#0284C7",
    },
    {
      icon: Heart,
      name: "Lectio Divina",
      tag: "Contemplatief",
      steps: ["Lectio — lees langzaam", "Meditatio — overweeg", "Oratio · Contemplatio"],
      tagColor: "#DB2777",
    },
  ]

  return (
    <section id="methoden" className="py-20" style={{ backgroundColor: T.bg }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: T.teal }}>Studiemethoden</p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>
            Bewezen methoden voor diepere bijbelstudie
          </h2>
          <p className="mt-4 text-base" style={{ color: T.muted }}>
            Kies de methode die past bij uw doel en beschikbare tijd.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {methods.map(({ icon: Icon, name, tag, steps, tagColor }) => (
            <div key={name} className="bg-white rounded-xl border p-5 flex flex-col"
              style={{ borderColor: T.border }}>
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
                    <span className="font-bold mt-px flex-shrink-0" style={{ color: tagColor }}>
                      {i + 1}.
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/auth/signin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            Bekijk alle methoden in detail
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─── How it works ───────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: Users,
      title: "Maak een gratis account aan",
      desc: "Registreer u met uw e-mailadres of log in met Google. Uw voortgang en notities worden automatisch opgeslagen.",
    },
    {
      num: "02",
      icon: BookOpen,
      title: "Kies een bijbelboek of leesplan",
      desc: "Begin direct met lezen of schrijf u in voor een leesplan. Kies uw favoriete bijbelvertaling.",
    },
    {
      num: "03",
      icon: MessageSquare,
      title: "Studeer met bewezen methoden",
      desc: "Gebruik de inductieve methode, SOAP of een andere methode om dieper in de tekst door te dringen.",
    },
  ]

  return (
    <section className="py-20" style={{ backgroundColor: T.card }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: T.teal }}>Hoe het werkt</p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>
            In drie stappen aan de slag
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {steps.map(({ num, icon: Icon, title, desc }, i) => (
            <div key={num} className="relative">
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
    "Matthew Henry commentaar",
    "King's Comments commentaar",
    "Historische context per hoofdstuk",
    "Prioriteitsondersteuning",
  ]

  return (
    <section id="prijzen" className="py-20" style={{ backgroundColor: T.bg }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: T.teal }}>Prijzen</p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>
            Begin gratis, groei verder
          </h2>
          <p className="mt-4 text-base" style={{ color: T.muted }}>
            Geen creditcard vereist voor het gratis plan.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-white rounded-2xl border p-8" style={{ borderColor: T.border }}>
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
              className="block text-center font-semibold py-3 rounded-xl border text-sm transition-colors"
              style={{ borderColor: T.border, color: T.text }}>
              Gratis beginnen
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl p-8 relative overflow-hidden"
            style={{ backgroundColor: T.sidebar }}>
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
              className="block text-center font-semibold py-3 rounded-xl text-sm transition-colors"
              style={{ backgroundColor: T.teal, color: "white" }}>
              Pro proberen
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ ────────────────────────────────────────────────────── */
function FAQ() {
  const faqs = [
    {
      q: "Is BijbelStudie helemaal gratis?",
      a: "Het gratis plan geeft volledige toegang tot bijbellezen, notities, leesplannen en studiemethoden. De Pro versie (€9,99/maand) voegt commentaren en geavanceerde functies toe.",
    },
    {
      q: "Welke bijbelvertalingen zijn beschikbaar?",
      a: "Wij ondersteunen onder andere de Statenvertaling, Herziene Statenvertaling, King James Version, American Standard Version, Elberfelder en meer. Het aanbod groeit regelmatig.",
    },
    {
      q: "Worden mijn notities opgeslagen?",
      a: "Ja. Al uw notities en voortgang worden automatisch opgeslagen in uw persoonlijke account en zijn op elk apparaat beschikbaar.",
    },
    {
      q: "Hoe werkt een leesplan?",
      a: "U schrijft zich in voor een leesplan en ontvangt dagelijkse leesporties. Uw voortgang wordt bijgehouden en u kunt op elk moment verdergaan waar u gebleven was.",
    },
    {
      q: "Is mijn persoonlijke data veilig?",
      a: "Ja. Wij gebruiken beveiligde verbindingen (HTTPS/TLS) en slaan uw gegevens versleuteld op. Uw data wordt nooit verkocht aan derden.",
    },
  ]

  return (
    <section id="faq" className="py-20" style={{ backgroundColor: T.card }}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: T.teal }}>FAQ</p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>
            Veelgestelde vragen
          </h2>
        </div>

        <div className="divide-y" style={{ borderColor: T.border }}>
          {faqs.map(({ q, a }) => (
            <details key={q} className="group py-0">
              <summary
                className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none select-none font-semibold text-sm"
                style={{ color: T.text }}>
                {q}
                <ChevronDown
                  className="h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-180"
                  style={{ color: T.muted }} />
              </summary>
              <p className="pb-5 text-sm leading-relaxed" style={{ color: T.muted }}>
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── CTA ────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section className="py-20" style={{ backgroundColor: T.sidebar }}>
      <div className="max-w-3xl mx-auto px-6 text-center space-y-7">
        <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
          Klaar om de Bijbel te bestuderen?
        </h2>
        <p className="text-base" style={{ color: "#9CA3AF" }}>
          Maak in minder dan een minuut een gratis account aan en begin vandaag nog.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/signin"
            className="inline-flex items-center justify-center gap-2 font-semibold text-white px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors">
            Gratis beginnen
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="#functies"
            className="inline-flex items-center justify-center gap-2 font-semibold px-8 py-3.5 rounded-xl border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors">
            Meer informatie
          </Link>
        </div>
        <p className="text-xs" style={{ color: "#6B7280" }}>
          Geen creditcard vereist · Gratis basisplan · Altijd opzegbaar
        </p>
      </div>
    </section>
  )
}

/* ─── Footer ─────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="py-14 border-t" style={{ backgroundColor: "#111827", borderColor: "#1F2937" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/images/favicon.ico" alt="" width={22} height={22} className="rounded-md" />
              <span className="font-bold text-white text-sm">BijbelStudie</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
              Online bijbelstudie platform voor serieuze bijbelstudenten. Gratis beginnen, altijd.
            </p>
          </div>

          {[
            {
              title: "Platform",
              links: [
                { label: "Bijbelstudie",  href: "/auth/signin" },
                { label: "Leesplannen",   href: "/auth/signin" },
                { label: "Notities",      href: "/auth/signin" },
                { label: "Hulpbronnen",  href: "/auth/signin" },
              ],
            },
            {
              title: "Methoden",
              links: [
                { label: "Inductieve methode", href: "/auth/signin" },
                { label: "SOAP methode",       href: "/auth/signin" },
                { label: "SOLVAT methode",     href: "/auth/signin" },
                { label: "Lectio Divina",      href: "/auth/signin" },
              ],
            },
            {
              title: "Informatie",
              links: [
                { label: "Contact",            href: "/contact" },
                { label: "Privacybeleid",      href: "/privacy-policy" },
                { label: "Servicevoorwaarden", href: "/terms-of-service" },
                { label: "Pro abonnement",     href: "/subscribe" },
              ],
            },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#9CA3AF" }}>
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors"
                      style={{ color: "#6B7280" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "#1F2937" }}>
          <p className="text-xs" style={{ color: "#4B5563" }}>
            © {new Date().getFullYear()} BijbelStudie. Alle rechten voorbehouden.
          </p>
          <p className="text-xs" style={{ color: "#4B5563" }}>
            Gemaakt voor serieuze bijbelstudenten
          </p>
        </div>
      </div>
    </footer>
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
