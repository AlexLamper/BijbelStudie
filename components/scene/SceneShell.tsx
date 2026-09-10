"use client"

import { Header } from "../layout/header"
import SceneBackdrop, { type SceneBackdropProps } from "./SceneBackdrop"
import SceneRail from "./SceneRail"
import { SCENE_BG, SCENE_X, SCENE_X_EDGE, SCRIM_TOP, SCRIM_TOP_VEIL } from "./tokens"
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
 *
 * THE ONE BACKGROUND RULE: THE BAR SHOWS WHAT THE PAGE STANDS ON.
 *
 * The scene navbar is transparent and carries its own `dark` scope, so it shows
 * whatever is behind it. That is right on a page with a landscape and wrong the
 * moment a page has none: the bar showed a photograph, the page under it showed
 * flat ground, and the two met at a hard line an inch from the top of the
 * screen. Both halves were defensible on their own and together they read as
 * two designs stitched at the seam.
 *
 * So a page declares which of the two it is, and the shell does the rest:
 *
 *   backdrop="static" | "reader"   There is a picture. It runs full-bleed from
 *                                  the very top, the bar stays transparent over
 *                                  it, and the top scrims keep the bar's own
 *                                  type legible over a bright sky.
 *   backdrop="none"                There is no picture. The shell paints its
 *                                  flat ground across the whole viewport -
 *                                  behind the bar as much as behind the
 *                                  content - and draws no scrim, because there
 *                                  is nothing to darken. The bar is still
 *                                  transparent, and therefore shows exactly the
 *                                  ground the page is standing on.
 *
 * What is NOT allowed is the third case: a picture behind the bar and a page
 * that paints over it. If a route's content covers the landscape (the reader,
 * and any screen that owns its own opaque ground), it takes `backdrop="none"`.
 */

export type SceneShellProps = Omit<SceneBackdropProps, "mode" | "reducedMotion"> & {
  /**
   * "static" (the default) draws a server-rendered SVG and is safe on every
   * route, signed in or out. "reader" draws the signed-in reader's own tree and
   * needs a route where a session is guaranteed. "none" draws no picture at
   * all - see THE ONE BACKGROUND RULE above.
   */
  backdrop?: SceneBackdropProps["mode"] | "none"
  /**
   * The real app bar, in its scene variant. Off by default only because a
   * route with no SessionProvider cannot mount it (`useSession` throws there).
   * It is safe signed OUT: a guest gets the same bar with an Inloggen button
   * where the profile menu would be, so a public route should turn it on too.
   */
  header?: boolean
  /**
   * The nav rail. Guest-aware in the same way - every item renders, the
   * account-bound routes answer a guest with a GuestGate, and the foot of the
   * rail offers the way in - so it belongs on public routes as much as on
   * signed-in ones. It reads the session, so it needs the provider too.
   */
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

  const hasPicture = backdrop !== "none"

  return (
    // `w-full min-w-0` is load-bearing: several signed-in layouts wrap the page
    // in a `flex` row (SidebarProvider), and a flex child without them is sized
    // to its content rather than to the viewport - which is what cut the navbar
    // and the panels short of the right edge.
    //
    // The ground comes from the token through `style` rather than from a class:
    // Tailwind reads class names as literal text, and a value spliced in from a
    // constant is a class it never generates.
    <div
      ref={rootRef}
      style={{ ...sceneVars(reducedMotion), backgroundColor: SCENE_BG }}
      className={`relative min-h-screen w-full min-w-0 ${className}`}
    >
      {hasPicture ? (
        <SceneBackdrop
          mode={backdrop as SceneBackdropProps["mode"]}
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
      ) : null}
      {/* No picture means no layer at all: the root's flat ground IS the page,
          from the top of the viewport to the bottom, and the transparent bar
          therefore shows exactly what the content below it is standing on.
          Not even the still wash /studie lights its window surround with
          (SCENE_WASH) - a `backdrop="none"` page is a reading screen, its type
          sits directly on this colour, and every contrast figure in tokens.ts
          is measured on the bare value. A gradient under a column of scripture
          costs about two points of contrast at the top of the column and buys
          nothing the reader wanted. */}

      {/* The real navbar, in its scene variant: transparent, hairline in white,
          own dark scope. It shows whatever the page stands on - the landscape
          where there is one, the flat ground where there is not. */}
      {header && <Header variant="scene" />}

      {/* A permanent band of dark under the top edge so a title and its controls
          stay legible over a noon sky, deepening as the page scrolls. Only over
          a picture: on a flat ground it would be a smudge under the bar and the
          seam all over again. */}
      {hasPicture && (
        <>
          <span aria-hidden className={SCRIM_TOP} />
          <span aria-hidden className={SCRIM_TOP_VEIL} style={{ opacity: "var(--veil, 0)" }} />
        </>
      )}

      {rail && <SceneRail />}

      <div className={`relative z-10 ${gutterClass}`}>{children}</div>
    </div>
  )
}
