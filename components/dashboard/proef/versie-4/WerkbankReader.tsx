"use client"

import Link from "next/link"
import { CHAPTER_COUNTS } from "../../../../lib/data/bible-chapter-counts"
import {
  ALL_BOOKS,
  TOTAL_CHAPTERS,
  readHref,
  type DashboardData,
} from "../../../../hooks/useDashboardData"
import type { TreeSummary } from "../../ProgressTree"
import { SkeletonBlock } from "../../../ui/skeletons"
import ProefdashboardSwitcher from "../../ProefdashboardSwitcher"
import { EYEBROW, FOCUS, HAIRLINE, MUTED, PANEL, TEAL, TEAL_TEXT, TEXT } from "./styles"

/**
 * The left panel: the reader.
 *
 * Who they are, what level, this week, and every running total - dense, in one
 * block, and pinned. From lg up it is its own pane and never scrolls with the
 * work; below that it simply sits at the top of the page.
 *
 * Nothing in here waits for the tree. The greeting and the date come from the
 * clock, the numbers from their own fetches, and the two lines that genuinely
 * belong to the tree (the stage, the wilting nudge) have their own skeleton and
 * their own fallback.
 */
export default function WerkbankReader({ d, tree }: { d: DashboardData; tree: TreeSummary }) {
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)
  const levelKnown = !tree.loading || !d.loading
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")

  // Books that are started but not finished, the furthest along first: the
  // shortest possible answer to "where was I, besides the last chapter?".
  const onTheWay = ALL_BOOKS.map(book => ({
    book,
    read: d.bookReadCount(book),
    total: CHAPTER_COUNTS[book] ?? 1,
  }))
    .filter(entry => entry.read > 0 && entry.read < entry.total)
    .sort((a, b) => b.read / b.total - a.read / a.total)
    .slice(0, 4)

  return (
    <div className={`p-5 ${PANEL}`}>
      {/* Identity */}
      <div className="flex items-start gap-3">
        {levelKnown ? (
          <span
            aria-hidden
            className="content-in flex h-11 w-11 flex-none items-center justify-center rounded-xl text-lg font-bold tabular-nums text-white"
            style={{ backgroundColor: TEAL }}
          >
            {level}
          </span>
        ) : (
          <SkeletonBlock className="h-11 w-11 flex-none rounded-xl" />
        )}
        <div className="min-w-0 flex-1">
          {d.greeting ? (
            <h1 className={`content-in truncate text-[17px] font-semibold leading-tight ${TEXT}`}>{d.greeting}</h1>
          ) : (
            <SkeletonBlock className="h-4 w-40" />
          )}
          {d.dateLabel ? (
            <p className={`mt-1.5 text-xs ${MUTED}`}>{d.dateLabel}</p>
          ) : (
            <SkeletonBlock className="mt-2 h-3 w-28" />
          )}
        </div>
      </div>

      {/* Level and XP */}
      <section className="mt-5" aria-labelledby="werkbank-voortgang">
        <h2 id="werkbank-voortgang" className={EYEBROW}>
          Voortgang
        </h2>
        <div className="mt-2 flex items-baseline justify-between gap-3 text-xs tabular-nums">
          <span className={`font-semibold ${TEXT}`}>Niveau {level}</span>
          {d.loading ? (
            <SkeletonBlock className="h-3 w-20" />
          ) : (
            <span className={MUTED}>
              {xpInto} / {xpFor} XP
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={`XP tot niveau ${level + 1}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={d.loading ? 0 : Math.round(pct)}
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${d.loading && tree.loading ? 0 : pct}%`, backgroundColor: TEAL }}
          />
        </div>
        {tree.loading ? (
          <SkeletonBlock className="mt-2 h-3 w-40" />
        ) : (
          <p className={`content-in mt-2 text-xs tabular-nums ${MUTED}`}>
            {tree.wilting
              ? `${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} niet gelezen - één hoofdstuk is genoeg`
              : `Nog ${tree.remainingXp} XP tot niveau ${level + 1}`}
            {tree.hasTree && tree.stageName ? ` · ${tree.stageName}` : ""}
          </p>
        )}
        <Link
          href="/profiel/boom"
          className={`mt-2 inline-block text-xs font-semibold no-underline hover:underline ${TEAL_TEXT} ${FOCUS}`}
        >
          Bekijk je boom →
        </Link>
      </section>

      {/* The week */}
      <section className={`mt-6 border-t pt-4 ${HAIRLINE}`} aria-labelledby="werkbank-week">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="werkbank-week" className={EYEBROW}>
            Deze week
          </h2>
          {!d.statsLoading && (
            <span className={`text-[11px] tabular-nums ${MUTED}`}>
              {d.weekTotal === 0 ? "geen activiteit" : `${d.weekTotal}× gelezen`}
            </span>
          )}
        </div>
        <ol className="m-0 mt-3 flex list-none items-end gap-1.5 p-0" aria-label="Gelezen per dag deze week">
          {d.weekDays.map((day, i) => {
            const read = day.count > 0
            return (
              <li key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="flex h-10 w-full items-end">
                  <span
                    aria-hidden
                    className={`block w-full rounded-t-md ${
                      read
                        ? ""
                        : day.isToday
                          ? "border border-dashed border-[#0D9488] dark:border-teal-400"
                          : "bg-slate-200 dark:bg-white/10"
                    } ${d.statsLoading ? "skeleton-pulse" : ""}`}
                    style={{
                      height: `${read ? Math.max(28, day.heightPct) : 24}%`,
                      backgroundColor: read ? (day.isToday ? TEAL : "rgba(13,148,136,0.45)") : undefined,
                    }}
                  />
                </span>
                <span className={`text-[10px] font-medium ${day.isToday ? TEAL_TEXT : MUTED}`}>
                  {day.label}
                  <span className="sr-only">
                    {read ? `, ${day.count} keer gelezen` : ", niet gelezen"}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      {/* The running totals */}
      <section className={`mt-6 border-t pt-4 ${HAIRLINE}`} aria-labelledby="werkbank-totalen">
        <h2 id="werkbank-totalen" className={EYEBROW}>
          Totalen
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3.5">
          <Total label="Reeks" loading={d.loading} value={`${d.streak}`} sub={`${dayWord(d.streak)} op rij`} />
          <Total label="Hoofdstukken" loading={d.loading} value={`${d.chaptersRead}`} sub={`van ${TOTAL_CHAPTERS}`} />
          <Total label="Boeken" loading={d.loading} value={`${d.booksWithProgress}`} sub="van 66 geopend" />
          <Total
            label="Uitgelezen"
            loading={d.loading}
            value={`${d.booksCompleted}`}
            sub={d.booksCompleted === 1 ? "boek" : "boeken"}
          />
          <Total
            label="Notities"
            loading={d.loading}
            value={`${d.notesCount}`}
            sub={d.notesCount === 1 ? "notitie" : "notities"}
          />
          <Total
            label="Lessen"
            loading={d.loading}
            value={`${d.studyCounts?.lessonsCompleted ?? 0}`}
            sub="afgerond"
          />
        </dl>
      </section>

      {/* Where the reader is midway */}
      {(d.loading || onTheWay.length > 0) && (
        <section className={`mt-6 border-t pt-4 ${HAIRLINE}`} aria-labelledby="werkbank-onderweg">
          <h2 id="werkbank-onderweg" className={EYEBROW}>
            Onderweg in
          </h2>
          {d.loading ? (
            <div className="mt-3 space-y-2.5">
              {[1, 2, 3].map(i => (
                <SkeletonBlock key={i} className="h-3.5 w-full" />
              ))}
            </div>
          ) : (
            <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0">
              {onTheWay.map(entry => (
                <li key={entry.book}>
                  <Link
                    href={readHref(entry.book, 1)}
                    className={`group flex items-center gap-2 no-underline ${FOCUS}`}
                  >
                    <span className={`min-w-0 flex-1 truncate text-xs font-medium group-hover:underline ${TEXT}`}>
                      {entry.book}
                    </span>
                    <span className="h-1.5 w-14 flex-shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (entry.read / entry.total) * 100)}%`,
                          backgroundColor: TEAL,
                        }}
                      />
                    </span>
                    <span className={`w-11 flex-shrink-0 text-right text-[10px] tabular-nums ${MUTED}`}>
                      {entry.read}/{entry.total}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* On the panel rather than on the scene, so it can keep the normal
          surface tone instead of the light-on-dark one. */}
      <div className={`mt-6 border-t pt-4 ${HAIRLINE}`}>
        <ProefdashboardSwitcher tone="auto" className="justify-center" />
      </div>
    </div>
  )
}

/* --- Pieces --------------------------------------------------- */

function Total({
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
      <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      {loading ? (
        <dd className="mt-1 space-y-1">
          <SkeletonBlock className="h-5 w-10" />
          <SkeletonBlock className="h-2.5 w-16" />
        </dd>
      ) : (
        <dd className="content-in">
          <span className="block text-lg font-semibold leading-none tabular-nums text-slate-900 dark:text-slate-100">
            {value}
          </span>
          <span className="mt-1 block truncate text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
            {sub}
          </span>
        </dd>
      )}
    </div>
  )
}
