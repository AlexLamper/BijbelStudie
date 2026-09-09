"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { CHAPTER_COUNTS } from "../lib/data/bible-chapter-counts"
import type { DailyVerse } from "../components/dashboard/DailyVerseCard"

/**
 * Everything the dashboard shows, fetched once and derived in one place.
 *
 * The design variants under /dashboard/versie-* read from this hook so
 * they differ in layout only, never in numbers. The endpoints and the parsing
 * are the ones `app/dashboard/page.tsx` uses - the current dashboard is left
 * untouched on purpose so it can be compared against the variants.
 */

/* ── Dutch Bible book names (66), canonical order ───────────────── */
export const OT_BOOKS: readonly string[] = [
  "Genesis", "Exodus", "Leviticus", "Numeri", "Deuteronomium",
  "Jozua", "Richteren", "Ruth", "1 Samuël", "2 Samuël",
  "1 Koningen", "2 Koningen", "1 Kronieken", "2 Kronieken", "Ezra",
  "Nehemia", "Esther", "Job", "Psalmen", "Spreuken",
  "Prediker", "Hooglied", "Jesaja", "Jeremia", "Klaagliederen",
  "Ezechiël", "Daniël", "Hosea", "Joël", "Amos",
  "Obadja", "Jona", "Micha", "Nahum", "Habakuk",
  "Zefanja", "Haggaï", "Zacharia", "Maleachi",
]
export const NT_BOOKS: readonly string[] = [
  "Mattheüs", "Markus", "Lukas", "Johannes", "Handelingen",
  "Romeinen", "1 Korinthe", "2 Korinthe", "Galaten", "Efeziërs",
  "Filippenzen", "Kolossenzen", "1 Thessalonicenzen", "2 Thessalonicenzen", "1 Timotheüs",
  "2 Timotheüs", "Titus", "Filémon", "Hebreeën", "Jakobus",
  "1 Petrus", "2 Petrus", "1 Johannes", "2 Johannes", "3 Johannes",
  "Judas", "Openbaring",
]
export const ALL_BOOKS: readonly string[] = [...OT_BOOKS, ...NT_BOOKS]
/** 1189, computed rather than typed so it can never drift from the counts table. */
export const TOTAL_CHAPTERS = ALL_BOOKS.reduce((sum, book) => sum + (CHAPTER_COUNTS[book] ?? 0), 0)

export interface LastRead { book: string; chapter: number; version: string }
export interface WeekDay { label: string; count: number; heightPct: number; isToday: boolean }
export interface LevelInfo {
  level: number
  xp: number
  progressPercentage: number
  xpIntoLevel: number
  xpForNextLevel: number
}
export interface RecentNote {
  _id: string
  book: string
  chapter: number
  verse?: number
  noteText: string
  createdAt: string
}
/** Lessons, studies and plans, from the same gamification call that carries the level. */
export interface StudyCounts { lessonsCompleted: number; studiesCompleted: number; plansActive: number }
export type { DailyVerse }

export const EMPTY_WEEK: WeekDay[] = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map(label => ({
  label, count: 0, heightPct: 0, isToday: false,
}))

export function getGreeting(name: string, date = new Date()): string {
  const h = date.getHours()
  if (h >= 0 && h < 6) return `Goedenacht, ${name}`
  if (h < 12) return `Goedemorgen, ${name}`
  if (h < 18) return `Goedemiddag, ${name}`
  if (h < 22) return `Goedenavond, ${name}`
  return `Goedenacht, ${name}`
}

/** "Dinsdag 8 september" - only the first letter raised, unlike CSS `capitalize`. */
export function formatDate(date = new Date()): string {
  const label = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function readHref(book: string, chapter: number, version = "statenvertaling"): string {
  return `/lezen?book=${encodeURIComponent(book)}&chapter=${chapter}&version=${encodeURIComponent(version)}`
}

/** Local calendar day, so a note written at 23:30 still counts as today. */
export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export function useDashboardData() {
  const { data: session } = useSession()

  const [lastRead, setLastRead] = useState<LastRead | null>(null)
  const [level, setLevel] = useState<LevelInfo | null>(null)
  const [studyCounts, setStudyCounts] = useState<StudyCounts | null>(null)
  const [verse, setVerse] = useState<DailyVerse | null>(null)
  const [streak, setStreak] = useState(0)
  const [lastStreakDate, setLastStreakDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verseLoading, setVerseLoading] = useState(true)
  const [notesCount, setNotesCount] = useState(0)
  const [weekDays, setWeekDays] = useState<WeekDay[]>([])
  const [weekTotal, setWeekTotal] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([])
  const [readChapters, setReadChapters] = useState<Record<string, number[]>>({})
  const [greeting, setGreeting] = useState("")
  const [dateLabel, setDateLabel] = useState("")

  const firstName = session?.user?.name?.split(" ")[0] || "Gebruiker"

  // Greeting and date are computed on the client, in the reader's own
  // timezone, and refreshed every minute so they stay right across midnight.
  useEffect(() => {
    const tick = () => {
      setGreeting(getGreeting(firstName))
      setDateLabel(formatDate())
    }
    tick()
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [firstName])

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
      // Three notes are rendered and the total comes back in `pagination`.
      fetch("/api/notes?limit=3"),
      fetch("/api/user/reading-progress"),
      fetch("/api/v1/gamification"),
    ])
      .then(rs => Promise.all(rs.map(r => r.ok ? r.json() : null)))
      .then(([ud, ld, nd, rp, gd]) => {
        setStreak(ud?.user?.streak ?? 0)
        setLastStreakDate(ud?.user?.lastStreakDate ?? null)

        const lr = ld?.book ? ld : ld?.lastReadChapter
        if (lr?.book) setLastRead({ book: lr.book, chapter: lr.chapter, version: lr.version })

        if (Array.isArray(nd?.notes)) {
          setNotesCount(nd.pagination?.totalCount ?? nd.notes.length)
          // The endpoint already sorts by createdAt descending.
          setRecentNotes(nd.notes.slice(0, 3))
        }

        if (rp?.readChapters) setReadChapters(rp.readChapters)

        if (gd?.level) {
          setLevel({
            level: gd.level,
            xp: gd.xp ?? 0,
            progressPercentage: gd.progressPercentage ?? 0,
            xpIntoLevel: gd.xpIntoLevel ?? 0,
            xpForNextLevel: gd.xpForNextLevel ?? 0,
          })
          setStudyCounts({
            lessonsCompleted: gd.lessonsCompleted ?? 0,
            studiesCompleted: gd.studiesCompleted ?? 0,
            plansActive: gd.plansActive ?? 0,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const derived = useMemo(() => {
    const bookReadCount = (book: string) => (readChapters[book] ?? []).length
    const bookReadRatio = (book: string) => bookReadCount(book) / (CHAPTER_COUNTS[book] ?? 1)
    let chaptersRead = 0
    let booksWithProgress = 0
    let booksCompleted = 0
    for (const book of ALL_BOOKS) {
      const read = bookReadCount(book)
      chaptersRead += read
      if (read > 0) booksWithProgress += 1
      if (read >= (CHAPTER_COUNTS[book] ?? Infinity)) booksCompleted += 1
    }
    return { bookReadCount, bookReadRatio, chaptersRead, booksWithProgress, booksCompleted }
  }, [readChapters])

  const days = weekDays.length ? weekDays : EMPTY_WEEK
  const todayCount = days.find(d => d.isToday)?.count ?? 0
  const readToday = todayCount > 0
  const noteToday = recentNotes.some(n => isToday(n.createdAt))
  const streakToday = isToday(lastStreakDate)

  return {
    // identity and time
    firstName, greeting, dateLabel,
    // raw
    lastRead, level, studyCounts, verse, streak, notesCount, recentNotes, readChapters,
    weekDays: days, weekTotal,
    // loading flags, one per fetch group, as on the current dashboard
    loading, verseLoading, statsLoading,
    // derived
    todayCount, readToday, noteToday, streakToday,
    ...derived,
  }
}

export type DashboardData = ReturnType<typeof useDashboardData>
