"use client"

import { Header } from "../../../layout/header"
import { useDashboardData } from "../../../../hooks/useDashboardData"
import { useTreeSummary } from "../../ProgressTree"
import WerkbankScene from "./WerkbankScene"
import WerkbankRail from "./WerkbankRail"
import WerkbankReader from "./WerkbankReader"
import WerkbankWork from "./WerkbankWork"

/**
 * Versie 4 - "Werkbank".
 *
 * The soberest of the five, and the one built to survive being opened every
 * morning. The reader's own scene runs full-bleed behind the entire viewport -
 * behind the navbar, behind the rail, behind the panels - but it is treated as
 * weather, not as a picture: held back by a masked scrim over the work, at full
 * strength in the band under the navbar and in the gutters. The panels
 * themselves are near-opaque, so every number is exactly as crisp as it is on
 * the live dashboard today. That is the whole argument of this candidate: the
 * atmosphere costs nothing.
 *
 * The shape is versie 10's, tightened. Two panes, not two columns: the reader
 * (identity, level, XP, the week, every running total) is pinned and never
 * moves, and the work - resume, verse, the 66 books, notes, studies - is the
 * only thing that scrolls. Because they are separate panes, the band of sky
 * under the navbar stays clean at any scroll position.
 *
 * The navbar is the real `Header`, untouched. The sidebar is the piece that
 * had to change: see WerkbankRail.
 *
 * One `useDashboardData()` for the whole page - the hook fetches on mount, so a
 * second caller would be a second round of requests - and one animated scene,
 * in the background. Everything the reader reads has its own loading flag and
 * none of them is the tree's.
 */
export default function DashboardWerkbank() {
  const d = useDashboardData()
  const tree = useTreeSummary()

  return (
    // `w-full min-w-0`: the layout's SidebarProvider wraps the page in a row
    // flex container, and a flex item is content-width unless it is told
    // otherwise. Without this the whole dashboard collapses to its widest word.
    <div className="relative flex min-h-screen w-full min-w-0 flex-col lg:h-screen lg:overflow-hidden">
      <WerkbankScene />

      <Header title="Dashboard" />

      <div className="relative z-10 flex min-h-0 flex-1">
        <WerkbankRail />

        {/* The top padding is the band of sky under the navbar - the one place
            the scene is at full strength and nothing is laid over it. Because
            the panes below scroll on their own from lg up, it stays clean at
            any scroll position. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 px-4 pb-6 pt-6 sm:px-6 sm:pt-8 lg:flex-row lg:gap-6 lg:px-10 lg:pb-8 lg:pt-14 xl:px-14 xl:pt-16">
          <aside
            aria-label="Jouw overzicht"
            className="min-h-0 w-full flex-none lg:w-[336px] lg:overflow-y-auto xl:w-[360px]"
          >
            <WerkbankReader d={d} tree={tree} />
          </aside>

          <main className="min-h-0 min-w-0 flex-1 lg:overflow-y-auto">
            <WerkbankWork d={d} />
          </main>
        </div>
      </div>
    </div>
  )
}
