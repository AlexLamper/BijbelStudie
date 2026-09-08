import { seededRng, type Rng } from './rng';
import { fruitCount, hasTrait, traitsForLevel, type TreeTrait } from './traits';
import { DEFAULT_SPECIES, isSpeciesId, SPECIES, type SpeciesId, type SpeciesParams, type TreeForm } from './species';

/**
 * The Levensboom generator: level, XP and species in, a scene graph out.
 *
 * Pure. No DOM, no canvas, no clock - the renderer
 * (`components/levensboom/TreeCanvas.tsx`) turns this into pixels and the app's
 * `tree_generator.dart` produces the identical graph from the identical inputs.
 * Season, time of day, scene and animal are deliberately *not* inputs: they
 * only ever touch colour and render-only layers, so the geometry - and
 * therefore the parity test - stays independent of what time it is and of what
 * the reader has picked in the studio.
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

/**
 * What the tree actually occupies, so a renderer can frame it instead of
 * letterboxing a fixed 100x100 box.
 *
 * A level-1 kiem and a level-30 tree are wildly different heights; without
 * this the kiem is a speck at the bottom of an empty sky and the big tree
 * still leaves a third of the frame unused. Always includes the ground line
 * plus a band of earth under it.
 */
export type TreeBounds = { minX: number; maxX: number; minY: number; maxY: number };

export type TreeScene = {
  branches: Branch[];
  leaves: Leaf[];
  blossoms: Ornament[];
  fruits: Ornament[];
  /** Where a bird or a dove sits: the leaf nearest the upper right of the crown. */
  perch: { x: number; y: number } | null;
  bounds: TreeBounds;
  traits: TreeTrait[];
  growth: number;
  maxDepth: number;
  level: number;
  frac: number;
  health: number;
  species: SpeciesId;
  form: TreeForm;
};

export type TreeInput = {
  seed: string;
  level: number;
  /** xpIntoLevel / xpForNextLevel, 0..1. */
  frac: number;
  /** 0.3..1 from lib/levensboom/health.ts. */
  health?: number;
  /** Defaults to `eik`, which is the shape every account had before species existed. */
  species?: SpeciesId | string | null;
};

export const GROUND_Y = 88;
export const TRUNK_X = 50;

/** How much earth the bounds include under the ground line. */
export const GROUND_PAD = 8;

/**
 * The smallest extent a `scene` framing shows, in tree units. A kiem is 8
 * units tall; framed to its own bounds it would fill the stage like a
 * monster sprout and the earth band, sized from the same scale, would swallow
 * it. Framed to at least this much, it stands small in a real landscape - the
 * "starts tiny" story the stages tell.
 */
export const MIN_SCENE_HEIGHT = 26;
export const MIN_SCENE_WIDTH = 34;

/** Fruit hangs from a leaf but must not inherit a frond's or a fig leaf's size. */
export const MAX_FRUIT_SIZE = 1.6;

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
 * Level 1 is exactly zero - a kiem, two leaves on a stem - which is what makes
 * the first level-ups the biggest visible change the tree ever makes.
 */
export function growthForLevel(level: number): number {
  return 1 - 1 / (1 + (Math.max(1, level) - 1) / 6);
}

/** 0 at level 1 (the stem only), 1 at level 2, 4 at level 8, 6 from level 26. */
export function maxDepthForLevel(level: number): number {
  return Math.min(7, Math.round(7 * growthForLevel(level)));
}

export function generateTree(input: TreeInput): TreeScene {
  const level = Math.max(1, Math.floor(input.level));
  const frac = clamp(input.frac, 0, 1);
  const health = clamp(input.health ?? 1, 0, 1);
  const species: SpeciesId = isSpeciesId(input.species) ? input.species : DEFAULT_SPECIES;
  const sp: SpeciesParams = SPECIES[species];

  const rand: Rng = seededRng(input.seed);
  const growth = growthForLevel(level);
  const maxDepth = maxDepthForLevel(level);
  const droopT = (1 - health) * 0.25;
  const leafCount = maxDepth === 0 ? 2 : Math.max(2, Math.round((3 + 7 * growth) * sp.leafCountMul));
  const blossoming =
    sp.blossom === 'always' || (sp.blossom === 'seasonal' && hasTrait(level, 'blossom'));

  const branches: Branch[] = [];
  const leaves: Leaf[] = [];

  const emitLeaves = (x: number, y: number, angle: number, depth: number) => {
    for (let i = 0; i < leafCount; i += 1) {
      if (leaves.length >= MAX_LEAVES) return;
      let a = angle + (rand() * 2 - 1) * 70;
      let distance = rand() * 2.6 * (0.5 + growth);
      let size = (0.8 + rand() * 0.7) * sp.leafSizeMul;
      const phase = rand();
      const hardiness = rand();
      if (maxDepth === 0) {
        // A kiem is a stem with one leaf either side. The five draws above are
        // still made, so the stream stays aligned once the tree grows out of it.
        a = angle + (i === 0 ? -58 : 58);
        distance = 1.4;
        size = 1.6 * sp.leafSizeMul;
      }
      leaves.push({
        x: x + Math.cos(a * DEG) * distance,
        y: y + Math.sin(a * DEG) * distance,
        angle: a,
        size,
        phase,
        hardiness,
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
    leader = true,
  ) => {
    if (branches.length >= MAX_BRANCHES) return;

    const curve = (rand() * 2 - 1) * sp.curveAmp;
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
      w1: width * sp.childWidthRatio,
      depth,
    });

    if (depth >= maxDepth) {
      emitLeaves(x1, y1, endAngle, depth);
      return;
    }

    // Two children by default, a third with a chance that rises with growth:
    // that is what makes a high level read as *fuller* and not merely taller.
    // A conical tree's leader always fans three - itself and two sides - but
    // still makes the draw, so the stream stays aligned across species.
    const third = rand() < 0.15 + 0.2 * growth + sp.thirdChildBias;
    const spread = sp.spreadBase + rand() * sp.spreadJitter;
    const spine = sp.form === 'conical' && leader;
    const childCount = spine ? 3 : depth === 0 ? 2 : third ? 3 : 2;

    for (let i = 0; i < childCount; i += 1) {
      // -1..1 across the fan. childCount is never 1, so no divide-by-zero guard.
      const t = (i / (childCount - 1)) * 2 - 1;
      const jitter = (rand() * 2 - 1) * 8;
      let raw: number;
      let childLen: number;
      let childWidth: number;
      let childLeader = false;
      if (spine) {
        if (i === 1) {
          // The leader keeps going up; that is the whole cedar silhouette.
          raw = endAngle + jitter * 0.35;
          childLen = len * 0.78;
          childWidth = width * 0.72;
          childLeader = true;
        } else {
          // Side branches go out nearly flat, longer near the ground.
          raw = endAngle + t * (spread + 42) + jitter;
          childLen = len * 0.62 * (1 - 0.55 * (depth / maxDepth));
          childWidth = width * 0.5;
        }
      } else if (sp.form === 'conical') {
        // A tier keeps going outward with only a slight fan, so the cedar
        // reads as layered shelves rather than as a second crown.
        raw = endAngle + t * spread * 0.55 + jitter * 0.6;
        childLen = len * 0.66;
        childWidth = width * 0.66;
      } else {
        raw = endAngle + t * spread + jitter;
        childLen = len * sp.childLenRatio;
        childWidth = width * sp.childWidthRatio;
      }
      // Wilt rotates the tip toward straight down, more the further out it is.
      const droop = droopT * ((depth + 1) / maxDepth);
      const childAngle = raw + (90 - raw) * droop;
      recurse(x1, y1, childAngle, childLen, childWidth, depth + 1, childLeader);
    }

    if (depth === maxDepth - 1) emitLeaves(x1, y1, endAngle, depth);
  };

  /**
   * One curved trunk of segments and a crown of fronds. Fronds are ordinary
   * leaves with a big `size`; the renderer draws the shape.
   */
  const growPalm = (
    x0: number,
    y0: number,
    angle0: number,
    trunkLen: number,
    trunkWidth: number,
    depthBase: number,
  ) => {
    const segments = maxDepth === 0 ? 1 : Math.min(6, maxDepth + 1);
    const segLen = trunkLen / segments;
    let x = x0;
    let y = y0;
    let angle = angle0;
    let width = trunkWidth;
    for (let i = 0; i < segments; i += 1) {
      if (branches.length >= MAX_BRANCHES) return;
      // Bends onward in the direction of its own lean, segment after segment.
      const curve = (rand() * 2 - 1) * sp.curveAmp + (angle0 + 90) * 0.35;
      const endAngle = angle + curve;
      const midAngle = angle + curve * 0.5;
      const x1 = x + Math.cos(endAngle * DEG) * segLen;
      const y1 = y + Math.sin(endAngle * DEG) * segLen;
      branches.push({
        x0: x,
        y0: y,
        cx: x + Math.cos(midAngle * DEG) * segLen * 0.5,
        cy: y + Math.sin(midAngle * DEG) * segLen * 0.5,
        x1,
        y1,
        w0: width,
        w1: width * 0.9,
        depth: depthBase + i,
      });
      x = x1;
      y = y1;
      angle = endAngle;
      width *= 0.9;
    }

    const count = maxDepth === 0 ? 2 : 4 + Math.round(8 * growth);
    for (let i = 0; i < count; i += 1) {
      if (leaves.length >= MAX_LEAVES) return;
      const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      const jitter = (rand() * 2 - 1) * 8;
      const size = (2.2 + 2.6 * growth) * (0.85 + rand() * 0.3) * sp.leafSizeMul;
      const phase = rand();
      const hardiness = rand();
      let a = angle + t * 95 + jitter;
      // Wilt lets the fronds hang.
      a += (90 - a) * droopT * 0.6;
      leaves.push({
        x: x + Math.cos(a * DEG) * size * 0.3,
        y: y + Math.sin(a * DEG) * size * 0.3,
        angle: a,
        size,
        phase,
        hardiness,
        bloomOrder: leaves.length,
        depth: depthBase + segments - 1,
        visible: true,
        open: true,
      });
    }
  };

  const lean = (rand() * 2 - 1) * 6 * sp.leanMul;
  const trunkLen = (4 + 36 * growth) * sp.trunkLenMul;
  const trunkWidth = (0.8 + 6.2 * growth) * sp.trunkWidthMul;
  const grow = sp.form === 'palm' ? growPalm : recurse;
  grow(TRUNK_X, GROUND_Y, -90 + lean, trunkLen, trunkWidth, 0);

  if (hasTrait(level, 'twin')) {
    // Drawn after the main tree finishes so the main tree's shape never changes
    // when this unlocks - the user gains a second trunk, they do not get a
    // different tree.
    const side = rand() < 0.5 ? -1 : 1;
    grow(
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
  if (blossoming) {
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
      fruits.push({ x: leaf.x, y: leaf.y, size: Math.min(leaf.size, MAX_FRUIT_SIZE), index: i });
    }
  }

  // No random draw here, so it is always computed: whether a bird sits on it
  // is the renderer's business.
  let perch: { x: number; y: number } | null = null;
  if (visible.length > 0) {
    let best = visible[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const leaf of visible) {
      const d = (leaf.x - 62) ** 2 + (leaf.y - 40) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = leaf;
      }
    }
    perch = { x: best.x, y: best.y };
  }

  // Padded by a leaf's worth so the outermost canopy is never clipped; a frond
  // is drawn well past its anchor, so it pads by its own length.
  const bounds: TreeBounds = { minX: TRUNK_X, maxX: TRUNK_X, minY: GROUND_Y, maxY: GROUND_Y + GROUND_PAD };
  for (const branch of branches) {
    bounds.minX = Math.min(bounds.minX, branch.x0, branch.x1);
    bounds.maxX = Math.max(bounds.maxX, branch.x0, branch.x1);
    bounds.minY = Math.min(bounds.minY, branch.y0, branch.y1);
  }
  for (const leaf of visible) {
    const pad = sp.leafShape === 'frond' ? leaf.size * 2.8 : 3;
    bounds.minX = Math.min(bounds.minX, leaf.x - pad);
    bounds.maxX = Math.max(bounds.maxX, leaf.x + pad);
    bounds.minY = Math.min(bounds.minY, leaf.y - pad);
  }

  return {
    branches,
    leaves,
    blossoms,
    fruits,
    perch,
    bounds,
    traits: traitsForLevel(level),
    growth,
    maxDepth,
    level,
    frac,
    health,
    species,
    form: sp.form,
  };
}
