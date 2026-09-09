"use client"

import { ProgressTreeScene, useTreeSummary } from "../../ProgressTree"

/**
 * The room, and the two layers that keep it in its place.
 *
 * One scene, fixed to the viewport, behind the whole page - the navbar, the
 * rail, the panels, everything. It is treated as weather rather than as a
 * picture: a scrim holds it back and takes some colour out of it where the work
 * happens, and lets it through at full strength along the band under the navbar
 * and in the gutters around the panels. A dashboard that is opened every
 * morning should not shout.
 *
 * Two details matter more than they look:
 *
 *  - the ground is painted first and always, so the first frame is a calm sky
 *    instead of a viewport-sized pulsing skeleton, and the scene fades in on top
 *    of it whenever it arrives. Nothing on the page waits for that;
 *  - the scrim is masked rather than stacked. A radial mask fades the wash out
 *    towards the top and towards both edges in one element, so there is exactly
 *    one scene and one overlay - no second canvas for the "bright" band.
 */

/** Opaque over the work, transparent along the top band and the outer gutters. */
const SCRIM_MASK =
  "radial-gradient(135% 92% at 50% 112%, rgba(0,0,0,1) 22%, rgba(0,0,0,0.94) 55%, rgba(0,0,0,0) 100%)"

export default function WerkbankScene() {
  const tree = useTreeSummary()

  // The scene is skipped entirely when the reader switched their tree off:
  // ProgressTreeScene's stand-in is a level badge, which is a fine tile and a
  // terrible wallpaper. The ground below is the wallpaper in that case.
  const showScene = !tree.loading && tree.hasTree

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#D6E6EC] via-[#E6EEEC] to-[#F2F5F1] dark:from-[#0A111C] dark:via-[#0C1622] dark:to-[#101C22]" />

      {showScene && (
        <div className="content-in absolute inset-0">
          <ProgressTreeScene />
        </div>
      )}

      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-saturate-[0.7] dark:bg-slate-950/60"
        style={{ maskImage: SCRIM_MASK, WebkitMaskImage: SCRIM_MASK }}
      />
    </div>
  )
}
