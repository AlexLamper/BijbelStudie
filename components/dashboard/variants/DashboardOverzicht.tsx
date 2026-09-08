"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Flame, ChevronRight, Clock } from "lucide-react"
import { curatedStudies, BADGE_STYLES } from "../../../lib/data/curated-studies"
import { CHAPTER_COUNTS } from "../../../lib/data/bible-chapter-counts"
import {
  useDashboardData,
  readHref,
  OT_BOOKS,
  NT_BOOKS,
  TOTAL_CHAPTERS,
} from "../../../hooks/useDashboardData"
import BillingNotices from "../../pricing/BillingNotices"
import DailyVerseCard from "../DailyVerseCard"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"

/**
 * Versie 2 - "Overzicht".
 *
 * A workbench: a twelve-column bento grid at lg, four and two columns below,
 * every tile on the same 8 px gap, the same hairline and the same radius, and
 * every figure in tabular numerals so columns of numbers stay put. Dense on
 * purpose - this is the version for the reader who wants everything on one
 * screen and scans rather than reads.
 */
export default function DashboardOverzicht() {
  const d = useDashboardData()
  const tree = useTreeSummary()
  const [hoveredBook, setHoveredBook] = useState<string | null>(null)

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const level = d.level?.level ?? 1

  return (
    <div className="min-h-full bg-background">
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 bg-background px-4 pb-3 pt-4 dark:border-border sm:px-6 xl:px-8">
        <div className="min-w-0">
          {d.greeting ? (
            <h1 className="truncate text-base font-semibold leading-tight text-foreground">{d.greeting}</h1>
          ) : (
            <SkeletonBlock className="h-4 w-48" />
          )}
          {d.dateLabel ? (
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{d.dateLabel}</p>
          ) : (
            <SkeletonBlock className="mt-1.5 h-3 w-32" />
          )}
        </div>
        <div className="flex items-center gap-4">
          <VariantSwitcher className="hidden md:flex" />
          {d.loading ? (
            <SkeletonBlock className="h-8 w-40 rounded-md" />
          ) : (
            <Link
              href={nextHref}
              className="press inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
              style={{ backgroundColor: TEAL }}
            >
              {d.lastRead ? `Verder lezen · ${d.lastRead.book} ${d.lastRead.chapter}` : "Begin met lezen"}
              <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
      <VariantSwitcher className="px-4 pt-3 md:hidden sm:px-6" />

      <div className="px-4 py-4 sm:px-6 xl:px-8">
        <div className="mb-2 empty:hidden">
          <BillingNotices />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-12">
          {/* ── Row A: four figures ────────────────────── */}
          <StatTile
            label="Reeks"
            icon={<Flame size={12} style={{ color: d.streak > 0 ? "#EA580C" : "#9CA3AF" }} aria-hidden />}
            loading={d.loading}
            value={d.streak}
            unit={d.streak === 1 ? "dag" : "dagen"}
            foot={
              d.streakToday
                ? "Vandaag al geteld"
                : d.streak > 0
                  ? "Lees vandaag om te behouden"
                  : "Begin vandaag"
            }
          />
          <StatTile
            label="Niveau"
            loading={d.loading}
            value={level}
            foot={d.level ? `${d.level.xpIntoLevel} / ${d.level.xpForNextLevel} XP` : "0 / 100 XP"}
          >
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${Math.min(100, d.level?.progressPercentage ?? 0)}%`, backgroundColor: TEAL }}
              />
            </div>
          </StatTile>
          <StatTile
            label="Notities"
            loading={d.loading}
            value={d.notesCount}
            foot={
              d.noteToday
                ? "1 vandaag geschreven"
                : d.recentNotes[0]
                  ? `Laatste: ${d.recentNotes[0].book} ${d.recentNotes[0].chapter}`
                  : "Nog geen notities"
            }
          />
          <StatTile
            label="Hoofdstukken"
            loading={d.loading}
            value={d.chaptersRead}
            foot={`van ${TOTAL_CHAPTERS} · ${d.booksWithProgress} ${d.booksWithProgress === 1 ? "boek" : "boeken"}`}
          />

          {/* ── Row B: the 66 books, and the tree ─────── */}
          <Tile className="col-span-2 md:col-span-4 lg:col-span-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={LABEL}>Bijbelboeken</p>
                {!d.loading && (
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {d.booksWithProgress} van 66 geopend · {d.booksCompleted} voltooid
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="mr-0.5">Minder</span>
                {[0, 0.15, 0.37, 0.75, 1].map((r, i) => (
                  <span
                    key={i}
                    className={`inline-block h-2.5 w-2.5 rounded-[2px] ${r === 0 ? "bg-gray-200 dark:bg-gray-700" : ""}`}
                    style={r === 0 ? undefined : { backgroundColor: progressColor(r) }}
                  />
                ))}
                <span className="ml-0.5">Meer</span>
              </div>
            </div>

            <p className="mt-2 h-4 text-xs text-muted-foreground">
              {hoveredBook ? (
                <>
                  <span className="font-semibold" style={{ color: TEAL }}>{hoveredBook}</span>
                  {" · "}
                  <span className="tabular-nums">
                    {d.bookReadCount(hoveredBook)} van {CHAPTER_COUNTS[hoveredBook] ?? "?"} hoofdstukken
                  </span>
                </>
              ) : (
                "Beweeg over een boek voor details"
              )}
            </p>

            {[
              { label: "Oude Testament", books: OT_BOOKS },
              { label: "Nieuwe Testament", books: NT_BOOKS },
            ].map(group => (
              <div key={group.label} className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {group.label} <span className="font-normal normal-case tabular-nums">({group.books.length})</span>
                </p>
                <div className="flex flex-wrap gap-[3px]">
                  {group.books.map(book => {
                    const ratio = d.loading ? 0 : d.bookReadRatio(book)
                    const empty = ratio === 0
                    return (
                      <Link
                        key={book}
                        href={readHref(book, 1)}
                        title={book}
                        aria-label={`${book}, ${d.bookReadCount(book)} van ${CHAPTER_COUNTS[book] ?? "?"} hoofdstukken`}
                        onMouseEnter={() => setHoveredBook(book)}
                        onMouseLeave={() => setHoveredBook(null)}
                        onFocus={() => setHoveredBook(book)}
                        onBlur={() => setHoveredBook(null)}
                        className={`relative block h-[15px] w-[15px] flex-shrink-0 rounded-[3px] transition-transform duration-100 hover:z-10 hover:scale-110 ${
                          empty ? "bg-gray-200 dark:bg-gray-700" : ""
                        } ${d.loading ? "skeleton-pulse" : ""}`}
                        style={{
                          backgroundColor: empty ? undefined : progressColor(ratio),
                          outline: hoveredBook === book ? `2px solid ${TEAL}` : "none",
                          outlineOffset: 1,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </Tile>

          <Tile className="col-span-2 flex flex-col md:col-span-4 lg:col-span-4">
            <div className="flex items-center justify-between gap-2">
              <p className={LABEL}>Jouw voortgang</p>
              <Link href="/profiel/boom" className={`text-[11px] font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Bekijk je boom
              </Link>
            </div>
            <div className="mt-3 flex flex-1 items-center gap-4">
              <ProgressTreeDisc size={88} />
              <div className="min-w-0 flex-1">
                {tree.loading ? (
                  <div className="space-y-2">
                    <SkeletonBlock className="h-4 w-36" />
                    <SkeletonBlock className="h-3 w-28" />
                  </div>
                ) : (
                  <div className="content-in">
                    <p className="text-sm font-semibold text-foreground">
                      {tree.hasTree && tree.stageName ? `${tree.stageName} · niveau ${tree.level}` : `Niveau ${tree.level}`}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {tree.wilting
                        ? `${tree.daysSinceActive} dagen niet gelezen`
                        : `Nog ${tree.remainingXp} XP tot niveau ${tree.level + 1}`}
                    </p>
                  </div>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] tabular-nums">
                  <Fact label="Lessen" value={d.loading ? null : d.studyCounts?.lessonsCompleted ?? 0} />
                  <Fact label="Studies" value={d.loading ? null : d.studyCounts?.studiesCompleted ?? 0} />
                  <Fact label="Langste reeks" value={tree.loading ? null : `${tree.longestStreak} dagen`} />
                  <Fact
                    label="Volgende"
                    value={
                      tree.loading
                        ? null
                        : tree.nextUnlock
                          ? `${tree.nextUnlock.name} · niv. ${tree.nextUnlock.level}`
                          : tree.nextStage
                            ? `${tree.nextStage.name} · niv. ${tree.nextStage.level}`
                            : "–"
                    }
                  />
                </dl>
              </div>
            </div>
          </Tile>

          {/* ── Row C: the week, the notes, the verse ── */}
          <Tile className="col-span-2 flex flex-col md:col-span-2 lg:col-span-4">
            <div className="flex items-center justify-between gap-2">
              <p className={LABEL}>Deze week</p>
              {!d.statsLoading && (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {d.weekTotal === 0 ? "Geen activiteit" : `${d.weekTotal}× gelezen`}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-1 flex-col justify-end">
              {d.statsLoading ? (
                <div className="flex h-24 items-end gap-1.5">
                  {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
                    <SkeletonBlock key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
                  ))}
                </div>
              ) : (
                <div className="content-in flex h-24 items-end gap-1.5">
                  {d.weekDays.map((day, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${day.label}: ${day.count}×`}>
                      {day.count > 0 ? (
                        <div
                          className="w-full rounded-t-[3px]"
                          style={{
                            height: `${Math.max(day.heightPct, 18)}%`,
                            backgroundColor: day.isToday ? TEAL : "rgba(13,148,136,0.4)",
                          }}
                        />
                      ) : (
                        <div
                          className={`w-full rounded-t-[3px] ${day.isToday ? "" : "bg-gray-200 opacity-50 dark:bg-secondary"}`}
                          style={{ height: "14%", backgroundColor: day.isToday ? "rgba(13,148,136,0.25)" : undefined }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-1.5 flex justify-between">
                {d.weekDays.map((day, i) => (
                  <span
                    key={i}
                    className={`flex-1 text-center text-[10px] font-medium tabular-nums ${day.isToday ? TEAL_TEXT : "text-muted-foreground"}`}
                  >
                    {day.label}
                  </span>
                ))}
              </div>
            </div>
          </Tile>

          <Tile className="col-span-2 flex flex-col md:col-span-2 lg:col-span-4">
            <div className="flex items-center justify-between gap-2">
              <p className={LABEL}>Recente notities</p>
              <Link href="/notities" className={`text-[11px] font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Alle{!d.loading && d.notesCount > 0 ? <span className="tabular-nums"> ({d.notesCount})</span> : null}
              </Link>
            </div>
            {d.loading ? (
              <div className="mt-3 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-1.5">
                    <SkeletonBlock className="h-3 w-2/5" />
                    <SkeletonBlock className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : d.recentNotes.length === 0 ? (
              <div className="mt-3 flex flex-1 flex-col justify-center py-4 text-center">
                <p className="text-xs text-muted-foreground">Nog geen notities.</p>
                <Link href={nextHref} className={`mt-1 text-xs font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Schrijf er een tijdens het lezen
                </Link>
              </div>
            ) : (
              <ul className="stagger-in mt-2 divide-y divide-gray-100 dark:divide-border/70">
                {d.recentNotes.map(note => (
                  <li key={note._id}>
                    <Link href={readHref(note.book, note.chapter)} className="group block py-2 no-underline">
                      <p className={`text-xs font-semibold ${TEAL_TEXT}`}>
                        {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground group-hover:text-foreground">
                        {note.noteText}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Tile>

          <div className="col-span-2 md:col-span-4 lg:col-span-4 [&>div]:rounded-lg">
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </div>

          {/* ── Row D: studies ─────────────────────────── */}
          <Tile className="col-span-2 md:col-span-4 lg:col-span-12">
            <div className="flex items-center justify-between gap-2">
              <p className={LABEL}>Aanbevolen studies</p>
              <Link href="/studies" className={`flex items-center gap-0.5 text-[11px] font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Bekijk alle <ChevronRight size={11} />
              </Link>
            </div>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {curatedStudies.slice(0, 6).map(study => {
                const badge = BADGE_STYLES[study.type]
                return (
                  <li key={study.id}>
                    <Link
                      href={`/studies/${study.id}`}
                      className="group flex items-center gap-2.5 rounded-md border border-gray-100 px-2.5 py-2 no-underline transition-colors hover:bg-gray-50 dark:border-border/70 dark:hover:bg-secondary/40"
                    >
                      <span
                        className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: badge.bg, color: badge.color }}
                      >
                        {study.type}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium leading-tight text-foreground">{study.title}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-0.5 tabular-nums"><Clock size={9} aria-hidden /> {study.durationLabel}</span>
                          <span className="opacity-50">·</span>
                          <span className="truncate">{study.startBook}</span>
                        </span>
                      </span>
                      <ArrowRight size={12} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: TEAL }} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Tile>
        </div>
      </div>
    </div>
  )
}

/* ── Tile vocabulary ───────────────────────────────────────── */

function Tile({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-lg border border-gray-200 bg-white p-3 dark:border-border dark:bg-card ${className}`}>
      {children}
    </section>
  )
}

function StatTile({
  label,
  icon,
  loading,
  value,
  unit,
  foot,
  children,
}: {
  label: string
  icon?: React.ReactNode
  loading: boolean
  value: number | string
  unit?: string
  foot: string
  children?: React.ReactNode
}) {
  return (
    <Tile className="col-span-1 lg:col-span-3">
      <div className="flex items-center justify-between gap-2">
        <p className={LABEL}>{label}</p>
        {icon}
      </div>
      {loading ? (
        <>
          <SkeletonBlock className="mt-2 h-7 w-16" />
          <SkeletonBlock className="mt-2 h-3 w-24" />
        </>
      ) : (
        <div className="content-in">
          <p className="mt-2 text-2xl font-semibold leading-none tabular-nums text-foreground">
            {value}
            {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
          </p>
          {children}
          <p className="mt-2 truncate text-[11px] tabular-nums text-muted-foreground">{foot}</p>
        </div>
      )}
    </Tile>
  )
}

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-muted-foreground">{label}</dt>
      {value === null ? (
        <dd><SkeletonBlock className="mt-1 h-3 w-12" /></dd>
      ) : (
        <dd className="truncate font-semibold text-foreground">{value}</dd>
      )}
    </div>
  )
}

function progressColor(ratio: number): string {
  if (ratio < 0.25) return "rgba(13,148,136,0.22)"
  if (ratio < 0.5) return "rgba(13,148,136,0.45)"
  if (ratio < 1) return "rgba(13,148,136,0.72)"
  return TEAL
}
