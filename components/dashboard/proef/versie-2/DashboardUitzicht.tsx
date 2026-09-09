"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Header } from "../../../layout/header"
import { useSidebar } from "../../../ui/sidebar"
import { useDashboardData, readHref } from "../../../../hooks/useDashboardData"
import { versionAbbreviation } from "../../../../lib/dailyVerseStore"
import { ProgressTreeScene, useTreeSummary } from "../../ProgressTree"
import { SkeletonBlock } from "../../../ui/skeletons"
import ProefdashboardSwitcher from "../../ProefdashboardSwitcher"
import { UitzichtRail, UitzichtNavStrip } from "./UitzichtRail"
import UitzichtReaderPanel from "./UitzichtReaderPanel"
import UitzichtWorkColumn from "./UitzichtWorkColumn"

/** Everything drawn on the scene is literal white on a literal black scrim. */
const ON_SCENE = { textShadow: "0 1px 3px rgba(0,0,0,0.55)" } as const
const FOCUS_LIGHT = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"

/**
 * Versie 2 - "Uitzicht".
 *
 * The scene is the view out; the content is the room you stand in. The
 * landscape is fixed to the viewport under the real navbar and keeps the top
 * band and the outer margins to itself at full strength - sky, weather, the
 * reader's own time of day - while the work sits on an inset, rounded sheet
 * that floats inside it. The precedent is `/studie`: an inset frame on a
 * darker ground, a window you work inside rather than a page you scroll.
 *
 * The band over the sky carries the three things that are true before any
 * fetch returns and the one action worth taking: the date, the greeting, how
 * the reader stands with their boom, and where to carry on reading. Inside the
 * sheet are versie 10's two panels - the reader on the left, the work on the
 * right, and only the work scrolls.
 *
 * Chrome: the navbar is the real one, unchanged. The sidebar is the piece that
 * used to cut the landscape in half, so it is a floating glass rail in the
 * left margin instead (see UitzichtRail) - it never pushes the sheet, and the
 * navbar's own trigger still pins it open.
 *
 * The text never waits for the tree. The greeting, the resume action and every
 * number run off their own loading flags; `ProgressTreeScene` is one canvas in
 * the background and nothing in the page is gated on it.
 */
export default function DashboardUitzicht() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  // The navbar's sidebar trigger is a real control and should do something
  // here. It is not used as the source of truth, though: `SidebarProvider`
  // defaults to open, and this page has to open unpinned or the scene is
  // hidden behind a rail on first paint. So the rail keeps its own state and
  // treats a change in the provider - trigger, or ⌘/Ctrl-B - as a toggle.
  const { open, openMobile } = useSidebar()
  const [pinned, setPinned] = useState(false)
  const lastTrigger = useRef({ open, openMobile })

  useEffect(() => {
    if (lastTrigger.current.open === open && lastTrigger.current.openMobile === openMobile) return
    lastTrigger.current = { open, openMobile }
    setPinned(previous => !previous)
  }, [open, openMobile])

  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? 0)
  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const versionLabel = versionAbbreviation(d.lastRead?.version)

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 flex-col bg-[#0B1220] lg:h-[100dvh] lg:overflow-hidden">
      {/* The real navbar, unchanged. It owns the top of the screen as it does
          everywhere else; the landscape starts underneath it. */}
      <Header title="Dashboard" />

      <div className="relative flex flex-col lg:min-h-0 lg:flex-1">
        {/* ── The view out ──────────────────────────────── */}
        {/* Fixed rather than stretched: the canvas is then exactly one
            viewport whatever the page height is, on every breakpoint, and it
            stays put while the sheet's own column scrolls. */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 top-14 z-0">
          <ProgressTreeScene />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/35" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-black/55 to-transparent" />
          <div aria-hidden className="absolute inset-y-0 left-0 w-[28rem] max-w-[60%] bg-gradient-to-r from-black/50 to-transparent" />
        </div>

        <UitzichtRail pinned={pinned} onTogglePin={() => setPinned(previous => !previous)} />

        <main
          className={[
            "relative z-10 flex flex-col pl-3 pr-3 sm:pl-5 sm:pr-5 xl:pr-7 lg:min-h-0 lg:flex-1",
            "transition-[padding] duration-300 ease-out",
            pinned ? "lg:pl-[15rem]" : "lg:pl-[5.5rem]",
          ].join(" ")}
        >
          {/* ── The band ────────────────────────────────── */}
          <div className="flex-none pb-5 pt-5 text-white" style={ON_SCENE}>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              {d.dateLabel ? (
                <p className="text-sm text-white/85">{d.dateLabel}</p>
              ) : (
                <SkeletonBlock className="h-3.5 w-40 bg-white/25" />
              )}
              <ProefdashboardSwitcher tone="light" />
            </div>

            {d.loading && tree.loading ? (
              <SkeletonBlock className="mt-4 h-3 w-32 bg-white/25" />
            ) : (
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {tree.hasTree && tree.stageName ? `${tree.stageName} · niveau ${level}` : `Niveau ${level}`}
              </p>
            )}

            {d.greeting ? (
              <h1 className="content-in mt-2 text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-4xl xl:text-[2.75rem]">
                {d.greeting}
              </h1>
            ) : (
              <SkeletonBlock className="mt-2 h-10 w-[22rem] max-w-full bg-white/25" />
            )}

            <p className="mt-2 max-w-[38rem] text-sm leading-relaxed text-white/85 sm:text-base">
              {!tree.loading && tree.wilting
                ? `Je boom heeft ${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} geen water gehad. Eén hoofdstuk is genoeg.`
                : d.readToday
                  ? "Je hebt vandaag al gelezen. Alles hierna is winst."
                  : "Eén hoofdstuk vandaag houdt je boom in leven."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                {d.loading ? (
                  <SkeletonBlock className="h-[52px] w-64 rounded-full bg-white/25" />
                ) : (
                  <Link
                    href={nextHref}
                    className={`press group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-gray-900 no-underline shadow-xl shadow-black/25 transition-colors hover:bg-white/90 ${FOCUS_LIGHT}`}
                    style={{ textShadow: "none" }}
                  >
                    {d.lastRead ? `Verder in ${d.lastRead.book} ${d.lastRead.chapter}` : "Begin met lezen"}
                    <ArrowRight size={18} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
                {!d.loading && d.lastRead && (
                  <p className="mt-2 text-xs text-white/70">
                    Hoofdstuk {d.lastRead.chapter}{versionLabel ? ` · ${versionLabel}` : ""}
                  </p>
                )}
              </div>

              {/* XP as a line of light along the horizon, not a boxed meter. */}
              <div className="w-full max-w-[26rem] sm:w-auto sm:min-w-[16rem] sm:flex-1">
                <div className="flex items-baseline justify-between text-xs font-medium tabular-nums text-white/80">
                  <span>Niveau {level}</span>
                  <span>{xpInto} / {xpFor} XP</span>
                  <span>Niveau {level + 1}</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={d.loading ? 0 : Math.round(pct)}
                  aria-label={`Voortgang naar niveau ${level + 1}`}
                >
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-1000 ease-out"
                    style={{ width: d.loading ? "0%" : `${pct}%`, boxShadow: "0 0 18px rgba(255,255,255,0.85)" }}
                  />
                </div>
              </div>
            </div>

            <UitzichtNavStrip className="mt-5" />
          </div>

          {/* ── The room ────────────────────────────────── */}
          <div className="pb-3 sm:pb-5 xl:pb-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <div
              className={[
                "flex flex-col overflow-hidden rounded-3xl backdrop-blur-xl lg:min-h-0 lg:flex-1 lg:flex-row",
                // Literal colours, not tokens: this sheet is laid over a scene
                // that can be a noon sky or a midnight one, and it has to read
                // as a solid working surface over both. Light: the app's own
                // page grey, so the white cards on it still lift. Dark: the
                // app's near-black, for the same reason.
                "border border-white/60 bg-[rgba(244,245,247,0.97)] shadow-[0_36px_90px_-30px_rgba(2,6,23,0.85)]",
                "dark:border-white/10 dark:bg-[rgba(20,20,20,0.97)]",
              ].join(" ")}
            >
              <UitzichtReaderPanel d={d} tree={tree} />
              <UitzichtWorkColumn d={d} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
