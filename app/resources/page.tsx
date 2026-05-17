"use client"

import { useState } from "react"
import {
  BookOpen,
  Search,
  Eye,
  MessageSquare,
  Heart,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  FlaskConical,
  Book,
} from "lucide-react"

interface Method {
  id: string
  name: string
  tagline: string
  icon: React.ElementType
  color: string
  steps: { letter?: string; title: string; description: string }[]
  tip: string
}

const METHODS: Method[] = [
  {
    id: "inductief",
    name: "Inductieve Bijbelstudie",
    tagline: "De meest grondige methode voor serieuze bijbelstudenten",
    icon: Layers,
    color: "bg-brand/10 text-brand dark:bg-brand/15",
    steps: [
      {
        title: "Observeer",
        description:
          "Lees de tekst meerdere keren en noteer alles wat je ziet. Stel vragen: Wie? Wat? Wanneer? Waar? Hoe? Waarom? Markeer sleutelwoorden en herhalingen. Observeer de structuur van de passage zonder interpretaties.",
      },
      {
        title: "Interpreteer",
        description:
          "Zoek de betekenis van de tekst. Wat wilde de auteur de oorspronkelijke lezers vertellen? Gebruik context (hoofdstuk, boek, Bijbel als geheel), historische achtergrond en andere Bijbelgedeelten. Raadpleeg commentaren.",
      },
      {
        title: "Toepassen",
        description:
          "Vraag je af: Wat betekent dit voor mij vandaag? Hoe kan ik dit in de praktijk brengen? Welke waarheid moet ik geloven, welke zonde belijden, welke belofte ontvangen, welk voorbeeld volgen?",
      },
    ],
    tip: "Begin altijd met bidden om leiding van de Heilige Geest. De Bijbel is Gods levend Woord en vraagt geestelijk onderscheid.",
  },
  {
    id: "soap",
    name: "SOAP Methode",
    tagline: "Eenvoudig dagelijks bijbellezen met diepgang",
    icon: Book,
    color: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    steps: [
      {
        letter: "S",
        title: "Schrift",
        description:
          "Schrijf het vers of de passage over die je hebt gekozen. Het handmatig opschrijven helpt je langzamer te lezen en beter te onthouden. Kies een passage die je aanspreekt of volg een leesplan.",
      },
      {
        letter: "O",
        title: "Observatie",
        description:
          "Noteer wat de tekst zegt. Wat valt je op? Welke woorden of zinnen zijn bijzonder? Zoek woorden op die je niet begrijpt. Noteer de context en structuur van de passage.",
      },
      {
        letter: "A",
        title: "Toepassing",
        description:
          "Hoe is deze waarheid van toepassing op jouw leven vandaag? Schrijf een concrete, persoonlijke toepassing. Wees specifiek: niet 'ik moet meer vertrouwen' maar 'ik ga vandaag mijn zorgen over X aan God geven'.",
      },
      {
        letter: "P",
        title: "Gebed",
        description:
          "Schrijf een gebed dat voortkomt uit wat je hebt geleerd. Bedank God voor de waarheid die je ontdekt hebt, vraag Hem om kracht om het toe te passen, en bid voor anderen in het licht van de passage.",
      },
    ],
    tip: "De SOAP methode is ideaal voor dagelijks bijbellezen. Bewaar je notitieboekje — je kijkt er later met dankbaarheid op terug.",
  },
  {
    id: "solvat",
    name: "SOLVAT Methode",
    tagline: "Systematische en grondige Bijbelstudie",
    icon: FlaskConical,
    color: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
    steps: [
      {
        letter: "S",
        title: "Selecteer een passage",
        description:
          "Kies een passage die je wilt bestuderen. Dit kan een vers, een pericoop of een heel hoofdstuk zijn. Lees het meerdere keren door in verschillende vertalingen.",
      },
      {
        letter: "O",
        title: "Observeer nauwkeurig",
        description:
          "Noteer alle feiten: personen, plaatsen, tijden, gebeurtenissen, beloften, geboden. Markeer verbindingswoorden (want, maar, opdat, omdat) die de logica van de tekst onthullen.",
      },
      {
        letter: "L",
        title: "Lees de context",
        description:
          "Bestudeer de directe context (voor en na de passage), de context van het hele boek, en de bredere Bijbelse context. Een tekst zonder context is een voorwendsel.",
      },
      {
        letter: "V",
        title: "Verken de achtergrond",
        description:
          "Onderzoek de historische, culturele en geografische achtergrond. Wie was de auteur? Wie waren de eerste lezers? Wat was de situatie? Gebruik Bijbelatlassen, commentaren en woordenboeken.",
      },
      {
        letter: "A",
        title: "Analyseer de betekenis",
        description:
          "Formuleer de centrale boodschap van de passage in één zin. Wat wilde de auteur onder de inspiratie van de Heilige Geest overbrengen? Hoe sluit dit aan bij de centrale boodschap van het Bijbelboek?",
      },
      {
        letter: "T",
        title: "Toepassen op het leven",
        description:
          "Trek principes die tijdloos zijn en toepasbaar op vandaag. Schrijf concrete actiepunten. Deel eventueel met anderen wat je geleerd hebt — onderwijs verdiept begrip.",
      },
    ],
    tip: "Besteed minimaal 30 minuten per sessie. De SOLVAT methode is grondiger dan andere methoden en vraagt meer tijd, maar de vruchten zijn het waard.",
  },
  {
    id: "lectio",
    name: "Lectio Divina",
    tagline: "Contemplatief Bijbellezen uit de kloostertraditie",
    icon: Heart,
    color: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    steps: [
      {
        title: "Lectio — Lezen",
        description:
          "Lees de passage langzaam en hardop. Lees het twee of drie keer. Let op welk woord of welke zin bij je blijft hangen. Dit is geen analyseren maar ontvankelijk luisteren.",
      },
      {
        title: "Meditatio — Overwegen",
        description:
          "Laat het woord of de zin in je gedachten rondgaan. Herhaal het stil. Wat spreekt je aan? Welke gedachten, herinneringen of beelden komen op? Laat de tekst tot je hart spreken.",
      },
      {
        title: "Oratio — Bidden",
        description:
          "Reageer op God vanuit wat je ontving. Spreek eerlijk met God over wat er in je opkwam. Dit is een persoonlijk gesprek, geen formeel gebed.",
      },
      {
        title: "Contemplatio — Rusten",
        description:
          "Rust stilzwijgend in Gods aanwezigheid. Laat woorden los. Wees eenvoudig aanwezig bij God die aanwezig is bij jou. Dit kan vijf minuten zijn of langer.",
      },
    ],
    tip: "Lectio Divina is minder 'analytisch' dan andere methoden. Het gaat om ontmoeting met God door Zijn Woord, niet om informatievergaring.",
  },
]

const RESOURCES = [
  {
    category: "Online Bijbeltools",
    items: [
      { name: "BijbelStudie.nl", desc: "Bijbelcommentaren en studiegidsen in het Nederlands", href: "#" },
      { name: "Blue Letter Bible", desc: "Griekse en Hebreeuwse lexicons, commentaren (Engels)", href: "#" },
      { name: "Bible Hub", desc: "Parallelle vertalingen en uitgebreide commentaren (Engels)", href: "#" },
    ],
  },
  {
    category: "Aanbevolen Boeken",
    items: [
      { name: "Bijbel lezen met begrip — Gordon Fee", desc: "Klassiek handboek voor hermeneutiek en exegese", href: "#" },
      { name: "Het Oude Testament spreekt — Vriezen", desc: "Standaardwerk voor OT-studie in het Nederlands", href: "#" },
      { name: "Inleiding op het Nieuwe Testament — Guthrie", desc: "Uitgebreide inleiding op de boeken van het NT", href: "#" },
    ],
  },
  {
    category: "Bijbelatlassen & Kaarten",
    items: [
      { name: "Bijbelatlas", desc: "Geografische kaarten van Bijbelse locaties", href: "#" },
      { name: "Tijdlijn van de Bijbel", desc: "Chronologisch overzicht van Bijbelse geschiedenis", href: "#" },
    ],
  },
]

function MethodCard({ method }: { method: Method }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      id={method.id}
      className="bg-card border border-border rounded-xl overflow-hidden transition-shadow hover:shadow-sm"
    >
      <button
        className="w-full text-left p-6 flex items-start gap-4"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className={`h-11 w-11 rounded-xl ${method.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <method.icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-lg text-foreground">{method.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{method.tagline}</p>
        </div>
        <div className="flex-shrink-0 mt-1">
          {open ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 animate-slide-up">
          <div className="border-t border-border pt-4">
            <div className="space-y-4">
              {method.steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0">
                    {step.letter ? (
                      <div className={`h-8 w-8 rounded-full ${method.color} flex items-center justify-center font-bold text-sm`}>
                        {step.letter}
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                        {i + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 bg-brand/5 dark:bg-brand/10 border border-brand/20 rounded-lg p-4 flex gap-3">
              <Lightbulb className="h-4 w-4 text-brand flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground leading-relaxed">{method.tip}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResourcesPage() {
  return (
    <div className="px-6 xl:px-10 py-8 max-w-5xl space-y-12 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          Hulpbronnen
        </h1>
        <p className="text-muted-foreground">
          Bewezen Bijbelstudiemethoden en hulpmiddelen om Gods Woord dieper te verstaan.
        </p>
      </div>

      {/* Study methods */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
            Studiemethoden
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <p className="text-sm text-muted-foreground">
          Klik op een methode om de stappen te zien. Kies de methode die past bij jouw doel en beschikbare tijd.
        </p>

        <div className="space-y-3">
          {METHODS.map((method) => (
            <MethodCard key={method.id} method={method} />
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
            Vergelijking
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Methode</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Tijdsduur</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Niveau</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Geschikt voor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">Inductief</td>
                <td className="px-4 py-3 text-muted-foreground">45–90 min</td>
                <td className="px-4 py-3"><span className="bg-brand/10 text-brand text-xs px-2 py-0.5 rounded-full">Gevorderd</span></td>
                <td className="px-4 py-3 text-muted-foreground">Diepgaande studie</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">SOAP</td>
                <td className="px-4 py-3 text-muted-foreground">15–30 min</td>
                <td className="px-4 py-3"><span className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs px-2 py-0.5 rounded-full">Beginner</span></td>
                <td className="px-4 py-3 text-muted-foreground">Dagelijks lezen</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">SOLVAT</td>
                <td className="px-4 py-3 text-muted-foreground">60–120 min</td>
                <td className="px-4 py-3"><span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs px-2 py-0.5 rounded-full">Gevorderd</span></td>
                <td className="px-4 py-3 text-muted-foreground">Systematische studie</td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">Lectio Divina</td>
                <td className="px-4 py-3 text-muted-foreground">20–45 min</td>
                <td className="px-4 py-3"><span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs px-2 py-0.5 rounded-full">Alle niveaus</span></td>
                <td className="px-4 py-3 text-muted-foreground">Gebed & meditatie</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* External resources */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
            Aanbevolen bronnen
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map((category) => (
            <div key={category.category} className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-sm text-foreground mb-3">{category.category}</h3>
              <div className="space-y-3">
                {category.items.map((item) => (
                  <div key={item.name} className="group">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-none">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA to study */}
      <div className="bg-gradient-to-r from-primary/5 via-brand/5 to-primary/5 border border-border rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">
            Klaar om te beginnen?
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Open de Bijbelstudietool en gebruik een van deze methoden direct.
          </p>
        </div>
        <a
          href="/study"
          className="inline-flex items-center gap-2 bg-brand text-brand-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand/90 transition-colors flex-shrink-0"
        >
          <BookOpen className="h-4 w-4" />
          Open Bijbelstudie
        </a>
      </div>
    </div>
  )
}
