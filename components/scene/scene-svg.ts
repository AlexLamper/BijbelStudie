import { renderTreeSvg } from "../../lib/levensboom/svg"
import type { Season, TimeOfDay } from "../../lib/levensboom/palette"

/**
 * The scene for a page that has no session to draw: one fixed tree, rendered to
 * an SVG string on the server.
 *
 * Why a string and not a canvas: a public page's first paint is the thing a
 * visitor actually waits for, and a canvas paints nothing until hydration. The
 * server renders the picture into the HTML, that is what crawlers get, and
 * SceneBackdrop only ever swaps a live canvas in afterwards - and only while a
 * page element it is told to watch is on screen.
 *
 * Not a client module: it imports the tree generator, which has no business in
 * a browser bundle. Call it from a server component and hand the string to
 * SceneShell.
 */

/** One fixed seed for every public scene, so the output is stable across builds. */
export const SCENE_SEED = "bijbelstudie-levensboom"

/**
 * The picture the whole signed-out site shows: a grown oak by the streams, in
 * summer, at dusk. Deliberately not the visitor's clock - the page looks the
 * same at nine in the morning and at midnight, and the live canvas lands on
 * exactly the palette the server already drew.
 *
 * Spread this into <SceneShell /> so the canvas upgrade matches the SVG:
 *
 *   <SceneShell svg={sceneSvg()} {...SCENE_TREE}>
 */
export const SCENE_TREE = {
  seed: SCENE_SEED,
  level: 14,
  frac: 0.7,
  species: "eik",
  scene: "waterbeken",
  season: "summer" as Season,
  timeOfDay: "dusk" as TimeOfDay,
} as const

export type SceneSvgOverrides = {
  seed?: string
  level?: number
  frac?: number
  species?: string
  scene?: string
  season?: Season
  timeOfDay?: TimeOfDay
  width?: number
  height?: number
  maxLeaves?: number
}

/**
 * `xMidYMax slice` rather than `xMidYMid slice`: aligned to the bottom, a wide
 * screen crops sky off the top and a phone crops sky off the sides, and in both
 * cases the ground the tree stands in survives. Centred, a 21:9 monitor would
 * cut the ground away.
 */
const ROOT_ATTRIBUTES = 'aria-hidden="true" preserveAspectRatio="xMidYMax slice"'

/**
 * `maxLeaves` is held well under the 320 default: this SVG is inline in the
 * document of the page's first paint, so every leaf is bytes in front of the
 * heading. At 200 the string measures about 28 KB.
 */
const MAX_LEAVES = 200

/**
 * Rendered once per process and reused.
 *
 * The generator is pure and clock-free, so the same options always produce the
 * same string - and per-request CPU on this project is a standing budget, not a
 * detail. A statically rendered route pays for this at build time and a dynamic
 * one pays for it once per lambda instance rather than once per visitor.
 */
const cache = new Map<string, string>()

export function sceneSvg(overrides: SceneSvgOverrides = {}): string {
  const options = {
    ...SCENE_TREE,
    width: 1600,
    height: 1000,
    maxLeaves: MAX_LEAVES,
    ...overrides,
  }
  const key = JSON.stringify(options)
  const hit = cache.get(key)
  if (hit) return hit

  const svg = renderTreeSvg({
    ...options,
    framing: "scene",
    rootAttributes: ROOT_ATTRIBUTES,
  })
  cache.set(key, svg)
  return svg
}
