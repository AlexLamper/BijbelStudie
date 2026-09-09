"use client"

import { useEffect, useMemo, useState } from "react"
import TreeCanvas from "../levensboom/TreeCanvas"
import { ProgressTreeScene } from "../dashboard/ProgressTree"
import { buildPalette, type Season, type TimeOfDay } from "../../lib/levensboom/palette"
import { SCRIM_BOTTOM, SCRIM_FLOOR, SCRIM_LEFT, SCRIM_VEIL } from "./tokens"

/**
 * The picture, and the scrims that make it safe to read on.
 *
 * Fixed, full-bleed, behind everything including the navbar - it runs from the
 * very top of the viewport, which is what makes a page feel like a window
 * rather than a document with a header photo. It never moves and it is never
 * replaced; it is only ever pushed further back, by `--veil`.
 *
 * Two modes, because two different pages need two different trees:
 *
 *   reader   The signed-in reader's OWN tree, from the provider the root layout
 *            already mounts. Costs no extra request. Only for a route where a
 *            session is guaranteed - signed out it falls back to a level disc,
 *            which is not a landscape.
 *
 *   static   A tree rendered to an SVG string on the server (see scene-svg.ts)
 *            and put straight into the HTML. The first paint, and what crawlers
 *            get. This is the default and the right choice for every public
 *            page: no session read, nothing to wait for, no canvas in the
 *            critical path.
 *
 * The canvas upgrade is opt-in, and gated. A fixed full-bleed canvas never
 * scrolls out of view, so TreeCanvas's own off-screen guard can never stop the
 * loop by itself - without a gate you get a full-viewport canvas swaying at
 * 60fps for the entire length of a long page, on a phone, behind panels that
 * have already covered it. So: pass `gateId` naming the element whose
 * visibility should decide (your hero), and the canvas runs only while that
 * element is on screen; past it the static SVG comes back and the loop stops.
 * No `gateId` means no canvas at all, which is a perfectly good page. Reduced
 * motion never mounts one.
 */

/** How long after the gate comes into view before the canvas may mount. Long
 *  enough that it never competes with hydration for the main thread on the one
 *  paint a visitor actually waits for. */
const WAKE_MS = 250

export type SceneBackdropProps = {
  /** Default "static". "reader" needs a signed-in route. */
  mode?: "reader" | "static"
  /** static mode: the server-rendered SVG. Omit for a plain dark ground. */
  svg?: string
  /** static mode: the same tree the SVG was drawn from, for the canvas upgrade. */
  seed?: string
  level?: number
  frac?: number
  species?: string
  scene?: string
  animal?: string
  season?: Season
  timeOfDay?: TimeOfDay
  /** id of the element whose visibility decides whether the canvas runs. */
  gateId?: string
  reducedMotion?: boolean
}

export default function SceneBackdrop({
  mode = "static",
  svg,
  seed,
  level = 1,
  frac = 0.7,
  species,
  scene,
  animal,
  season = "summer",
  timeOfDay = "dusk",
  gateId,
  reducedMotion = false,
}: SceneBackdropProps) {
  return (
    // `aria-hidden` on the whole layer in static mode: it is a picture behind
    // text and the page already says in words what it shows. In reader mode the
    // tree is the reader's own and describes itself, so the layer stays in the
    // tree and ProgressTreeScene's own label is what gets read.
    <div aria-hidden={mode === "static" || undefined} className="pointer-events-none fixed inset-0 z-0">
      {mode === "reader" ? (
        <ProgressTreeScene />
      ) : (
        <StaticScene
          svg={svg}
          seed={seed}
          level={level}
          frac={frac}
          species={species}
          scene={scene}
          animal={animal}
          season={season}
          timeOfDay={timeOfDay}
          gateId={gateId}
          reducedMotion={reducedMotion}
        />
      )}

      {/* A constant floor of dark, so the copy is legible from the first frame
          - including the frame in which the scene is still its own loading
          skeleton and therefore pale grey. */}
      <span aria-hidden className={SCRIM_FLOOR} />
      {/* The left scrim carries the rail and the heading ... */}
      <span aria-hidden className={SCRIM_LEFT} />
      {/* ... the bottom one carries whatever breaks the fold. */}
      <span aria-hidden className={SCRIM_BOTTOM} />
      {/* The veil: the scene goes deep as the working panels arrive. */}
      <span aria-hidden className={SCRIM_VEIL} style={{ opacity: "var(--veil, 0)" }} />
    </div>
  )
}

/* -- static mode ------------------------------------------------ */

function StaticScene({
  svg,
  seed,
  level,
  frac,
  species,
  scene,
  animal,
  season,
  timeOfDay,
  gateId,
  reducedMotion,
}: Omit<SceneBackdropProps, "mode"> & { level: number; frac: number; season: Season; timeOfDay: TimeOfDay }) {
  const [live, setLive] = useState(false)

  // Fixed season and time of day, so the canvas lands on exactly the palette
  // the server already drew rather than on the visitor's clock.
  const palette = useMemo(
    () => buildPalette(season, timeOfDay, 1, { scene: scene ?? undefined, species: species ?? undefined }),
    [season, timeOfDay, scene, species],
  )

  useEffect(() => {
    // No gate, no canvas: see the note at the top of this file.
    if (reducedMotion || !seed || !gateId) {
      setLive(false)
      return
    }

    const gate = document.getElementById(gateId)
    let timer = 0

    const wake = () => {
      if (timer === 0) {
        timer = window.setTimeout(() => {
          timer = 0
          setLive(true)
        }, WAKE_MS)
      }
    }
    const sleep = () => {
      if (timer !== 0) {
        window.clearTimeout(timer)
        timer = 0
      }
      setLive(false)
    }

    if (!gate || !("IntersectionObserver" in window)) {
      // The gate is named but not on the page (or the browser cannot watch it):
      // the SVG is already correct, so leave it alone rather than start a loop
      // nothing can stop.
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) wake()
        else sleep()
      },
      { rootMargin: "15% 0px 15% 0px" },
    )
    observer.observe(gate)

    return () => {
      observer.disconnect()
      if (timer !== 0) window.clearTimeout(timer)
    }
  }, [gateId, reducedMotion, seed])

  if (live && seed) {
    return (
      <TreeCanvas
        seed={seed}
        level={level}
        frac={frac}
        species={species}
        scene={scene}
        animal={animal}
        framing="scene"
        palette={palette}
        className="block h-full w-full"
        ariaLabel=""
      />
    )
  }

  if (!svg) return null

  return (
    <div
      className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
