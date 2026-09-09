/**
 * The land behind the tree: the ridge generator and the per-scene backdrop.
 *
 * Extracted from `svg.ts` unchanged so surfaces other than the tree renderer
 * can draw the same horizon - see `lib/studyArt.ts`, which composes study
 * artwork out of exactly this geometry rather than inventing a second one.
 *
 * This is renderer code, not generator code: it takes a resolved palette and
 * draws. It is therefore NOT part of the three-copies parity rule in
 * CLAUDE.md - there is no Dart mirror owed for anything in this file, and
 * nothing here may ever consult an unseeded random or the clock.
 */

import { sceneSpec } from './scenes';
import type { Palette } from './palette';

/** Two decimal places, as a string. Every coordinate in the SVG goes through it. */
export const f = (n: number) => (Math.round(n * 100) / 100).toString();

/**
 * One rolling ridge, as a closed path.
 *
 * `baseY` is the ground line it sits on, `amp` how tall the hills are, `freq`
 * how many of them span the width, `phase` where in the wave the left edge
 * falls, and `lift` a flat raise applied to the whole ridge. The path closes
 * below `baseY` so it can be filled as a solid silhouette.
 */
export function hillPath(
  width: number,
  baseY: number,
  amp: number,
  freq: number,
  phase: number,
  lift: number,
): string {
  let d = `M0 ${f(baseY + amp * 2)}`;
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * width;
    const y = baseY - lift - amp * (0.5 + 0.5 * Math.sin((i / steps) * freq * Math.PI * 2 + phase));
    d += `L${f(x)} ${f(y)}`;
  }
  return `${d}L${f(width)} ${f(baseY + amp * 2)}Z`;
}

/** The distant shapes a scene puts behind the tree, as an SVG fragment. */
export function backdrop(palette: Palette, width: number, height: number, groundTop: number): string {
  const spec = sceneSpec(palette.scene);
  switch (spec.backdrop) {
    case 'hills':
    case 'garden':
      return (
        `<path d="${hillPath(width, groundTop, height * 0.09, 1.3, 0.8, height * 0.05)}" fill="${palette.farAlt}"/>` +
        `<path d="${hillPath(width, groundTop, height * 0.06, 2.1, 2.6, 0)}" fill="${palette.far}"/>`
      );
    case 'dunes':
      return (
        `<path d="${hillPath(width, groundTop, height * 0.1, 0.9, 2.2, height * 0.03)}" fill="${palette.farAlt}"/>` +
        `<path d="${hillPath(width, groundTop, height * 0.07, 1.4, 4.4, 0)}" fill="${palette.far}"/>`
      );
    case 'lake': {
      const horizon = groundTop - height * 0.14;
      return (
        `<path d="${hillPath(width, horizon, height * 0.045, 1.6, 1.2, 0)}" fill="${palette.far}"/>` +
        `<rect x="0" y="${f(horizon)}" width="${width}" height="${f(groundTop - horizon)}" fill="${palette.water ?? palette.far}"/>`
      );
    }
    case 'mountain': {
      const peaks: [number, number][] = [[-0.05, 0.12], [0.08, 0.3], [0.24, 0.42], [0.4, 0.26], [0.58, 0.48], [0.74, 0.3], [0.9, 0.38], [1.05, 0.14]];
      let d = `M${f(-width * 0.1)} ${f(groundTop)}`;
      for (const [px, py] of peaks) d += `L${f(px * width)} ${f(groundTop - py * height)}`;
      d += `L${f(width * 1.1)} ${f(groundTop)}Z`;
      return `<path d="${d}" fill="${palette.far}"/><path d="${hillPath(width, groundTop, height * 0.07, 1.1, 3.4, 0)}" fill="${palette.farAlt}"/>`;
    }
    case 'wall': {
      const wallTop = groundTop - height * 0.17;
      return `<rect x="0" y="${f(wallTop)}" width="${width}" height="${f(groundTop - wallTop)}" fill="${palette.far}"/>`;
    }
    case 'stars':
      return '';
    case 'meadow':
    default:
      return `<path d="${hillPath(width, groundTop, height * 0.04, 1.2, 1.1, 0)}" fill="${palette.far}" opacity="0.55"/>`;
  }
}
