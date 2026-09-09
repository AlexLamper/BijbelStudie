"use client"

import { useEffect, useMemo, useState } from "react"
import TreeCanvas from "../../levensboom/TreeCanvas"
import { buildPalette } from "../../../lib/levensboom/palette"

/** How long after the gate comes into view before the canvas is allowed to
 *  mount. Long enough that it never competes with hydration for the main
 *  thread on the one paint a visitor actually waits for. */
const WAKE_MS = 250

/**
 * The full-bleed scene behind /proeflanding.
 *
 * Two things make this different from the dashboard's ProgressTreeScene, and
 * both are load-bearing:
 *
 * 1. There is no session. The scene is the *marketing* tree - one fixed seed,
 *    always summer, always dusk - not a reader's own. It follows the pattern
 *    components/landing/HeroLevensboom.tsx already established.
 *
 * 2. It must be in the HTML. `/` is the site's main SEO surface and its
 *    measured FCP is already 2.86s; a canvas that paints nothing until
 *    hydration must never be what a visitor waits for. So the server renders
 *    the scene to an SVG string (lib/levensboom/svg.ts, at build time - the
 *    page is force-static), that string is the first paint and what crawlers
 *    get, and the live canvas only ever replaces it afterwards.
 *
 * The canvas is also unmounted again once the reader has left the hero. The
 * scene is fixed, so it never scrolls out of view and TreeCanvas's own
 * intersection guard can never stop the loop by itself - which would mean a
 * full-viewport canvas swaying at 60fps for the entire length of a long
 * marketing page, on a phone, behind panels that have already covered it. The
 * gate is the hero section; past it the static SVG comes back and the loop
 * stops. Reduced motion never mounts the canvas at all.
 */
export default function SceneBackdrop({
  svg,
  seed,
  level,
  gateId,
  reducedMotion,
}: {
  svg: string
  seed: string
  level: number
  /** id of the element whose visibility decides whether the canvas runs. */
  gateId: string
  reducedMotion: boolean
}) {
  const [live, setLive] = useState(false)

  // Dusk, always: the marketing scene does not follow the visitor's clock, so
  // the page looks the same at nine in the morning and at midnight - and the
  // canvas lands on exactly the palette the server already drew.
  const palette = useMemo(
    () => buildPalette("summer", "dusk", 1, { scene: "waterbeken", species: "eik" }),
    [],
  )

  useEffect(() => {
    if (reducedMotion) {
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
      wake()
      return () => {
        if (timer !== 0) window.clearTimeout(timer)
      }
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
  }, [gateId, reducedMotion])

  if (!live) {
    return (
      <div
        className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }

  return (
    <TreeCanvas
      seed={seed}
      level={level}
      frac={0.7}
      species="eik"
      scene="waterbeken"
      animal="vlinders"
      framing="scene"
      palette={palette}
      className="block h-full w-full"
      ariaLabel=""
    />
  )
}
