"use client"

import { useEffect, useRef, useState } from "react"

/**
 * The scroll engine behind every immersive page.
 *
 * The scene is fixed to the viewport and never moves; the content travels over
 * it. Three numbers describe where the reader is in that journey, and they are
 * published as CSS custom properties on one element rather than as React
 * state:
 *
 *   --lift  0 -> 1   how far the sky layer has receded (drives a translate)
 *   --fade  1 -> ~0  the sky layer's opacity, eased so the heading and the one
 *                    action stay readable well past the halfway point
 *   --veil  0 -> 1   how dark the scene has gone behind the working panels
 *
 * Custom properties, not state, because state would re-render the whole page on
 * every frame of every scroll. Everything that consumes these touches
 * `transform` and `opacity` only, so a frame costs a composite and never a
 * layout.
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
 *
 * ONE THING TO KNOW BEFORE YOU USE IT: the measurement is `window.scrollY`, so
 * the page must scroll on the document. A route whose layout wraps the page in
 * `h-screen overflow-hidden` with an inner `overflow-y-auto` (most of the
 * signed-in layouts do) never moves `window.scrollY`, and the scene will sit at
 * `--lift: 0` forever. Such a layout has to give up its own scroll container -
 * see app/dashboard/layout.tsx, which keeps the providers and nothing else.
 */

/** The real navbar is h-14 (components/layout/header.tsx). */
export const HEADER_H = 56

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function useSceneDepth() {
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
      // picture while the heading is on screen and is a background by the time
      // the working panels arrive.
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

/**
 * The seed values for `--lift`, `--fade` and `--veil`, so the very first paint
 * is defined before the hook has run once and every consumer's `var(--x, y)`
 * fallback is never the thing deciding what the page looks like. SceneShell
 * puts these on its root; a page never needs them itself.
 */
export function sceneVars(reducedMotion: boolean): React.CSSProperties & Record<string, string> {
  return {
    "--lift": "0",
    "--fade": "1",
    "--veil": reducedMotion ? "1" : "0",
  }
}

/*
 * The two travelling layers are CSS classes, not styles computed here:
 *
 *   .scene-sky      the screen of copy set straight into the landscape; it
 *                   recedes and gives way as the reader scrolls
 *   .scene-horizon  whatever breaks the fold under it, trailing the sky at a
 *                   third of the distance
 *
 * Both live in app/globals.css, inside a `prefers-reduced-motion:
 * no-preference` block, so a page never branches on a hook to answer reduced
 * motion - and a page that needs no other client state can stay a server
 * component. A layer that wants a different distance writes its own
 * `translate3d(0, calc(var(--lift, 0) * -Npx), 0)`; the variables are public.
 */
