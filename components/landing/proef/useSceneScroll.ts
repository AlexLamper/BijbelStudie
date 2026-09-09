"use client"

import { useEffect, useRef, useState } from "react"

/**
 * The scroll engine for the /proeflanding experiment.
 *
 * Deliberately a copy of components/dashboard/scene/useDepthScroll.ts
 * rather than an import: the two experiments are separate and must be able to
 * drift apart (or be deleted) without touching each other. The mechanism is
 * identical, and so are the three numbers it publishes as CSS custom
 * properties on one element:
 *
 *   --lift  0 → 1   how far the sky layer has receded (drives a translate)
 *   --fade  1 → ~0  the sky layer's opacity, eased so the headline and the
 *                   primary call to action stay readable well past halfway
 *   --veil  0 → 1   how dark the scene has gone behind the page's panels
 *
 * Custom properties, not React state: state would re-render an entire landing
 * page on every frame of every scroll. Everything that consumes them touches
 * `transform` and `opacity` only, so a frame costs a composite and never a
 * layout.
 *
 * The listener is passive and rAF-throttled - the scroll event does nothing
 * but request a frame, and the single `window.scrollY` read happens at the top
 * of that frame, before anything is written. Values are rounded to three
 * decimals and skipped when unchanged, so a scroll that ends still writes
 * nothing.
 *
 * One deliberate difference from the dashboard's settled state: there,
 * `prefers-reduced-motion` writes `--veil: 1`, because that page's working
 * panels start almost at the top and the veil is what makes them readable.
 * Here the veil is atmosphere only - every piece of copy on this page sits
 * either inside an opaque panel or on its own literal scrim - so the settled
 * state leaves the landscape at full strength (`--veil: 0`) instead of handing
 * a reduced-motion visitor a permanently dimmed picture.
 */

/** The scene navbar is h-14, like components/layout/header.tsx. */
export const NAV_H = 56

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function useSceneScroll() {
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
      root.style.setProperty("--veil", "0")
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
      const span = Math.max(1, window.innerHeight - NAV_H)

      const progress = clamp01(y / span)
      // Quadratic: the sky holds its colour through the first half of the
      // journey and only gives way once it is genuinely on its way out.
      const fade = 1 - progress * progress * 0.92
      // The dark comes in later than the lift, so the picture is still a
      // picture while the headline is on screen and is a background by the
      // time the first panel arrives.
      const veil = clamp01((y - span * 0.35) / (span * 0.6))

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
