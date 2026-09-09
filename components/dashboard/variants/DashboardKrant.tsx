"use client"

import Link from "next/link"
import { curatedStudies } from "../../../lib/data/curated-studies"
import { useDashboardData, readHref, TOTAL_CHAPTERS } from "../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../lib/dailyVerseStore"
import BillingNotices from "../../pricing/BillingNotices"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const KICKER = "text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
const RULE = "border-gray-300 dark:border-border"

/**
 * Versie 7 - "Krant".
 *
 * A morning paper. A ruled masthead with the date on it, the day's verse set
 * as the lead story with a drop capital, and everything else broken into
 * columns divided by hairlines: your figures as a table with dotted leaders,
 * the notes as short items, the studies as a listing. Serif for anything
 * meant to be read, sans for anything meant to be scanned - and no card
 * anywhere, because a newspaper has none.
 */
export default function DashboardKrant() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")
  const lead = d.verse?.text ?? ""
  const dropCap = lead.charAt(0)
  const rest = lead.slice(1)

  return (
    <div className="min-h-full bg-[#FCFCFA] dark:bg-background">
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-5 sm:px-8">
        <VariantSwitcher className="justify-end" />

        {/* --- Masthead --------------------------------------- */}
        <header className={`mt-4 border-b-2 pb-3 ${RULE}`}>
          <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b pb-2 ${RULE}`}>
            <p className={KICKER}>Bijbelstudie · Dagblad</p>
            {d.dateLabel ? (
              <p className="text-[11px] font-medium tabular-nums text-muted-foreground">{d.dateLabel}</p>
            ) : (
              <SkeletonBlock className="h-3 w-36" />
            )}
          </div>
          {d.greeting ? (
            <h1 className="mt-3 font-serif text-[2.1rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-[2.9rem]">
              {d.greeting}
            </h1>
          ) : (
            <SkeletonBlock className="mt-3 h-10 w-2/3 sm:h-12" />
          )}
          {!d.loading && (
            <p className="content-in mt-2 text-sm text-muted-foreground">
              {d.streak > 0
                ? `${d.streak} ${dayWord(d.streak)} op rij gelezen · ${d.chaptersRead} van ${TOTAL_CHAPTERS} hoofdstukken`
                : `${d.chaptersRead} van ${TOTAL_CHAPTERS} hoofdstukken gelezen`}
            </p>
          )}
        </header>

        <div className="mt-4 empty:hidden">
          <BillingNotices />
        </div>

        {/* --- The paper: lead left, columns right ------------ */}
        <div className={`mt-6 grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:divide-x ${RULE}`}>
          {/* Lead story */}
          <div className="min-w-0">
            <article aria-labelledby="krant-lead">
              <h2 id="krant-lead" className={KICKER}>Tekst van de dag</h2>
              {d.verseLoading ? (
                <div className="mt-3 space-y-3">
                  <SkeletonBlock className="h-8 w-full" />
                  <SkeletonBlock className="h-8 w-11/12" />
                  <SkeletonBlock className="h-8 w-4/5" />
                  <SkeletonBlock className="mt-4 h-3.5 w-40" />
                </div>
              ) : d.verse ? (
                <div className="content-in mt-3">
                  <p className="font-serif text-[1.35rem] leading-[1.55] text-foreground sm:text-[1.6rem]">
                    <span
                      aria-hidden
                      className="float-left mr-2.5 mt-1 font-serif text-[3.4rem] font-bold leading-[0.78] sm:text-[4.2rem]"
                      style={{ color: TEAL }}
                    >
                      {dropCap}
                    </span>
                    {rest}
                  </p>
                  <p className={`mt-4 flex flex-wrap items-baseline gap-x-3 border-t pt-3 text-sm ${RULE}`}>
                    <span className="font-semibold" style={{ color: TEAL }}>{d.verse.reference}</span>
                    {versionAbbreviation(d.verse.version) && (
                      <span className="text-muted-foreground">{versionAbbreviation(d.verse.version)}</span>
                    )}
                    <Link
                      href={readHref(d.verse.book, d.verse.chapter)}
                      className={`ml-auto font-semibold no-underline hover:underline ${TEAL_TEXT}`}
                    >
                      Lees het hoofdstuk →
                    </Link>
                  </p>
                </div>
              ) : (
                <p className="mt-3 font-serif text-lg text-muted-foreground">
                  De tekst van vandaag is even niet beschikbaar.
                </p>
              )}
            </article>

            {/* Second item: where you left off, boxed like a call-out */}
            <article className={`mt-8 border-y-2 py-5 ${RULE}`} aria-labelledby="krant-verder">
              <h2 id="krant-verder" className={KICKER}>
                {d.lastRead ? "Verder waar u was" : "Begin vandaag"}
              </h2>
              {d.loading ? (
                <div className="mt-3 space-y-3">
                  <SkeletonBlock className="h-8 w-64" />
                  <SkeletonBlock className="h-4 w-48" />
                  <SkeletonBlock className="mt-3 h-10 w-40" />
                </div>
              ) : (
                <div className="content-in mt-2 flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start uw bijbelstudie"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {d.lastRead
                        ? `Hoofdstuk ${d.lastRead.chapter}${versionAbbreviation(d.lastRead.version) ? ` · ${versionAbbreviation(d.lastRead.version)}` : ""}`
                        : "Lees dag voor dag door de Bijbel."}
                    </p>
                  </div>
                  <Link
                    href={nextHref}
                    className="press inline-flex items-center rounded-none px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white no-underline transition-colors hover:bg-[#0F766E]"
                    style={{ backgroundColor: TEAL }}
                  >
                    {d.lastRead ? "Verder lezen" : "Begin met lezen"}
                  </Link>
                </div>
              )}
            </article>

            {/* Third item: the notes, as short despatches in two columns */}
            <article className="mt-8" aria-labelledby="krant-notities">
              <div className={`flex items-baseline justify-between gap-3 border-b pb-2 ${RULE}`}>
                <h2 id="krant-notities" className={KICKER}>
                  Uit uw notities{!d.loading && d.notesCount > 0 ? ` · ${d.notesCount}` : ""}
                </h2>
                <Link href="/notities" className={`text-[11px] font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Alle notities
                </Link>
              </div>
              {d.loading ? (
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  {[1, 2].map(i => (
                    <div key={i} className="space-y-2">
                      <SkeletonBlock className="h-3 w-1/3" />
                      <SkeletonBlock className="h-3.5 w-full" />
                      <SkeletonBlock className="h-3.5 w-4/5" />
                    </div>
                  ))}
                </div>
              ) : d.recentNotes.length === 0 ? (
                <p className="mt-4 font-serif text-base text-muted-foreground">
                  Nog niets opgeschreven.{" "}
                  <Link href={nextHref} className={`font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                    Schrijf uw eerste notitie tijdens het lezen.
                  </Link>
                </p>
              ) : (
                <ul className="stagger-in mt-4 grid gap-5 sm:grid-cols-2">
                  {d.recentNotes.map(note => (
                    <li key={note._id}>
                      <Link href={readHref(note.book, note.chapter)} className="group block no-underline">
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: TEAL }}>
                          {note.book} {note.chapter}{note.verse ? `:${note.verse}` : ""}
                        </p>
                        <p className="mt-1 line-clamp-3 font-serif text-[15px] leading-[1.5] text-muted-foreground group-hover:text-foreground">
                          {note.noteText}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          {/* Right column: the ledger */}
          <div className="min-w-0 lg:pl-8">
            <section aria-labelledby="krant-cijfers">
              <h2 id="krant-cijfers" className={`border-b pb-2 ${KICKER} ${RULE}`}>In cijfers</h2>
              <dl className="mt-3 space-y-2">
                <Row label="Reeks" loading={d.loading} value={`${d.streak} ${dayWord(d.streak)}`} />
                <Row label="Langste reeks" loading={tree.loading} value={`${tree.longestStreak} ${dayWord(tree.longestStreak)}`} />
                <Row label="Deze week" loading={d.statsLoading} value={`${d.weekTotal}× gelezen`} />
                <Row label="Hoofdstukken" loading={d.loading} value={`${d.chaptersRead} / ${TOTAL_CHAPTERS}`} />
                <Row label="Boeken geopend" loading={d.loading} value={`${d.booksWithProgress} / 66`} />
                <Row label="Boeken uitgelezen" loading={d.loading} value={`${d.booksCompleted}`} />
                <Row label="Notities" loading={d.loading} value={`${d.notesCount}`} />
                <Row label="Lessen" loading={d.loading} value={`${d.studyCounts?.lessonsCompleted ?? 0}`} />
              </dl>
            </section>

            <section className="mt-8" aria-labelledby="krant-voortgang">
              <h2 id="krant-voortgang" className={`border-b pb-2 ${KICKER} ${RULE}`}>Uw voortgang</h2>
              <div className="mt-4 flex items-center gap-4">
                <ProgressTreeDisc size={64} still />
                <div className="min-w-0 flex-1">
                  {tree.loading ? (
                    <div className="space-y-2">
                      <SkeletonBlock className="h-4 w-32" />
                      <SkeletonBlock className="h-3 w-24" />
                    </div>
                  ) : (
                    <div className="content-in">
                      <p className="font-serif text-lg font-bold leading-tight text-foreground">
                        {tree.hasTree && tree.stageName ? tree.stageName : `Niveau ${tree.level}`}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {tree.wilting
                          ? `${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} niet gelezen`
                          : `Nog ${tree.remainingXp} XP tot niveau ${tree.level + 1}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Link href="/profiel/boom" className={`mt-3 inline-block text-[11px] font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                Bekijk uw boom →
              </Link>
            </section>

            <section className="mt-8" aria-labelledby="krant-studies">
              <div className={`flex items-baseline justify-between gap-3 border-b pb-2 ${RULE}`}>
                <h2 id="krant-studies" className={KICKER}>Aanbevolen</h2>
                <Link href="/studies" className={`text-[11px] font-semibold no-underline hover:underline ${TEAL_TEXT}`}>
                  Alle studies
                </Link>
              </div>
              <ul className="mt-1 divide-y divide-gray-200 dark:divide-border">
                {curatedStudies.slice(0, 5).map(study => (
                  <li key={study.id}>
                    <Link href={`/studies/${study.id}`} className="group block py-2.5 no-underline">
                      <p className="font-serif text-[15px] font-bold leading-snug text-foreground group-hover:underline">
                        {study.title}
                      </p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                        {study.type} · {study.durationLabel}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --- Pieces ------------------------------------------------- */

/** A ledger line: label left, figure right, dotted leader between them. */
function Row({ label, loading, value }: { label: string; loading: boolean; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <dt className="flex-shrink-0 text-muted-foreground">{label}</dt>
      <span aria-hidden className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-gray-300 dark:border-border" />
      {loading ? (
        <dd><SkeletonBlock className="h-3.5 w-14" /></dd>
      ) : (
        <dd className="flex-shrink-0 font-semibold tabular-nums text-foreground">{value}</dd>
      )}
    </div>
  )
}
