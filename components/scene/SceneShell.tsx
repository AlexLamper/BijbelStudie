"use client"

import { Header } from "../layout/header"
import SceneBackdrop, { type SceneBackdropProps } from "./SceneBackdrop"
import SceneRail from "./SceneRail"
import { SCENE_X, SCENE_X_EDGE, SCRIM_TOP, SCRIM_TOP_VEIL } from "./tokens"
import { sceneVars, useSceneDepth } from "./useSceneDepth"

/**
 * The window every immersive page lives in.
 *
 * The scene is fixed to the viewport and never moves; everything else travels
 * over it. The landscape runs from the very top - behind the navbar, behind the
 * heading, behind every panel - and is only ever pushed further back, never
 * replaced. That is the whole idea, and this component is the only place it is
 * assembled: the root, the depth variables, the backdrop and its scrims, the
 * app bar, the rail, the band of dark under the top edge, and one content layer
 * for the page.
 *
 * What a page still owns: its own layers. The shape the dashboard uses, and the
 * one to copy, is three of them -
 *
 *   1. the sky      one screen of copy set straight into the landscape, wearing
 *                   `className="scene-sky"`
 *   2. the horizon  a row of figures that breaks the fold, wearing
 *                   `className="scene-horizon"`
 *   3. the desk     the working panels, which is the only part that really
 *                   scrolls
 *
 * Those two classes are the whole motion API (app/globals.css). They answer
 * reduced motion in CSS, so a page needs no hook, no flag and no branch - and
 * a page with no other client state can stay a server component.
 *
 * Two hard rules for anything rendered inside:
 *   - Text never waits on the scene. The picture is a background; a heading, a
 *     paragraph or a number renders as soon as ITS data is there, with a
 *     SceneSkeleton in the shape of what is coming while it is not.
 *   - One animated canvas per page. The shell already owns the only one there
 *     is allowed to be. Do not mount a TreeCanvas, a Lottie or a video loop in
 *     the content on top of it.
 */

export type SceneShellProps = Omit<SceneBackdropProps, "mode" | "reducedMotion"> & {
  /**
   * "static" (the default) draws a server-rendered SVG and is safe on every
   * route, signed in or out. "reader" draws the signed-in reader's own tree and
   * needs a route where a session is guaranteed.
   */
  backdrop?: SceneBackdropProps["mode"]
  /**
   * The real app bar, in its scene variant. Off by default, because
   * `components/layout/header.tsx` reads the session - on a route with no
   * SessionProvider it throws, and signed out it pushes the visitor to the
   * sign-in page. Turn it on for a signed-in route, never on a public one.
   */
  header?: boolean
  /** The floating nav rail. Reads the session too, so the same rule applies. */
  rail?: boolean
  /**
   * The content layer's gutter. Defaults to the rail's inset when the rail is
   * shown and to the symmetrical edge gutter when it is not.
   *
   * "none" gives the page an unpadded content layer, for a page that wants
   * full-bleed sections and will apply `SCENE_X` per section itself.
   */
  gutter?: "rail" | "edge" | "none"
  /** Extra classes on the root, e.g. a taller `min-h`. Rarely needed. */
  className?: string
  children: React.ReactNode
}

export default function SceneShell({
  backdrop = "static",
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
  header = false,
  rail = false,
  gutter,
  className = "",
  children,
}: SceneShellProps) {
  const { rootRef, reducedMotion } = useSceneDepth()

  const gutterClass =
    gutter === "none" ? "" : gutter === "edge" ? SCENE_X_EDGE : gutter === "rail" ? SCENE_X : rail ? SCENE_X : SCENE_X_EDGE

  return (
    // `w-full min-w-0` is load-bearing: several signed-in layouts wrap the page
    // in a `flex` row (SidebarProvider), and a flex child without them is sized
    // to its content rather than to the viewport - which is what cut the navbar
    // and the panels short of the right edge.
    //
    // `bg-[#0B1220]` is written out rather than built from SCENE_BG: Tailwind
    // reads class names as literal text, and a value spliced in from a constant
    // is a class it never generates.
    <div
      ref={rootRef}
      style={sceneVars(reducedMotion)}
      className={`relative min-h-screen w-full min-w-0 bg-[#0B1220] ${className}`}
    >
      <SceneBackdrop
        mode={backdrop}
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

      {/* The real navbar, in its scene variant: transparent, hairline in white,
          own dark scope. The landscape runs straight through it, which is what
          makes the experience cover the whole screen. */}
      {header && <Header variant="scene" />}

      {/* A permanent band of dark under the top edge so a title and its controls
          stay legible over a noon sky, deepening as the page scrolls. */}
      <span aria-hidden className={SCRIM_TOP} />
      <span aria-hidden className={SCRIM_TOP_VEIL} style={{ opacity: "var(--veil, 0)" }} />

      {rail && <SceneRail />}

      <div className={`relative z-10 ${gutterClass}`}>{children}</div>
    </div>
  )
}
