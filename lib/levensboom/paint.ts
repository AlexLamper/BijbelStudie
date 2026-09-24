import { GROUND_Y, type Branch, type TreeScene } from './generate';
import { MATURE } from './growth';
import { mix, type Palette } from './palette';
import { seededRng } from './rng';
import type { TreeForm } from './species';

/**
 * Growth v2 render-only primitives both renderers share (plan §4.4 "new
 * drawing primitives", §4.5 maturing): the seed leaf's shape and colour, and
 * the bark knots, moss and root flare of an old tree. Paint, not topology -
 * nothing here feeds back into the generator, and season, time and health only
 * reach it through the palette.
 *
 * Placeholder design numbers, written out so the Dart port
 * (`lib/features/levensboom/present/tree_paint.dart`) can copy them 1:1; the
 * designer refines them. Colours are mixes of existing palette tokens only.
 * All geometry is in tree units, on the scene's own branch geometry, so a
 * renderer applies its camera exactly as it does to the branches.
 */

// ---------------------------------------------------------------------------
// Seed leaves (kind 'cotyledon')
// ---------------------------------------------------------------------------

/**
 * A seed leaf is drawn in its own rotated frame (+x along `leaf.angle`), with
 * `s` = the leaf's pixel size exactly as a species leaf gets it:
 *
 *   broad-leaved   ellipse centre (0.55·s, 0), radii (0.62·s, 0.46·s)  - rounder and fleshier than any species leaf
 *   conical form   ellipse centre (0.75·s, 0), radii (0.85·s, 0.16·s)  - a conifer's seed leaves are needles
 *
 * Colour (`cotyledonColor`):
 *   base  = mix(leaf or leafAlt (leaf.phase > 0.5), light, 0.14)          - slightly lighter than the canopy
 *   faded = mix(mix(base, barkLit, 0.4), glow, 0.3)                        - a pale, yellowing olive
 *   age   = step >= 3 ? clamp(0.3 + 0.25·(position − 3), 0, 0.8) : 0
 *   fill  = mix(base, faded, age)
 */
export const COTYLEDON = {
  cx: 0.55,
  rx: 0.62,
  ry: 0.46,
  needleCx: 0.75,
  needleRx: 0.85,
  needleRy: 0.16,
  lighten: 0.14,
  fadeBark: 0.4,
  fadeGlow: 0.3,
  yellowFromStep: 3,
  yellowStart: 0.3,
  yellowPerStep: 0.25,
  yellowMax: 0.8,
} as const;

export function cotyledonShape(form: TreeForm, size: number): { cx: number; rx: number; ry: number } {
  if (form === 'conical') return { cx: COTYLEDON.needleCx * size, rx: COTYLEDON.needleRx * size, ry: COTYLEDON.needleRy * size };
  return { cx: COTYLEDON.cx * size, rx: COTYLEDON.rx * size, ry: COTYLEDON.ry * size };
}

export function cotyledonColor(
  palette: Pick<Palette, 'leaf' | 'leafAlt' | 'light' | 'barkLit' | 'glow'>,
  alt: boolean,
  scene: { step?: number; position: number },
): string {
  const base = mix(alt ? palette.leafAlt : palette.leaf, palette.light, COTYLEDON.lighten);
  const step = scene.step ?? Math.floor(scene.position);
  if (step < COTYLEDON.yellowFromStep) return base;
  const age = Math.min(
    COTYLEDON.yellowMax,
    Math.max(0, COTYLEDON.yellowStart + COTYLEDON.yellowPerStep * (scene.position - COTYLEDON.yellowFromStep)),
  );
  const faded = mix(mix(base, palette.barkLit, COTYLEDON.fadeBark), palette.glow, COTYLEDON.fadeGlow);
  return mix(base, faded, age);
}

// ---------------------------------------------------------------------------
// Maturing: knots, moss, root flare (by position, plan §4.5)
// ---------------------------------------------------------------------------

/**
 * One seeded stream, `"<seed>:mature"`, always drawn in full and in this order
 * whatever the position, so a detail that appears later never moves one that
 * is already there:
 *
 *   knots  6 × (along, s, size)       mossTufts  7 × (along, s, size)       roots  2 × (spread), left then right
 *
 * where `s` gives both the side (s < 0.5 ? −1 : +1) and how far out (|2·s − 1|).
 *
 * The trunk is the branch with path 'T' (a palm's first segment). With u a
 * share of its length, P(u) the point on its quadratic curve, n(u) the unit
 * normal (−dy, dx)/|d| of the curve's direction d (so +n is the trunk's right
 * edge for a trunk growing up), and hw(u) = (w0 + (w1 − w0)·u) / 2 its half
 * width:
 *
 * KNOTS - from position 22, not on a palm. count = min(6, 1 + floor((position − 22) / 3)).
 *   knot i: u = 0.18 + 0.6·along;  side = s < 0.5 ? −1 : +1;  lateral = 0.2 + 0.3·|2·s − 1|
 *   centre = P(u) + n(u)·side·lateral·hw(u);  rx = hw(u)·(0.28 + 0.14·size);  ry = 0.62·rx
 *   rotated to the trunk's heading at u. Painted as a rim ellipse (1.3·rx, 1.4·ry) in barkLit at
 *   opacity 0.55, then the knot in mix(bark, groundDeep, 0.5) at opacity 0.9.
 *
 * MOSS - from position 26, not on a palm. count = min(7, 3 + floor((position − 26) / 2)).
 *   tuft j: u = 0.02 + 0.1·along;  side as above;  lateral = 0.55 + 0.4·|2·s − 1|
 *   centre = P(u) + n(u)·side·lateral·hw(u);  r = w0·(0.11 + 0.08·size)·min(1, 0.6 + 0.4·(position − 26) / 6)
 *   fill mix(size < 0.5 ? leaf : leafAlt, groundDeep, 0.45) at opacity 0.85.
 *
 * ROOT FLARE - from position 30, every form. amount = 0.35 + 0.65·min(1, (position − 30) / 6).
 *   base (x0, y0) = the trunk's start;  hw0 = hw(0);  rise = hw0·(1.2 + 0.8·amount)
 *   u = min(0.25, rise / trunk length);  top = P(u) + n(u)·side·hw(u)   (side −1 left, +1 right)
 *   toe  = (x0 + side·(hw0 + hw0·(0.6 + 0.8·amount)·(0.8 + 0.4·spread)), GROUND_Y + 0.3)
 *   ctrl = (x0 + side·1.08·hw0, GROUND_Y − 0.15·rise)
 *   outline: M top · Q ctrl toe · L (toe.x, GROUND_Y + 0.9) · L (x0, GROUND_Y + 0.9) · L (x0, top.y) · Z
 *   drawn behind the trunk; on the canvas (lit trunk) the left foot in mix(barkLit, bark, 0.5) and the
 *   right in bark; the SVG's trunk is flat bark, so both feet are bark there.
 */
export const MATURE_PAINT = {
  knotMax: 6,
  knotEvery: 3,
  knotAlong: [0.18, 0.6],
  knotLateral: [0.2, 0.3],
  knotSize: [0.28, 0.14],
  knotAspect: 0.62,
  mossMax: 7,
  mossFirst: 3,
  mossEvery: 2,
  mossAlong: [0.02, 0.1],
  mossLateral: [0.55, 0.4],
  mossSize: [0.11, 0.08],
  mossGrowSteps: 6,
  flareMin: 0.35,
  flareSteps: 6,
  flareRise: [1.2, 0.8],
  flareReach: [0.6, 0.8],
  flareSpread: [0.8, 0.4],
  flareMaxAlong: 0.25,
} as const;

export type Knot = { x: number; y: number; rx: number; ry: number; /** degrees */ angle: number };
export type MossTuft = { x: number; y: number; r: number; alt: boolean };
export type RootFoot = {
  side: -1 | 1;
  top: { x: number; y: number };
  ctrl: { x: number; y: number };
  toe: { x: number; y: number };
  baseX: number;
  /** Bottom edge of the foot, just under the ground line. */
  bottomY: number;
};
export type MatureDetails = { knots: Knot[]; moss: MossTuft[]; roots: RootFoot[] };

const EMPTY: MatureDetails = { knots: [], moss: [], roots: [] };

function trunkAt(trunk: Branch, u: number) {
  const v = 1 - u;
  const x = v * v * trunk.x0 + 2 * v * u * trunk.cx + u * u * trunk.x1;
  const y = v * v * trunk.y0 + 2 * v * u * trunk.cy + u * u * trunk.y1;
  const dx = 2 * v * (trunk.cx - trunk.x0) + 2 * u * (trunk.x1 - trunk.cx);
  const dy = 2 * v * (trunk.cy - trunk.y0) + 2 * u * (trunk.y1 - trunk.cy);
  const length = Math.hypot(dx, dy) || 1;
  return {
    x,
    y,
    nx: -dy / length,
    ny: dx / length,
    heading: (Math.atan2(dy, dx) * 180) / Math.PI,
    hw: (trunk.w0 + (trunk.w1 - trunk.w0) * u) / 2,
  };
}

/** The maturing details for a scene, in tree units. Empty below step 22. */
export function matureDetails(scene: Pick<TreeScene, 'branches' | 'position' | 'form'>, seed: string): MatureDetails {
  const position = scene.position;
  if (!(position >= MATURE.knotsFrom)) return EMPTY;
  const trunk = scene.branches.find((b) => b.path === 'T');
  if (!trunk) return EMPTY;

  const rand = seededRng(`${seed}:mature`);
  const draws = (n: number) => Array.from({ length: n }, () => [rand(), rand(), rand()] as const);
  const knotDraws = draws(MATURE_PAINT.knotMax);
  const mossDraws = draws(MATURE_PAINT.mossMax);
  const rootDraws = [rand(), rand()];
  const palm = scene.form === 'palm';
  const P = MATURE_PAINT;

  const knots: Knot[] = [];
  if (!palm) {
    const count = Math.min(P.knotMax, 1 + Math.floor((position - MATURE.knotsFrom) / P.knotEvery));
    for (let i = 0; i < count; i += 1) {
      const [along, sideU, size] = knotDraws[i];
      const at = trunkAt(trunk, P.knotAlong[0] + P.knotAlong[1] * along);
      const side = sideU < 0.5 ? -1 : 1;
      const lateral = P.knotLateral[0] + P.knotLateral[1] * Math.abs(2 * sideU - 1);
      const rx = at.hw * (P.knotSize[0] + P.knotSize[1] * size);
      knots.push({
        x: at.x + at.nx * side * lateral * at.hw,
        y: at.y + at.ny * side * lateral * at.hw,
        rx,
        ry: rx * P.knotAspect,
        angle: at.heading,
      });
    }
  }

  const moss: MossTuft[] = [];
  if (!palm && position >= MATURE.mossFrom) {
    const count = Math.min(P.mossMax, P.mossFirst + Math.floor((position - MATURE.mossFrom) / P.mossEvery));
    const grow = Math.min(1, 0.6 + (0.4 * (position - MATURE.mossFrom)) / P.mossGrowSteps);
    for (let j = 0; j < count; j += 1) {
      const [along, sideU, size] = mossDraws[j];
      const at = trunkAt(trunk, P.mossAlong[0] + P.mossAlong[1] * along);
      const side = sideU < 0.5 ? -1 : 1;
      const lateral = P.mossLateral[0] + P.mossLateral[1] * Math.abs(2 * sideU - 1);
      moss.push({
        x: at.x + at.nx * side * lateral * at.hw,
        y: at.y + at.ny * side * lateral * at.hw,
        r: trunk.w0 * (P.mossSize[0] + P.mossSize[1] * size) * grow,
        alt: size >= 0.5,
      });
    }
  }

  const roots: RootFoot[] = [];
  if (position >= MATURE.flareFrom) {
    const amount = P.flareMin + (1 - P.flareMin) * Math.min(1, (position - MATURE.flareFrom) / P.flareSteps);
    const length = Math.max(1e-6, Math.hypot(trunk.x1 - trunk.x0, trunk.y1 - trunk.y0));
    const hw0 = trunk.w0 / 2;
    const rise = hw0 * (P.flareRise[0] + P.flareRise[1] * amount);
    const at = trunkAt(trunk, Math.min(P.flareMaxAlong, rise / length));
    ([-1, 1] as const).forEach((side, i) => {
      const reach = hw0 + hw0 * (P.flareReach[0] + P.flareReach[1] * amount) * (P.flareSpread[0] + P.flareSpread[1] * rootDraws[i]);
      roots.push({
        side,
        top: { x: at.x + at.nx * side * at.hw, y: at.y + at.ny * side * at.hw },
        ctrl: { x: trunk.x0 + side * 1.08 * hw0, y: GROUND_Y - 0.15 * rise },
        toe: { x: trunk.x0 + side * reach, y: GROUND_Y + 0.3 },
        baseX: trunk.x0,
        bottomY: GROUND_Y + 0.9,
      });
    });
  }

  return { knots, moss, roots };
}

/** Knot colours: the dark knot and its lit rim. */
export function knotColors(palette: Pick<Palette, 'bark' | 'barkLit' | 'groundDeep'>): { knot: string; rim: string } {
  return { knot: mix(palette.bark, palette.groundDeep, 0.5), rim: palette.barkLit };
}

export function mossColor(palette: Pick<Palette, 'leaf' | 'leafAlt' | 'groundDeep'>, alt: boolean): string {
  return mix(alt ? palette.leafAlt : palette.leaf, palette.groundDeep, 0.45);
}

export function rootColor(palette: Pick<Palette, 'bark' | 'barkLit'>, side: -1 | 1): string {
  return side < 0 ? mix(palette.barkLit, palette.bark, 0.5) : palette.bark;
}
