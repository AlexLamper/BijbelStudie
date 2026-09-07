import { seededRng, type Rng } from './rng';
import { fruitCount, hasTrait, traitsForLevel, type TreeTrait } from './traits';

/**
 * The Levensboom generator: level and XP in, a scene graph out.
 *
 * Pure. No DOM, no canvas, no clock - the renderer
 * (`components/levensboom/TreeCanvas.tsx`) turns this into pixels and the app's
 * `tree_generator.dart` produces the identical graph from the identical inputs.
 * Season and time of day are deliberately *not* inputs: they only ever touch
 * colour (lib/levensboom/palette.ts), so the geometry - and therefore the
 * parity test - stays independent of what time it is.
 *
 * Contract: docs/levensboom-spec.md §4.
 */

export type Branch = {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  w0: number;
  w1: number;
  depth: number;
};

export type Leaf = {
  x: number;
  y: number;
  angle: number;
  size: number;
  /** 0..1 wind offset, so the canopy shimmers instead of pulsing as one block. */
  phase: number;
  /** 0..1; the leaves with the highest values are the ones a wilting tree sheds. */
  hardiness: number;
  bloomOrder: number;
  /** The branch depth this leaf hangs from; the level-up grow-in reveals by depth. */
  depth: number;
  visible: boolean;
  /** False while the leaf is still a bud - the in-level XP progress made visual. */
  open: boolean;
};

export type Ornament = { x: number; y: number; size: number; index: number };
export type Mote = { x: number; y: number; phase: number };

/**
 * What the tree actually occupies, so a renderer can frame it instead of
 * letterboxing a fixed 100x100 box.
 *
 * A level-2 sapling and a level-30 tree are wildly different heights; without
 * this the sapling is a speck at the bottom of an empty sky and the big tree
 * still leaves a third of the frame unused. Always includes the ground line.
 */
export type TreeBounds = { minX: number; maxX: number; minY: number; maxY: number };

export type TreeScene = {
  branches: Branch[];
  leaves: Leaf[];
  blossoms: Ornament[];
  fruits: Ornament[];
  bird: { x: number; y: number } | null;
  fireflies: Mote[];
  bounds: TreeBounds;
  traits: TreeTrait[];
  growth: number;
  maxDepth: number;
  level: number;
  frac: number;
  health: number;
};

export type TreeInput = {
  seed: string;
  level: number;
  /** xpIntoLevel / xpForNextLevel, 0..1. */
  frac: number;
  /** 0.3..1 from lib/levensboom/health.ts. */
  health?: number;
};

export const GROUND_Y = 88;
export const TRUNK_X = 50;

/**
 * Hard stop on the recursion, checked before any random draw so it cannot
 * desync the two platforms' streams.
 *
 * Branch count is exponential in depth, and the whole point of this curve is
 * that there is no top level. Without a ceiling, a level-60 account would hand
 * a low-end Android a five-figure scene graph to repaint every frame. The
 * silhouette stops gaining detail here; growth after that shows up as scale,
 * traits and fruit.
 */
export const MAX_BRANCHES = 900;

/** Same reasoning as MAX_BRANCHES, for the layer that is drawn per frame. */
export const MAX_LEAVES = 1400;

const DEG = Math.PI / 180;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Asymptotic, so the curve needs no cap: level 40 is visibly bigger than level
 * 20, but the gap keeps shrinking and the tree never grows off the canvas.
 */
export function growthForLevel(level: number): number {
  return 1 - 1 / (1 + Math.max(1, level) / 8);
}

export function maxDepthForLevel(level: number): number {
  return Math.min(7, 2 + Math.round(5 * growthForLevel(level)));
}

export function generateTree(input: TreeInput): TreeScene {
  const level = Math.max(1, Math.floor(input.level));
  const frac = clamp(input.frac, 0, 1);
  const health = clamp(input.health ?? 1, 0, 1);

  const rand: Rng = seededRng(input.seed);
  const growth = growthForLevel(level);
  const maxDepth = maxDepthForLevel(level);
  const droopT = (1 - health) * 0.25;
  const canopy = hasTrait(level, 'canopy');

  const branches: Branch[] = [];
  const leaves: Leaf[] = [];

  const emitLeaves = (x: number, y: number, angle: number, depth: number) => {
    if (leaves.length >= MAX_LEAVES) return;
    // Enough leaves per tip, held close enough to it, that the clusters read as
    // one canopy. Fewer and wider - which is where this started - draws a bare
    // skeleton wearing a handful of specks, and a bare tree is exactly the
    // message this feature must not send.
    const count = canopy ? Math.round(4 + 6 * growth) : 3;
    for (let i = 0; i < count; i += 1) {
      const a = angle + (rand() * 2 - 1) * 70;
      const distance = rand() * 2.6 * (0.5 + growth);
      leaves.push({
        x: x + Math.cos(a * DEG) * distance,
        y: y + Math.sin(a * DEG) * distance,
        angle: a,
        size: 0.8 + rand() * 0.7,
        phase: rand(),
        hardiness: rand(),
        bloomOrder: leaves.length,
        depth,
        visible: true,
        open: true,
      });
    }
  };

  const recurse = (
    x0: number,
    y0: number,
    angle: number,
    len: number,
    width: number,
    depth: number,
  ) => {
    if (branches.length >= MAX_BRANCHES) return;

    const curve = (rand() * 2 - 1) * 10;
    const endAngle = angle + curve;
    const midAngle = angle + curve * 0.5;

    const x1 = x0 + Math.cos(endAngle * DEG) * len;
    const y1 = y0 + Math.sin(endAngle * DEG) * len;

    branches.push({
      x0,
      y0,
      cx: x0 + Math.cos(midAngle * DEG) * len * 0.5,
      cy: y0 + Math.sin(midAngle * DEG) * len * 0.5,
      x1,
      y1,
      w0: width,
      w1: width * 0.68,
      depth,
    });

    if (depth >= maxDepth) {
      emitLeaves(x1, y1, endAngle, depth);
      return;
    }

    // Two children by default, a third with a chance that rises with growth:
    // that is what makes a high level read as *fuller* and not merely taller.
    const childCount = depth === 0 ? 2 : rand() < 0.15 + 0.2 * growth ? 3 : 2;
    const spread = 26 + rand() * 14;

    for (let i = 0; i < childCount; i += 1) {
      // -1..1 across the fan. childCount is never 1, so no divide-by-zero guard.
      const t = (i / (childCount - 1)) * 2 - 1;
      const jitter = (rand() * 2 - 1) * 8;
      const raw = endAngle + t * spread + jitter;
      // Wilt rotates the tip toward straight down, more the further out it is.
      const droop = droopT * ((depth + 1) / maxDepth);
      const childAngle = raw + (90 - raw) * droop;
      recurse(x1, y1, childAngle, len * 0.74, width * 0.68, depth + 1);
    }

    if (depth === maxDepth - 1) emitLeaves(x1, y1, endAngle, depth);
  };

  const lean = (rand() * 2 - 1) * 6;
  const trunkLen = 15 + 25 * growth;
  const trunkWidth = 2 + 5 * growth;
  recurse(TRUNK_X, GROUND_Y, -90 + lean, trunkLen, trunkWidth, 0);

  if (hasTrait(level, 'twin')) {
    // Drawn after the main tree finishes so the main tree's shape never changes
    // when this unlocks - the user gains a second trunk, they do not get a
    // different tree.
    const side = rand() < 0.5 ? -1 : 1;
    recurse(
      TRUNK_X + side * 6,
      GROUND_Y,
      -90 + lean + side * 14,
      trunkLen * 0.62,
      trunkWidth * 0.55,
      1,
    );
  }

  // Wilt sheds a scatter rather than a block, and the same leaves return on
  // recovery because `hardiness` is seeded.
  const visibleCut = 0.55 + 0.45 * health;
  const openCut = Math.ceil(leaves.length * (0.5 + 0.5 * frac));
  for (const leaf of leaves) {
    leaf.visible = leaf.hardiness <= visibleCut;
    leaf.open = leaf.bloomOrder < openCut;
  }

  const visible = leaves.filter((leaf) => leaf.visible);

  const blossoms: Ornament[] = [];
  if (hasTrait(level, 'blossom')) {
    const cap = Math.round(6 + 10 * growth);
    for (let i = 0; i < visible.length && blossoms.length < cap; i += 9) {
      blossoms.push({ x: visible[i].x, y: visible[i].y, size: visible[i].size, index: blossoms.length });
    }
  }

  const fruits: Ornament[] = [];
  const wanted = fruitCount(level);
  if (wanted > 0 && visible.length > 0) {
    // Highest leaves first, so fruit hangs in the canopy and not on the trunk.
    const highest = [...visible].sort((a, b) => (a.y === b.y ? a.bloomOrder - b.bloomOrder : a.y - b.y));
    const stride = Math.max(1, Math.floor(highest.length / wanted));
    for (let i = 0; i < wanted; i += 1) {
      const leaf = highest[Math.min(highest.length - 1, i * stride)];
      fruits.push({ x: leaf.x, y: leaf.y, size: leaf.size, index: i });
    }
  }

  let bird: { x: number; y: number } | null = null;
  if (hasTrait(level, 'bird') && visible.length > 0) {
    let best = visible[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const leaf of visible) {
      const d = (leaf.x - 62) ** 2 + (leaf.y - 40) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = leaf;
      }
    }
    bird = { x: best.x, y: best.y };
  }

  const fireflies: Mote[] = [];
  if (hasTrait(level, 'fireflies') && visible.length > 0) {
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const leaf of visible) {
      if (leaf.x < minX) minX = leaf.x;
      if (leaf.x > maxX) maxX = leaf.x;
      if (leaf.y < minY) minY = leaf.y;
      if (leaf.y > maxY) maxY = leaf.y;
    }
    for (let i = 0; i < 12; i += 1) {
      fireflies.push({
        x: minX + rand() * (maxX - minX),
        y: minY + rand() * (maxY - minY),
        phase: rand(),
      });
    }
  }

  // Padded by a leaf's worth so the outermost canopy is never clipped.
  const bounds: TreeBounds = { minX: TRUNK_X, maxX: TRUNK_X, minY: GROUND_Y, maxY: GROUND_Y + 6 };
  for (const branch of branches) {
    bounds.minX = Math.min(bounds.minX, branch.x0, branch.x1);
    bounds.maxX = Math.max(bounds.maxX, branch.x0, branch.x1);
    bounds.minY = Math.min(bounds.minY, branch.y0, branch.y1);
  }
  for (const leaf of visible) {
    bounds.minX = Math.min(bounds.minX, leaf.x - 3);
    bounds.maxX = Math.max(bounds.maxX, leaf.x + 3);
    bounds.minY = Math.min(bounds.minY, leaf.y - 3);
  }

  return {
    branches,
    leaves,
    blossoms,
    fruits,
    bird,
    fireflies,
    bounds,
    traits: traitsForLevel(level),
    growth,
    maxDepth,
    level,
    frac,
    health,
  };
}
