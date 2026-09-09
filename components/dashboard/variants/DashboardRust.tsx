"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useDashboardData, readHref } from "../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../lib/dailyVerseStore"
import BillingNotices from "../../pricing/BillingNotices"
import { SkeletonBlock } from "../../ui/skeletons"
import VariantSwitcher from "../VariantSwitcher"
import { ProgressTreeDisc, useTreeSummary } from "../ProgressTree"

const TEAL = "#0D9488"
const TEAL_TEXT = "text-[#0D9488] dark:text-teal-400"

/**
 * Versie 9 - "Rust".
 *
 * Everything the reader does not need at this exact moment, removed. One
 * centred column on a full height page: the tree, the greeting, one sentence
 * of state, one button, the verse underneath in small type, and a single row
 * of links. No cards, no tiles, no figures except the two in that sentence.
 *
 * The counterweight to the workbench: where that answers every question at
 * once, this answers one - what do I do now - and trusts the rest of the app
 * to hold the rest.
 */
export default function DashboardRust() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")

  // One sentence, chosen by what the day actually looks like.
  const state = d.readToday
    ? d.streak > 1
      ? `Je hebt vandaag gelezen. ${d.streak} ${dayWord(d.streak)} op rij.`
      : "Je hebt vandaag gelezen."
    : d.streak > 0
      ? `Je leest ${d.streak} ${dayWord(d.streak)} op rij. Vandaag nog niet.`
      : "Een goed moment om te beginnen."

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="px-5 pt-5 sm:px-8">
        <VariantSwitcher className="justify-end" />
        <div className="mx-auto mt-4 w-full max-w-[34rem] empty:hidden">
          <BillingNotices />
        </div>
      </div>

      {/* --- The middle of the page ------------------------- */}
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[34rem] text-center">
          <div className="flex justify-center">
            <ProgressTreeDisc size={112} />
          </div>

          {d.greeting ? (
            <h1 className="mt-8 text-[1.9rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[2.3rem]">
              {d.greeting}
            </h1>
          ) : (
            <SkeletonBlock className="mx-auto mt-8 h-9 w-72 sm:h-11" />
          )}

          {d.loading || d.statsLoading ? (
            <SkeletonBlock className="mx-auto mt-4 h-4 w-64" />
          ) : (
            <p className="content-in mt-3 text-base text-muted-foreground">{state}</p>
          )}

          {d.loading ? (
            <SkeletonBlock className="mx-auto mt-9 h-14 w-60 rounded-2xl" />
          ) : (
            <div className="content-in mt-9">
              <Link
                href={nextHref}
                className="press inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-lg font-semibold text-white no-underline transition-colors hover:bg-[#0F766E]"
                style={{ backgroundColor: TEAL }}
              >
                {d.lastRead ? `Verder in ${d.lastRead.book} ${d.lastRead.chapter}` : "Begin met lezen"}
                <ArrowRight size={18} />
              </Link>
              {d.lastRead && versionAbbreviation(d.lastRead.version) && (
                <p className="mt-3 text-xs tabular-nums text-muted-foreground">
                  {versionAbbreviation(d.lastRead.version)}
                </p>
              )}
            </div>
          )}

          {/* The verse, quietly, under a hairline */}
          <section className="mt-14 border-t border-gray-200 pt-8 dark:border-border" aria-labelledby="rust-tekst">
            <h2 id="rust-tekst" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Tekst van de dag
            </h2>
            {d.verseLoading ? (
              <div className="mt-4 space-y-2.5">
                <SkeletonBlock className="mx-auto h-4 w-full" />
                <SkeletonBlock className="mx-auto h-4 w-11/12" />
                <SkeletonBlock className="mx-auto mt-3 h-3 w-28" />
              </div>
            ) : d.verse ? (
              <figure className="content-in mt-4">
                <blockquote className="font-serif text-lg leading-[1.6] text-foreground">{d.verse.text}</blockquote>
                <figcaption className="mt-3 text-sm">
                  <Link
                    href={readHref(d.verse.book, d.verse.chapter)}
                    className={`font-semibold no-underline hover:underline ${TEAL_TEXT}`}
                  >
                    {d.verse.reference}
                  </Link>
                  {versionAbbreviation(d.verse.version) && (
                    <span className="ml-2 text-muted-foreground">{versionAbbreviation(d.verse.version)}</span>
                  )}
                </figcaption>
              </figure>
            ) : (
              <p className="mt-4 text-base text-muted-foreground">De tekst van vandaag is even niet beschikbaar.</p>
            )}
          </section>
        </div>
      </main>

      {/* --- Everything else, in one line ------------------- */}
      <footer className="border-t border-gray-200 px-5 py-5 dark:border-border sm:px-8">
        <nav className="mx-auto flex w-full max-w-[34rem] flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link href="/lezen" className="text-muted-foreground no-underline transition-colors hover:text-foreground">
            Bijbel lezen
          </Link>
          <Link href="/studies" className="text-muted-foreground no-underline transition-colors hover:text-foreground">
            Studies
          </Link>
          <Link href="/notities" className="text-muted-foreground no-underline transition-colors hover:text-foreground">
            Notities{!d.loading && d.notesCount > 0 ? <span className="tabular-nums"> · {d.notesCount}</span> : null}
          </Link>
          <Link href="/profiel/boom" className="text-muted-foreground no-underline transition-colors hover:text-foreground">
            Je boom
            {!tree.loading ? <span className="tabular-nums"> · niveau {tree.level}</span> : null}
          </Link>
        </nav>
      </footer>
    </div>
  )
}
