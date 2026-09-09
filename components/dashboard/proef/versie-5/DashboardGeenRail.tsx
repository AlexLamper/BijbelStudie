"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useDashboardData, readHref } from "../../../../hooks/useDashboardData"
import { SkeletonBlock } from "../../../ui/skeletons"
import { ProgressTreeScene, useTreeSummary } from "../../ProgressTree"
import ProefdashboardSwitcher from "../../ProefdashboardSwitcher"
import LezerPaneel from "./LezerPaneel"
import WerkKolom from "./WerkKolom"
import { SHELL, SLAB, EYEBROW, FOCUS_ON_SCENE, dayWord } from "./shell"

/**
 * Ontwerp 5 - "Geen rail".
 *
 * The candidate that answers the sidebar question by deleting the sidebar. The
 * real navbar stays and takes the navigation with it (see NavigatieBalk), and
 * from the bottom of that bar downwards there is nothing standing in the
 * landscape at all: the scene is fixed to the viewport and runs the full width
 * of the screen, so scrolling moves the page over a view that stays put.
 *
 * Losing the rail leaves the left edge unheld, so the content has to hold it
 * itself. One measure runs through the whole page - the belt, the greeting and
 * the slab share it - and versie 10's two panels are welded into a single
 * object inside that measure: the reader on the left, sticky, and the work on
 * the right, the only thing that scrolls, divided by a rule instead of a gap.
 * Outside the measure the landscape is untouched at full strength, which is the
 * space the rail used to occupy.
 *
 * One scene is mounted, once, for the entire page.
 */
export default function DashboardGeenRail() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  const nextHref = d.lastRead ? readHref(d.lastRead.book, d.lastRead.chapter, d.lastRead.version) : "/studie"
  const level = d.level?.level ?? tree.level
  const xpInto = d.level?.xpIntoLevel ?? 0
  const xpFor = d.level?.xpForNextLevel ?? 100
  const pct = Math.min(100, d.level?.progressPercentage ?? 0)

  const subline =
    !tree.loading && tree.wilting
      ? `Je boom heeft ${tree.daysSinceActive} ${dayWord(tree.daysSinceActive)} geen water gehad. Eén hoofdstuk is genoeg.`
      : d.readToday
        ? "Je hebt vandaag al gelezen. Alles hierna is winst."
        : "Eén hoofdstuk vandaag houdt je boom in leven."

  return (
    <>
      {/* -- The room. Fixed, full width, edge to edge under the navbar. -- */}
      <div className="fixed inset-0 z-0">
        <ProgressTreeScene />
      </div>

      <div className="relative z-10">
        {/* -- Open sky: nothing boxed, nothing docked ------------- */}
        <section aria-labelledby="v5-groet" className="relative min-h-[42vh] pb-20 pt-6 lg:min-h-[46vh]">
          {/* One scrim across the band. It has to carry white type over a noon
              sky and a midnight one alike, so it is literal black, not a token. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/15"
          />

          <div className={`${SHELL} relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2`}>
            {d.dateLabel ? (
              <p className="text-sm text-white/80">{d.dateLabel}</p>
            ) : (
              <SkeletonBlock className="h-3.5 w-36 bg-white/20" />
            )}
            <ProefdashboardSwitcher tone="light" />
          </div>

          <div className={`${SHELL} relative mt-10 lg:mt-14`}>
            <div className="max-w-[44rem]">
              <p className={`${EYEBROW} text-white/70`}>
                {!tree.loading && tree.hasTree && tree.stageName
                  ? `${tree.stageName} — niveau ${level}`
                  : `Niveau ${level}`}
              </p>

              {d.greeting ? (
                <h2
                  id="v5-groet"
                  className="content-in mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl xl:text-6xl"
                >
                  {d.greeting}
                </h2>
              ) : (
                <SkeletonBlock className="mt-3 h-14 w-[24rem] max-w-full bg-white/20" />
              )}

              <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">{subline}</p>

              {/* XP as a line of light on the horizon rather than a boxed meter. */}
              <div className="mt-8 max-w-[30rem]">
                <div className="flex items-baseline justify-between text-xs font-medium tabular-nums text-white/75">
                  <span>Niveau {level}</span>
                  <span>
                    {xpInto} / {xpFor} XP
                  </span>
                  <span>Niveau {level + 1}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-1000 ease-out"
                    style={{ width: d.loading ? "0%" : `${pct}%`, boxShadow: "0 0 18px rgba(255,255,255,0.85)" }}
                  />
                </div>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                {d.loading ? (
                  <SkeletonBlock className="h-14 w-60 rounded-full bg-white/20" />
                ) : (
                  <Link
                    href={nextHref}
                    className={`press group inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-base font-semibold text-gray-900 no-underline shadow-xl shadow-black/25 transition-colors hover:bg-white/90 ${FOCUS_ON_SCENE}`}
                  >
                    {d.lastRead ? `Verder in ${d.lastRead.book} ${d.lastRead.chapter}` : "Begin met lezen"}
                    <ArrowRight size={18} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
                <Link
                  href="/profiel/boom"
                  className={`rounded text-sm font-semibold text-white/85 no-underline underline-offset-4 hover:text-white hover:underline ${FOCUS_ON_SCENE}`}
                >
                  Bekijk je boom →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* -- One object on the landscape ------------------------- */}
        <div className={`${SHELL} relative -mt-10 pb-16`}>
          <div className={SLAB}>
            <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
              {/* The reader. Sticky under the navbar and the belt, so the
                  standing figures never scroll away - versie 10's rule, kept. */}
              <div className="lg:sticky lg:top-[6.75rem] lg:self-start">
                <LezerPaneel d={d} tree={tree} />
              </div>

              {/* The work. The only thing that scrolls. */}
              <div className="min-w-0 border-t border-black/10 dark:border-white/10 lg:border-l lg:border-t-0">
                <WerkKolom d={d} nextHref={nextHref} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
