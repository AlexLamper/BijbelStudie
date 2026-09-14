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
    case 'river':
    case 'vineyard':
      return (
        `<path d="${hillPath(width, groundTop, height * 0.08, 1.4, 0.6, height * 0.04)}" fill="${palette.farAlt}"/>` +
        `<path d="${hillPath(width, groundTop, height * 0.05, 2.3, 2.9, 0)}" fill="${palette.far}"/>`
      );
    case 'field':
      return (
        `<path d="${hillPath(width, groundTop, height * 0.06, 1.1, 1.9, height * 0.03)}" fill="${palette.farAlt}"/>` +
        `<path d="${hillPath(width, groundTop, height * 0.04, 1.9, 4.1, 0)}" fill="${palette.far}"/>`
      );
    case 'sea': {
      const horizon = groundTop - height * 0.16;
      return `<rect x="0" y="${f(horizon)}" width="${width}" height="${f(groundTop - horizon)}" fill="${palette.water ?? palette.far}"/>`;
    }
    case 'rainbow': {
      // The bow: six bands on a centre below the horizon, each drawn only as
      // the arc above the ground line, so no clip path (and no id) is needed.
      const cx = width * 0.62;
      const cy = groundTop + height * 0.32;
      const r = height * 0.78;
      const band = Math.max(1.5, height * 0.014);
      const colours = ['#E4483F', '#F0933A', '#F2D24A', '#6DBA5C', '#4E9CD6', '#7A5FB8'];
      let bow = '';
      colours.forEach((colour, i) => {
        const ri = r - i * band;
        const dx = Math.sqrt(Math.max(0, ri * ri - (cy - groundTop) ** 2));
        bow += `<path d="M${f(cx - dx)} ${f(groundTop)}A${f(ri)} ${f(ri)} 0 0 1 ${f(cx + dx)} ${f(groundTop)}" fill="none" stroke="${colour}" stroke-width="${f(band)}" opacity="0.5"/>`;
      });
      return `${bow}<path d="${hillPath(width, groundTop, height * 0.04, 1.2, 1.1, 0)}" fill="${palette.far}" opacity="0.55"/>`;
    }
    case 'sunrise': {
      const sx = width * 0.5;
      const sy = groundTop - height * 0.1;
      const sr = Math.max(6, width * 0.09);
      return (
        `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr * 2.6)}" fill="${palette.glow}" opacity="0.28"/>` +
        `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="${palette.accent}"/>` +
        `<path d="${hillPath(width, groundTop, height * 0.1, 1.2, 0.4, height * 0.05)}" fill="${palette.farAlt}"/>` +
        `<path d="${hillPath(width, groundTop, height * 0.06, 2.0, 2.4, 0)}" fill="${palette.far}"/>`
      );
    }
    case 'shepherds': {
      const sx = width * 0.72;
      const sy = height * 0.14;
      const sr = Math.max(3, width * 0.02);
      return (
        `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr * 4)}" fill="${palette.accent}" opacity="0.14"/>` +
        `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr * 0.5)}" fill="${palette.accent}"/>` +
        `<path d="M${f(sx)} ${f(sy - sr * 3)}L${f(sx + sr * 0.3)} ${f(sy)}L${f(sx)} ${f(sy + sr * 3)}L${f(sx - sr * 0.3)} ${f(sy)}Z" fill="${palette.accent}"/>` +
        `<path d="M${f(sx - sr * 2.2)} ${f(sy)}L${f(sx)} ${f(sy - sr * 0.3)}L${f(sx + sr * 2.2)} ${f(sy)}L${f(sx)} ${f(sy + sr * 0.3)}Z" fill="${palette.accent}"/>` +
        `<path d="${hillPath(width, groundTop, height * 0.09, 1.1, 1.5, height * 0.04)}" fill="${palette.farAlt}"/>` +
        `<path d="${hillPath(width, groundTop, height * 0.05, 1.8, 3.6, 0)}" fill="${palette.far}"/>`
      );
    }
    case 'meadow':
    default:
      return `<path d="${hillPath(width, groundTop, height * 0.04, 1.2, 1.1, 0)}" fill="${palette.far}" opacity="0.55"/>`;
  }
}
