"use client"

import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { useDashboardData, readHref, isToday } from "../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../lib/dailyVerseStore"
import BillingNotices from "../../pricing/BillingNotices"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"

/**
 * Versie 1 - "Vandaag".
 *
 * A reading room. One column of measured width, large type, almost no chrome:
 * the day's verse set as the centrepiece, exactly one button, and the day as a
 * three-line checklist. What the workbench variant shows as a tile is here a
 * sentence, or left out. Hairlines only where a list needs them.
 */
export default function DashboardVandaag() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const todayNote = d.recentNotes.find(n => isToday(n.createdAt))
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")

  const checklist = [
    {
      key: "lezen",
      title: "In de Bijbel gelezen",
      done: d.readToday,
      detail: d.readToday ? "Vandaag gelezen" : "Nog niet vandaag",
      action: d.readToday ? null : { label: "Lezen", href: nextHref },
    },
    {
      key: "notitie",
      title: "Een notitie geschreven",
      done: d.noteToday,
      detail: d.noteToday && todayNote ? `Bij ${todayNote.book} ${todayNote.chapter}` : "Schrijf op wat je opviel",
      action: d.noteToday ? null : { label: "Notities", href: "/notities" },
    },
    {
      key: "reeks",
      title: "Reeks behouden",
      done: d.streakToday,
      detail: d.streakToday
        ? `${d.streak} ${dayWord(d.streak)} op rij`
        : d.streak > 0
          ? `Lees vandaag om je reeks van ${d.streak} ${dayWord(d.streak)} te behouden`
          : "Begin vandaag een nieuwe reeks",
      action: null,
    },
  ]
  const doneCount = checklist.filter(item => item.done).length

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[42rem] px-5 pb-20 pt-6 sm:px-8 sm:pt-8">
        <VariantSwitcher className="justify-end" />

        <div className="mt-6 empty:hidden">
          <BillingNotices />
        </div>

        {/* ── Masthead ─────────────────────────────────────── */}
        <header className="mt-10 sm:mt-14">
          {d.dateLabel ? (
            <p className={EYEBROW}>{d.dateLabel}</p>
          ) : (
            <SkeletonBlock className="h-3 w-40" />
          )}
          {d.greeting ? (
            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
              {d.greeting}
            </h1>
          ) : (
            <SkeletonBlock className="mt-3 h-9 w-3/4 sm:h-11" />
          )}
          {d.loading ? (
            <SkeletonBlock className="mt-4 h-4 w-48" />
          ) : (
            <p className="content-in mt-3 text-base text-muted-foreground">
              {d.streak > 0 ? `Je leest ${d.streak} ${dayWord(d.streak)} op rij.` : "Een goed moment om te beginnen."}
            </p>
          )}
        </header>

        {/* ── The day's verse, set in type ─────────────────── */}
        <section className="mt-14 sm:mt-20" aria-labelledby="vandaag-tekst">
          <h2 id="vandaag-tekst" className={EYEBROW}>Tekst van de dag</h2>
          {d.verseLoading ? (
            <div className="mt-6 space-y-3.5">
              <SkeletonBlock className="h-6 w-full sm:h-7" />
              <SkeletonBlock className="h-6 w-11/12 sm:h-7" />
              <SkeletonBlock className="h-6 w-2/3 sm:h-7" />
              <SkeletonBlock className="mt-5 h-3.5 w-32" />
            </div>
          ) : d.verse ? (
            <figure className="content-in mt-5">
              <blockquote className="font-serif text-[1.55rem] leading-[1.45] text-foreground sm:text-[1.9rem]">
                {d.verse.text}
              </blockquote>
              <figcaption className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <cite className="not-italic font-semibold" style={{ color: TEAL }}>{d.verse.reference}</cite>
                {versionAbbreviation(d.verse.version) && (
                  <span className="text-muted-foreground">{versionAbbreviation(d.verse.version)}</span>
                )}
                <Link
                  href={readHref(d.verse.book, d.verse.chapter)}
                  className={`ml-auto font-semibold no-underline hover:underline ${TEAL_TEXT}`}
                >
                  Lees het hoofdstuk →
                </Link>
              </figcaption>
            </figure>
          ) : (
            <p className="mt-5 text-base text-muted-foreground">De tekst van vandaag is even niet beschikbaar.</p>
          )}
        </section>

        {/* ── The one next action ──────────────────────────── */}
        <section className="mt-14 sm:mt-20" aria-labelledby="vandaag-verder">
          {d.loading ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-32" />
              <SkeletonBlock className="h-8 w-56" />
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="mt-6 h-12 w-44 rounded-xl" />
            </div>
          ) : (
            <div className="content-in">
              <h2 id="vandaag-verder" className={EYEBROW}>
                {d.lastRead ? "Verder waar je was" : "Begin vandaag"}
              </h2>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {d.lastRead ? `${d.lastRead.book} ${d.lastRead.chapter}` : "Start je bijbelstudie"}
              </p>
              <p className="mt-1.5 text-base text-muted-foreground">
                {d.lastRead
                  ? `Hoofdstuk ${d.lastRead.chapter}${versionAbbreviation(d.lastRead.version) ? ` · ${versionAbbreviation(d.lastRead.version)}` : ""}`
                  : "Lees dag voor dag door de Bijbel."}
              </p>
              <Link
                href={nextHref}
                className="press mt-6 inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
                style={{ backgroundColor: TEAL }}
              >
                {d.lastRead ? "Verder lezen" : "Begin met lezen"}
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>

        {/* ── Today, in three lines ────────────────────────── */}
        <section className="mt-14 sm:mt-20" aria-labelledby="vandaag-lijst">
          <div className="flex items-baseline justify-between">
            <h2 id="vandaag-lijst" className={EYEBROW}>Vandaag</h2>
            {!d.loading && !d.statsLoading && (
              <span className="text-xs tabular-nums text-muted-foreground">{doneCount} van {checklist.length}</span>
            )}
          </div>
          {d.loading || d.statsLoading ? (
            <ul className="mt-4 divide-y divide-gray-200 dark:divide-border">
              {[1, 2, 3].map(i => (
                <li key={i} className="flex items-center gap-4 py-4">
                  <SkeletonBlock className="h-6 w-6 flex-shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-48" />
                    <SkeletonBlock className="h-3 w-32" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="stagger-in mt-4 divide-y divide-gray-200 dark:divide-border">
              {checklist.map(item => (
                <li key={item.key} className="flex items-center gap-4 py-4">
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                      item.done ? "text-white" : "border-2 border-gray-300 dark:border-gray-600"
                    }`}
                    style={item.done ? { backgroundColor: TEAL } : undefined}
                  >
                    {item.done && <Check size={14} strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-base font-medium ${item.done ? "text-muted-foreground" : "text-foreground"}`}>
                      <span className="sr-only">{item.done ? "Gedaan: " : "Nog te doen: "}</span>
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                  {item.action && (
                    <Link
                      href={item.action.href}
                      className={`flex-shrink-0 text-sm font-semibold no-underline hover:underline ${TEAL_TEXT}`}
                    >
                      {item.action.label} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Progress, quietly ────────────────────────────── */}
        <section className="mt-14 flex items-center gap-5 sm:mt-20" aria-labelledby="vandaag-voortgang">
          <ProgressTreeDisc size={64} still />
          <div className="min-w-0 flex-1">
            <h2 id="vandaag-voortgang" className={EYEBROW}>Jouw voortgang</h2>
            {tree.loading ? (
              <div className="mt-2 space-y-2">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-3 w-28" />
              </div>
            ) : (
              <div className="content-in">
                <p className="mt-1 text-base font-medium text-foreground">
                  {tree.hasTree && tree.stageName ? `${tree.stageName} · niveau ${tree.level}` : `Niveau ${tree.level}`}
                </p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {tree.wilting
                    ? `${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} niet gelezen`
                    : `Nog ${tree.remainingXp} XP tot niveau ${tree.level + 1}`}
                </p>
              </div>
            )}
          </div>
          <Link
            href="/profiel/boom"
            className={`hidden flex-shrink-0 text-sm font-semibold no-underline hover:underline sm:inline ${TEAL_TEXT}`}
          >
            Bekijk je boom →
          </Link>
        </section>

        {/* ── Elsewhere ────────────────────────────────────── */}
        <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-200 pt-6 text-sm dark:border-border">
          <Link href="/notities" className="text-muted-foreground no-underline transition-colors hover:text-foreground">
            Notities{!d.loading && d.notesCount > 0 ? <span className="tabular-nums"> · {d.notesCount}</span> : null}
          </Link>
          <Link href="/studies" className="text-muted-foreground no-underline transition-colors hover:text-foreground">
            Studies
          </Link>
          <Link href="/lezen" className="text-muted-foreground no-underline transition-colors hover:text-foreground">
            Bijbel lezen
          </Link>
          <Link href="/profiel/boom" className="text-muted-foreground no-underline transition-colors hover:text-foreground sm:hidden">
            Je boom
          </Link>
        </footer>
      </div>
    </div>
  )
}
