"use client"

import SceneBackdrop from "./SceneBackdrop"
import SceneNavbar from "./SceneNavbar"
import { HERO_GATE_ID } from "./pieces"
import { useSceneScroll } from "./useSceneScroll"

/**
 * The window the whole page lives in.
 *
 * The scene is fixed to the viewport and never moves; everything else travels
 * over it. That is the entire idea of the dashboard candidate this page takes
 * its language from, and it is what "the full screen is used" means here: the
 * landscape runs from the very top of the viewport - behind the navbar, behind
 * the headline, behind every panel - and is only ever pushed further back,
 * never replaced.
 *
 * The contrast work is done by literal scrims, in four layers:
 *   1. a constant floor of black over the whole picture
 *   2. a left wash, which carries the headline and the call to action
 *   3. a bottom wash, which carries the figures that break the fold
 *   4. the veil, which deepens as the page's panels arrive
 *
 * This is a client component only because of the scroll engine and the mobile
 * menu. `children` is passed in from the server page, so every word of
 * marketing copy on this page is server-rendered HTML that is readable before
 * any JavaScript runs.
 */

/**
 * The two travelling layers, as classes rather than inline styles, so
 * `prefers-reduced-motion` is answered in CSS and never needs a second render
 * pass or a hydration branch.
 */
const CSS = `
.pl-sky {
  transform: translate3d(0, calc(var(--lift, 0) * -56px), 0);
  opacity: var(--fade, 1);
  will-change: transform, opacity;
}
.pl-horizon {
  transform: translate3d(0, calc(var(--lift, 0) * -18px), 0);
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .pl-sky, .pl-horizon { transform: none; opacity: 1; will-change: auto; }
}
`

export default function SceneShell({
  sceneSvg,
  seed,
  level,
  children,
}: {
  /** The scene, drawn to SVG on the server. The first paint, and what crawlers get. */
  sceneSvg: string
  seed: string
  level: number
  children: React.ReactNode
}) {
  const { rootRef, reducedMotion } = useSceneScroll()

  /** Seeded here so the first paint is defined; the hook drives them after that. */
  const sceneVars: React.CSSProperties & Record<string, string> = {
    "--lift": "0",
    "--fade": "1",
    "--veil": "0",
  }

  return (
    <div ref={rootRef} style={sceneVars} className="relative min-h-screen w-full min-w-0 bg-[#0B1220]">
      <style>{CSS}</style>

      {/* -- The scene. Fixed, full-bleed, never moves. Runs from the very top
             of the viewport, so it is behind the navbar too. `aria-hidden` on
             the whole layer: it is a picture behind text, and the page already
             says in words what it shows. ---------------------------------- */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <SceneBackdrop
          svg={sceneSvg}
          seed={seed}
          level={level}
          gateId={HERO_GATE_ID}
          reducedMotion={reducedMotion}
        />
        {/* A constant floor of dark, so the copy is legible from the first
            frame - including the frame in which the scene is still only the
            server's SVG. */}
        <span className="absolute inset-0 bg-black/25" />
        {/* The left scrim carries the headline and the call to action ... */}
        <span className="absolute inset-y-0 left-0 w-[min(48rem,82%)] bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
        {/* ... the bottom one carries the figures that break the fold. */}
        <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />
        {/* The veil: the scene goes deep as the page's panels arrive. */}
        <span className="absolute inset-0 bg-black/55" style={{ opacity: "var(--veil, 0)" }} />
      </div>

      <SceneNavbar />
      {/* A permanent band of dark under the top edge so the bar's wordmark and
          links stay legible over the brightest part of the sky, deepening as
          the page scrolls. */}
      <span
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-24 bg-gradient-to-b from-black/55 via-black/25 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-14 z-40 h-8 bg-gradient-to-b from-black/45 to-transparent"
        style={{ opacity: "var(--veil, 0)" }}
      />

      {children}
    </div>
  )
}
