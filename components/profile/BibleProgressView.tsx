"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronLeft } from "lucide-react"
import AppShell from "../shell/AppShell"
import { Card, ProgressBar, Skeleton, StatCard } from "../kit/primitives"
import {
  BOOK_FILTERS,
  chapterReaderHref,
  computeBibleProgress,
  filterBooks,
  type BookFilter,
  type BookProgress,
} from "../../lib/bibleProgress"

/**
 * "Bijbel gelezen" at /profiel/bijbel: all 66 books with the chapters read.
 *
 * Reads the existing `GET /api/user/reading-progress` (the dashboard's own
 * source, already canonicalised server-side) and folds it once more through
 * lib/bibleProgress so every number here matches the dashboard card that links
 * to this page. Nothing on this page writes.
 */

type LoadState = "loading" | "ready" | "error"

export default function BibleProgressView() {
  const [state, setState] = useState<LoadState>("loading")
  const [raw, setRaw] = useState<Record<string, unknown>>({})
  const [filter, setFilter] = useState<BookFilter>("alles")
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  const load = useCallback(() => {
    let cancelled = false
    setState("loading")
    fetch("/api/user/reading-progress", { cache: "no-store" })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(data => {
        if (cancelled) return
        setRaw(data?.readChapters && typeof data.readChapters === "object" ? data.readChapters : {})
        setState("ready")
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => load(), [load])

  const progress = useMemo(() => computeBibleProgress(raw), [raw])
  const { totals } = progress

  const toggle = (name: string) =>
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  const counts: Record<BookFilter, number> = {
    alles: progress.books.length,
    begonnen: filterBooks(progress.books, "begonnen").length,
    voltooid: totals.booksCompleted,
    "niet-begonnen": filterBooks(progress.books, "niet-begonnen").length,
  }

  return (
    <AppShell title="Bijbel gelezen">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-[18px] lg:max-w-[1100px] xl:max-w-[1320px] 2xl:max-w-[1500px]">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-muted no-underline hover:text-ink"
          >
            <ChevronLeft size={15} aria-hidden="true" />
            Dashboard
          </Link>
          <h1 className="mt-2 text-[24px] font-bold tracking-[-0.4px] text-ink">Bijbel gelezen</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">
            Elk hoofdstuk dat je in de lezer opent, telt hier mee. Tik op een boek om de hoofdstukken te zien.
          </p>
        </div>

        {state === "error" ? (
          <Card className="p-5">
            <p className="text-[14px] font-semibold text-ink">Je leesvoortgang kon niet worden geladen.</p>
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
          <div role="status" aria-label="Leesvoortgang laden" className="flex flex-col gap-[18px]">
            <div className="grid grid-cols-3 gap-[13px] max-sm:grid-cols-1">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-[84px] rounded-card" />)}
            </div>
            <Skeleton className="h-[36px] w-2/3 rounded-full" />
            <Skeleton className="h-[420px] rounded-card" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-[13px] max-sm:grid-cols-1">
              <StatCard label="Hoofdstukken gelezen" value={`${totals.chaptersRead}/${totals.chaptersTotal}`} />
              <StatCard label="Boeken voltooid" value={`${totals.booksCompleted}/${totals.booksTotal}`} />
              <Card className="px-[17px] py-[15px]">
                <span className="text-[12px] text-ink-muted">Van de Bijbel</span>
                <div className="mt-[6px] text-[25px] font-bold tracking-[-0.5px] text-ink tabular-nums">
                  {formatPercent(totals.percent)}
                </div>
                <ProgressBar value={totals.percent} height={4} className="mt-2" />
              </Card>
            </div>

            {totals.chaptersRead === 0 && (
              <Card className="p-4">
                <p className="text-[13.5px] text-ink-body">
                  Je hebt nog geen hoofdstukken gelezen. Open een hoofdstuk in de lezer en het verschijnt hier.
                </p>
                <Link
                  href="/lezen"
                  className="mt-2 inline-block text-[13px] font-semibold text-teal no-underline hover:text-teal-dark dark:text-teal-400 dark:hover:text-teal-300"
                >
                  Naar de lezer →
                </Link>
              </Card>
            )}

            <div role="group" aria-label="Boeken filteren" className="flex flex-wrap gap-2">
              {BOOK_FILTERS.map(f => {
                const active = filter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(f.id)}
                    className={`inline-flex items-center gap-[6px] rounded-full px-[15px] py-2 text-[13px] transition-colors ${
                      active
                        ? "bg-teal font-semibold text-white"
                        : "border border-line bg-surface font-medium text-ink-body hover:border-line-strong"
                    }`}
                  >
                    {f.label}
                    <span className={`tabular-nums ${active ? "text-white/80" : "text-ink-faint"}`}>{counts[f.id]}</span>
                  </button>
                )
              })}
            </div>

            <TestamentSection
              title="Oude Testament"
              books={filterBooks(progress.oldTestament, filter)}
              all={progress.oldTestament}
              open={open}
              onToggle={toggle}
            />
            <TestamentSection
              title="Nieuwe Testament"
              books={filterBooks(progress.newTestament, filter)}
              all={progress.newTestament}
              open={open}
              onToggle={toggle}
            />
          </>
        )}
      </div>
    </AppShell>
  )
}

function formatPercent(pct: number): string {
  if (pct > 0 && pct < 0.1) return "<0,1%"
  return `${pct.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`
}

function TestamentSection({
  title,
  books,
  all,
  open,
  onToggle,
}: {
  title: string
  books: BookProgress[]
  all: BookProgress[]
  open: Set<string>
  onToggle: (name: string) => void
}) {
  const read = all.reduce((s, b) => s + b.readCount, 0)
  const total = all.reduce((s, b) => s + b.chapters, 0)
  const done = all.filter(b => b.completed).length

  return (
    <section aria-label={title}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[16px] font-bold text-ink">{title}</h2>
        <span className="text-[12.5px] text-ink-faint tabular-nums">
          {read}/{total} hoofdstukken · {done}/{all.length} boeken voltooid
        </span>
      </div>
      <Card className="overflow-hidden">
        {books.length === 0 ? (
          <p className="p-4 text-[13.5px] text-ink-muted">Geen boeken in deze selectie.</p>
        ) : (
          <ul className="divide-y divide-line">
            {books.map(book => (
              <BookRow key={book.name} book={book} expanded={open.has(book.name)} onToggle={() => onToggle(book.name)} />
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}

function BookRow({ book, expanded, onToggle }: { book: BookProgress; expanded: boolean; onToggle: () => void }) {
  const panelId = `hoofdstukken-${book.readerName.replace(/[^a-zA-Z0-9]+/g, "-")}`
  const readSet = new Set(book.readChapters)

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? panelId : undefined}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-tint/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14.5px] font-semibold text-ink">{book.name}</span>
            {book.completed && (
              <span className="inline-flex flex-none items-center rounded-full bg-teal-tint px-2 py-[2px] text-[11.5px] font-bold text-teal dark:text-teal-400">
                Voltooid
              </span>
            )}
          </div>
          <div className="mt-[6px] flex items-center gap-3">
            <ProgressBar value={book.percent} height={4} className="flex-1" />
            <span className="w-[112px] flex-none text-right text-[12px] text-ink-muted tabular-nums max-sm:w-auto">
              {book.readCount}/{book.chapters} · {book.percent}%
            </span>
          </div>
        </div>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`flex-none text-ink-faint transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div id={panelId} className="px-4 pb-4">
          <p className="mb-2 text-[12px] text-ink-faint">
            {book.readCount} van {book.chapters} {book.chapters === 1 ? "hoofdstuk" : "hoofdstukken"} gelezen. Tik op een nummer om het te openen.
          </p>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-[6px]">
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map(n => {
              const isRead = readSet.has(n)
              return (
                <li key={n}>
                  <Link
                    href={chapterReaderHref(book, n)}
                    aria-label={`${book.name} ${n}, ${isRead ? "gelezen" : "nog niet gelezen"}`}
                    title={isRead ? "Gelezen" : "Nog niet gelezen"}
                    className={`flex h-[36px] items-center justify-center rounded-[8px] text-[13px] tabular-nums no-underline transition-colors ${
                      isRead
                        ? "bg-teal font-semibold text-white hover:bg-teal-dark"
                        : "border border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    {n}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </li>
  )
}
