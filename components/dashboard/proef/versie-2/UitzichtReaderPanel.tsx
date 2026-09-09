"use client"

import Link from "next/link"
import { Flame } from "lucide-react"
import { CHAPTER_COUNTS } from "../../../../lib/data/bible-chapter-counts"
import { ALL_BOOKS, TOTAL_CHAPTERS, readHref, type DashboardData } from "../../../../hooks/useDashboardData"
import type { TreeSummary } from "../../ProgressTree"
import { SkeletonBlock } from "../../../ui/skeletons"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"

/**
 * Versie 10's left panel, moved inside the sheet: the reader, not the work.
 *
 * Who they are, what level, the week, the running totals and the books they
 * are part-way through. It does not scroll with the right column - from lg up
 * it is its own pane in a fixed-height window, so these figures stay in view
 * while the work beside them scrolls.
 *
 * This pane sits on the sheet, which is a calm opaque surface, so theme tokens
 * are safe here. Only the chrome outside the sheet uses literal white/black.
 */
export default function UitzichtReaderPanel({ d, tree }: { d: DashboardData; tree: TreeSummary }) {
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")

  const underway = ALL_BOOKS
    .map(book => ({ book, read: d.bookReadCount(book), total: CHAPTER_COUNTS[book] ?? 1 }))
    .filter(entry => entry.read > 0 && entry.read < entry.total)
    .sort((a, b) => b.read / b.total - a.read / a.total)
    .slice(0, 4)

  return (
    <div className="flex-none border-b border-black/[0.06] p-5 dark:border-white/10 sm:p-6 lg:w-[330px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
      {/* ── Voortgang ─────────────────────────────────── */}
      <section aria-labelledby="uitzicht-voortgang">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="uitzicht-voortgang" className={EYEBROW}>Jouw voortgang</h2>
          {d.streak > 0 && !d.loading && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              style={{ backgroundColor: "rgba(234,88,12,0.10)", color: "#EA580C" }}
            >
              <Flame size={11} aria-hidden /> {d.streak} {dayWord(d.streak)}
            </span>
          )}
        </div>

        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-semibold leading-none tabular-nums text-foreground">{level}</span>
          <span className="text-sm text-muted-foreground">
            {tree.loading ? "niveau" : tree.stageName ? `niveau · ${tree.stageName}` : "niveau"}
          </span>
        </p>

        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-secondary"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={d.loading ? 0 : Math.round(pct)}
          aria-label={`Voortgang naar niveau ${level + 1}`}
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: d.loading && tree.loading ? "0%" : `${pct}%`, backgroundColor: TEAL }}
          />
        </div>

        {d.loading ? (
          <SkeletonBlock className="mt-2 h-3 w-40" />
        ) : (
          <p className="content-in mt-2 text-xs tabular-nums text-muted-foreground">
            {xpInto} / {xpFor} XP · nog {Math.max(0, xpFor - xpInto)} tot niveau {level + 1}
          </p>
        )}

        {!tree.loading && (tree.nextStage || tree.nextUnlock || tree.wilting) && (
          <ul className="content-in mt-3 space-y-1.5 text-xs">
            {tree.wilting && (
              <li className="text-muted-foreground">
                {tree.daysSinceActive} {dayWord(tree.daysSinceActive)} niet gelezen
              </li>
            )}
            {tree.nextStage && (
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Volgende fase</span>
                <span className="font-semibold text-foreground">{tree.nextStage.name} · {tree.nextStage.level}</span>
              </li>
            )}
            {tree.nextUnlock && (
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Volgende vrijspeling</span>
                <span className="font-semibold text-foreground">{tree.nextUnlock.name} · {tree.nextUnlock.level}</span>
              </li>
            )}
          </ul>
        )}

        <Link
          href="/profiel/boom"
          className={`mt-3 inline-block text-xs font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}
        >
          Bekijk je boom →
        </Link>
      </section>

      {/* ── Deze week ─────────────────────────────────── */}
      <section aria-labelledby="uitzicht-week" className="mt-6 border-t border-gray-100 pt-4 dark:border-border/70">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="uitzicht-week" className={EYEBROW}>Deze week</h2>
          {!d.statsLoading && (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {d.weekTotal === 0 ? "Geen activiteit" : `${d.weekTotal}× gelezen`}
            </span>
          )}
        </div>
        <ol className="mt-3 flex list-none gap-1.5 p-0" aria-label="Deze week">
          {d.weekDays.map((day, i) => {
            const read = day.count > 0
            return (
              <li key={i} className="flex flex-1 list-none flex-col items-center gap-1.5">
                <span
                  aria-hidden
                  className={[
                    "block h-7 w-full rounded-md",
                    read
                      ? ""
                      : day.isToday
                        ? "border-2 border-dashed border-[#0D9488] dark:border-teal-400"
                        : "bg-gray-100 dark:bg-secondary",
                    d.statsLoading ? "skeleton-pulse" : "",
                  ].join(" ")}
                  style={read ? { backgroundColor: day.isToday ? TEAL : "rgba(13,148,136,0.5)" } : undefined}
                />
                <span className={`text-[10px] font-medium ${day.isToday ? TEAL_TEXT : "text-muted-foreground"}`}>
                  {day.label}
                  <span className="sr-only">{read ? `, ${day.count} keer gelezen` : ", niet gelezen"}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      {/* ── Totalen ───────────────────────────────────── */}
      <section aria-labelledby="uitzicht-totalen" className="mt-6 border-t border-gray-100 pt-4 dark:border-border/70">
        <h2 id="uitzicht-totalen" className={EYEBROW}>Totalen</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <Total label="Hoofdstukken" loading={d.loading} value={`${d.chaptersRead}`} sub={`van ${TOTAL_CHAPTERS}`} />
          <Total label="Bijbelboeken" loading={d.loading} value={`${d.booksWithProgress}`} sub="van 66 geopend" />
          <Total label="Notities" loading={d.loading} value={`${d.notesCount}`} sub={d.notesCount === 1 ? "notitie" : "notities"} />
          <Total label="Lessen" loading={d.loading} value={`${d.studyCounts?.lessonsCompleted ?? 0}`} sub="afgerond" />
        </dl>
      </section>

      {/* ── Onderweg in ───────────────────────────────── */}
      {(d.loading || underway.length > 0) && (
        <section aria-labelledby="uitzicht-onderweg" className="mt-6 border-t border-gray-100 pt-4 dark:border-border/70">
          <h2 id="uitzicht-onderweg" className={EYEBROW}>Onderweg in</h2>
          {d.loading ? (
            <div className="mt-3 space-y-2.5">
              {[1, 2, 3].map(i => <SkeletonBlock key={i} className="h-3.5 w-full" />)}
            </div>
          ) : (
            <ul className="stagger-in mt-2.5 list-none space-y-2 p-0">
              {underway.map(entry => (
                <li key={entry.book} className="list-none">
                  <Link
                    href={readHref(entry.book, 1)}
                    className={`group flex items-center gap-2 rounded-md no-underline ${FOCUS}`}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground group-hover:underline">
                      {entry.book}
                    </span>
                    <span aria-hidden className="h-1.5 w-14 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${Math.min(100, (entry.read / entry.total) * 100)}%`, backgroundColor: TEAL }}
                      />
                    </span>
                    <span className="w-11 flex-shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                      {entry.read}/{entry.total}
                      <span className="sr-only"> hoofdstukken gelezen</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function Total({ label, loading, value, sub }: { label: string; loading: boolean; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      {loading ? (
        <dd className="mt-1 space-y-1">
          <SkeletonBlock className="h-5 w-10" />
          <SkeletonBlock className="h-2.5 w-16" />
        </dd>
      ) : (
        <dd className="content-in">
          <span className="block text-lg font-semibold leading-none tabular-nums text-foreground">{value}</span>
          <span className="mt-1 block truncate text-[10px] tabular-nums text-muted-foreground">{sub}</span>
        </dd>
      )}
    </div>
  )
}
