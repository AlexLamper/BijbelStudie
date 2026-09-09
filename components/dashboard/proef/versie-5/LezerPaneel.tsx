"use client"

import Link from "next/link"
import { CHAPTER_COUNTS } from "../../../../lib/data/bible-chapter-counts"
import {
  readHref,
  ALL_BOOKS,
  TOTAL_CHAPTERS,
  type DashboardData,
} from "../../../../hooks/useDashboardData"
import { SkeletonBlock } from "../../../ui/skeletons"
import type { TreeSummary } from "../../ProgressTree"
import { TEAL, TEAL_TEXT, EYEBROW, FOCUS, dayWord } from "./shell"

/**
 * The left half of the composition: the reader.
 *
 * Versie 10's panel, kept as it was in substance - level, the week, the running
 * totals, the books already underway - but no longer a card of its own. It is
 * one half of a single slab now, separated from the work by a rule rather than
 * by a gap, because without a rail holding the left edge two floating cards
 * would read as debris on the landscape instead of as one object.
 *
 * Nothing here waits on the tree. The level, the XP bar and every total come
 * from the dashboard fetches; the tree only ever adds a line (the stage, or the
 * warning that the tree is drying out) and it adds it when it arrives.
 */
export default function LezerPaneel({ d, tree }: { d: DashboardData; tree: TreeSummary }) {
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? 0)

  const onderweg = ALL_BOOKS.map(book => ({
    book,
    read: d.bookReadCount(book),
    total: CHAPTER_COUNTS[book] ?? 1,
  }))
    .filter(entry => entry.read > 0 && entry.read < entry.total)
    .sort((a, b) => b.read / b.total - a.read / a.total)
    .slice(0, 4)

  return (
    <section aria-labelledby="v5-lezer" className="p-6 lg:p-7">
      <h2 id="v5-lezer" className={`${EYEBROW} text-gray-500 dark:text-gray-400`}>
        Jouw voortgang
      </h2>

      {/* Level and the XP still to go */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          {d.loading ? (
            <SkeletonBlock className="h-7 w-28" />
          ) : (
            <p className="content-in text-2xl font-semibold tracking-tight text-foreground">Niveau {level}</p>
          )}
          <span className="text-xs tabular-nums text-muted-foreground">
            {d.loading ? "" : `${xpInto} / ${xpFor} XP`}
          </span>
        </div>

        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: d.loading ? "0%" : `${pct}%`, backgroundColor: TEAL }}
          />
        </div>

        {tree.loading ? (
          <SkeletonBlock className="mt-2.5 h-3 w-44" />
        ) : (
          <p className="content-in mt-2.5 text-xs leading-relaxed tabular-nums text-muted-foreground">
            {tree.wilting
              ? `${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} niet gelezen`
              : `Nog ${Math.max(0, xpFor - xpInto)} XP tot niveau ${level + 1}`}
            {tree.hasTree && tree.stageName ? ` · ${tree.stageName}` : ""}
          </p>
        )}

        <Link
          href="/profiel/boom"
          className={`mt-2 inline-block rounded text-xs font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}
        >
          Bekijk je boom →
        </Link>
      </div>

      {/* The week */}
      <div className="mt-6 border-t border-black/10 pt-4 dark:border-white/10">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={`${EYEBROW} text-gray-500 dark:text-gray-400`}>Deze week</h3>
          {!d.loading && (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {d.streak} {dayWord(d.streak)} op rij
            </span>
          )}
        </div>
        <ol className="m-0 mt-3 flex list-none gap-1.5 p-0" aria-label="Deze week">
          {d.weekDays.map((day, i) => {
            const read = day.count > 0
            return (
              <li key={i} className="flex flex-1 list-none flex-col items-center gap-1.5">
                <span
                  aria-hidden
                  className={`block h-7 w-full rounded-md ${
                    read
                      ? ""
                      : day.isToday
                        ? "border-2 border-dashed border-[#0D9488] dark:border-teal-400"
                        : "bg-gray-200/80 dark:bg-white/10"
                  } ${d.statsLoading ? "skeleton-pulse" : ""}`}
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
        {!d.statsLoading && (
          <p className="mt-2.5 text-[11px] tabular-nums text-muted-foreground">
            {d.weekTotal === 0 ? "Nog geen activiteit deze week" : `${d.weekTotal} hoofdstukken deze week`}
          </p>
        )}
      </div>

      {/* The standing totals */}
      <div className="mt-6 border-t border-black/10 pt-4 dark:border-white/10">
        <h3 className={`${EYEBROW} text-gray-500 dark:text-gray-400`}>Totalen</h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <Totaal label="Hoofdstukken" loading={d.loading} value={`${d.chaptersRead}`} sub={`van ${TOTAL_CHAPTERS}`} />
          <Totaal label="Boeken" loading={d.loading} value={`${d.booksWithProgress}`} sub="van 66 geopend" />
          <Totaal
            label="Notities"
            loading={d.loading}
            value={`${d.notesCount}`}
            sub={d.notesCount === 1 ? "notitie" : "notities"}
          />
          <Totaal
            label="Lessen"
            loading={d.loading}
            value={`${d.studyCounts?.lessonsCompleted ?? 0}`}
            sub="afgerond"
          />
        </dl>
      </div>

      {/* Where you were last */}
      {(d.loading || onderweg.length > 0) && (
        <div className="mt-6 border-t border-black/10 pt-4 dark:border-white/10">
          <h3 className={`${EYEBROW} text-gray-500 dark:text-gray-400`}>Onderweg in</h3>
          {d.loading ? (
            <div className="mt-3 space-y-2.5">
              {[1, 2, 3].map(i => (
                <SkeletonBlock key={i} className="h-3.5 w-full" />
              ))}
            </div>
          ) : (
            <ul className="m-0 mt-2.5 list-none space-y-2 p-0">
              {onderweg.map(entry => (
                <li key={entry.book} className="list-none">
                  <Link
                    href={readHref(entry.book, 1)}
                    className={`group flex items-center gap-2 rounded no-underline ${FOCUS}`}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground group-hover:underline">
                      {entry.book}
                    </span>
                    <span
                      aria-hidden
                      className="h-1.5 w-14 flex-shrink-0 overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/10"
                    >
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (entry.read / entry.total) * 100)}%`,
                          backgroundColor: TEAL,
                        }}
                      />
                    </span>
                    <span className="w-11 flex-shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                      {entry.read}/{entry.total}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

/* -- Pieces --------------------------------------------------- */

function Totaal({
  label,
  loading,
  value,
  sub,
}: {
  label: string
  loading: boolean
  value: string
  sub: string
}) {
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
