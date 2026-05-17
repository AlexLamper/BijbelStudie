"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ScrollText, CalendarCheck2, PenLine, GraduationCap,
  BookOpen, Flame, ArrowRight, ChevronRight,
  BarChart2, CheckCircle2, Circle, StickyNote,
} from "lucide-react"

/* ── Types ─────────────────────────────────────────────────── */
interface Stats     { streak: number; notesCount: number }
interface LastRead  { book: string; chapter: number; version: string }
interface Plan      { _id: string; title: string; progressPercentage: number; completedDays: number; duration: number }
interface DailyVerse { text: string; reference: string; version: string; book: string }

function greeting(name: string) {
  const h = new Date().getHours()
  const greet = h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond"
  return `${greet}, ${name}`
}

function formatDate() {
  return new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })
}

/* ── Sub-components ─────────────────────────────────────────── */

function VerseCard({ verse, loading }: { verse: DailyVerse | null; loading: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl h-full flex flex-col" style={{ backgroundColor: "#1F2937" }}>
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

      <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px w-6 flex-shrink-0" style={{ backgroundColor: "#0D9488" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6B7280" }}>
            Vers van de dag
          </span>
        </div>

        <blockquote className="flex-1 flex items-center">
          {loading ? (
            <div className="space-y-3 w-full">
              <div className="h-4 rounded-full animate-pulse w-full"  style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
              <div className="h-4 rounded-full animate-pulse w-5/6"  style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
              <div className="h-4 rounded-full animate-pulse w-4/6"  style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
            </div>
          ) : verse ? (
            <p className="leading-loose text-white"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(1.15rem, 2vw, 1.5rem)", fontStyle: "italic" }}>
              &ldquo;{verse.text}&rdquo;
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.45)" }}>
              Vers kon niet worden geladen.
            </p>
          )}
        </blockquote>

        <div className="mt-8 pt-6 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            {loading ? (
              <div className="h-3 w-28 rounded-full animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            ) : verse ? (
              <>
                <p className="font-bold text-sm" style={{ color: "#2DD4BF" }}>{verse.reference}</p>
                <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>Statenvertaling · {verse.book}</p>
              </>
            ) : null}
          </div>
          <Link href="/study"
            className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: "#2DD4BF" }}>
            Lees hoofdstuk <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function StreakCard({ streak, loading }: { streak: number; loading: boolean }) {
  const bars = Array.from({ length: 7 }, (_, i) => i < Math.min(streak, 7))
  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dagreeks</p>
          <p className="text-3xl font-extrabold text-foreground mt-1">
            {loading ? "—" : streak}
            <span className="text-base font-normal text-muted-foreground ml-1.5">dagen</span>
          </p>
        </div>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(234,88,12,0.1)" }}>
          <Flame size={20} style={{ color: "#EA580C" }} />
        </div>
      </div>
      {/* Weekly bar chart */}
      <div className="flex items-end gap-1.5 h-8">
        {bars.map((filled, i) => (
          <div key={i} className="flex-1 rounded-sm"
            style={{
              height: filled ? `${60 + Math.random() * 40}%` : "25%",
              backgroundColor: filled ? "#0D9488" : "#E5E7EB",
              opacity: filled ? 1 : 0.5,
            }} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">Afgelopen 7 dagen</p>
    </div>
  )
}

function ContinueCard({ lastRead, loading }: { lastRead: LastRead | null; loading: boolean }) {
  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
        {lastRead ? "Verder lezen" : "Begin hier"}
      </p>
      {loading ? (
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
      ) : lastRead ? (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(13,148,136,0.1)" }}>
              <BookOpen size={18} style={{ color: "#0D9488" }} />
            </div>
            <div>
              <p className="font-bold text-foreground">{lastRead.book} {lastRead.chapter}</p>
              <p className="text-xs text-muted-foreground">{lastRead.version}</p>
            </div>
          </div>
          <Link href="/study"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#0D9488" }}>
            Doorgaan <ArrowRight size={14} />
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">U heeft nog niet gelezen. Start vandaag.</p>
          <Link href="/study"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#0D9488" }}>
            Begin met lezen <ArrowRight size={14} />
          </Link>
        </>
      )}
    </div>
  )
}

function PlanCard({ plan, loading }: { plan: Plan | null; loading: boolean }) {
  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Leesplan</p>
      {loading ? (
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
      ) : plan ? (
        <div>
          <p className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{plan.title}</p>
          <p className="text-xs text-muted-foreground mb-3">
            Dag {plan.completedDays} van {plan.duration} · {plan.progressPercentage}% voltooid
          </p>
          <div className="h-1.5 rounded-full bg-muted mb-4">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${plan.progressPercentage}%`, backgroundColor: "#0D9488" }} />
          </div>
          <Link href="/plans" className="text-sm font-semibold" style={{ color: "#0D9488" }}>
            Bekijk plan →
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-3">Schrijf u in voor een leesplan om dagelijks bij te houden.</p>
          <Link href="/plans" className="text-sm font-semibold" style={{ color: "#0D9488" }}>
            Bekijk plannen →
          </Link>
        </div>
      )}
    </div>
  )
}

const QUICK = [
  { title: "Bijbelstudie", sub: "Lees & bestudeer de Bijbel",    href: "/study",     icon: ScrollText,     bg: "rgba(13,148,136,0.08)",  ic: "#0D9488" },
  { title: "Leesplannen",  sub: "Volg een gestructureerd plan",   href: "/plans",     icon: CalendarCheck2, bg: "rgba(59,130,246,0.08)",  ic: "#3B82F6" },
  { title: "Notities",     sub: "Al uw bijbelaantekeningen",      href: "/notes",     icon: PenLine,        bg: "rgba(245,158,11,0.08)",  ic: "#D97706" },
  { title: "Hulpbronnen",  sub: "Studiemethoden & materialen",    href: "/resources", icon: GraduationCap,  bg: "rgba(139,92,246,0.08)", ic: "#7C3AED" },
]

const METHODS = [
  { name: "Inductieve methode", steps: ["Observeer", "Interpreteer", "Toepas"], tag: "Grondig" },
  { name: "SOAP methode",       steps: ["Schrift", "Observatie", "Toepassing", "Gebed"], tag: "Dagelijks" },
  { name: "SOLVAT methode",     steps: ["Selecteer", "Observeer", "Lees", "Verken", "Analyseer", "Toepas"], tag: "Systematisch" },
]

/* ── Page ──────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats]         = useState<Stats>({ streak: 0, notesCount: 0 })
  const [lastRead, setLastRead]   = useState<LastRead | null>(null)
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [loading, setLoading]     = useState(true)
  const [verse, setVerse]         = useState<DailyVerse | null>(null)
  const [verseLoading, setVerseLoading] = useState(true)

  useEffect(() => {
    fetch("/api/bible/daytext")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.text) setVerse(d) })
      .catch(() => {})
      .finally(() => setVerseLoading(false))
  }, [])

  useEffect(() => {
    Promise.all([
      fetch("/api/user"),
      fetch("/api/user/last-read"),
      fetch("/api/notes"),
      fetch("/api/bible-plans"),
    ])
      .then(rs => Promise.all(rs.map(r => r.ok ? r.json() : null)))
      .then(([ud, ld, nd, pd]) => {
        setStats({
          streak:     ud?.user?.streak ?? 0,
          notesCount: Array.isArray(nd?.notes) ? nd.notes.length : 0,
        })
        if (ld?.book) setLastRead(ld)
        const enrolled = pd?.plans?.find((p: Plan) => p.progressPercentage != null && p.progressPercentage > 0)
        if (enrolled) setActivePlan(enrolled)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const firstName = session?.user?.name?.split(" ")[0] || "Gebruiker"

  return (
    <div className="h-full flex flex-col">
      {/* Page header — full width */}
      <div className="px-6 xl:px-10 pt-8 pb-6 border-b border-border bg-background flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting(firstName)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full"
            style={{ backgroundColor: "rgba(234,88,12,0.08)", color: "#EA580C" }}>
            <Flame size={14} />
            {loading ? "—" : `${stats.streak} dagenreeks`}
          </div>
          <div className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full"
            style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488" }}>
            <StickyNote size={14} />
            {loading ? "—" : `${stats.notesCount} notities`}
          </div>
        </div>
      </div>

      {/* Main grid — fills remaining height */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 xl:px-10 py-6 grid grid-cols-1 xl:grid-cols-[1fr_340px] 2xl:grid-cols-[1fr_380px] gap-6 h-full">

          {/* LEFT column */}
          <div className="flex flex-col gap-6 min-h-0">

            {/* Featured verse — most prominent element */}
            <div className="min-h-[280px] xl:min-h-[320px]">
              <VerseCard verse={verse} loading={verseLoading} />
            </div>

            {/* Quick navigation — 4 cards full width */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Snel navigeren
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {QUICK.map(q => (
                  <Link key={q.href} href={q.href}
                    className="group bg-white dark:bg-card border border-border rounded-xl p-4 hover:border-opacity-60 hover:shadow-sm transition-all"
                    style={{ borderColor: "#E5E7EB" }}>
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: q.bg }}>
                      <q.icon size={18} style={{ color: q.ic }} />
                    </div>
                    <p className="font-semibold text-sm text-foreground group-hover:text-teal-600 transition-colors">{q.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{q.sub}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Study methods — full width, horizontal */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Studiemethoden</h2>
                <Link href="/resources" className="text-xs font-semibold" style={{ color: "#0D9488" }}>
                  Alle methoden →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {METHODS.map(m => (
                  <Link key={m.name} href="/resources"
                    className="bg-white dark:bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow group">
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-semibold text-sm text-foreground group-hover:text-teal-600 transition-colors">{m.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                        style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488" }}>
                        {m.tag}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {m.steps.map((s, i) => (
                        <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-bold flex-shrink-0 w-3.5" style={{ color: "#0D9488" }}>{i + 1}.</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT column — sticky tools panel */}
          <div className="flex flex-col gap-4">
            <StreakCard streak={stats.streak} loading={loading} />
            <ContinueCard lastRead={lastRead} loading={loading} />
            <PlanCard plan={activePlan} loading={loading} />

            {/* Today's reading checklist */}
            <div className="bg-white dark:bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Vandaag te doen</p>
              <div className="space-y-3">
                {[
                  { label: "Vers van de dag lezen",  done: true },
                  { label: "Bijbelhoofdstuk lezen",   done: !!lastRead },
                  { label: "Leesplan bijhouden",      done: !!activePlan },
                  { label: "Notitie maken",           done: stats.notesCount > 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    {item.done
                      ? <CheckCircle2 size={16} className="flex-shrink-0" style={{ color: "#0D9488" }} />
                      : <Circle       size={16} className="flex-shrink-0" style={{ color: "#D1D5DB" }} />
                    }
                    <span className="text-sm" style={{ color: item.done ? "#0D9488" : "#6B7280", textDecoration: item.done ? "line-through" : "none" }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats quick view */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-card border border-border rounded-xl p-4 text-center">
                <div className="h-8 w-8 rounded-lg mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(59,130,246,0.08)" }}>
                  <BarChart2 size={16} style={{ color: "#3B82F6" }} />
                </div>
                <p className="text-2xl font-extrabold text-foreground">66</p>
                <p className="text-xs text-muted-foreground">Bijbelboeken</p>
              </div>
              <div className="bg-white dark:bg-card border border-border rounded-xl p-4 text-center">
                <div className="h-8 w-8 rounded-lg mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(245,158,11,0.08)" }}>
                  <StickyNote size={16} style={{ color: "#D97706" }} />
                </div>
                <p className="text-2xl font-extrabold text-foreground">{loading ? "—" : stats.notesCount}</p>
                <p className="text-xs text-muted-foreground">Jouw notities</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
