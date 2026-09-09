"use client"

import { Flame } from "lucide-react"
import { Header } from "../../../layout/header"
import { useSidebar } from "../../../ui/sidebar"
import { useDashboardData } from "../../../../hooks/useDashboardData"
import { SkeletonBlock } from "../../../ui/skeletons"
import { ProgressTreeScene, useTreeSummary } from "../../ProgressTree"
import ProefdashboardSwitcher from "../../ProefdashboardSwitcher"
import GlasRail from "./GlasRail"
import GlasLezerPaneel from "./GlasLezerPaneel"
import GlasWerkKolom from "./GlasWerkKolom"
import { CARD_SHADOW, dayWord, GLASS_CARD } from "./glas"

/**
 * Dashboardontwerp 1 - "Glas".
 *
 * The reader's own landscape fills everything under the navbar, and every other
 * surface on the page is a sheet of smoked glass floating on it. Nothing is
 * opaque: the scene is visible in the gutter around the navigation rail,
 * between the two panels and behind the whole page, so this reads as furniture
 * arranged in a room rather than as cards stacked on a background.
 *
 * What comes from where:
 *  - The navbar is the real one (components/layout/header.tsx), untouched. Its
 *    sidebar trigger still works - it pins the glass rail open.
 *  - The sidebar is the part that had to change. An opaque 12rem column is the
 *    one thing a full-bleed scene cannot survive, so the same navigation is a
 *    floating rail inset from every edge (see GlasRail): 4rem of icons that
 *    widens over the content on hover or focus, never pushing it, with the
 *    landscape running behind it and around it.
 *  - The shape is version 10's: a sticky reader panel on the left, a work
 *    column on the right that is the only thing that scrolls.
 *  - The content is the live dashboard's, in full.
 *
 * Budget: exactly one animated `ProgressTreeScene`, mounted here as the
 * background. Nothing else on the page draws a tree.
 *
 * Loading: every figure has its own flag from `useDashboardData`. The greeting,
 * the resume action and the numbers arrive on their own; the scene is a
 * background that appears when it appears and gates nothing.
 */
export default function DashboardGlas() {
  const d = useDashboardData()
  const tree = useTreeSummary()
  // The navbar's own trigger. Open = the rail is pinned wide and the content
  // steps aside for it; closed = a 4rem strip that the landscape runs past.
  const { open } = useSidebar()

  return (
    <div className="relative flex h-svh min-w-0 flex-1 flex-col overflow-hidden bg-[#0F172A]">
      {/* The real navbar, unchanged. */}
      <Header title="Dashboard" />

      {/* ── The room ────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <ProgressTreeScene />
        </div>

        {/* Three scrims, all literal black - the scene follows the reader's
            time of day, not the app theme, so a token here would be right over
            half the scenes and invisible over the other half. The flat wash
            sets a floor, the horizontal one darkens the left where the rail and
            the reader panel sit, and the bottom one catches the end of the
            work column. */}
        <div aria-hidden className="absolute inset-0 bg-black/20" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-black/15" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent" />

        <GlasRail />

        {/* The only scroll container on the page. */}
        <main
          className={[
            "relative z-10 h-full overflow-y-auto px-4 pb-16 pt-4 sm:px-6",
            "transition-[padding] duration-300 ease-out",
            open ? "md:pl-[15rem]" : "md:pl-24",
            "md:pr-6 xl:pr-10",
          ].join(" ")}
        >
          <div className="mx-auto w-full max-w-[1500px]">
            {/* ── The masthead: who, when, and how long a run ── */}
            <div
              style={CARD_SHADOW}
              className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 ${GLASS_CARD}`}
            >
              <div className="min-w-0">
                {d.greeting ? (
                  <h2 className="content-in truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    {d.greeting}
                  </h2>
                ) : (
                  <SkeletonBlock className="h-6 w-56 max-w-full bg-white/20" />
                )}
                {d.dateLabel ? (
                  <p className="mt-1 text-sm text-white/75">{d.dateLabel}</p>
                ) : (
                  <SkeletonBlock className="mt-2 h-3 w-32 bg-white/20" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {!d.loading && d.streak > 0 && (
                  <span className="content-in inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white">
                    <Flame size={13} aria-hidden className="flex-shrink-0" />
                    {d.streak} {dayWord(d.streak)} op rij
                  </span>
                )}
                <ProefdashboardSwitcher tone="light" />
              </div>
            </div>

            {/* ── Two slabs, the landscape in the gutter between them ── */}
            <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-8">
              <GlasLezerPaneel d={d} tree={tree} />
              <GlasWerkKolom d={d} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
