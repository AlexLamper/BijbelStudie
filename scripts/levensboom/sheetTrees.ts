import { generateTree, GROUND_Y, MIN_SCENE_HEIGHT, MIN_SCENE_WIDTH, TRUNK_X, type TreeScene } from '../../lib/levensboom/generate';
import type { Frame } from '../../lib/levensboom/camera';
import { renderSceneSvg } from '../../lib/levensboom/svg';
import { generateTreeV1, type TreeSceneV1 } from '../../lib/levensboom/v1/generateV1';
import type { Cell } from './sheetKit';

/**
 * Tree cells for the contact sheets: one place that decides how a sheet
 * renders a tree, so every sheet shows the same thing.
 *
 * - Summer, daytime, full health, the default scene (`waterbeken`).
 * - `level = floor(position)` and `frac = position - level`, so a whole step
 *   is drawn the moment it arrives (half its leaves still buds) - exactly
 *   what the product shows right after a level-up.
 * - Every leaf is drawn (no `maxLeaves` sampling), closest to the canvas.
 */

/** Fixed sheet seeds, shaped like the ObjectIds that seed real trees. */
export const SEEDS = ['65f0c1a2b3c4d5e6f7a81000', '65f0c1a2b3c4d5e6f7a82f1b', '65f0c1a2b3c4d5e6f7a84e36'] as const;

export const SCENE_ID = 'waterbeken';
/** No sampling: at most MAX_LEAVES exist anyway. */
const ALL_LEAVES = 10_000;

export const DASHBOARD = { width: 320, height: 200 } as const;

export function shortSeed(seed: string): string {
  return `…${seed.slice(-4)}`;
}

export type TreeCellInput = {
  seed: string;
  species: string;
  position: number;
  /** Structural step; defaults to floor(position). */
  step?: number;
  /** Drives traits and fruit; defaults to floor(position). */
  level?: number;
  width: number;
  height: number;
  scale: number;
  framing?: 'scene' | 'portrait';
  label?: string;
  note?: string;
  labelBelow?: boolean;
  disc?: boolean;
  accent?: boolean;
  slot?: number;
};

export function sceneAt(input: Pick<TreeCellInput, 'seed' | 'species' | 'position' | 'step' | 'level'>): TreeScene {
  const floorLevel = Math.max(1, Math.floor(input.position + 1e-9));
  const level = input.level ?? floorLevel;
  const frac = Math.min(1, Math.max(0, input.position - level));
  return generateTree({
    seed: input.seed,
    level,
    frac,
    health: 1,
    species: input.species,
    at: { position: input.position, step: input.step },
  });
}

/** A v2 tree as a sheet cell; also returns the scene for labels and counts. */
export function treeCell(input: TreeCellInput): { cell: Cell; scene: TreeScene } {
  const scene = sceneAt(input);
  const svg = renderSceneSvg(scene, {
    seed: input.seed,
    species: input.species,
    scene: SCENE_ID,
    season: 'summer',
    timeOfDay: 'day',
    health: 1,
    framing: input.framing ?? 'scene',
    width: input.width,
    height: input.height,
    maxLeaves: ALL_LEAVES,
  });
  return {
    scene,
    cell: {
      svg,
      width: input.width,
      height: input.height,
      scale: input.scale,
      label: input.label,
      note: input.note,
      labelBelow: input.labelBelow,
      disc: input.disc,
      accent: input.accent,
      slot: input.slot,
    },
  };
}

/** "312 t · 820 b": branches (takken) and visible leaves (bladeren). */
export function counts(scene: TreeScene): string {
  return `${scene.branches.length} t · ${scene.leaves.filter((leaf) => leaf.visible).length} b`;
}

/**
 * The v1 camera (svg.ts before growth v2): fit the tree's bounds to the frame,
 * but never frame less than 26 x 34 units, so a kiem stays small. Scene framing
 * only; the baseline sheet needs nothing else.
 */
function measureV1(width: number, height: number, scene: TreeSceneV1): Frame {
  const { minX, maxX, minY } = scene.bounds;
  const contentW = Math.max(1, maxX - minX);
  const treeH = Math.max(1, GROUND_Y - minY);
  const band = height * 0.12;
  const sceneW = Math.max(contentW, MIN_SCENE_WIDTH);
  const sceneH = Math.max(treeH, MIN_SCENE_HEIGHT);
  const scale = Math.min((width * 0.9) / sceneW, ((height - band) * 0.84) / sceneH);
  const groundTop = height - band;
  const pivotY = groundTop + 0.6 * scale;
  const originX = width / 2 - ((minX + maxX) / 2) * scale;
  const originY = pivotY - GROUND_Y * scale;
  return { scale, originX, originY, pivotX: originX + TRUNK_X * scale, pivotY, groundTop, guarded: false };
}

/** Today's (v1) tree, v1 camera, current renderer (v1 has no green wood: all bark). */
export function v1Cell(input: { seed: string; species: string; level: number; width: number; height: number; scale: number; label?: string }): Cell {
  const v1 = generateTreeV1({ seed: input.seed, level: input.level, frac: 0.5, health: 1, species: input.species });
  const scene = {
    branches: v1.branches.map((b) => ({ ...b, path: '', birth: 1, wood: 1 })),
    leaves: v1.leaves.map((leaf) => ({ ...leaf, path: '', birth: 1, kind: 'leaf' as const })),
    blossoms: v1.blossoms.map((o) => ({ ...o, path: '' })),
    fruits: v1.fruits.map((o) => ({ ...o, path: '' })),
    bounds: v1.bounds,
    growth: v1.growth,
    position: input.level,
  };
  const svg = renderSceneSvg(scene, {
    seed: input.seed,
    species: input.species,
    scene: SCENE_ID,
    season: 'summer',
    timeOfDay: 'day',
    health: 1,
    framing: 'scene',
    width: input.width,
    height: input.height,
    maxLeaves: ALL_LEAVES,
    frame: measureV1(input.width, input.height, v1),
  });
  return { svg, width: input.width, height: input.height, scale: input.scale, label: input.label };
}
