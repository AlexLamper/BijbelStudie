"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import { BookOpen, ChevronLeft, Flag, Flame, Sparkles } from "lucide-react"
import AppShell from "../shell/AppShell"
import { Card, Skeleton } from "../kit/primitives"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog"
import Bookcase, { BOOKCASE_CSS } from "./Bookcase"
import { chapterReaderHref, computeBibleProgress, type BookProgress } from "../../lib/bibleProgress"
import {
  RIBBON_RED,
  SHELF_GROUPS,
  SPINE_LABELS,
  bookcaseLayout,
  firstUnreadChapter,
  formatBiblePercent,
  formatShelfCount,
  groupIndexOf,
  inkOn,
  joinBookNames,
  ladderSteps,
  newlyFinishedBooks,
  nextUnreadChapter,
  readingTable,
  shelfSummary,
  type LadderStep,
} from "../../lib/bookcase"

/**
 * "Bijbelvoortgang" at /profiel/bijbel: "Je boekenkast".
 *
 * A deep-teal case holds the 66 books as spines (components/profile/Bookcase).
 * A spine's width follows its chapter count, its colour rises as chapters are
 * read, a finished book wears gold lettering, and each shelf's brass plaque
 * counts its group. The ladder leaning on the case is the overall bar. Below
 * (beside it on a wide screen): where the leeslint lies, the books on the
 * reading table and the next rung on three tracks. Tapping a spine opens the
 * book with every chapter as a link into the reader.
 *
 * Reads only what the server already returns: `GET /api/user/reading-progress`
 * (folded once more through lib/bibleProgress, as the dashboard card does),
 * `GET /api/user/last-read` for where the leeslint lies, `GET /api/streak`.
 * Nothing here writes, apart from remembering on this device which books were
 * finished last time, so a newly finished one gets its moment. The app's
 * screen is the same page (features/profile/present/bible_progress_screen.dart).
 */

type LoadState = "loading" | "ready" | "error"

/** Finished book names last shown on this device. */
const FINISHED_KEY = "bs.boekenkast.uit"

const easeOutCubic = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3
const varStyle = (vars: Record<string, string | number>): CSSProperties => vars as CSSProperties

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return reduced
}

/** 0-1 over `ms` once `played`; straight to 1 under reduced motion. */
function useIntroClock(played: boolean, reduced: boolean, ms = 1700): number {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!played) return
    if (reduced) {
      setT(1)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const v = Math.min(1, (now - start) / ms)
      setT(v)
      if (v < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [played, reduced, ms])
  return t
}

export default function BibleProgressView() {
  const [state, setState] = useState<LoadState>("loading")
  const [raw, setRaw] = useState<Record<string, unknown>>({})
  const [streak, setStreak] = useState(0)
  const [lastRead, setLastRead] = useState<{ book: string; chapter: number } | null>(null)
  const [fresh, setFresh] = useState<string[]>([])
  const [played, setPlayed] = useState(false)
  const [openBook, setOpenBook] = useState<string | null>(null)
  const reduced = usePrefersReducedMotion()
  const checkedFinished = useRef(false)

  const load = useCallback(() => {
    let cancelled = false
    setState("loading")
    const json = (url: string) =>
      fetch(url, { cache: "no-store" }).then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    Promise.all([
      json("/api/user/reading-progress"),
      json("/api/streak").catch(() => null),
      json("/api/user/last-read").catch(() => null),
    ])
      .then(([progressData, streakData, lastData]) => {
        if (cancelled) return
        setRaw(progressData?.readChapters && typeof progressData.readChapters === "object" ? progressData.readChapters : {})
        setStreak(typeof streakData?.streak === "number" ? streakData.streak : 0)
        const last = lastData?.lastReadChapter
        setLastRead(last?.book ? { book: String(last.book), chapter: Number(last.chapter) || 1 } : null)
        setState("ready")
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => load(), [load])

  const progress = useMemo(() => computeBibleProgress(raw), [raw])
  const layout = useMemo(() => bookcaseLayout(progress), [progress])
  const next = useMemo(() => nextUnreadChapter(progress, lastRead), [progress, lastRead])
  const { totals } = progress

  // Which books are newly finished since this device last showed the case.
  // Once per mount (a ref, so React's development double-run does not eat it).
  useEffect(() => {
    if (state !== "ready" || checkedFinished.current) return
    checkedFinished.current = true
    let before: string[] | null = null
    try {
      const stored = window.localStorage.getItem(FINISHED_KEY)
      const parsed: unknown = stored ? JSON.parse(stored) : null
      before = Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string") : null
    } catch {
      before = null
    }
    try {
      window.localStorage.setItem(FINISHED_KEY, JSON.stringify(progress.books.filter(b => b.completed).map(b => b.name)))
    } catch {
      // Private mode: the next visit treats the case as new.
    }
    setFresh(newlyFinishedBooks(before, progress))
  }, [state, progress])

  // Start the reveal one frame after the case is on screen.
  useEffect(() => {
    if (state !== "ready") return
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPlayed(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [state])

  const t = useIntroClock(played, reduced)
  const climb = easeOutCubic((t - 0.15) / 0.65)
  const count = t >= 1 ? totals.chaptersRead : Math.round(totals.chaptersRead * easeOutCubic(t / 0.6))
  const climbedPct = t >= 1 ? totals.percent : totals.percent * climb
  const marker = climbedPct < 0.1 && climbedPct < totals.percent ? "0%" : formatBiblePercent(climbedPct)
  const fraction = (totals.chaptersRead / Math.max(1, totals.chaptersTotal)) * (t >= 1 ? 1 : climb)

  const table = useMemo(() => readingTable(progress, next?.book.name), [progress, next])
  const steps = useMemo(
    () =>
      ladderSteps({
        chaptersRead: totals.chaptersRead,
        chaptersTotal: totals.chaptersTotal,
        booksStarted: totals.booksStarted,
        streak,
      }),
    [totals, streak],
  )
  const onOpenBook = useCallback((book: BookProgress) => setOpenBook(book.name), [])
  const dialogBook = openBook ? progress.books.find(b => b.name === openBook) ?? null : null
  const restart = progress.books[0]

  return (
    <AppShell title="Bijbelvoortgang" ownHeading>
      <style>{BOOKCASE_CSS}</style>
      <div className="bk mx-auto w-full max-w-[1180px]">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-muted no-underline hover:text-ink"
        >
          <ChevronLeft size={15} aria-hidden="true" />
          Dashboard
        </Link>

        {state === "error" ? (
          <Card className="mt-3 p-5">
            <h1 className="text-[16px] font-bold text-ink">Je boekenkast</h1>
            <p className="mt-1 text-[14px] font-semibold text-ink">Je leesvoortgang kon niet worden geladen.</p>
            <p className="mt-1 text-[13px] text-ink-muted">Controleer je verbinding en probeer het opnieuw.</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 inline-flex items-center rounded-btn border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-body hover:border-line-strong"
            >
              Opnieuw proberen
            </button>
          </Card>
        ) : state === "loading" ? (
          <div role="status" aria-label="Je boekenkast laden" className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Skeleton className="h-[520px] rounded-[22px] max-md:-mx-4 max-md:rounded-none" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-[112px] rounded-[20px]" />
              <Skeleton className="h-[46px] rounded-[14px]" />
              <Skeleton className="mt-4 h-[180px] rounded-card" />
            </div>
          </div>
        ) : (
          <div className={`mt-3 grid items-start gap-x-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] ${played ? "is-played" : ""}`}>
            <section
              aria-labelledby="bk-title"
              className="bk-room relative overflow-hidden max-md:-mx-4 md:rounded-[22px] md:border md:border-line"
            >
              <div className="relative flex items-end justify-between gap-3 px-[22px] pt-5 md:px-7 md:pt-7">
                <div className="min-w-0">
                  <h1
                    id="bk-title"
                    className="font-serif text-[27px] font-semibold leading-[1.1] tracking-[-0.4px] text-ink md:text-[32px]"
                  >
                    Je boekenkast
                  </h1>
                  <p className="mt-[5px] text-[14px] text-ink-body">{boldNumbers(shelfSummary(progress))}</p>
                </div>
                <div className="flex-none text-right">
                  <span className="sr-only">
                    {totals.chaptersRead} van {totals.chaptersTotal} hoofdstukken gelezen, {formatBiblePercent(totals.percent)} van de Bijbel
                  </span>
                  <b
                    aria-hidden="true"
                    className="block text-[30px] font-extrabold leading-none tracking-[-1px] text-teal-dark tabular-nums dark:text-teal-400 md:text-[36px]"
                  >
                    {formatShelfCount(count)}
                  </b>
                  <span aria-hidden="true" className="mt-[5px] block text-[12px] text-ink-muted">
                    van {formatShelfCount(totals.chaptersTotal)} hoofdstukken
                  </span>
                </div>
              </div>

              {fresh.length > 0 && (
                <div className="px-[22px] pt-[10px] md:px-7" aria-live="polite">
                  <span
                    className="bk-in inline-flex items-center gap-[6px] rounded-full py-[5px] pl-[9px] pr-3 text-[12.5px] font-bold text-[#5B4314] shadow-[0_3px_8px_rgba(164,124,44,.2)]"
                    style={{ background: "linear-gradient(90deg,#B98A2E,#F5D98B 45%,#C49533)", ...varStyle({ "--d": "1.5s" }) }}
                  >
                    <Sparkles size={14} aria-hidden="true" />
                    {fresh.length > 3 ? `${joinBookNames(fresh)} nieuw uit` : `Nieuw uit: ${joinBookNames(fresh)}`}
                  </span>
                </div>
              )}

              <div className="relative mx-auto mt-[6px] max-w-[560px] px-[10px]">
                <div aria-hidden="true" className="bk-floor absolute bottom-0 left-[-100vw] right-[-100vw]" style={{ height: `${(46 / 436) * 100}%` }} />
                <div className="relative">
                  <Bookcase
                    layout={layout}
                    fraction={fraction}
                    markerLabel={marker}
                    played={played}
                    current={next?.book.name ?? null}
                    fresh={fresh}
                    pulled={openBook}
                    onOpenBook={onOpenBook}
                  />
                </div>
              </div>
            </section>

            <div className="relative z-[1] flex min-w-0 flex-col max-md:-mt-2 md:max-lg:mt-4">
              {next ? (
                <RibbonCard book={next.book} chapter={next.chapter} fresh={totals.chaptersRead === 0} played={played} onOpen={() => setOpenBook(next.book.name)} />
              ) : (
                <AllReadCard />
              )}
              <Link
                href={next ? chapterReaderHref(next.book, next.chapter) : chapterReaderHref(restart, 1)}
                className="mt-3 flex h-[46px] items-center justify-center rounded-[14px] bg-teal px-4 text-[15px] font-bold text-white no-underline transition-colors hover:bg-teal-dark"
              >
                {next ? `Lees ${next.book.name} ${next.chapter}` : `Begin opnieuw bij ${restart.name} 1`}
              </Link>

              <Section title="Op je leestafel" lede="Boeken die je begonnen bent">
                <ReadingTable books={table} onOpen={onOpenBook} />
              </Section>

              {steps.length > 0 && (
                <Section title="De ladder op" lede="Elke sport is een stuk van de Bijbel">
                  <LadderList steps={steps} played={played} />
                </Section>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogBook != null} onOpenChange={open => { if (!open) setOpenBook(null) }}>
        {dialogBook && (
          <BookDialog
            book={dialogBook}
            leeslint={next && next.book.name === dialogBook.name ? next.chapter : null}
          />
        )}
      </Dialog>
    </AppShell>
  )
}

/** Every number in `text` weighted and in full ink. */
function boldNumbers(text: string): ReactNode {
  return text.split(/(\d[\d.]*)/).map((part, i) =>
    /^\d/.test(part) ? (
      <b key={i} className="font-bold text-ink">
        {part}
      </b>
    ) : (
      part
    ),
  )
}

/** Canonical position by name. */
const BOOK_INDEX: Record<string, number> = Object.fromEntries(
  computeBibleProgress({}).books.map((b, i) => [b.name, i]),
)

/** The book's group, with its colour and plaque name. */
const groupOf = (name: string) => SHELF_GROUPS[groupIndexOf(BOOK_INDEX[name] ?? 0)]

/** A closed book from the front: group colour, darker spine edge, title, rule, ribbon. */
function BookCover({
  title,
  color,
  width = 70,
  height = 90,
  titleSize,
  ruleTop,
  ribbon,
  tilt = 0,
}: {
  title: string
  color: string
  width?: number
  height?: number
  titleSize?: number
  ruleTop?: number
  ribbon?: string | null
  tilt?: number
}) {
  const k = width / 70
  // Shrink so the longest word fits the cover; Lora runs about 0.6 em a letter.
  const longest = Math.max(1, ...title.split(" ").map(w => w.length))
  const size = Math.min(titleSize ?? (title.length > 9 ? 8.6 : 10.5) * k, (width - 18 * k) / (longest * 0.6))
  return (
    <div
      aria-hidden="true"
      className="relative flex-none"
      style={{
        width,
        height,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: color,
          borderRadius: `${3.5 * k}px ${8 * k}px ${8 * k}px ${3.5 * k}px`,
          boxShadow: "0 8px 14px -8px rgba(15,23,42,.5)",
        }}
      >
        <i className="absolute inset-y-0 left-0 block bg-black/[.24]" style={{ width: 7 * k }} />
        {title && (
          <span
            className="absolute line-clamp-2 font-serif font-semibold leading-[1.15] text-white"
            style={{ left: 13 * k, right: 5 * k, top: 11 * k, fontSize: size }}
          >
            {title}
          </span>
        )}
        <i className="absolute block h-px bg-white/50" style={{ left: 13 * k, right: 9 * k, top: ruleTop ?? 40 * k }} />
      </div>
      {ribbon && (
        <i
          className="absolute block"
          style={{
            right: 12 * k,
            bottom: -11 * k,
            width: 8 * k,
            height: 24 * k,
            background: `linear-gradient(90deg, ${ribbon} 50%, color-mix(in srgb, ${ribbon} 86%, black) 50%)`,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
          }}
        />
      )}
    </div>
  )
}

/** "Je leeslint ligt in Exodus 10" with the book and a cell per chapter. */
function RibbonCard({
  book,
  chapter,
  fresh,
  played,
  onOpen,
}: {
  book: BookProgress
  chapter: number
  fresh: boolean
  played: boolean
  onOpen: () => void
}) {
  const color = groupOf(book.name).color
  const kicker = fresh ? "Hier begin je" : "Je leeslint ligt in"
  const cols = book.chapters > 100 ? 25 : 20
  const read = new Set(book.readChapters)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-[14px] rounded-[20px] bg-surface p-4 text-left transition-transform hover:-translate-y-px"
      style={{ boxShadow: "var(--bk-card-shadow)" }}
      aria-label={`${kicker} ${book.name} ${chapter}. ${book.readCount} van ${book.chapters} hoofdstukken gelezen. Bekijk het boek.`}
    >
      <BookCover title={book.name} color={color} width={58} height={80} titleSize={book.name.length > 9 ? 9 : 11} ruleTop={30} ribbon="#C2410C" />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-ink-muted">{kicker}</div>
        <div className="mt-px truncate text-[20px] font-bold tracking-[-0.3px] text-ink">
          {book.name} {chapter}
        </div>
        <div className="mt-2 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden="true">
          {Array.from({ length: book.chapters }, (_, i) => {
            const n = i + 1
            const bg = !played
              ? "var(--bk-ch-empty)"
              : read.has(n)
                ? color
                : n === chapter
                  ? "var(--bk-ch-next)"
                  : "var(--bk-ch-empty)"
            return (
              <i
                key={n}
                className="bk-cell block h-2 rounded-[2px]"
                style={{ background: bg, ...varStyle({ "--d": `${500 + i * 22}ms` }) }}
              />
            )
          })}
        </div>
      </div>
    </button>
  )
}

function AllReadCard() {
  return (
    <div className="flex w-full items-center gap-[14px] rounded-[20px] bg-surface p-4" style={{ boxShadow: "var(--bk-card-shadow)" }}>
      <BookCover title="Bijbel" color="#134E4A" width={58} height={80} titleSize={11} ruleTop={30} />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-ink-muted">Je boekenkast is vol</div>
        <div className="mt-px text-[18px] font-bold tracking-[-0.3px] text-ink">Je hebt de hele Bijbel gelezen</div>
      </div>
    </div>
  )
}

function Section({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <section className="mt-[26px] max-md:px-1">
      <h2 className="font-serif text-[20px] font-semibold tracking-[-0.2px] text-ink">{title}</h2>
      <p className="mt-[3px] text-[13.5px] text-ink-muted">{lede}</p>
      <div className="mt-3">{children}</div>
    </section>
  )
}

const TILTS = [-3, 2, -1.5, 3]

/** "Op je leestafel": books underway, slightly askew, four across, more scroll. */
function ReadingTable({ books, onOpen }: { books: BookProgress[]; onOpen: (book: BookProgress) => void }) {
  if (books.length === 0) {
    return (
      <p className="rounded-[14px] bg-sunken p-[14px] text-[13.5px] text-ink-muted">
        Nog niets op tafel. Open een hoofdstuk in de lezer en het boek ligt hier klaar.
      </p>
    )
  }
  const per = books.length > 4 ? 4.35 : 4
  return (
    <ul className="-mx-1 flex gap-[10px] overflow-x-auto px-1 pb-2 pt-1 [scrollbar-width:thin]">
      {books.map((book, i) => {
        const pct = Math.round((book.readCount / Math.max(1, book.chapters)) * 100)
        return (
          <li
            key={book.name}
            className="bk-in flex-none"
            style={{ width: `calc((100% - ${30}px) / ${per})`, ...varStyle({ "--d": `${650 + Math.min(i, 6) * 110}ms` }) }}
          >
            <button
              type="button"
              onClick={() => onOpen(book)}
              className="group flex w-full flex-col items-center rounded-[12px] pb-1 pt-[6px] text-center outline-none focus-visible:ring-2 focus-visible:ring-teal"
              aria-label={`${book.name}, ${book.readCount} van ${book.chapters} hoofdstukken gelezen`}
            >
              <span className="transition-transform duration-200 group-hover:-translate-y-[3px]">
                <BookCover title={book.name} color={groupOf(book.name).color} ribbon={RIBBON_RED} tilt={TILTS[i % TILTS.length]} />
              </span>
              <b className="mt-[18px] w-full truncate text-[13px] font-semibold text-ink">{book.name}</b>
              <span className="text-[11.5px] text-ink-muted tabular-nums">
                {book.readCount} van {book.chapters}
              </span>
              <span className="mt-[5px] block h-1 w-[56px] max-w-full overflow-hidden rounded-[2px] bg-line">
                <i className="block h-full rounded-[2px] bg-teal" style={{ width: `${Math.max(4, pct)}%` }} />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** "De ladder op": the next rung on each track with a brass bar. */
function LadderList({ steps, played }: { steps: LadderStep[]; played: boolean }) {
  const look = {
    bible: { Icon: Flag, wash: "var(--bk-amber-wash)", ink: "text-[var(--bk-amber)]" },
    books: { Icon: BookOpen, wash: "var(--teal-tint)", ink: "text-teal-dark dark:text-teal-400" },
    streak: { Icon: Flame, wash: "var(--warn-wash)", ink: "text-[#C2410C] dark:text-[#FB923C]" },
  } as const
  return (
    <ul className="rounded-[18px] border border-line bg-surface px-[14px] py-1">
      {steps.map(step => {
        const { Icon, wash, ink } = look[step.track]
        const pct = Math.round(Math.min(1, step.value / Math.max(1, step.target)) * 100)
        return (
          <li key={step.track} className="flex items-center gap-3 border-b border-dashed border-line py-[11px] last:border-b-0">
            <span className={`grid h-9 w-9 flex-none place-items-center rounded-[12px] ${ink}`} style={{ background: wash }}>
              <Icon size={19} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[14.5px] font-semibold text-ink">{step.title}</b>
              <span className="text-[12.5px] text-ink-muted">{step.subtitle}</span>
            </span>
            <span
              className="block h-[6px] w-16 flex-none overflow-hidden rounded-[3px] bg-line"
              role="img"
              aria-label={`${step.value} van ${step.target}`}
            >
              <i
                className="bk-bar block h-full rounded-[3px] bg-[#D4A84B]"
                style={{ width: played ? `${pct}%` : "0%", ...varStyle({ "--d": "900ms" }) }}
              />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** One book: how far along, a read button and every chapter as a link. */
function BookDialog({ book, leeslint }: { book: BookProgress; leeslint: number | null }) {
  const group = groupOf(book.name)
  const color = group.color
  const next = leeslint ?? (book.completed ? 1 : firstUnreadChapter(book))
  const read = new Set(book.readChapters)
  const status = book.completed
    ? `Alle ${book.chapters} hoofdstukken gelezen`
    : book.started
      ? `${book.readCount} van ${book.chapters} hoofdstukken gelezen`
      : `Nog niet begonnen, ${book.chapters} ${book.chapters === 1 ? "hoofdstuk" : "hoofdstukken"}`
  const cellInk = inkOn(color)

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[460px] gap-0 overflow-y-auto border-line bg-surface p-0 sm:rounded-[20px]">
      {/* Portalled out of the page, so it carries the case's theme tokens itself. */}
      <div className="bk p-5 pb-6">
        <div className="flex items-center gap-4 pr-6">
          <BookCover title={SPINE_LABELS[book.name] ?? ""} color={color} width={50} height={66} titleSize={10} ruleTop={28} ribbon={leeslint != null ? RIBBON_RED : null} />
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-ink-muted">{group.plaque}</div>
            <DialogTitle className="font-serif text-[24px] font-semibold leading-[1.2] tracking-normal text-ink">{book.name}</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-[2px] flex items-center gap-2 text-[13px] text-ink-muted">
                {book.completed && (
                  <span
                    className="rounded-[5px] px-[7px] py-[1px] text-[11.5px] font-bold text-[#5B4314]"
                    style={{ background: "linear-gradient(90deg,#B98A2E,#F5D98B 45%,#C49533)" }}
                  >
                    Uit
                  </span>
                )}
                <span>{status}</span>
              </div>
            </DialogDescription>
          </div>
        </div>

        <div className="mt-[18px] flex items-center gap-[10px]">
          <span className="block h-[7px] flex-1 overflow-hidden rounded-full bg-line">
            <i className="block h-full rounded-full" style={{ width: `${Math.max(book.readCount > 0 ? 4 : 0, book.percent)}%`, background: color }} />
          </span>
          <span className="text-[12px] font-bold text-ink-body tabular-nums">{book.percent}%</span>
        </div>

        {leeslint != null && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-body">
            <i
              aria-hidden="true"
              className="block h-4 w-2"
              style={{ background: RIBBON_RED, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }}
            />
            Je leeslint ligt bij hoofdstuk {leeslint}
          </p>
        )}

        <Link
          href={chapterReaderHref(book, next)}
          className="mt-4 flex h-[46px] items-center justify-center rounded-[14px] bg-teal px-4 text-[15px] font-bold text-white no-underline transition-colors hover:bg-teal-dark"
        >
          {book.completed ? `Lees ${book.name} opnieuw` : `Lees ${book.name} ${next}`}
        </Link>

        <div className="mt-[22px] flex items-baseline justify-between">
          <span className="text-[14px] font-semibold text-ink">Hoofdstukken</span>
          <span className="text-[12px] text-ink-muted">Klik om te openen</span>
        </div>
        <ul className="mt-[10px] grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-[6px]">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map(n => {
            const isRead = read.has(n)
            const isNext = n === leeslint
            return (
              <li key={n}>
                <Link
                  href={chapterReaderHref(book, n)}
                  aria-label={`${book.name} ${n}, ${isRead ? "gelezen" : "nog niet gelezen"}${isNext ? ", hier ligt je leeslint" : ""}`}
                  className={`flex h-9 items-center justify-center rounded-[9px] text-[13px] tabular-nums no-underline transition-[filter] hover:brightness-95 ${
                    isRead ? "font-bold" : isNext ? "font-bold" : "bg-sunken font-medium text-ink-muted dark:bg-[#2A2A2A]"
                  }`}
                  style={
                    isRead
                      ? { background: color, color: cellInk }
                      : isNext
                        ? { boxShadow: "inset 0 0 0 1.6px var(--bk-ch-next)", color: "var(--bk-ch-next)" }
                        : undefined
                  }
                >
                  {n}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </DialogContent>
  )
}
