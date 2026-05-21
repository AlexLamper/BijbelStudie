"use client"

import Link from "next/link"
import {
  BookOpen, Layers, Book, FlaskConical, Heart,
  Lightbulb, ExternalLink, ArrowRight,
  BookMarked, Globe, GraduationCap, Scroll, ChevronRight,
} from "lucide-react"

/* ── Data ───────────────────────────────────────────────────────── */
const METHODS = [
  {
    id: "inductief",
    name: "Inductieve Bijbelstudie",
    tagline: "De meest grondige methode voor serieuze bijbelstudenten",
    icon: Layers,
    accentBg: "rgba(13,148,136,0.1)",
    accentText: "#0D9488",
    duration: "45-90 min",
    level: "Gevorderd",
    levelBg: "rgba(13,148,136,0.1)",
    levelText: "#0D9488",
    steps: [
      { title: "Observeer", description: "Lees de tekst meerdere keren en noteer alles wat je ziet. Stel de vragen: Wie? Wat? Wanneer? Waar? Hoe? Waarom? Markeer sleutelwoorden en herhalingen." },
      { title: "Interpreteer", description: "Zoek de betekenis. Wat wilde de auteur overbrengen? Gebruik context, historische achtergrond en parallelgedeelten." },
      { title: "Toepassen", description: "Wat betekent dit voor mij vandaag? Welke waarheid moet ik geloven, welke zonde belijden, welke belofte ontvangen?" },
    ],
    tip: "Begin altijd met bidden om leiding van de Heilige Geest. De Bijbel vraagt geestelijk onderscheid.",
  },
  {
    id: "soap",
    name: "SOAP Methode",
    tagline: "Eenvoudig dagelijks bijbellezen met diepgang",
    icon: Book,
    accentBg: "rgba(59,130,246,0.1)",
    accentText: "#3B82F6",
    duration: "15-30 min",
    level: "Beginner",
    levelBg: "rgba(34,197,94,0.1)",
    levelText: "#16A34A",
    steps: [
      { letter: "S", title: "Schrift", description: "Schrijf het vers of de passage over om langzamer te lezen en beter te onthouden." },
      { letter: "O", title: "Observatie", description: "Noteer wat de tekst zegt. Welke woorden vallen op? Zoek woorden op die je niet begrijpt." },
      { letter: "A", title: "Toepassing", description: "Hoe is deze waarheid van toepassing op jouw leven? Wees concreet en persoonlijk." },
      { letter: "P", title: "Gebed", description: "Schrijf een gebed dat voortkomt uit wat je leerde. Bedank God en vraag om kracht om het te leven." },
    ],
    tip: "De SOAP methode is ideaal voor dagelijks bijbellezen. Bewaar je notitieboekje - je kijkt er later met dankbaarheid op terug.",
  },
  {
    id: "solvat",
    name: "SOLVAT Methode",
    tagline: "Systematische en grondige Bijbelstudie",
    icon: FlaskConical,
    accentBg: "rgba(139,92,246,0.1)",
    accentText: "#7C3AED",
    duration: "60-120 min",
    level: "Gevorderd",
    levelBg: "rgba(139,92,246,0.1)",
    levelText: "#7C3AED",
    steps: [
      { letter: "S", title: "Selecteer een passage", description: "Kies een passage en lees die meerdere keren door, ook in andere vertalingen." },
      { letter: "O", title: "Observeer nauwkeurig", description: "Noteer alle feiten: personen, plaatsen, tijden, beloften, geboden. Markeer verbindingswoorden." },
      { letter: "L", title: "Lees de context", description: "Bestudeer de directe context, het boek, en de bredere Bijbelse context." },
      { letter: "V", title: "Verken de achtergrond", description: "Onderzoek de historische, culturele en geografische achtergrond van de passage." },
      { letter: "A", title: "Analyseer de betekenis", description: "Formuleer de centrale boodschap in één zin. Wat wilde de auteur overbrengen?" },
      { letter: "T", title: "Toepassen op het leven", description: "Trek tijdloze principes. Schrijf concrete actiepunten. Deel eventueel wat je leerde." },
    ],
    tip: "Besteed minimaal 30 minuten per sessie. De vruchten zijn de investering waard.",
  },
  {
    id: "lectio",
    name: "Lectio Divina",
    tagline: "Contemplatief Bijbellezen uit de kloostertraditie",
    icon: Heart,
    accentBg: "rgba(244,63,94,0.1)",
    accentText: "#E11D48",
    duration: "20-45 min",
    level: "Alle niveaus",
    levelBg: "rgba(245,158,11,0.1)",
    levelText: "#D97706",
    steps: [
      { title: "Lectio", description: "Lees de passage langzaam en hardop, twee of drie keer. Let op welk woord bij je blijft hangen." },
      { title: "Meditatio", description: "Laat het woord in je gedachten rondgaan. Welke gedachten of beelden komen op?" },
      { title: "Oratio", description: "Reageer op God vanuit wat je ontving. Dit is een persoonlijk gesprek, geen formeel gebed." },
      { title: "Contemplatio", description: "Rust stilzwijgend in Gods aanwezigheid. Laat woorden los. Wees eenvoudig aanwezig bij God." },
    ],
    tip: "Lectio Divina gaat om ontmoeting met God door Zijn Woord, niet om informatievergaring. Neem de tijd.",
  },
]

const RESOURCES = [
  {
    category: "Online Bijbeltools",
    icon: Globe,
    iconBg: "rgba(13,148,136,0.1)",
    iconColor: "#0D9488",
    items: [
      { name: "BijbelStudie.nl", desc: "Bijbelcommentaren en studiegidsen in het Nederlands", href: "https://www.bijbelstudie.nl" },
      { name: "Blue Letter Bible", desc: "Griekse en Hebreeuwse lexicons en commentaren", href: "https://www.blueletterbible.org" },
      { name: "Bible Hub", desc: "Parallelle vertalingen en uitgebreide commentaren", href: "https://biblehub.com" },
      { name: "BijbelGenootschap", desc: "Nederlandse Bijbelvertaling en bijbelonderwijs", href: "https://www.bijbelgenootschap.nl" },
    ],
  },
  {
    category: "Aanbevolen Boeken",
    icon: BookMarked,
    iconBg: "rgba(59,130,246,0.1)",
    iconColor: "#3B82F6",
    items: [
      { name: "Bijbel lezen met begrip - Gordon Fee", desc: "Klassiek handboek voor hermeneutiek en exegese", href: "#" },
      { name: "Het Oude Testament spreekt - Vriezen", desc: "Standaardwerk voor OT-studie in het Nederlands", href: "#" },
      { name: "Inleiding op het Nieuwe Testament - Guthrie", desc: "Uitgebreide inleiding op de boeken van het NT", href: "#" },
      { name: "Hoe lees ik de Bijbel? - Goldingay", desc: "Toegankelijke gids voor Bijbellezen en -begrijpen", href: "#" },
    ],
  },
]

const GLOSSARY = [
  { term: "Exegese", def: "Het zorgvuldig uitleggen van een Bijbeltekst vanuit de originele taal, cultuur en context - letterlijk 'uit de tekst halen'." },
  { term: "Hermeneutiek", def: "De wetenschap van de Bijbeluitleg: de principes en methoden die helpen om teksten correct te interpreteren." },
  { term: "Context", def: "De directe omgeving van een Bijbeltekst (zinnen ervoor en erna), de bredere context van het boek, en de gehele Bijbel als context." },
  { term: "Canoniek", def: "Behorend tot de erkende verzameling van Bijbelboeken die door de kerk als gezaghebbend wordt beschouwd." },
  { term: "Pericoop", def: "Een afgebakend gedeelte uit de Bijbel dat een afgeronde eenheid vormt - zoals een gelijkenis of een verhaal." },
  { term: "Parallelpassage", def: "Een ander Bijbelgedeelte dat hetzelfde onderwerp behandelt of hetzelfde verhaal vertelt vanuit een ander perspectief." },
  { term: "Typologie", def: "Personen, gebeurtenissen of instellingen uit het OT worden gezien als voorafschaduwing van wat in het NT vervuld wordt." },
  { term: "Allegorie", def: "Een verhaal of tekst die een verborgen, diepere betekenis heeft naast de letterlijke betekenis." },
]

/* ── Method section ─────────────────────────────────────────────── */
function MethodSection({ method }: { method: typeof METHODS[0] }) {
  const Icon = method.icon
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: method.accentBg }}>
          <Icon className="h-5 w-5" style={{ color: method.accentText }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h3 className="font-bold text-base text-gray-900 dark:text-foreground">{method.name}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: method.levelBg, color: method.levelText }}>
              {method.level}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-muted-foreground">{method.tagline}</p>
          <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1">{method.duration} per sessie</p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-5">
        {method.steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {step.letter ? (
                <div className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: method.accentBg, color: method.accentText }}>
                  {step.letter}
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-secondary flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-muted-foreground">
                  {i + 1}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-foreground">{step.title}</p>
              <p className="text-sm text-gray-500 dark:text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="flex gap-3 p-3.5 rounded-xl"
        style={{ backgroundColor: "rgba(13,148,136,0.05)", border: "1px solid rgba(13,148,136,0.15)" }}>
        <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#0D9488" }} />
        <p className="text-sm text-gray-700 dark:text-foreground/80 leading-relaxed">{method.tip}</p>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function ResourcesPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 xl:px-10 py-8 space-y-12">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#0D9488" }}>
            Bibliotheek
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground mb-2">
            Hulpbronnen
          </h1>
          <p className="text-gray-500 dark:text-muted-foreground text-sm max-w-2xl">
            Bewezen studiemethoden, externe tools en een begrippenlijst - alles op één plek om Gods Woord dieper te verstaan.
          </p>
        </div>

        {/* ── Studiemethoden ────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
              <Scroll className="h-4 w-4" style={{ color: "#0D9488" }} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-foreground">Studiemethoden</h2>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">Vier bewezen manieren om de Bijbel te bestuderen</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {METHODS.map(method => (
              <MethodSection key={method.id} method={method} />
            ))}
          </div>

          <div className="mt-5">
            <Link href="/studie"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0D9488" }}>
              <BookOpen className="h-4 w-4" />
              Pas een methode toe in de Bijbelstudie
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* ── Hulpmiddelen ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(59,130,246,0.08)" }}>
              <Globe className="h-4 w-4" style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-foreground">Hulpmiddelen</h2>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">Externe tools en boeken om je studie te verdiepen</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {RESOURCES.map(cat => (
              <div key={cat.category}
                className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cat.iconBg }}>
                    <cat.icon className="h-4 w-4" style={{ color: cat.iconColor }} />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-foreground">{cat.category}</h3>
                </div>
                <div className="space-y-3.5">
                  {cat.items.map(item => (
                    <a key={item.name} href={item.href}
                      target="_blank" rel="noopener noreferrer"
                      className="group flex items-start gap-2.5 hover:opacity-75 transition-opacity">
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-foreground transition-colors" />
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-foreground leading-snug group-hover:underline">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { href: "/notities",  label: "Mijn notities",  icon: BookOpen },
              { href: "/studies",  label: "Studies",         icon: BookMarked },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-secondary text-gray-700 dark:text-foreground hover:bg-gray-200 dark:hover:bg-secondary/80 transition-colors">
                <Icon className="h-4 w-4" style={{ color: "#0D9488" }} />
                {label}
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Begrippenlijst ────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(124,58,237,0.08)" }}>
              <GraduationCap className="h-4 w-4" style={{ color: "#7C3AED" }} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-foreground">Begrippenlijst</h2>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">Veelgebruikte termen in Bijbelstudie en theologie</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GLOSSARY.map(({ term, def }) => (
              <div key={term}
                className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-5">
                <p className="font-bold text-sm text-gray-900 dark:text-foreground mb-1.5">{term}</p>
                <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">{def}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 p-4 rounded-xl"
            style={{ backgroundColor: "rgba(13,148,136,0.04)", border: "1px solid rgba(13,148,136,0.12)" }}>
            <Lightbulb className="h-4 w-4 flex-shrink-0" style={{ color: "#0D9488" }} />
            <p className="text-sm text-gray-700 dark:text-foreground">
              Mis je een begrip? De begrippenlijst wordt regelmatig uitgebreid.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
