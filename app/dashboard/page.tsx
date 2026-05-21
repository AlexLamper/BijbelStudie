"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BookOpen, Flame, ArrowRight, ChevronRight,
  StickyNote, CalendarCheck2, BarChart2, Lightbulb, Clock,
} from "lucide-react"
import Image from "next/image"
import { curatedStudies, BADGE_STYLES } from "../../lib/data/curated-studies"

/* ── Dutch Bible book names (66) ─────────────────────────── */
const OT = [
  "Genesis","Exodus","Leviticus","Numeri","Deuteronomium",
  "Jozua","Richteren","Ruth","1 Samuël","2 Samuël",
  "1 Koningen","2 Koningen","1 Kronieken","2 Kronieken","Ezra",
  "Nehemia","Esther","Job","Psalmen","Spreuken",
  "Prediker","Hooglied","Jesaja","Jeremia","Klaagliederen",
  "Ezechiël","Daniël","Hosea","Joël","Amos",
  "Obadja","Jona","Micha","Nahum","Habakuk",
  "Zefanja","Haggaï","Zacharia","Maleachi",
]
const NT = [
  "Mattheüs","Markus","Lukas","Johannes","Handelingen",
  "Romeinen","1 Korinthe","2 Korinthe","Galaten","Efeziërs",
  "Filippenzen","Kolossenzen","1 Thessalonicenzen","2 Thessalonicenzen","1 Timotheüs",
  "2 Timotheüs","Titus","Filémon","Hebreeën","Jakobus",
  "1 Petrus","2 Petrus","1 Johannes","2 Johannes","3 Johannes",
  "Judas","Openbaring",
]

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim()
}

const NL_TO_EN: Record<string, string> = {
  "genesis":"genesis","exodus":"exodus","leviticus":"leviticus","numeri":"numbers",
  "deuteronomium":"deuteronomy","jozua":"joshua","richtere":"judges","ruth":"ruth",
  "1 samuel":"1 samuel","2 samuel":"2 samuel","1 koningen":"1 kings","2 koningen":"2 kings",
  "1 kronieken":"1 chronicles","2 kronieken":"2 chronicles","ezra":"ezra","nehemia":"nehemiah",
  "esther":"esther","job":"job","psalmen":"psalms","spreuken":"proverbs",
  "prediker":"ecclesiastes","hooglied":"song of solomon","jesaja":"isaiah","jeremia":"jeremiah",
  "klaagliederen":"lamentations","ezechiel":"ezekiel","daniel":"daniel","hosea":"hosea",
  "joel":"joel","amos":"amos","obadja":"obadiah","jona":"jonah","micha":"micah",
  "nahum":"nahum","habakuk":"habakkuk","zefanja":"zephaniah","haggai":"haggai",
  "zacharia":"zechariah","maleachi":"malachi","mattheus":"matthew","markus":"mark",
  "lukas":"luke","johannes":"john","handelingen":"acts","romeinen":"romans",
  "1 korinthe":"1 corinthians","2 korinthe":"2 corinthians","galaten":"galatians",
  "efeziers":"ephesians","filippenzen":"philippians","kolossenzen":"colossians",
  "1 thessalonicenzen":"1 thessalonians","2 thessalonicenzen":"2 thessalonians",
  "1 timotheus":"1 timothy","2 timotheus":"2 timothy","titus":"titus",
  "filemon":"philemon","hebreeen":"hebrews","jakobus":"james",
  "1 petrus":"1 peter","2 petrus":"2 peter","1 johannes":"1 john","2 johannes":"2 john",
  "3 johannes":"3 john","judas":"jude","openbaring":"revelation",
}

function bookMatchesNote(dutchBook: string, noteBook: string): boolean {
  const d = norm(dutchBook)
  const n = norm(noteBook)
  if (d === n) return true
  const enEquiv = NL_TO_EN[d]
  if (enEquiv && enEquiv === n) return true
  return false
}

interface LastRead   { book: string; chapter: number; version: string }
interface Plan       { _id: string; title: string; progressPercentage: number; completedDays: number; duration: number }
interface DailyVerse { text: string; reference: string; book: string; chapter: number }
interface WeekDay    { label: string; count: number; heightPct: number; isToday: boolean }

function greeting(name: string) {
  const h = new Date().getHours()
  return `${h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond"}, ${name}`
}
function formatDate() {
  return new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })
}

export default function DashboardPage() {
  const { data: session } = useSession()

  const [lastRead, setLastRead]     = useState<LastRead | null>(null)
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [verse, setVerse]           = useState<DailyVerse | null>(null)
  const [streak, setStreak]         = useState(0)
  const [notedBooks, setNotedBooks] = useState<Set<string>>(new Set())
  const [loading, setLoading]           = useState(true)
  const [verseLoading, setVerseLoading] = useState(true)
  const [notesCount, setNotesCount]     = useState(0)
  const [weekDays, setWeekDays]         = useState<WeekDay[]>([])
  const [weekTotal, setWeekTotal]       = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [recentNotes, setRecentNotes]   = useState<Array<{ _id: string; book: string; chapter: number; verse?: number; noteText: string; createdAt: string }>>([])

  useEffect(() => {
    fetch("/api/user/weekly-stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.days) { setWeekDays(d.days); setWeekTotal(d.totalThisWeek ?? 0) } })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

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
      fetch("/api/notes?limit=500"),
      fetch("/api/bible-plans"),
    ])
      .then(rs => Promise.all(rs.map(r => r.ok ? r.json() : null)))
      .then(([ud, ld, nd, pd]) => {
        setStreak(ud?.user?.streak ?? 0)

        const lr = ld?.book ? ld : ld?.lastReadChapter
        if (lr?.book) setLastRead(lr)

        if (Array.isArray(nd?.notes)) {
          setNotesCount(nd.notes.length)
          const books = new Set<string>()
          for (const n of nd.notes) {
            if (n.book) books.add(norm(n.book))
          }
          setNotedBooks(books)
          const sorted = [...nd.notes].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          setRecentNotes(sorted.slice(0, 3))
        }

        const enrolled = pd?.plans?.find(
          (p: Plan) => p.progressPercentage != null && p.progressPercentage > 0
        )
        if (enrolled) setActivePlan(enrolled)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const firstName = session?.user?.name?.split(" ")[0] || "Gebruiker"

  function bookState(book: string): "current" | "studied" | "default" {
    const isCurrent = lastRead?.book ? bookMatchesNote(book, lastRead.book) : false
    const isStudied = [...notedBooks].some(nb =>
      bookMatchesNote(book, nb) || NL_TO_EN[norm(book)] === nb
    )
    if (isCurrent) return "current"
    if (isStudied) return "studied"
    return "default"
  }

  const studiedCount = OT.concat(NT).filter(b => bookState(b) !== "default").length

  const EMPTY_DAYS = ["Ma","Di","Wo","Do","Vr","Za","Zo"].map(l => ({ label: l, count: 0, heightPct: 0, isToday: false }))
  const days = weekDays.length ? weekDays : EMPTY_DAYS

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{greeting(firstName)}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">{formatDate()}</p>
          </div>
          {streak > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mt-1"
              style={{ backgroundColor: "rgba(234,88,12,0.08)", color: "#EA580C" }}>
              <Flame size={12} /> {streak} dagen
            </span>
          )}
        </div>
      </div>

      {/* ── Main ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 xl:px-10 py-6 grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 items-start">

          {/* ── Left column ───────────────────────────── */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* Hero CTA - most prominent element */}
            <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)" }}>
              {loading ? (
                <div className="flex items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-1/4 rounded animate-pulse bg-white/20" />
                    <div className="h-7 w-1/2 rounded animate-pulse bg-white/20" />
                    <div className="h-3 w-1/3 rounded animate-pulse bg-white/20 mt-1" />
                  </div>
                  <div className="h-10 w-32 rounded-xl animate-pulse bg-white/20 flex-shrink-0" />
                </div>
              ) : lastRead ? (
                <div className="flex items-center justify-between gap-6 flex-wrap">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1.5">
                      Ga verder waar je gebleven was
                    </p>
                    <h2 className="text-2xl font-bold text-white">{lastRead.book}</h2>
                    <p className="text-white/70 text-sm mt-0.5">Hoofdstuk {lastRead.chapter} · {lastRead.version}</p>
                  </div>
                  <Link
                    href={`/studie?book=${encodeURIComponent(lastRead.book)}&chapter=${lastRead.chapter}&version=${encodeURIComponent(lastRead.version)}`}
                    className="flex-shrink-0 bg-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-white/90 transition-colors no-underline"
                    style={{ color: "#0D9488" }}
                  >
                    Doorgaan <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-6 flex-wrap">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1.5">
                      Begin vandaag
                    </p>
                    <h2 className="text-2xl font-bold text-white">Start je bijbelstudie</h2>
                    <p className="text-white/70 text-sm mt-0.5">Lees dag voor dag door de Bijbel.</p>
                  </div>
                  <Link
                    href="/studie"
                    className="flex-shrink-0 bg-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-white/90 transition-colors no-underline"
                    style={{ color: "#0D9488" }}
                  >
                    Begin met lezen <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
                    <div className="h-3 w-1/2 rounded animate-pulse mb-2 bg-gray-100 dark:bg-secondary" />
                    <div className="h-6 w-1/3 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
                  </div>
                ))
              ) : [
                { label: "Dagelijkse reeks", value: streak > 0 ? `${streak} dag${streak === 1 ? "" : "en"}` : "0 dagen", icon: Flame, color: streak > 0 ? "#EA580C" : "#9CA3AF" },
                { label: "Bijbelboeken", value: `${studiedCount} / 66`, icon: BookOpen, color: "#0D9488" },
                { label: "Notities geschreven", value: `${notesCount}`, icon: StickyNote, color: "#0D9488" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
                  <Icon size={14} className="mb-2" style={{ color }} />
                  <p className="text-xl font-bold text-gray-900 dark:text-foreground">{value}</p>
                  <p className="text-xs text-gray-400 dark:text-muted-foreground mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* Bible books overview */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                    <BookOpen size={14} style={{ color: "#0D9488" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-foreground">Bijbelboeken</p>
                    {!loading && (
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">
                        {studiedCount} van 66 {studiedCount === 1 ? "boek" : "boeken"} aangeraakt
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#0D9488" }} />
                    Actief
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "rgba(13,148,136,0.2)" }} />
                    Notities
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-secondary" />
                    Nog te lezen
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-gray-400 dark:text-muted-foreground">
                  Oude Testament <span className="font-normal normal-case">({OT.length} boeken)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {OT.map(book => {
                    const state = loading ? "default" : bookState(book)
                    const isCurrent = state === "current"
                    const isStudied = state === "studied"
                    return (
                      <Link key={book} href={`/studie?book=${encodeURIComponent(book)}&chapter=1&version=statenvertaling`} title={book}
                        className={!isCurrent && !isStudied ? "border border-gray-200 dark:border-border bg-gray-50 dark:bg-secondary text-gray-500 dark:text-muted-foreground" : ""}
                        style={{
                          display: "inline-block", padding: "3px 9px", borderRadius: 6, fontSize: 11.5,
                          fontWeight: isCurrent ? 700 : isStudied ? 500 : 400,
                          ...(isCurrent ? { border: "1px solid #0D9488", backgroundColor: "#0D9488", color: "white" }
                            : isStudied ? { border: "1px solid rgba(13,148,136,0.35)", backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488" }
                            : {}),
                          textDecoration: "none", transition: "all 0.1s", whiteSpace: "nowrap",
                        }}
                      >{book}</Link>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-gray-400 dark:text-muted-foreground">
                  Nieuwe Testament <span className="font-normal normal-case">({NT.length} boeken)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {NT.map(book => {
                    const state = loading ? "default" : bookState(book)
                    const isCurrent = state === "current"
                    const isStudied = state === "studied"
                    return (
                      <Link key={book} href={`/studie?book=${encodeURIComponent(book)}&chapter=1&version=statenvertaling`} title={book}
                        className={!isCurrent && !isStudied ? "border border-gray-200 dark:border-border bg-gray-50 dark:bg-secondary text-gray-500 dark:text-muted-foreground" : ""}
                        style={{
                          display: "inline-block", padding: "3px 9px", borderRadius: 6, fontSize: 11.5,
                          fontWeight: isCurrent ? 700 : isStudied ? 500 : 400,
                          ...(isCurrent ? { border: "1px solid #0D9488", backgroundColor: "#0D9488", color: "white" }
                            : isStudied ? { border: "1px solid rgba(13,148,136,0.35)", backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488" }
                            : {}),
                          textDecoration: "none", transition: "all 0.1s", whiteSpace: "nowrap",
                        }}
                      >{book}</Link>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Samengestelde studies */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                    <Lightbulb size={14} style={{ color: "#0D9488" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-foreground">Samengestelde studies</p>
                    <p className="text-xs text-gray-500 dark:text-muted-foreground">Kies een studie en begin vandaag</p>
                  </div>
                </div>
                <Link href="/studies" className="text-xs font-medium flex items-center gap-0.5 flex-shrink-0" style={{ color: "#0D9488" }}>
                  Alle studies <ChevronRight size={12} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {curatedStudies.slice(0, 4).map(study => {
                  const badge = BADGE_STYLES[study.type]
                  return (
                    <Link
                      key={study.id}
                      href={`/studie?book=${encodeURIComponent(study.startBook)}&chapter=${study.startChapter}&version=${encodeURIComponent(study.startVersion)}`}
                      className="flex items-center rounded-xl overflow-hidden group transition-shadow hover:shadow-md border border-gray-100 dark:border-border"
                      style={{ textDecoration: "none" }}
                    >
                      <div className="relative flex-shrink-0" style={{ width: 88, height: 66 }}>
                        <Image src={study.image} alt={study.title} fill className="object-cover" sizes="88px" />
                      </div>
                      <div className="flex-1 min-w-0 px-3 py-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mb-1"
                          style={{ backgroundColor: badge.bg, color: badge.color }}>
                          {study.type}
                        </span>
                        <p className="text-xs font-semibold leading-tight truncate text-gray-900 dark:text-foreground">{study.title}</p>
                        <p className="text-xs mt-0.5 flex items-center gap-1 text-gray-400 dark:text-muted-foreground">
                          <Clock size={10} /> {study.durationLabel}
                        </p>
                      </div>
                      <div className="flex-shrink-0 pr-3">
                        <ArrowRight size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" style={{ color: "#0D9488" }} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

          </div>

          {/* ── Right sidebar ─────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Vers van de dag */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-5 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-gray-400 dark:text-muted-foreground">
                Vers van de dag
              </p>
              {verseLoading ? (
                <div className="space-y-2.5 border-l-2 pl-4" style={{ borderColor: "#D1FAE5" }}>
                  <div className="h-3.5 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
                  <div className="h-3.5 rounded animate-pulse w-4/5 bg-gray-100 dark:bg-secondary" />
                  <div className="h-3.5 rounded animate-pulse w-3/5 bg-gray-100 dark:bg-secondary" />
                </div>
              ) : verse ? (
                <>
                  <div className="border-l-2 pl-4 mb-4" style={{ borderColor: "#0D9488" }}>
                    <p className="text-gray-700 dark:text-foreground/80"
                      style={{ fontFamily: "Georgia, serif", fontSize: "0.95rem", fontStyle: "italic", lineHeight: 1.8, wordBreak: "break-word", overflowWrap: "break-word" }}>
                      &ldquo;{verse.text}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#0D9488" }}>{verse.reference}</p>
                      <a href="https://bijbelapi.com" target="_blank" rel="noopener noreferrer"
                        className="text-xs hover:underline text-gray-500 dark:text-muted-foreground">
                        via BijbelAPI.com
                      </a>
                    </div>
                    <Link
                      href={`/studie?book=${encodeURIComponent(verse.book)}&chapter=${verse.chapter}&version=statenvertaling`}
                      className="text-xs font-medium whitespace-nowrap text-gray-500 dark:text-muted-foreground">
                      Lees hoofdstuk →
                    </Link>
                  </div>
                </>
              ) : null}
            </div>

            {/* Leesstatistieken */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 size={14} style={{ color: "#0D9488" }} />
                  <p className="text-xs font-bold text-gray-800 dark:text-foreground">Deze week</p>
                </div>
                {!statsLoading && (
                  <span className="text-xs text-gray-400 dark:text-muted-foreground">
                    {weekTotal === 0 ? "Geen activiteit" : `${weekTotal}× gelezen`}
                  </span>
                )}
              </div>
              {statsLoading ? (
                <div className="flex items-end gap-1.5 h-16">
                  {[40,65,30,80,55,70,45].map((h,i) => (
                    <div key={i} className="flex-1 rounded-t-md animate-pulse bg-gray-100 dark:bg-secondary" style={{ height: `${h}%` }} />
                  ))}
                </div>
              ) : (
                <div className="flex items-end gap-1.5 h-16">
                  {days.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                      {d.count > 0 ? (
                        <div className="w-full rounded-t-md transition-all"
                          style={{ height: `${Math.max(d.heightPct, 20)}%`, backgroundColor: d.isToday ? "#0D9488" : "rgba(13,148,136,0.4)" }} />
                      ) : (
                        <div className={`w-full rounded-t-md opacity-40 ${d.isToday ? "" : "bg-gray-200 dark:bg-secondary"}`}
                          style={{ height: "30%", backgroundColor: d.isToday ? "rgba(13,148,136,0.25)" : undefined }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between mt-1.5">
                {days.map((d, i) => (
                  <span key={i} className="flex-1 text-center text-[10px] font-medium"
                    style={{ color: d.isToday ? "#0D9488" : "#9CA3AF" }}>
                    {d.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Leesplan */}
            {(loading || activePlan) && (
              <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-muted-foreground">
                    Leesplan
                  </p>
                  <CalendarCheck2 size={14} style={{ color: "#0D9488" }} />
                </div>
                {loading ? (
                  <div className="h-10 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
                ) : activePlan ? (
                  <>
                    <p className="text-sm font-semibold mb-1 line-clamp-1 text-gray-900 dark:text-foreground">
                      {activePlan.title}
                    </p>
                    <p className="text-xs mb-2.5 text-gray-500 dark:text-muted-foreground">
                      Dag {activePlan.completedDays} van {activePlan.duration} · {activePlan.progressPercentage}%
                    </p>
                    <div className="h-1.5 rounded-full mb-3 bg-gray-100 dark:bg-secondary">
                      <div className="h-1.5 rounded-full"
                        style={{ width: `${activePlan.progressPercentage}%`, backgroundColor: "#0D9488" }} />
                    </div>
                    <Link href="/studies" className="text-xs font-semibold" style={{ color: "#0D9488" }}>
                      Bekijk plan →
                    </Link>
                  </>
                ) : null}
              </div>
            )}

            {/* Recente notities */}
            {(loading || recentNotes.length > 0) && (
              <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-muted-foreground">
                    Recente notities
                  </p>
                  <StickyNote size={14} style={{ color: "#0D9488" }} />
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-3 rounded animate-pulse w-2/5 bg-gray-100 dark:bg-secondary" />
                        <div className="h-3 rounded animate-pulse w-full bg-gray-100 dark:bg-secondary" />
                        <div className="h-3 rounded animate-pulse w-4/5 bg-gray-100 dark:bg-secondary" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {recentNotes.map(note => (
                      <Link
                        key={note._id}
                        href={`/studie?book=${encodeURIComponent(note.book)}&chapter=${note.chapter}&version=statenvertaling`}
                        className="group block"
                        style={{ textDecoration: "none" }}
                      >
                        <p className="text-xs font-semibold group-hover:opacity-80 transition-opacity" style={{ color: "#0D9488" }}>
                          {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {note.noteText}
                        </p>
                      </Link>
                    ))}
                    <Link href="/notities" className="text-xs font-medium pt-0.5" style={{ color: "#0D9488" }}>
                      Alle notities bekijken →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Snel naar */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500 dark:text-muted-foreground">
                Snel naar
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { href: "/studie",  label: "Bijbelstudie",  icon: BookOpen },
                  { href: "/notities",  label: "Mijn notities", icon: StickyNote },
                  { href: "/studies",  label: "Leesplannen",   icon: CalendarCheck2 },
                ].map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 dark:hover:bg-secondary text-gray-700 dark:text-foreground">
                    <Icon size={14} style={{ color: "#0D9488", flexShrink: 0 }} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
