"use client"

import { useEffect, useRef, useState } from "react"

/**
 * The scroll engine behind candidate 3, "Diepte".
 *
 * The scene is fixed to the viewport and never moves; the content travels over
 * it. Three numbers describe where the reader is in that journey, and they are
 * published as CSS custom properties on one element rather than as React state:
 *
 *   --lift  0 → 1   how far the sky layer has receded (drives a translate)
 *   --fade  1 → ~0  the sky layer's opacity, eased so the greeting and the one
 *                   action stay readable well past the halfway point
 *   --veil  0 → 1   how dark the scene has gone behind the working panels
 *
 * Custom properties, not state, because state would re-render the whole
 * dashboard on every frame of every scroll. Everything that consumes these
 * touches `transform` and `opacity` only, so a frame costs a composite and
 * never a layout.
 *
 * The listener is passive and rAF-throttled: the scroll event does nothing but
 * request a frame, and the single `window.scrollY` read happens at the top of
 * that frame, before anything is written. Values are rounded to three decimals
 * and skipped when unchanged, so a scroll that ends still writes nothing.
 *
 * `prefers-reduced-motion: reduce` gets a completely different branch: the
 * settled state is written once, no listener is ever attached, and the page has
 * no scroll effects at all - the scene simply sits still behind panels that are
 * dark enough to read from the first paint.
 */

/** The real navbar is h-14 (components/layout/header.tsx). */
export const HEADER_H = 56

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function useDepthScroll() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReducedMotion(query.matches)
    apply()
    query.addEventListener("change", apply)
    return () => query.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // Settled state, written once. No scroll listener exists in this branch.
    if (reducedMotion) {
      root.style.setProperty("--lift", "0")
      root.style.setProperty("--fade", "1")
      root.style.setProperty("--veil", "1")
      return
    }

    let frame = 0
    let lastLift = ""
    let lastFade = ""
    let lastVeil = ""

    const paint = () => {
      frame = 0

      // The only measurement, taken before any write in this frame so nothing
      // can force a synchronous layout in the middle of the pass.
      const y = window.scrollY
      const span = Math.max(1, window.innerHeight - HEADER_H)

      const progress = clamp01(y / span)
      // Quadratic: the sky holds its colour through the first half of the
      // journey and only gives way once it is genuinely on its way out.
      const fade = 1 - progress * progress * 0.92
      // The dark comes in later than the lift, so the picture is still a
      // picture while the greeting is on screen and is a background by the
      // time the working panels arrive.
      const veil = clamp01((y - span * 0.3) / (span * 0.55))

      const nextLift = progress.toFixed(3)
      const nextFade = fade.toFixed(3)
      const nextVeil = veil.toFixed(3)

      if (nextLift !== lastLift) { root.style.setProperty("--lift", nextLift); lastLift = nextLift }
      if (nextFade !== lastFade) { root.style.setProperty("--fade", nextFade); lastFade = nextFade }
      if (nextVeil !== lastVeil) { root.style.setProperty("--veil", nextVeil); lastVeil = nextVeil }
    }

    const request = () => {
      if (frame === 0) frame = window.requestAnimationFrame(paint)
    }

    // A reload restores the scroll position, so the first frame has to be
    // painted from wherever the reader already is.
    paint()

    window.addEventListener("scroll", request, { passive: true })
    window.addEventListener("resize", request, { passive: true })
    return () => {
      window.removeEventListener("scroll", request)
      window.removeEventListener("resize", request)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  return { rootRef, reducedMotion }
}
