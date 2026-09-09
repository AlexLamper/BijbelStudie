"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { Header } from "../../../components/layout/header"
import { CHAPTER_COUNTS } from "../../../lib/data/bible-chapter-counts"
import { BADGE_STYLES, curatedStudies } from "../../../lib/data/curated-studies"
import { versionAbbreviation } from "../../../lib/dailyVerseStore"
import {
  NT_BOOKS,
  OT_BOOKS,
  TOTAL_CHAPTERS,
  readHref,
  useDashboardData,
} from "../../../hooks/useDashboardData"
import BillingNotices from "../../../components/pricing/BillingNotices"
import DailyVerseCard from "../../../components/dashboard/DailyVerseCard"
import { ProgressTreeScene, useTreeSummary } from "../../../components/dashboard/ProgressTree"
import { SkeletonBlock } from "../../../components/ui/skeletons"
import SceneRail from "../../../components/dashboard/proef/versie-3/SceneRail"
import { useDepthScroll } from "../../../components/dashboard/proef/versie-3/useDepthScroll"
import {
  EYEBROW,
  GlassStat,
  PANEL,
  SKEL,
  TEAL,
  TEAL_ON_DARK,
  Total,
  WeekStrip,
} from "../../../components/dashboard/proef/versie-3/pieces"

/**
 * Ontwerp 3 - "Diepte".
 *
 * The scene is fixed to the viewport and never moves. Everything else travels
 * over it, and that travel is the whole idea: at rest the screen is almost all
 * landscape, with the greeting, the level and the one action that matters set
 * straight into the sky. As the reader scrolls, that sky layer lifts and gives
 * way, the scene goes deep behind the working panels so a paragraph stays
 * readable, and the rail tightens from a film of glass into a defined edge.
 * The picture is never replaced - only ever moved further back.
 *
 * Three layers, in this order:
 *   1. the sky      - greeting, level, XP as a line of light, the one action
 *   2. the horizon  - four running numbers, breaking the fold on purpose
 *   3. the desk     - version 10's two panels: a sticky reader on the left that
 *                     carries the standing figures, and the work on the right,
 *                     which is the only thing that scrolls
 *
 * The content set is the live dashboard's, whole: greeting, resume, daily
 * verse, streak and week, level and XP, notes, the 66 books, the studies and
 * the quick links.
 *
 * Chrome: the real navbar, imported unchanged. The sidebar is the piece that
 * had to give - see components/dashboard/proef/versie-3/SceneRail.tsx.
 *
 * Motion: one passive, rAF-throttled scroll listener publishing three CSS
 * variables (see useDepthScroll.ts). Every consumer of them touches `transform`
 * or `opacity` and nothing else, and `prefers-reduced-motion` gets the settled
 * state with no scroll effects at all.
 */
export default function ProefdashboardVersie3() {
  const d = useDashboardData()
  const tree = useTreeSummary()
  const { rootRef, reducedMotion } = useDepthScroll()

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)
  const readPct = Math.round((d.chaptersRead / TOTAL_CHAPTERS) * 100)

  const chapterCount = (book: string) => CHAPTER_COUNTS[book] ?? 1

  const [hoveredBook, setHoveredBook] = useState<string | null>(null)

  /** Seeded here so the first paint is defined; the hook drives them after that. */
  const sceneVars: React.CSSProperties & Record<string, string> = {
    "--lift": "0",
    "--fade": "1",
    "--veil": reducedMotion ? "1" : "0",
  }

  /** The sky layer recedes; the horizon numbers trail it at a third of the distance. */
  const skyMotion: React.CSSProperties = reducedMotion
    ? {}
    : {
        transform: "translate3d(0, calc(var(--lift, 0) * -56px), 0)",
        opacity: "var(--fade, 1)",
        willChange: "transform, opacity",
      }
  const horizonMotion: React.CSSProperties = reducedMotion
    ? {}
    : { transform: "translate3d(0, calc(var(--lift, 0) * -18px), 0)", willChange: "transform" }

  return (
    // `w-full min-w-0` is load-bearing: SidebarProvider wraps this page in a
    // `flex` row, and a flex child without them is sized to its content rather
    // than to the viewport - which is what cut the navbar and the panels short
    // of the right edge.
    <div ref={rootRef} style={sceneVars} className="relative min-h-screen w-full min-w-0 bg-[#0B1220]">
      {/* -- The scene. Fixed, full-bleed, never moves. Runs from the very
             top of the viewport, so it is behind the navbar too. -------- */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <ProgressTreeScene />
        {/* A constant floor of dark, so the copy is legible from the first
            frame - including the frame in which the scene is still its own
            loading skeleton and therefore pale grey. */}
        <span aria-hidden className="absolute inset-0 bg-black/25" />
        {/* The left scrim carries the rail and the greeting ... */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[min(46rem,78%)] bg-gradient-to-r from-black/85 via-black/45 to-transparent"
        />
        {/* ... the bottom one carries the numbers that break the fold. */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />
        {/* The veil: the scene goes deep as the working panels arrive. */}
        <span aria-hidden className="absolute inset-0 bg-black/55" style={{ opacity: "var(--veil, 0)" }} />
      </div>

      {/* The real navbar, in its scene variant: transparent, hairline in
          white, own dark scope. The landscape runs straight through it, which
          is what makes the experience cover the whole screen. */}
      <Header variant="scene" />
      {/* A permanent band of dark under the top edge so the bar's own title and
          controls stay legible over a noon sky, deepening as the page scrolls. */}
      <span
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-24 bg-gradient-to-b from-black/55 via-black/25 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-14 z-40 h-8 bg-gradient-to-b from-black/45 to-transparent"
        style={{ opacity: "var(--veil, 0)" }}
      />

      <SceneRail />

      {/* -- Layer 1: the sky ------------------------------------------ */}
      <section
        aria-labelledby="diepte-titel"
        className="relative z-10 flex min-h-[calc(100vh-3.5rem)] flex-col justify-between px-5 pb-32 pt-5 sm:px-8 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-16"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {d.dateLabel ? (
            <p className="text-sm text-white/80">{d.dateLabel}</p>
          ) : (
            <SkeletonBlock className={`h-3.5 w-36 ${SKEL}`} />
          )}
          <Link
            href="/dashboard"
            className="text-xs font-medium text-white/60 no-underline transition-colors hover:text-white"
          >
            Huidig dashboard
          </Link>
        </div>

        <div className="max-w-[46rem]" style={skyMotion}>
          <p className={EYEBROW}>
            {tree.hasTree && tree.stageName ? `${tree.stageName} - niveau ${level}` : `Niveau ${level}`}
          </p>

          {/* The heading is always in the tree, so the section's label is never
              a dangling reference and the page never lacks an h1 while the
              name is still being resolved. */}
          <h1
            id="diepte-titel"
            className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl xl:text-6xl"
          >
            {d.greeting ? <span className="content-in">{d.greeting}</span> : <span className="sr-only">Dashboard</span>}
          </h1>
          {!d.greeting && <SkeletonBlock className={`mt-3 h-14 w-[26rem] max-w-full ${SKEL}`} />}

          <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">
            {tree.wilting
              ? `Je boom heeft ${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} geen water gehad. Eén hoofdstuk is genoeg.`
              : d.readToday
                ? "Je hebt vandaag al gelezen. Alles hierna is winst."
                : "Eén hoofdstuk vandaag houdt je boom in leven."}
          </p>

          {/* XP as a line of light along the horizon, not a boxed meter. */}
          <div className="mt-8 max-w-[30rem]">
            <div className="flex items-baseline justify-between text-xs font-medium tabular-nums text-white/75">
              <span>Niveau {level}</span>
              <span>{xpInto} / {xpFor} XP</span>
              <span>Niveau {level + 1}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-1000 ease-out"
                style={{
                  width: d.loading && tree.loading ? "0%" : `${pct}%`,
                  boxShadow: "0 0 18px rgba(255,255,255,0.85)",
                }}
              />
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            {d.loading ? (
              <SkeletonBlock className={`h-14 w-64 rounded-full ${SKEL}`} />
            ) : (
              <Link
                href={nextHref}
                className="press group inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-base font-semibold text-gray-900 no-underline shadow-xl shadow-black/30 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              >
                {d.lastRead ? `Verder in ${d.lastRead.book} ${d.lastRead.chapter}` : "Begin met lezen"}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
            <Link
              href="/profiel/boom"
              className="text-sm font-semibold text-white/85 no-underline underline-offset-4 hover:text-white hover:underline"
            >
              Bekijk je boom →
            </Link>
          </div>
        </div>

        {/* Keeps the button row clear of the numbers that break the fold. */}
        <div aria-hidden />
      </section>

      {/* -- Layer 2: the horizon -------------------------------------- */}
      <div
        className="relative z-10 -mt-24 px-5 sm:px-8 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-16"
        style={horizonMotion}
      >
        <dl className="stagger-in grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <GlassStat
            label="Reeks"
            value={d.loading ? null : `${d.streak}`}
            unit={dayWord(d.streak)}
            note={!tree.loading && tree.longestStreak > d.streak ? `langste ${tree.longestStreak}` : undefined}
          />
          <GlassStat
            label="Hoofdstukken"
            value={d.loading ? null : `${d.chaptersRead}`}
            unit={`van ${TOTAL_CHAPTERS}`}
            note={d.loading ? undefined : `${readPct}% van de Bijbel`}
          />
          <GlassStat
            label="Boeken begonnen"
            value={d.loading ? null : `${d.booksWithProgress}`}
            unit="van 66"
            note={!d.loading && d.booksCompleted > 0 ? `${d.booksCompleted} uitgelezen` : undefined}
          />
          <GlassStat
            label="Notities"
            value={d.loading ? null : `${d.notesCount}`}
            unit={d.notesCount === 1 ? "notitie" : "notities"}
          />
        </dl>
      </div>

      {/* -- Layer 3: the desk - version 10's two panels ---------------- */}
      <div className="relative z-10 grid w-full grid-cols-1 gap-6 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-16">

        {/* --- The reader ------------------------------------------- */}
        {/* Sticks the moment it reaches the navbar. Capped to the viewport and
            scrollable inside, so a short screen can still reach "Onderweg in"
            instead of losing it under the fold of a sticky column. */}
        <aside className="lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
          <section className={`p-5 ${PANEL}`} aria-labelledby="diepte-voortgang">
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden
                className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-full ring-1 ring-white/25"
                style={{ backgroundColor: "rgba(13,148,136,0.28)" }}
              >
                <span className="text-lg font-bold leading-none tabular-nums text-white">{level}</span>
                <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/70">niveau</span>
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="diepte-voortgang" className="truncate text-base font-semibold leading-tight text-white">
                  Jouw voortgang
                </h2>
                {d.dateLabel ? (
                  <p className="mt-1 truncate text-xs text-white/65">{d.firstName} · {d.dateLabel}</p>
                ) : (
                  <SkeletonBlock className={`mt-2 h-3 w-32 ${SKEL}`} />
                )}
              </div>
            </div>

            {/* Level and the XP still to go */}
            <div className="mt-5">
              <div className="flex items-baseline justify-between text-xs tabular-nums">
                <span className="font-semibold text-white">Niveau {level}</span>
                <span className="text-white/65">{xpInto} / {xpFor} XP</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: d.loading && tree.loading ? "0%" : `${pct}%`, backgroundColor: TEAL_ON_DARK }}
                />
              </div>
              {tree.loading ? (
                <SkeletonBlock className={`mt-2 h-3 w-40 ${SKEL}`} />
              ) : (
                <p className="content-in mt-2 text-xs tabular-nums text-white/70">
                  {tree.wilting
                    ? `${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} niet gelezen`
                    : `Nog ${Math.max(0, xpFor - xpInto)} XP tot niveau ${level + 1}`}
                  {tree.nextStage ? ` · volgende fase ${tree.nextStage.name}` : ""}
                </p>
              )}
              {!tree.loading && tree.nextUnlock && (
                <p className="mt-1 text-xs text-white/60">
                  Volgende vrijspeling: {tree.nextUnlock.name} - niveau {tree.nextUnlock.level}
                </p>
              )}
              <Link
                href="/profiel/boom"
                className="mt-2.5 inline-block text-xs font-semibold no-underline hover:underline"
                style={{ color: TEAL_ON_DARK }}
              >
                Naar je boom →
              </Link>
            </div>

            {/* The week */}
            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className={EYEBROW}>Deze week</h3>
                {!d.loading && (
                  <span className="text-[11px] tabular-nums text-white/65">
                    {d.streak} {dayWord(d.streak)} op rij
                  </span>
                )}
              </div>
              <WeekStrip days={d.weekDays} loading={d.statsLoading} />
              {!d.statsLoading && (
                <p className="mt-2.5 text-xs tabular-nums text-white/60">
                  {d.weekTotal === 0 ? "Nog geen activiteit deze week" : `${d.weekTotal} hoofdstukken deze week`}
                </p>
              )}
            </div>

            {/* The standing totals */}
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className={`${EYEBROW} mb-3`}>Totalen</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Total label="Hoofdstukken" loading={d.loading} value={`${d.chaptersRead}`} sub={`van ${TOTAL_CHAPTERS}`} />
                <Total label="Boeken" loading={d.loading} value={`${d.booksWithProgress}`} sub="van 66 geopend" />
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
            </div>

            {/* "Onderweg in" used to list the four books furthest along. The
                field of 66 squares in the work column says the same thing more
                clearly and for every book at once, so the list is gone. */}
          </section>
        </aside>

        {/* --- The work --------------------------------------------- */}
        <div className="min-w-0 space-y-5">
          <div className="empty:hidden">
            <BillingNotices />
          </div>

          {/* Verder waar je was */}
          {d.loading ? (
            <SkeletonBlock className={`h-36 w-full rounded-2xl ${SKEL}`} />
          ) : (
            <section
              className={`content-in flex flex-wrap items-end justify-between gap-4 p-6 ${PANEL}`}
              aria-labelledby="diepte-verder"
            >
              <div className="min-w-0">
                <h2 id="diepte-verder" className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
                  {d.lastRead ? "Verder waar je was" : "Begin vandaag"}
                </h2>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {d.lastRead
                    ? `Hoofdstuk ${d.lastRead.chapter}${versionAbbreviation(d.lastRead.version) ? ` · ${versionAbbreviation(d.lastRead.version)}` : ""}`
                    : "Lees dag voor dag door de Bijbel."}
                </p>
              </div>
              <Link
                href={nextHref}
                className="press inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline outline-none transition-colors hover:bg-[#0F766E] focus-visible:ring-2 focus-visible:ring-white"
                style={{ backgroundColor: TEAL }}
              >
                {d.lastRead ? "Verder lezen" : "Begin met lezen"}
                <ArrowRight size={14} />
              </Link>
            </section>
          )}

          {/* Tekst van de dag */}
          <div className="[&>div]:rounded-2xl">
            <DailyVerseCard verse={d.verse} loading={d.verseLoading} />
          </div>

          {/* Je weg door de Bijbel */}
          <section className={`p-6 ${PANEL}`} aria-labelledby="diepte-weg">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="diepte-weg" className="text-base font-semibold text-white">Je weg door de Bijbel</h2>
              {d.loading ? (
                <SkeletonBlock className={`h-3 w-40 ${SKEL}`} />
              ) : (
                <p className="text-xs tabular-nums text-white/65">
                  {d.chaptersRead} van {TOTAL_CHAPTERS} hoofdstukken · {readPct}%
                </p>
              )}
            </div>
            <p className="mt-1 h-4 text-xs text-white/70">
              {hoveredBook ? (
                <>
                  <span className="font-semibold text-white">{hoveredBook}</span>
                  {" · "}
                  <span className="tabular-nums">
                    {d.bookReadCount(hoveredBook)} van {chapterCount(hoveredBook)} hoofdstukken
                  </span>
                </>
              ) : (
                "Beweeg over een boek voor details"
              )}
            </p>

            <BookField
              label="Oude Testament"
              books={OT_BOOKS}
              ratioOf={d.bookReadRatio}
              loading={d.loading}
              current={d.lastRead?.book ?? null}
              hovered={hoveredBook}
              onHover={setHoveredBook}
            />
            <BookField
              label="Nieuwe Testament"
              books={NT_BOOKS}
              ratioOf={d.bookReadRatio}
              loading={d.loading}
              current={d.lastRead?.book ?? null}
              hovered={hoveredBook}
              onHover={setHoveredBook}
            />

            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[11px] text-white/55">
              <span>Niets</span>
              <span aria-hidden className="flex gap-[3px]">
                {[0, 0.2, 0.4, 0.7, 1].map(ratio => (
                  <span
                    key={ratio}
                    className="block h-[11px] w-[11px] rounded-sm"
                    style={{ backgroundColor: fieldColor(ratio) }}
                  />
                ))}
              </span>
              <span>Uitgelezen</span>
            </div>
          </section>

          {/* Recente notities */}
          <section className={`p-6 ${PANEL}`} aria-labelledby="diepte-notities">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="diepte-notities" className="text-base font-semibold text-white">Recente notities</h2>
              <Link
                href="/notities"
                className="text-xs font-semibold no-underline hover:underline"
                style={{ color: TEAL_ON_DARK }}
              >
                Alle notities
              </Link>
            </div>
            {d.loading ? (
              <div className="mt-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <SkeletonBlock className={`h-3 w-1/4 ${SKEL}`} />
                    <SkeletonBlock className={`h-3.5 w-full ${SKEL}`} />
                  </div>
                ))}
              </div>
            ) : d.recentNotes.length === 0 ? (
              <p className="mt-4 text-sm text-white/70">
                Nog geen notities.{" "}
                <Link
                  href={nextHref}
                  className="font-semibold no-underline hover:underline"
                  style={{ color: TEAL_ON_DARK }}
                >
                  Schrijf er een tijdens het lezen
                </Link>
              </p>
            ) : (
              <ul className="stagger-in mt-2 divide-y divide-white/10">
                {d.recentNotes.map(note => (
                  <li key={note._id}>
                    <Link href={readHref(note.book, note.chapter)} className="group block py-3 no-underline">
                      <p className="text-xs font-semibold" style={{ color: TEAL_ON_DARK }}>
                        {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-white/75 group-hover:text-white">
                        {note.noteText}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Aanbevolen studies */}
          <section className={`p-6 ${PANEL}`} aria-labelledby="diepte-studies">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="diepte-studies" className="text-base font-semibold text-white">Aanbevolen studies</h2>
              <Link
                href="/studies"
                className="text-xs font-semibold no-underline hover:underline"
                style={{ color: TEAL_ON_DARK }}
              >
                Bekijk alle
              </Link>
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {curatedStudies.slice(0, 4).map(study => {
                const badge = BADGE_STYLES[study.type]
                return (
                  <li key={study.id}>
                    <Link
                      href={`/studies/${study.id}`}
                      className="group flex h-full flex-col rounded-xl bg-white/[0.06] p-4 no-underline outline-none ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {study.type}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] tabular-nums text-white/65">
                          <Clock size={10} aria-hidden /> {study.durationLabel}
                        </span>
                      </span>
                      <span className="mt-2.5 text-[15px] font-semibold leading-snug text-white">{study.title}</span>
                      <span className="mt-1 line-clamp-2 flex-1 text-sm leading-relaxed text-white/70">
                        {study.description}
                      </span>
                      <span
                        className="mt-3 flex items-center gap-1 text-xs font-semibold"
                        style={{ color: TEAL_ON_DARK }}
                      >
                        Bekijk studie
                        <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* "Snel naar" is gone on purpose: every one of its three links is
              already in the rail, one hover away, and a fourth panel repeating
              them was the clearest case of the page doing too much. */}

        </div>
      </div>
    </div>
  )
}

/* -- The reading field ---------------------------------------------- */

/**
 * The five-step ramp the live dashboard already uses, restated for a dark
 * ground: the empty square is a film of white rather than `--progress-empty`,
 * which is tuned for a white page and disappears here.
 */
function fieldColor(ratio: number): string {
  if (ratio <= 0) return "rgba(255,255,255,0.14)"
  if (ratio < 0.25) return "rgba(45,212,191,0.30)"
  if (ratio < 0.5) return "rgba(45,212,191,0.52)"
  if (ratio < 1) return "rgba(45,212,191,0.76)"
  return "#2DD4BF"
}

/**
 * One testament as a field of squares, one per book, filled by how much of it
 * is read - the contribution-graph shape the live dashboard uses, which reads
 * far faster than a ribbon and gives all 66 books at once.
 */
function BookField({
  label,
  books,
  ratioOf,
  loading,
  current,
  hovered,
  onHover,
}: {
  label: string
  books: readonly string[]
  ratioOf: (book: string) => number
  loading: boolean
  current: string | null
  hovered: string | null
  onHover: (book: string | null) => void
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
        {label} <span className="font-normal normal-case tabular-nums">({books.length} boeken)</span>
      </p>
      <div className="flex flex-wrap gap-[3px]">
        {books.map(book => {
          const ratio = loading ? 0 : ratioOf(book)
          const isCurrent = !loading && current === book
          return (
            <Link
              key={book}
              href={readHref(book, 1)}
              title={book}
              aria-label={book}
              onMouseEnter={() => onHover(book)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(book)}
              onBlur={() => onHover(null)}
              className={`relative block flex-shrink-0 rounded-sm no-underline transition-transform duration-100 hover:z-10 hover:scale-125 ${
                loading ? "skeleton-pulse" : ""
              }`}
              style={{
                width: 18,
                height: 18,
                backgroundColor: fieldColor(ratio),
                outline: hovered === book || isCurrent ? "2px solid #2DD4BF" : "none",
                outlineOffset: 1,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
