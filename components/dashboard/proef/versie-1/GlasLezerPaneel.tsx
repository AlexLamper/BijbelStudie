"use client"

import Link from "next/link"
import { ALL_BOOKS, readHref, TOTAL_CHAPTERS } from "../../../../hooks/useDashboardData"
import type { DashboardData } from "../../../../hooks/useDashboardData"
import { CHAPTER_COUNTS } from "../../../../lib/data/bible-chapter-counts"
import type { TreeSummary } from "../../ProgressTree"
import { SkeletonBlock } from "../../../ui/skeletons"
import { dayWord, EYEBROW, FOCUS, GLASS_PANEL, PANEL_SHADOW, TEAL, TRACK } from "./glas"

/**
 * The left slab: the reader.
 *
 * Version 10's standing figures - level, the week, the running totals, the
 * books currently underway - on the densest glass on the page, sticky so they
 * never scroll away while the work column moves under them.
 *
 * Every number here comes from `useDashboardData`, which resolves without the
 * tree: only the stage name and the wilting line wait on `tree`, and each of
 * those has its own placeholder. The panel is fully readable while the
 * landscape behind it is still being drawn.
 */
export default function GlasLezerPaneel({ d, tree }: { d: DashboardData; tree: TreeSummary }) {
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)

  // The four books furthest along, so the panel says where you actually are.
  const onderweg = ALL_BOOKS
    .map(book => ({ book, read: d.bookReadCount(book), total: CHAPTER_COUNTS[book] ?? 1 }))
    .filter(entry => entry.read > 0)
    .sort((a, b) => b.read / b.total - a.read / a.total)
    .slice(0, 4)

  return (
    <aside
      style={PANEL_SHADOW}
      className={`p-5 lg:sticky lg:top-4 lg:max-h-[calc(100svh-8rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain ${GLASS_PANEL}`}
      aria-labelledby="glas-voortgang"
    >
      {/* ── Level and XP: version 11's line of light ── */}
      <h2 id="glas-voortgang" className={EYEBROW}>Jouw voortgang</h2>

      {/* A div, not a p: the skeleton renders a div and a div inside a p is
          invalid nesting React will complain about at hydration. */}
      <div className="mt-2 flex items-baseline gap-2">
        {d.loading && tree.loading ? (
          <SkeletonBlock className="h-7 w-12 bg-white/25" />
        ) : (
          <span className="text-3xl font-semibold leading-none tabular-nums text-white">{level}</span>
        )}
        <span className="text-sm font-medium text-white/70">niveau</span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-xs font-medium tabular-nums text-white/75">
          <span>{xpInto} / {xpFor} XP</span>
          <span>Niveau {level + 1}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
          <div
            className="h-full rounded-full bg-white transition-[width] duration-1000 ease-out"
            style={{ width: d.loading ? "0%" : `${pct}%`, boxShadow: "0 0 16px rgba(255,255,255,0.85)" }}
          />
        </div>
        {tree.loading ? (
          <SkeletonBlock className="mt-2.5 h-3 w-40 bg-white/20" />
        ) : (
          <p className="content-in mt-2.5 text-xs leading-relaxed text-white/70">
            {tree.wilting
              ? `Je boom heeft ${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} geen water gehad.`
              : `Nog ${Math.max(0, xpFor - xpInto)} XP tot niveau ${level + 1}`}
            {tree.hasTree && tree.stageName ? ` · ${tree.stageName}` : ""}
          </p>
        )}
        <Link
          href="/profiel/boom"
          className={`mt-2 inline-block rounded text-xs font-semibold text-white no-underline underline-offset-4 hover:underline ${FOCUS}`}
        >
          Bekijk je boom →
        </Link>
      </div>

      {/* ── The week ── */}
      <section className="mt-6 border-t border-white/15 pt-4" aria-labelledby="glas-week">
        {/* The run itself is stated once, in the masthead. This strip shows its
            shape instead. */}
        <h3 id="glas-week" className={EYEBROW}>Deze week</h3>
        <ol className="mt-3 flex list-none gap-1.5 p-0" aria-label="Gelezen dagen deze week">
          {d.weekDays.map((day, i) => {
            const read = day.count > 0
            return (
              <li key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  aria-hidden
                  className={`block h-7 w-full rounded-md ring-1 ring-inset ring-white/15 ${
                    !read && day.isToday ? "border-2 border-dashed border-white/60" : ""
                  } ${d.statsLoading ? "skeleton-pulse" : ""}`}
                  style={{
                    backgroundColor: read
                      ? day.isToday
                        ? TEAL
                        : "rgba(13,148,136,0.62)"
                      : "rgba(0,0,0,0.3)",
                  }}
                />
                <span className={`text-[10px] font-medium ${day.isToday ? "text-white" : "text-white/70"}`}>
                  {day.label}
                  <span className="sr-only">{read ? `, ${day.count} keer gelezen` : ", niet gelezen"}</span>
                </span>
              </li>
            )
          })}
        </ol>
        {!d.statsLoading && (
          <p className="mt-2.5 text-xs tabular-nums text-white/70">
            {d.weekTotal === 0 ? "Nog geen activiteit deze week" : `${d.weekTotal} hoofdstukken deze week`}
          </p>
        )}
      </section>

      {/* ── The running totals ── */}
      <section className="mt-6 border-t border-white/15 pt-4" aria-labelledby="glas-totalen">
        <h3 id="glas-totalen" className={EYEBROW}>Totalen</h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <Totaal label="Hoofdstukken" loading={d.loading} value={`${d.chaptersRead}`} sub={`van ${TOTAL_CHAPTERS}`} />
          <Totaal label="Bijbelboeken" loading={d.loading} value={`${d.booksWithProgress}`} sub="van 66 geopend" />
          <Totaal label="Notities" loading={d.loading} value={`${d.notesCount}`} sub={d.notesCount === 1 ? "notitie" : "notities"} />
          <Totaal label="Lessen" loading={d.loading} value={`${d.studyCounts?.lessonsCompleted ?? 0}`} sub="afgerond" />
        </dl>
      </section>

      {/* ── Where the reader actually is ── */}
      {(d.loading || onderweg.length > 0) && (
        <section className="mt-6 border-t border-white/15 pt-4" aria-labelledby="glas-onderweg">
          <h3 id="glas-onderweg" className={EYEBROW}>Onderweg in</h3>
          {d.loading ? (
            <div className="mt-3 space-y-2.5">
              {[1, 2, 3].map(i => (
                <SkeletonBlock key={i} className="h-3.5 w-full bg-white/20" />
              ))}
            </div>
          ) : (
            <ul className="mt-2.5 list-none space-y-2 p-0">
              {onderweg.map(entry => (
                <li key={entry.book}>
                  <Link
                    href={readHref(entry.book, 1)}
                    className={`group flex items-center gap-2 rounded px-0.5 py-0.5 no-underline ${FOCUS}`}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-white/85 group-hover:text-white group-hover:underline">
                      {entry.book}
                    </span>
                    <span
                      className="h-1.5 w-14 flex-shrink-0 overflow-hidden rounded-full"
                      style={{ backgroundColor: TRACK }}
                    >
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${Math.min(100, (entry.read / entry.total) * 100)}%`, backgroundColor: TEAL }}
                      />
                    </span>
                    <span className="w-11 flex-shrink-0 text-right text-[10px] tabular-nums text-white/70">
                      {entry.read}/{entry.total}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </aside>
  )
}

/* ── Pieces ───────────────────────────────────────────────────── */

function Totaal({ label, loading, value, sub }: { label: string; loading: boolean; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70">{label}</dt>
      {loading ? (
        <dd className="mt-1 space-y-1">
          <SkeletonBlock className="h-5 w-10 bg-white/20" />
          <SkeletonBlock className="h-2.5 w-16 bg-white/20" />
        </dd>
      ) : (
        <dd className="content-in">
          <span className="block text-lg font-semibold leading-none tabular-nums text-white">{value}</span>
          <span className="mt-1 block truncate text-[10px] tabular-nums text-white/70">{sub}</span>
        </dd>
      )}
    </div>
  )
}
