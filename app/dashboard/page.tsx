"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { CHAPTER_COUNTS } from "../../lib/data/bible-chapter-counts"
import { curatedStudies } from "../../lib/data/curated-studies"
import {
  NT_BOOKS,
  OT_BOOKS,
  TOTAL_CHAPTERS,
  readHref,
  useDashboardData,
} from "../../hooks/useDashboardData"
import BillingNotices from "../../components/pricing/BillingNotices"
import { useTreeSummary } from "../../components/dashboard/ProgressTree"
import SceneShell from "../../components/scene/SceneShell"
import { GlassStat, SceneSkeleton, SectionHeading, Total, WeekStrip } from "../../components/scene/pieces"
import { EYEBROW, PANEL, TEAL_ON_DARK } from "../../components/scene/tokens"

/**
 * A row in one of the two ledgers at the bottom of the work column.
 *
 * Two columns from `sm` up - a margin and the line itself - and one stacked
 * column below it, where 8.5rem of margin would leave nothing for the words.
 */
const LEDGER_ROW = "sm:grid sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-5"

/**
 * The same row as a link. It bleeds two pixels past the column so the hover
 * wash reads as a row rather than as a box drawn around the type.
 */
const LEDGER_LINK =
  "-mx-2 block rounded-lg px-2 no-underline outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white"

/**
 * The dashboard.
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
 * The content set: greeting, streak and week, level and XP, the 66 books, the
 * recent notes and the recommended studies. The resume panel and the daily
 * verse card that used to sit in the work column are gone - the one action in
 * the sky already carries the reader onward, and the verse card is drawn for a
 * white page.
 *
 * That one action goes to the guided study (`/studie`), not to free reading.
 * The dashboard is where someone decides what to do with the next twenty
 * minutes, and the answer the product wants is "the study you are in" - so the
 * pill hands off to the dispatcher and lets it work out which study that is.
 * Reading is still one hover away on the rail, and the reading-shaped links on
 * this page still point at /lezen.
 *
 * The window itself - the root, the fixed scene and its scrims, the navbar, the
 * rail and the content gutter - is components/scene/SceneShell.tsx, which every
 * immersive page in the app now shares. This page brings only its three layers.
 *
 * Chrome: the real navbar, imported unchanged. The sidebar is the piece that
 * had to give - see components/scene/SceneRail.tsx.
 *
 * Motion: one passive, rAF-throttled scroll listener publishing three CSS
 * variables (see components/scene/useSceneDepth.ts). Every consumer of them
 * touches `transform` or `opacity` and nothing else, and `prefers-reduced-
 * motion` gets the settled state with no scroll effects at all.
 */
export default function DashboardPage() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  /**
   * The one action in the sky goes to the guided study, not to free reading.
   *
   * `/studie` is a dispatcher (app/studie/page.tsx): with no query it resolves
   * the reader's newest active enrolment server-side and redirects into
   * /studie/[studyId]/[day], and falls back to /studies when there is none. So
   * the dashboard needs to know nothing about enrolments - no extra fetch, no
   * endpoint, no waiting. Never hand it `?book=`/`?chapter=`: that is a reading
   * intent and the dispatcher forwards it straight to /lezen, which is exactly
   * the behaviour this replaced.
   */
  const studyHref = "/studie"

  /**
   * The reading destination, for the links that really are about reading: back
   * to the last chapter, or the reader's own default when there is no last one.
   */
  const readingHref = d.lastRead
    ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version)
    : "/lezen"
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? tree.progressPercentage)
  const readPct = Math.round((d.chaptersRead / TOTAL_CHAPTERS) * 100)

  const chapterCount = (book: string) => CHAPTER_COUNTS[book] ?? 1

  const [hoveredBook, setHoveredBook] = useState<string | null>(null)

  return (
    // The reader's OWN tree is the scene here, so `backdrop="reader"`; every
    // page with no session guaranteed uses the static one instead. The shell
    // owns the root, the scene, the scrims, the navbar, the rail and the
    // gutter - see components/scene/README.md.
    <SceneShell backdrop="reader" header rail>
      {/* -- Layer 1: the sky ------------------------------------------ */}
      <section
        aria-labelledby="diepte-titel"
        className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-between pb-32 pt-5"
      >
        {/* The date, alone. There used to be a "Huidig dashboard" link opposite
            it - the last survivor of the design bake-off's switcher, pointing
            at the page it was already on. With it gone the row is a single
            item, so it is left-aligned against the greeting below rather than
            spaced apart from nothing. */}
        <div>
          {d.dateLabel ? (
            <p className="text-sm text-white/80">{d.dateLabel}</p>
          ) : (
            <SceneSkeleton className="h-3.5 w-36" />
          )}
        </div>

        <div className="scene-sky max-w-[46rem]">
          {/* The one line of colour up here. It is the reader's own standing -
              the stage their tree is in - so it is the thing on this screen
              that has earned an accent; everything else stays white on the
              landscape. */}
          <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
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
          {!d.greeting && <SceneSkeleton className="mt-3 h-14 w-[26rem] max-w-full" />}

          <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">
            {tree.wilting
              ? `Je boom heeft ${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} geen water gehad. Eén hoofdstuk is genoeg.`
              : d.readToday
                ? "Je hebt vandaag al gelezen. Wat je nu leest, is extra."
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
            {/* No skeleton and no branch any more: the destination and the words
                are both fixed, so the page's one action is clickable in the
                first frame instead of waiting on a fetch it no longer needs.
                The wording has to be true whether the dispatcher lands on a
                running study or on the list to pick one, so it says neither
                "verder" nor "begin". */}
            <Link
              href={studyHref}
              className="press group inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-base font-semibold text-gray-900 no-underline shadow-xl shadow-black/30 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488]"
            >
              Aan de slag met je studie
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            {/* The second accent, and the last one on this screen: the quiet
                action beside the white pill. */}
            <Link
              href="/profiel/boom"
              className="text-sm font-semibold no-underline underline-offset-4 hover:underline"
              style={{ color: TEAL_ON_DARK }}
            >
              Bekijk je boom →
            </Link>
          </div>
        </div>

        {/* Keeps the button row clear of the numbers that break the fold. */}
        <div aria-hidden />
      </section>

      {/* -- Layer 2: the horizon -------------------------------------- */}
      <div className="scene-horizon -mt-24">
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
      <div className="grid w-full grid-cols-1 gap-6 pb-20 pt-14 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">

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
                  <SceneSkeleton className="mt-2 h-3 w-32" />
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
                <SceneSkeleton className="mt-2 h-3 w-40" />
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
        {/* `flex flex-col gap-5` rather than `space-y-5` on purpose. Tailwind's
            space utility keys off the `hidden` ATTRIBUTE (`> :not([hidden]) ~
            :not([hidden])`), and the billing slot is hidden with `display:none`
            via `empty:hidden` - so on the usual screen, where there is no
            notice, the books card still inherited 1.25rem of top margin from a
            slot that draws nothing, and started 20px below the reader panel
            beside it. A flex gap is not created for a `display:none` child, so
            the two panels now start on exactly the same line, and a notice that
            IS shown still gets the same 20px it always had. */}
        <div className="flex min-w-0 flex-col gap-5">
          <div className="empty:hidden">
            <BillingNotices />
          </div>

          {/* "Verder waar je was" stood here and is gone: a panel repeating the
              sky's one action a screen further down was the page asking twice.
              "Tekst van de dag" is gone too - its card is drawn for a white page
              and never sat right on the landscape. */}

          {/* Je weg door de Bijbel.
              The card the reader panel is measured against. It cannot simply
              stretch to that panel's height: the panel is `self-start` so it
              can be sticky, which takes it out of the row's stretch, and no
              sibling can read a sticky element's height in CSS. So the card
              carries a floor of its own at `lg` - about the height the reader
              panel settles at - and spends it on the field rather than on air:
              the two testaments are `flex-1`, so the slack goes into the
              squares' own breathing room instead of collecting as one dead gap
              above the legend. Below `lg` the columns stack, there is nothing
              to line up with, and the floor is not applied. */}
          <section className={`flex flex-col p-6 lg:min-h-[33rem] ${PANEL}`} aria-labelledby="diepte-weg">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="diepte-weg" className="text-base font-semibold text-white">Je weg door de Bijbel</h2>
              {d.loading ? (
                <SceneSkeleton className="h-3 w-40" />
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

          {/* Recente notities.
              No panel. A note is a line the reader wrote, so it is set as one:
              the reference stands in the margin the way it does in a printed
              bible, the words run beside it, and a hairline separates them.
              Boxing four of these in glass was what made them look like
              somebody else's content. */}
          <section aria-labelledby="diepte-notities" className="pt-2">
            <SectionHeading
              id="diepte-notities"
              title="Recente notities"
              rule
              action={
                <Link
                  href="/notities"
                  className="text-xs font-semibold no-underline hover:underline"
                  style={{ color: TEAL_ON_DARK }}
                >
                  Alle notities
                </Link>
              }
            />
            {d.loading ? (
              <div className="divide-y divide-white/10">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`py-3.5 ${LEDGER_ROW}`}>
                    <SceneSkeleton className="h-3 w-24" />
                    <SceneSkeleton className="mt-1.5 h-3.5 w-full sm:mt-0" />
                  </div>
                ))}
              </div>
            ) : d.recentNotes.length === 0 ? (
              <p className="mt-4 text-sm text-white/70">
                Nog geen notities.{" "}
                {/* Reading-shaped, so it keeps going to the reader even though
                    the hero above it now goes to the study flow. */}
                <Link
                  href={readingHref}
                  className="font-semibold no-underline hover:underline"
                  style={{ color: TEAL_ON_DARK }}
                >
                  Schrijf er een tijdens het lezen
                </Link>
              </p>
            ) : (
              <ul className="stagger-in m-0 divide-y divide-white/10 p-0">
                {d.recentNotes.map(note => (
                  <li key={note._id} className="list-none">
                    <Link
                      href={readHref(note.book, note.chapter)}
                      className={`group py-3.5 ${LEDGER_ROW} ${LEDGER_LINK}`}
                    >
                      <span className="truncate text-xs font-semibold tabular-nums" style={{ color: TEAL_ON_DARK }}>
                        {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                      </span>
                      <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/75 transition-colors group-hover:text-white sm:mt-0">
                        {note.noteText}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Aanbevolen studies.
              The same four studies and the same links, read as a bill of fare
              instead of four boxes: what kind of study it is and how long it
              takes sit in the margin, and the title does the work. The teal
              chip is gone - all four types carried the same colour, so it
              said nothing the word did not, and white on it measured 3.7:1. */}
          <section aria-labelledby="diepte-studies" className="pt-2">
            <SectionHeading
              id="diepte-studies"
              title="Aanbevolen studies"
              rule
              action={
                <Link
                  href="/studies"
                  className="text-xs font-semibold no-underline hover:underline"
                  style={{ color: TEAL_ON_DARK }}
                >
                  Bekijk alle
                </Link>
              }
            />
            <ul className="stagger-in m-0 divide-y divide-white/10 p-0">
              {curatedStudies.slice(0, 4).map(study => (
                <li key={study.id} className="list-none">
                  <Link href={`/studies/${study.id}`} className={`group py-3.5 ${LEDGER_ROW} ${LEDGER_LINK}`}>
                    <span className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55 sm:flex-col sm:gap-1">
                      <span className="truncate">{study.type}</span>
                      <span className="flex items-center gap-1 font-medium normal-case tracking-normal tabular-nums text-white/45">
                        {/* The clock names the number as a duration; it is not decoration. */}
                        <Clock size={10} aria-hidden /> {study.durationLabel}
                      </span>
                    </span>
                    <span className="mt-1.5 sm:mt-0">
                      <span className="block text-[15px] font-semibold leading-snug text-white">{study.title}</span>
                      <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/70 transition-colors group-hover:text-white/90">
                        {study.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* "Snel naar" is gone on purpose: every one of its three links is
              already in the rail, one hover away, and a fourth panel repeating
              them was the clearest case of the page doing too much. */}

        </div>
      </div>
    </SceneShell>
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
    // `flex-1` is what lets the card reach the reader panel's foot without a
    // hole in it: the two fields share whatever height the card's `lg:min-h`
    // hands them, and each centres its own rows in its share. With no floor -
    // every width below `lg` - there is no free space to hand out and the block
    // is exactly as tall as its content, as before.
    <div className="mt-4 flex flex-1 flex-col justify-center">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
        {label} <span className="font-normal normal-case tabular-nums">({books.length} boeken)</span>
      </p>
      {/* auto-fill, not auto-fit: the last row's squares keep their track and
          stay left-aligned under the row above instead of stretching across the
          full width. The minimum track grows with the screen, so a square is a
          20px chip on a phone and a 44px tile on a desktop - which is also the
          first time this control clears a 24px touch target. */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(1.25rem,1fr))] gap-[3px] lg:grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] lg:gap-1 2xl:grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))]">
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
              className={`relative block aspect-square w-full rounded-sm no-underline transition-transform duration-100 hover:z-10 hover:scale-110 lg:rounded-md ${
                loading ? "skeleton-pulse" : ""
              }`}
              style={{
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
