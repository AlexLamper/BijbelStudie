'use client';

import { useEffect, useMemo, useRef } from 'react';
import { GROUND_Y, type TreeScene } from '../../lib/levensboom/generate';
import { cachedTree, POSITION_BUCKET } from '../../lib/levensboom/sceneCache';
import { mix, paletteForNow, woodColor, type Palette, type TimeOfDay } from '../../lib/levensboom/palette';
import { seededRng } from '../../lib/levensboom/rng';
import { speciesParams, type LeafShape, type SpeciesId } from '../../lib/levensboom/species';
import { sceneSpec, type SceneId } from '../../lib/levensboom/scenes';
import { type AnimalId } from '../../lib/levensboom/catalog';
import type { GrowthFloor } from '../../lib/levensboom/growth';
import { measureFrame, type Frame as CameraFrame, type FrameExtents } from '../../lib/levensboom/camera';
import { lerpScenes, tweenEase, tweenMsFor } from '../../lib/levensboom/tween';
import {
  cotyledonColor,
  cotyledonShape,
  knotColors,
  leafFadeAlpha,
  matureDetails,
  mossColor,
  moundFor,
  portraitDiscFor,
  rootColor,
  trunkWidthOf,
  type MatureDetails,
} from '../../lib/levensboom/paint';

/**
 * The Levensboom, drawn to a canvas.
 *
 * Two layers, for a reason. The branches barely move, so they are rendered once
 * to an offscreen canvas and re-drawn each frame under a single small rotation
 * about the trunk base - that is the whole-canopy sway, for the cost of one
 * `drawImage`. Everything that has to move independently (leaves shimmering on
 * their own phase, fruit, animals, motes) is drawn live on top. Without the
 * split, a level-20 tree means re-tessellating ~300 tapered bezier outlines
 * sixty times a second for no visible gain.
 *
 * Two framings. `scene` is the landscape: sky, backdrop, a band of earth the
 * trunk stands *in*, animals. `portrait` is the avatar: the tree alone on a
 * sky disc, for the navbar and every other place a 28 px face has to read.
 * Both come from `lib/levensboom/camera.ts` (growth v2): the landscape stays
 * put and the tree takes a designed share of it, so growth shows as size.
 *
 * Growth v2 tween: with `from`, the canvas plays the tree growing from that
 * position to the current one - `lerpScenes` from `lib/levensboom/tween.ts`
 * each frame, with the camera measured on the in-between scene so it eases
 * along. The branch layer is rebuilt every frame while that runs, and only
 * then.
 *
 * The loop stops when the tab is hidden or the canvas scrolls out of view,
 * never starts at all under reduced motion or at avatar sizes, and species,
 * scene and animal never touch the generator - they are paint.
 */

const DEG = Math.PI / 180;
const SWAY_DEGREES = 0.85;
const MOTE_COUNT = 18;
const STAR_COUNT = 60;
const DRIFTER_COUNT = 14;
const FIREFLY_COUNT = 12;
/** Below this many CSS pixels a canvas is an avatar: one still frame, no loop. */
const STILL_BELOW_PX = 64;
/** The `seasons` trait (docs/levensboom-spec.md §6) arrives here. */
const SEASONS_TRAIT_LEVEL = 25;
/** A blossom's radius as a share of its (capped) leaf size times the leaf scale: smaller than a leaf. */
const BLOSSOM_RADIUS = 0.7;

export type TreeFraming = 'scene' | 'portrait';

export type TreeCanvasProps = {
  seed: string;
  level: number;
  /** xpIntoLevel / xpForNextLevel. */
  frac: number;
  /** 0.3..1; below 1 the tree droops and sheds. */
  health?: number;
  species?: SpeciesId | string | null;
  scene?: SceneId | string | null;
  animal?: AnimalId | string | null;
  framing?: TreeFraming;
  /**
   * 0..1. Below 1 the tree is mid grow-in, by depth.
   * @deprecated Growth v2 grows the tree with `from` instead; kept working
   * until every caller has moved over.
   */
  reveal?: number;
  reducedMotion?: boolean;
  /** Never animate, whatever the size. Tiles and thumbnails. */
  still?: boolean;
  className?: string;
  /** Overrides the device clock. Only the level-up dialog uses this (night). */
  palette?: Palette;
  /** Pins the scene's time of day instead of following the device clock. A display preference. */
  timeOfDay?: TimeOfDay | 'auto' | null;
  /** Adds the rising column of light motes the level-up sequence calls for. */
  celebration?: boolean;
  /** Index of a fruit to swell with a soft bloom, when a level-up unlocked one. */
  bloomFruit?: number | null;
  ariaLabel?: string;
  /** Growth v2: a legacy account's growth floor, from `levensboom.growth.floor`. */
  floor?: GrowthFloor | null;
  /**
   * Growth v2: tween from this earlier position to the current one (plan §9.2,
   * §9.3) - the level-up and the in-level lesson growth. Paths that exist in
   * both scenes lengthen in place, newborn wood grows out of its parent's tip,
   * the camera eases. Under reduced motion the end state shows at once.
   *
   * The tween plays once per distinct `from` (by value, so an inline object
   * is fine) and starts at the first paint. If only the target moves while it
   * runs, it retargets without restarting; once it has ended, a new target
   * just shows. `floor` left out means the current `floor`.
   */
  from?: { level: number; frac: number; floor?: GrowthFloor | null } | null;
  /** Tween length in ms; defaults to `TWEEN.levelUpMs` (1800) when the step changes, else `TWEEN.growMs` (1200). */
  tweenMs?: number;
  /**
   * Called once when the tween has finished - also when it was skipped
   * (reduced motion, `still`, avatar size) and when the canvas was off
   * screen for its whole length.
   */
  onTweenEnd?: () => void;
  /** Growth v2: render at this position instead of level/frac (ladder thumbnails, the dev page). */
  at?: { position: number; step?: number } | null;
};

type Mote = { x: number; y: number; r: number; speed: number; phase: number };
type Star = { x: number; y: number; r: number; phase: number };
/** Petals and falling leaves: same shape, different season. */
type Drifter = { x: number; y: number; size: number; speed: number; drift: number; phase: number };
type Firefly = { x: number; y: number; phase: number };
type Butterfly = { rx: number; ry: number; speed: number; phase: number; hue: number };
type Bee = { rx: number; ry: number; speed: number; phase: number };

type Decor = {
  motes: Mote[];
  stars: Star[];
  drifters: Drifter[];
  fireflies: Firefly[];
  butterflies: Butterfly[];
  bees: Bee[];
  /** Where on its circle the eagle starts. */
  eaglePhase: number;
  /** Backdrop details: stone/flower/olive positions, extra stars. 0..1 pairs. */
  dots: { x: number; y: number; r: number; k: number }[];
  /** Where the ground animals stand, in tree units left/right of the trunk. */
  sheep: [number, number];
  deer: number;
  fox: number;
  donkey: number;
  stork: number;
  lion: number;
  /**
   * Growth v2: where a perching bird waits while the tree has no twig that can
   * hold it (`scene.perch` null) - beside the trunk on the ground, or on a
   * small stone. Tree units; drawn last from the scene stream.
   */
  groundBird: { side: -1 | 1; distance: number; stone: boolean };
};

/** The camera plus the box it was measured for. */
type Frame = CameraFrame & { width: number; height: number };

/**
 * Bees and butterflies orbit the tree's bounds, but never tighter than this
 * (tree units), so they visit a seedling instead of swarming its bare stem.
 * The orbit's centre rises when the minimum applies, so it never dips into
 * the ground: centreY = min(boundsMidY, GROUND_Y − ry).
 */
const ORBIT_MIN = { rx: 9, ry: 7 };

const PERCHING = new Set(['vogel', 'duif', 'raaf', 'uil']);

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Perpendicular unit vector of (dx, dy). */
function normal(dx: number, dy: number): [number, number] {
  const length = Math.hypot(dx, dy) || 1;
  return [-dy / length, dx / length];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** How much of a branch at `depth` is grown, for the level-up sequence. */
function revealAt(reveal: number, depth: number, maxDepth: number): number {
  if (reveal >= 1) return 1;
  return Math.min(1, Math.max(0, reveal * (maxDepth + 1) - depth));
}

function buildDecor(seed: string): Decor {
  // Separate streams, so adding a mote can never shift the tree's own draws.
  const rand = seededRng(`${seed}:decor`);
  const motes: Mote[] = Array.from({ length: MOTE_COUNT }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    r: 0.25 + rand() * 0.45,
    speed: 0.6 + rand() * 1.2,
    phase: rand(),
  }));
  const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
    x: rand() * 100,
    y: rand() * 62,
    r: 0.15 + rand() * 0.3,
    phase: rand(),
  }));
  // Autumn's falling leaves and the level-25 blossom storm are the same
  // handful of drifters wearing different colours.
  const drifters: Drifter[] = Array.from({ length: DRIFTER_COUNT }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    size: 0.7 + rand() * 0.9,
    speed: 0.5 + rand() * 1.1,
    drift: 0.6 + rand() * 1.6,
    phase: rand(),
  }));
  const fireflies: Firefly[] = Array.from({ length: FIREFLY_COUNT }, () => ({
    x: rand(),
    y: rand(),
    phase: rand(),
  }));
  const butterflies: Butterfly[] = Array.from({ length: 3 }, (_, i) => ({
    rx: 0.55 + rand() * 0.35,
    ry: 0.35 + rand() * 0.3,
    speed: 0.7 + rand() * 0.6,
    phase: rand(),
    hue: i,
  }));
  // Appended after everything that existed before, so no older decor moved.
  const bees: Bee[] = Array.from({ length: 7 }, () => ({
    rx: 0.35 + rand() * 0.55,
    ry: 0.3 + rand() * 0.5,
    speed: 0.6 + rand() * 0.8,
    phase: rand(),
  }));
  const eaglePhase = rand();

  const scene = seededRng(`${seed}:scene`);
  const dots = Array.from({ length: 120 }, () => ({
    x: scene(),
    y: scene(),
    r: scene(),
    k: scene(),
  }));
  const sheep: [number, number] = [-(13 + scene() * 8), 11 + scene() * 7];
  const deer = 15 + scene() * 6;
  // Same rule: later animals draw after the earlier ones.
  const fox = -(12 + scene() * 6);
  const donkey = 14 + scene() * 6;
  const stork = 12 + scene() * 5;
  const lion = 15 + scene() * 5;
  // Growth v2, appended so nothing above moved: a bird on a tree too young to
  // perch on stands 6-11 units beside the trunk, on the ground or a stone.
  const groundBird = {
    side: (scene() < 0.5 ? -1 : 1) as -1 | 1,
    distance: 6 + scene() * 5,
    stone: scene() < 0.5,
  };

  return { motes, stars, drifters, fireflies, butterflies, bees, eaglePhase, dots, sheep, deer, fox, donkey, stork, lion, groundBird };
}

/**
 * The branch layer: root flare behind the trunk, the wood, then knots and moss
 * on the bark (`lib/levensboom/paint.ts` has their numbers). Each branch is lit
 * from the upper left, from its `wood` colour's lit tone to its own: bark
 * (barkLit → bark) for old wood, the green-stem mix for young wood.
 */
function drawBranches(
  ctx: CanvasRenderingContext2D,
  scene: TreeScene,
  palette: Palette,
  frame: Frame,
  reveal: number,
  mature: MatureDetails,
) {
  const { scale, originX, originY } = frame;
  const X = (x: number) => originX + x * scale;
  const Y = (y: number) => originY + y * scale;
  // Old details show once the trunk has grown in, never half-drawn.
  const trunkShown = revealAt(reveal, 0, scene.maxDepth) >= 1;

  if (trunkShown) {
    for (const foot of mature.roots) {
      ctx.fillStyle = rootColor(palette, foot.side);
      ctx.beginPath();
      ctx.moveTo(X(foot.top.x), Y(foot.top.y));
      ctx.quadraticCurveTo(X(foot.ctrl.x), Y(foot.ctrl.y), X(foot.toe.x), Y(foot.toe.y));
      ctx.lineTo(X(foot.toe.x), Y(foot.bottomY));
      ctx.lineTo(X(foot.baseX), Y(foot.bottomY));
      ctx.lineTo(X(foot.baseX), Y(foot.top.y));
      ctx.closePath();
      ctx.fill();
    }
  }

  // Wood colours per twentieth: a tree is a handful of distinct mixes.
  const lit = { leaf: palette.leafAlt, bark: palette.barkLit };
  const tones = new Map<number, [string, string]>();
  const toneOf = (wood: number): [string, string] => {
    const key = Math.round(Math.min(1, Math.max(0, wood)) * 20);
    let tone = tones.get(key);
    if (!tone) {
      tone = [woodColor(lit, key / 20), woodColor(palette, key / 20)];
      tones.set(key, tone);
    }
    return tone;
  };

  for (const branch of scene.branches) {
    const t = revealAt(reveal, branch.depth, scene.maxDepth);
    if (t <= 0) continue;
    // A newborn twig at the start of a tween has no length yet.
    if (branch.w0 <= 0 && branch.x1 === branch.x0 && branch.y1 === branch.y0) continue;

    const x0 = originX + branch.x0 * scale;
    const y0 = originY + branch.y0 * scale;
    const cx = originX + lerp(branch.x0, branch.cx, t) * scale;
    const cy = originY + lerp(branch.y0, branch.cy, t) * scale;
    const x1 = originX + lerp(branch.x0, branch.x1, t) * scale;
    const y1 = originY + lerp(branch.y0, branch.y1, t) * scale;

    const w0 = Math.max(0.6, (branch.w0 * scale) / 2);
    const w1 = Math.max(0.4, (branch.w1 * scale * t) / 2);

    const [n0x, n0y] = normal(cx - x0, cy - y0);
    const [n1x, n1y] = normal(x1 - cx, y1 - cy);
    const nmx = ((n0x + n1x) / 2) * ((w0 + w1) / 2);
    const nmy = ((n0y + n1y) / 2) * ((w0 + w1) / 2);

    ctx.beginPath();
    ctx.moveTo(x0 + n0x * w0, y0 + n0y * w0);
    ctx.quadraticCurveTo(cx + nmx, cy + nmy, x1 + n1x * w1, y1 + n1y * w1);
    ctx.lineTo(x1 - n1x * w1, y1 - n1y * w1);
    ctx.quadraticCurveTo(cx - nmx, cy - nmy, x0 - n0x * w0, y0 - n0y * w0);
    ctx.closePath();

    // Lit from the upper left, like the glow behind the canopy.
    const [light, base] = toneOf(branch.wood ?? 1);
    const gradient = ctx.createLinearGradient(x0 - w0, y0, x0 + w0, y0);
    gradient.addColorStop(0, light);
    gradient.addColorStop(1, base);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  if (!trunkShown) return;
  if (mature.knots.length > 0) {
    const { knot, rim } = knotColors(palette);
    for (const k of mature.knots) {
      const angle = k.angle * DEG;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.ellipse(X(k.x), Y(k.y), k.rx * 1.3 * scale, k.ry * 1.4 * scale, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = knot;
      ctx.beginPath();
      ctx.ellipse(X(k.x), Y(k.y), k.rx * scale, k.ry * scale, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (mature.moss.length > 0) {
    ctx.globalAlpha = 0.85;
    for (const tuft of mature.moss) {
      ctx.fillStyle = mossColor(palette, tuft.alt);
      ctx.beginPath();
      ctx.arc(X(tuft.x), Y(tuft.y), Math.max(0.5, tuft.r * scale), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** One leaf, at the origin, pointing along +x. `size` is already in pixels. */
function leafPath(ctx: CanvasRenderingContext2D, shape: LeafShape, size: number, scale: number, droop: [number, number]) {
  ctx.beginPath();
  switch (shape) {
    case 'narrow':
      ctx.ellipse(size * 0.7, 0, size * 1.3, size * 0.32, 0, 0, Math.PI * 2);
      break;
    case 'large':
      ctx.ellipse(size * 0.65, 0, size * 1.05, size * 0.85, 0, 0, Math.PI * 2);
      break;
    case 'almond':
      ctx.ellipse(size * 0.65, 0, size * 1.15, size * 0.42, 0, 0, Math.PI * 2);
      break;
    case 'lance':
      // The willow: long and thin, hanging from its stem.
      ctx.ellipse(size * 0.8, 0, size * 1.5, size * 0.22, 0, 0, Math.PI * 2);
      break;
    case 'scale':
      // The cypress: short, fat foliage that overlaps into a dense mass.
      ctx.ellipse(size * 0.45, 0, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
      break;
    case 'feather':
      // The acacia: a rib with tiny leaflets; the leaflets are strokes added
      // by the caller where there is room to see them.
      ctx.ellipse(size * 0.7, 0, size * 1.1, size * 0.3, 0, 0, Math.PI * 2);
      break;
    case 'needle': {
      // A tuft of needles. At avatar sizes a single stroke is all that
      // survives the downsample, so the fan collapses to three, then one.
      const length = size * 1.6;
      const fan = scale > 1.6 ? [-40, -20, 0, 20, 40] : scale > 1 ? [-30, 0, 30] : [0];
      for (const a of fan) {
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a * DEG) * length, Math.sin(a * DEG) * length);
      }
      break;
    }
    case 'frond': {
      // A long blade whose tip hangs toward the ground. `droop` is world-down
      // expressed in this leaf's rotated frame.
      const length = size * 3.2;
      const w = size * 0.42;
      const [dx, dy] = droop;
      const tipX = length + dx * length * 0.18;
      const tipY = dy * length * 0.26;
      ctx.moveTo(0, -w);
      ctx.quadraticCurveTo(length * 0.55, -w * 0.7 + tipY * 0.3, tipX, tipY);
      ctx.quadraticCurveTo(length * 0.55, w * 0.7 + tipY * 0.3, 0, w);
      ctx.closePath();
      break;
    }
    case 'oval':
    default:
      ctx.ellipse(size * 0.6, 0, size, size * 0.55, 0, 0, Math.PI * 2);
  }
}

function drawFruit(
  ctx: CanvasRenderingContext2D,
  style: ReturnType<typeof speciesParams>['fruitStyle'],
  x: number,
  y: number,
  size: number,
  palette: Palette,
) {
  ctx.fillStyle = palette.fruit;
  switch (style) {
    case 'olive':
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.75, size * 0.55, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'fig':
      ctx.beginPath();
      ctx.moveTo(x, y - size * 1.1);
      ctx.quadraticCurveTo(x + size * 1.15, y - size * 0.2, x + size * 0.55, y + size * 0.75);
      ctx.quadraticCurveTo(x, y + size * 1.05, x - size * 0.55, y + size * 0.75);
      ctx.quadraticCurveTo(x - size * 1.15, y - size * 0.2, x, y - size * 1.1);
      ctx.fill();
      break;
    case 'dates':
      for (const [ox, oy] of [
        [-0.5, 0.1],
        [0.5, 0.1],
        [0, 0.75],
      ]) {
        ctx.beginPath();
        ctx.ellipse(x + ox * size, y + oy * size, size * 0.42, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'almond':
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.5, size * 0.8, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'cone':
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.55, size * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.fruitAlt;
      ctx.lineWidth = Math.max(0.5, size * 0.12);
      ctx.beginPath();
      ctx.moveTo(x - size * 0.45, y - size * 0.25);
      ctx.lineTo(x + size * 0.45, y - size * 0.25);
      ctx.moveTo(x - size * 0.5, y + size * 0.2);
      ctx.lineTo(x + size * 0.5, y + size * 0.2);
      ctx.stroke();
      break;
    case 'apple':
      ctx.beginPath();
      ctx.arc(x, y, size * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.fruitAlt;
      ctx.lineWidth = Math.max(0.5, size * 0.14);
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.8);
      ctx.lineTo(x + size * 0.15, y - size * 1.25);
      ctx.stroke();
      break;
    case 'pomegranate':
      ctx.beginPath();
      ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
      ctx.fill();
      // The calyx crown on top.
      ctx.fillStyle = palette.fruitAlt;
      ctx.beginPath();
      ctx.moveTo(x - size * 0.3, y - size * 0.75);
      ctx.lineTo(x - size * 0.35, y - size * 1.15);
      ctx.lineTo(x, y - size * 0.95);
      ctx.lineTo(x + size * 0.35, y - size * 1.15);
      ctx.lineTo(x + size * 0.3, y - size * 0.75);
      ctx.closePath();
      ctx.fill();
      break;
    case 'catkin':
      ctx.beginPath();
      ctx.ellipse(x, y + size * 0.5, size * 0.32, size * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.fruitAlt;
      for (const [ox, oy] of [
        [-0.12, 0.1],
        [0.14, 0.55],
        [-0.1, 1.0],
      ]) {
        ctx.beginPath();
        ctx.arc(x + ox * size, y + oy * size, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'pod':
      // A hanging, curved seed pod with a seam.
      ctx.strokeStyle = palette.fruit;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(0.8, size * 0.4);
      ctx.beginPath();
      ctx.moveTo(x - size * 0.5, y - size * 0.3);
      ctx.quadraticCurveTo(x + size * 0.1, y + size * 1.2, x + size * 0.7, y + size * 0.9);
      ctx.stroke();
      ctx.strokeStyle = palette.fruitAlt;
      ctx.lineWidth = Math.max(0.4, size * 0.1);
      ctx.stroke();
      break;
    case 'berry':
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - size * 0.4, y + size * 0.45, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.fruitAlt;
      ctx.beginPath();
      ctx.arc(x + size * 0.55, y + size * 0.35, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'acorn':
    default:
      ctx.beginPath();
      ctx.ellipse(x, y + size * 0.15, size * 0.7, size * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.fruitAlt;
      ctx.beginPath();
      ctx.ellipse(x, y - size * 0.45, size * 0.8, size * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
  }
  // One highlight dot: enough to read as round rather than as a sticker.
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = palette.light;
  ctx.beginPath();
  ctx.arc(x - size * 0.3, y - size * 0.35, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ---------------------------------------------------------------- backdrops */

function hillPath(ctx: CanvasRenderingContext2D, width: number, baseY: number, amp: number, freq: number, phase: number, lift: number) {
  ctx.beginPath();
  ctx.moveTo(0, baseY + amp * 2);
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * width;
    const y = baseY - lift - amp * (0.5 + 0.5 * Math.sin((i / steps) * freq * Math.PI * 2 + phase));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, baseY + amp * 2);
  ctx.closePath();
}

/** A wavy line across the frame: sea swell, the shore's foam. */
function wavePath(ctx: CanvasRenderingContext2D, width: number, y: number, amp: number, count: number, shift: number) {
  ctx.beginPath();
  const step = width / count;
  ctx.moveTo(-step + shift, y);
  for (let i = -1; i <= count; i += 1) {
    const x = i * step + shift;
    ctx.quadraticCurveTo(x + step * 0.5, y - amp, x + step, y);
  }
}

function drawFarBackdrop(ctx: CanvasRenderingContext2D, palette: Palette, decor: Decor, frame: Frame, t: number, still: boolean) {
  const { width: w, height: h, groundTop } = frame;
  const spec = sceneSpec(palette.scene);
  switch (spec.backdrop) {
    case 'river': {
      // Far bank and hills, then the river itself between them and the near
      // bank the tree stands on - the reader is on the Jordan's shore.
      ctx.fillStyle = palette.farAlt;
      hillPath(ctx, w, groundTop, h * 0.08, 1.4, 0.6, h * 0.04);
      ctx.fill();
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, groundTop, h * 0.05, 2.3, 2.9, 0);
      ctx.fill();
      const top = groundTop - h * 0.085;
      ctx.fillStyle = palette.water ?? palette.far;
      ctx.fillRect(0, top, w, groundTop - top);
      ctx.strokeStyle = palette.light;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, h * 0.003);
      for (let i = 0; i < 5; i += 1) {
        const d = decor.dots[50 + i];
        const y = top + (0.2 + d.y * 0.6) * (groundTop - top);
        const drift = still ? 0 : Math.sin(t * 0.0006 + d.k * 6.283) * w * 0.01;
        ctx.beginPath();
        ctx.moveTo(d.x * w - w * 0.04 * (0.5 + d.r) + drift, y);
        ctx.lineTo(d.x * w + w * 0.04 * (0.5 + d.r) + drift, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'vineyard': {
      ctx.fillStyle = palette.farAlt;
      hillPath(ctx, w, groundTop, h * 0.08, 1.4, 0.6, h * 0.04);
      ctx.fill();
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, groundTop, h * 0.05, 2.3, 2.9, 0);
      ctx.fill();
      // Rows of vines on posts, smaller as they recede up the hill.
      for (let row = 0; row < 4; row += 1) {
        const perspective = 1 - row * 0.18;
        const y = groundTop - h * (0.015 + row * 0.03);
        const step = w * 0.07 * perspective;
        const offset = step * (row % 2 === 0 ? 0.25 : 0.6);
        let k = 0;
        for (let x = offset; x < w; x += step, k += 1) {
          const d = decor.dots[(row * 17 + k) % 120];
          ctx.strokeStyle = palette.groundDeep;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = Math.max(0.7, w * 0.004 * perspective);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - h * 0.03 * perspective);
          ctx.stroke();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = palette.farAlt;
          ctx.beginPath();
          ctx.ellipse(x, y - h * 0.028 * perspective, Math.max(1.5, w * 0.022 * perspective), Math.max(1, h * 0.014 * perspective), 0, 0, Math.PI * 2);
          ctx.fill();
          if (d.k > 0.5) {
            ctx.fillStyle = spec.accent;
            ctx.beginPath();
            ctx.arc(x + (d.x - 0.5) * w * 0.02, y - h * 0.018 * perspective, Math.max(0.6, w * 0.004 * perspective), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'field': {
      ctx.fillStyle = palette.farAlt;
      hillPath(ctx, w, groundTop, h * 0.06, 1.1, 1.9, h * 0.03);
      ctx.fill();
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, groundTop, h * 0.04, 1.9, 4.1, 0);
      ctx.fill();
      break;
    }
    case 'sea': {
      const horizon = groundTop - h * 0.16;
      ctx.fillStyle = palette.water ?? palette.far;
      ctx.fillRect(0, horizon, w, groundTop - horizon);
      // Swell: rows of low scallops, drifting sideways.
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = Math.max(1, h * 0.004);
      for (let i = 0; i < 5; i += 1) {
        const y = horizon + (0.18 + i * 0.17) * (groundTop - horizon);
        const count = 9 + i * 2;
        const shift = still ? 0 : ((t * 0.012 * (1 + i * 0.2)) % (w / count)) - w / count;
        ctx.globalAlpha = 0.2 + i * 0.07;
        wavePath(ctx, w, y, h * 0.006 * (1 + i * 0.3), count, shift);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'rainbow': {
      // The bow: six bands on a centre below the horizon; the earth band
      // covers the part that would run under the ground.
      const cx = w * 0.62;
      const cy = groundTop + h * 0.32;
      const r = h * 0.78;
      const band = Math.max(1.5, h * 0.014);
      const colours = ['#E4483F', '#F0933A', '#F2D24A', '#6DBA5C', '#4E9CD6', '#7A5FB8'];
      ctx.lineWidth = band;
      ctx.globalAlpha = 0.5;
      colours.forEach((colour, i) => {
        ctx.strokeStyle = colour;
        ctx.beginPath();
        ctx.arc(cx, cy, r - i * band, Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, groundTop, h * 0.04, 1.2, 1.1, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'sunrise': {
      const sx = w * 0.5;
      const sy = groundTop - h * 0.1;
      const sr = Math.max(6, w * 0.09);
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 3);
      halo.addColorStop(0, `${palette.glow}66`);
      halo.addColorStop(1, `${palette.glow}00`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, groundTop);
      // Rays, turning very slowly.
      ctx.strokeStyle = spec.accent;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = Math.max(1, w * 0.006);
      const turn = still ? 0 : t * 0.00008;
      for (let i = 0; i < 9; i += 1) {
        const a = Math.PI + (i / 8) * Math.PI + turn;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * sr * 1.15, sy + Math.sin(a) * sr * 1.15);
        ctx.lineTo(sx + Math.cos(a) * sr * 2.4, sy + Math.sin(a) * sr * 2.4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.farAlt;
      hillPath(ctx, w, groundTop, h * 0.1, 1.2, 0.4, h * 0.05);
      ctx.fill();
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, groundTop, h * 0.06, 2.0, 2.4, 0);
      ctx.fill();
      break;
    }
    case 'shepherds': {
      // One bright star over the fields, and a flock on the near hill.
      const sx = w * 0.72;
      const sy = h * 0.14;
      const sr = Math.max(3, w * 0.02);
      const twinkle = still ? 1 : 0.92 + 0.08 * Math.sin(t * 0.002);
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 5);
      halo.addColorStop(0, `${spec.accent}55`);
      halo.addColorStop(1, `${spec.accent}00`);
      ctx.fillStyle = halo;
      ctx.fillRect(sx - sr * 5, sy - sr * 5, sr * 10, sr * 10);
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.moveTo(sx, sy - sr * 3 * twinkle);
      ctx.lineTo(sx + sr * 0.3, sy);
      ctx.lineTo(sx, sy + sr * 3 * twinkle);
      ctx.lineTo(sx - sr * 0.3, sy);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx - sr * 2.2 * twinkle, sy);
      ctx.lineTo(sx, sy - sr * 0.3);
      ctx.lineTo(sx + sr * 2.2 * twinkle, sy);
      ctx.lineTo(sx, sy + sr * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = palette.farAlt;
      hillPath(ctx, w, groundTop, h * 0.09, 1.1, 1.5, h * 0.04);
      ctx.fill();
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, groundTop, h * 0.05, 1.8, 3.6, 0);
      ctx.fill();
      ctx.fillStyle = palette.light;
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 5; i += 1) {
        const d = decor.dots[70 + i];
        ctx.beginPath();
        ctx.ellipse(w * (0.08 + d.x * 0.84), groundTop - h * 0.012 - d.y * h * 0.03, Math.max(1.2, w * 0.008), Math.max(0.8, w * 0.005), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'hills': {
      ctx.fillStyle = palette.farAlt;
      hillPath(ctx, w, groundTop, h * 0.09, 1.3, 0.8, h * 0.05);
      ctx.fill();
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, groundTop, h * 0.06, 2.1, 2.6, h * 0.0);
      ctx.fill();
      // Olive groves: dark specks along the near hill.
      ctx.fillStyle = spec.accent;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < 9; i += 1) {
        const d = decor.dots[i];
        const x = d.x * w;
        const y = groundTop - h * 0.02 - d.y * h * 0.05;
        ctx.beginPath();
        ctx.ellipse(x, y, Math.max(1.2, w * 0.012), Math.max(1, w * 0.008), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'lake': {
      const horizon = groundTop - h * 0.14;
      // Far shore.
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, horizon, h * 0.045, 1.6, 1.2, 0);
      ctx.fill();
      // Water, with a few light streaks.
      ctx.fillStyle = palette.water ?? palette.far;
      ctx.fillRect(0, horizon, w, groundTop - horizon);
      ctx.strokeStyle = spec.accent;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(1, h * 0.004);
      for (let i = 0; i < 5; i += 1) {
        const d = decor.dots[i + 10];
        const y = horizon + (0.2 + d.y * 0.7) * (groundTop - horizon);
        const x = d.x * w;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.05 * (0.5 + d.r), y);
        ctx.lineTo(x + w * 0.05 * (0.5 + d.r), y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // The boat.
      const bx = w * 0.74;
      const by = horizon + (groundTop - horizon) * 0.3;
      const bw = Math.max(8, w * 0.06);
      ctx.fillStyle = palette.bark;
      ctx.beginPath();
      ctx.moveTo(bx - bw / 2, by);
      ctx.lineTo(bx + bw / 2, by);
      ctx.lineTo(bx + bw * 0.35, by + bw * 0.22);
      ctx.lineTo(bx - bw * 0.35, by + bw * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = palette.bark;
      ctx.lineWidth = Math.max(1, bw * 0.05);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - bw * 0.7);
      ctx.stroke();
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.moveTo(bx + bw * 0.03, by - bw * 0.68);
      ctx.lineTo(bx + bw * 0.42, by - bw * 0.08);
      ctx.lineTo(bx + bw * 0.03, by - bw * 0.08);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'dunes': {
      ctx.fillStyle = palette.farAlt;
      hillPath(ctx, w, groundTop, h * 0.1, 0.9, 2.2, h * 0.03);
      ctx.fill();
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, groundTop, h * 0.07, 1.4, 4.4, 0);
      ctx.fill();
      break;
    }
    case 'mountain': {
      const peaks: [number, number][] = [
        [-0.05, 0.12],
        [0.08, 0.3],
        [0.24, 0.42],
        [0.4, 0.26],
        [0.58, 0.48],
        [0.74, 0.3],
        [0.9, 0.38],
        [1.05, 0.14],
      ];
      ctx.fillStyle = palette.far;
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, groundTop);
      for (const [px, py] of peaks) ctx.lineTo(px * w, groundTop - py * h);
      ctx.lineTo(w * 1.1, groundTop);
      ctx.closePath();
      ctx.fill();
      // Snow on the two tallest peaks.
      ctx.fillStyle = spec.accent;
      for (const [px, py] of [peaks[2], peaks[4]]) {
        const top = groundTop - py * h;
        const cap = h * 0.06;
        ctx.beginPath();
        ctx.moveTo(px * w, top);
        ctx.lineTo(px * w + cap * 0.9, top + cap);
        ctx.lineTo(px * w + cap * 0.3, top + cap * 0.8);
        ctx.lineTo(px * w - cap * 0.2, top + cap * 1.05);
        ctx.lineTo(px * w - cap * 0.9, top + cap);
        ctx.closePath();
        ctx.fill();
      }
      // A nearer, lower slope.
      ctx.fillStyle = palette.farAlt;
      hillPath(ctx, w, groundTop, h * 0.07, 1.1, 3.4, 0);
      ctx.fill();
      break;
    }
    case 'wall': {
      const wallTop = groundTop - h * 0.17;
      ctx.fillStyle = palette.far;
      ctx.fillRect(0, wallTop, w, groundTop - wallTop);
      // Merlons along the top.
      const step = w * 0.07;
      const mw = step * 0.5;
      const mh = h * 0.035;
      for (let x = step * 0.25; x < w; x += step) ctx.fillRect(x, wallTop - mh, mw, mh + 1);
      // A tower on the right.
      const tx = w * 0.78;
      const tw = w * 0.12;
      const towerTop = groundTop - h * 0.3;
      ctx.fillRect(tx, towerTop, tw, groundTop - towerTop);
      for (let x = tx; x < tx + tw; x += tw / 4) ctx.fillRect(x, towerTop - mh, tw / 8, mh + 1);
      // Stone courses.
      ctx.strokeStyle = palette.farAlt;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i += 1) {
        const y = wallTop + ((groundTop - wallTop) * i) / 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // The gate.
      const gx = w * 0.28;
      const gw = w * 0.06;
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.moveTo(gx - gw / 2, groundTop);
      ctx.lineTo(gx - gw / 2, groundTop - h * 0.07);
      ctx.arc(gx, groundTop - h * 0.07, gw / 2, Math.PI, 0);
      ctx.lineTo(gx + gw / 2, groundTop);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'garden': {
      ctx.fillStyle = palette.farAlt;
      hillPath(ctx, w, groundTop, h * 0.08, 1.7, 0.4, h * 0.03);
      ctx.fill();
      ctx.fillStyle = palette.far;
      hillPath(ctx, w, groundTop, h * 0.05, 3.2, 1.9, 0);
      ctx.fill();
      break;
    }
    case 'stars': {
      // A denser field than the default night sky, plus the milky way.
      ctx.fillStyle = palette.light;
      for (let i = 0; i < 90; i += 1) {
        const d = decor.dots[i];
        ctx.globalAlpha = 0.35 + 0.6 * d.k;
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * groundTop * 0.95, Math.max(0.4, d.r * w * 0.0035), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const band = ctx.createLinearGradient(0, 0, w, groundTop);
      band.addColorStop(0.3, `${palette.light}00`);
      band.addColorStop(0.5, `${palette.light}22`);
      band.addColorStop(0.7, `${palette.light}00`);
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, w, groundTop);
      // The moon.
      const mx = w * 0.18;
      const my = h * 0.16;
      const mr = Math.max(4, w * 0.035);
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.skyTop;
      ctx.beginPath();
      ctx.arc(mx + mr * 0.45, my - mr * 0.15, mr * 0.85, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'meadow':
    default: {
      ctx.fillStyle = palette.far;
      ctx.globalAlpha = 0.55;
      hillPath(ctx, w, groundTop, h * 0.04, 1.2, 1.1, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

/** Details that sit on the earth band: the stream, the pool, flowers, stones. */
function drawNearBackdrop(ctx: CanvasRenderingContext2D, palette: Palette, decor: Decor, frame: Frame, t: number, still: boolean) {
  const { width: w, height: h, groundTop } = frame;
  const band = h - groundTop;
  const spec = sceneSpec(palette.scene);
  switch (spec.backdrop) {
    case 'river': {
      // Reeds along the near bank, swaying at the head.
      for (let i = 0; i < 10; i += 1) {
        const d = decor.dots[54 + i];
        const x = w * (0.03 + d.x * 0.94);
        const base = groundTop + band * (0.5 + d.y * 0.45);
        const top = base - band * (0.5 + d.r * 0.35);
        const sway = still ? 0 : Math.sin(t * 0.0015 + d.k * 6.283) * band * 0.04;
        ctx.strokeStyle = palette.groundDeep;
        ctx.lineWidth = Math.max(0.8, band * 0.03);
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.quadraticCurveTo(x, (base + top) / 2, x + sway, top);
        ctx.stroke();
        ctx.fillStyle = spec.accent;
        ctx.beginPath();
        ctx.ellipse(x + sway, top - band * 0.06, Math.max(1, band * 0.03), Math.max(2, band * 0.09), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'field': {
      // Standing wheat, heads nodding in the wind.
      for (let i = 0; i < 22; i += 1) {
        const d = decor.dots[60 + i];
        const x = w * (0.02 + d.x * 0.96);
        const base = groundTop + band * (0.35 + d.y * 0.6);
        const top = base - band * (0.5 + d.r * 0.4);
        const sway = still ? 0 : Math.sin(t * 0.0013 + d.k * 6.283) * band * 0.05;
        ctx.strokeStyle = palette.groundDeep;
        ctx.lineWidth = Math.max(0.8, band * 0.025);
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.quadraticCurveTo(x, (base + top) / 2, x + sway, top);
        ctx.stroke();
        ctx.fillStyle = spec.accent;
        ctx.beginPath();
        ctx.ellipse(x + sway, top - band * 0.08, Math.max(1, band * 0.035), Math.max(2, band * 0.11), sway / band, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'sea': {
      // Foam where the last wave reaches the sand.
      ctx.strokeStyle = spec.accent;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = Math.max(1.5, band * 0.06);
      const shift = still ? 0 : Math.sin(t * 0.0009) * w * 0.01;
      wavePath(ctx, w, groundTop + band * 0.04, band * 0.05, 11, shift);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Two shells.
      ctx.fillStyle = palette.light;
      for (let i = 0; i < 2; i += 1) {
        const d = decor.dots[44 + i];
        ctx.beginPath();
        ctx.ellipse(w * (0.1 + d.x * 0.8), groundTop + band * (0.45 + d.y * 0.4), Math.max(1.2, w * 0.008), Math.max(1, w * 0.006), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'vineyard':
    case 'rainbow':
    case 'sunrise':
    case 'shepherds':
    case 'meadow': {
      if (!palette.water) break;
      // The stream: enters at the right, widens toward the viewer.
      ctx.fillStyle = palette.water;
      ctx.beginPath();
      ctx.moveTo(w * 0.66, groundTop);
      ctx.quadraticCurveTo(w * 0.72, groundTop + band * 0.45, w * 0.98, groundTop + band * 0.75);
      ctx.lineTo(w * 1.02, h);
      ctx.lineTo(w * 0.84, h);
      ctx.quadraticCurveTo(w * 0.7, groundTop + band * 0.55, w * 0.7, groundTop);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = spec.accent;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1, band * 0.04);
      ctx.beginPath();
      ctx.moveTo(w * 0.7, groundTop + band * 0.2);
      ctx.quadraticCurveTo(w * 0.76, groundTop + band * 0.5, w * 0.9, groundTop + band * 0.7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Stones on the bank.
      ctx.fillStyle = palette.farAlt;
      for (let i = 0; i < 4; i += 1) {
        const d = decor.dots[20 + i];
        ctx.beginPath();
        ctx.ellipse(w * (0.05 + d.x * 0.5), groundTop + band * (0.3 + d.y * 0.5), Math.max(1.5, w * 0.012 * (0.5 + d.r)), Math.max(1, w * 0.007 * (0.5 + d.r)), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'dunes': {
      if (!palette.water) break;
      const px = w * 0.2;
      const py = groundTop + band * 0.45;
      ctx.fillStyle = palette.water;
      ctx.beginPath();
      ctx.ellipse(px, py, w * 0.13, band * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = spec.accent;
      ctx.globalAlpha = 0.8;
      for (const ox of [-1.15, 1.1]) {
        ctx.beginPath();
        ctx.ellipse(px + ox * w * 0.13, py - band * 0.05, Math.max(2, w * 0.02), Math.max(1.5, band * 0.16), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'garden': {
      if (palette.water) {
        ctx.fillStyle = palette.water;
        ctx.beginPath();
        ctx.moveTo(-w * 0.02, groundTop + band * 0.35);
        ctx.quadraticCurveTo(w * 0.18, groundTop + band * 0.2, w * 0.3, groundTop + band * 0.8);
        ctx.lineTo(w * 0.22, h);
        ctx.lineTo(-w * 0.02, h);
        ctx.closePath();
        ctx.fill();
      }
      const colours = [spec.accent, '#F5D76E', '#FFFFFF', '#F28C6B'];
      for (let i = 0; i < 16; i += 1) {
        const d = decor.dots[30 + i];
        const x = w * (0.32 + d.x * 0.66);
        const y = groundTop + band * (0.15 + d.y * 0.7);
        const r = Math.max(1.2, w * 0.006 * (0.7 + d.r));
        ctx.strokeStyle = palette.groundDeep;
        ctx.lineWidth = Math.max(0.8, r * 0.4);
        ctx.beginPath();
        ctx.moveTo(x, y + r * 2.4);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = colours[Math.floor(d.k * colours.length) % colours.length];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'mountain':
    case 'wall':
    case 'hills':
    case 'lake': {
      ctx.fillStyle = palette.farAlt;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i += 1) {
        const d = decor.dots[40 + i];
        ctx.beginPath();
        ctx.ellipse(w * (0.05 + d.x * 0.9), groundTop + band * (0.35 + d.y * 0.45), Math.max(1.5, w * 0.014 * (0.5 + d.r)), Math.max(1, w * 0.008 * (0.5 + d.r)), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    default:
      break;
  }
}

/* ----------------------------------------------------------------- animals */

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, colour: string) {
  const s = Math.max(2, 2.6 * scale);
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1, 0.45 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y);
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y);
  ctx.stroke();
}

type PerchBirdColours = { body: string; wing: string; beak: string; eye: string };

const DOVE: PerchBirdColours = { body: '#F4F4F0', wing: '#E2E2D8', beak: '#E0A458', eye: '#2B2B2B' };
const RAVEN: PerchBirdColours = { body: '#26262B', wing: '#3A3A42', beak: '#5A5A60', eye: '#DADAE0' };

/** The dove and the raven: one bird, two coats. */
function drawPerchBird(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, still: boolean, c: PerchBirdColours) {
  const s = Math.max(2.5, 2.4 * scale);
  const flap = still ? 0 : Math.sin(t * 0.004) * 0.25;
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.4, s, s * 0.55, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Tail.
  ctx.beginPath();
  ctx.moveTo(x - s * 0.8, y - s * 0.3);
  ctx.lineTo(x - s * 1.5, y - s * 0.05);
  ctx.lineTo(x - s * 1.35, y - s * 0.55);
  ctx.closePath();
  ctx.fill();
  // Head.
  ctx.beginPath();
  ctx.arc(x + s * 0.85, y - s * 0.8, s * 0.38, 0, Math.PI * 2);
  ctx.fill();
  // Wing.
  ctx.fillStyle = c.wing;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, y - s * 0.55);
  ctx.quadraticCurveTo(x - s * 0.2, y - s * (1.35 + flap), x + s * 0.7, y - s * (1.05 + flap));
  ctx.lineTo(x + s * 0.4, y - s * 0.45);
  ctx.closePath();
  ctx.fill();
  // Beak and eye.
  ctx.fillStyle = c.beak;
  ctx.beginPath();
  ctx.moveTo(x + s * 1.2, y - s * 0.82);
  ctx.lineTo(x + s * 1.5, y - s * 0.72);
  ctx.lineTo(x + s * 1.18, y - s * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.eye;
  ctx.beginPath();
  ctx.arc(x + s * 0.95, y - s * 0.86, Math.max(0.5, s * 0.08), 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A perching bird on the ground beside a tree too young to hold it (growth v2,
 * plan §4.7): feet on the earth line or on a small stone, facing the trunk.
 * The `vogel` is drawn as a small songbird here - its flying "v" belongs in a
 * crown, not on the ground.
 *
 * Stone: an upper half-ellipse, radii (1.4, 0.8) tree units (at least 2 × 1.2
 * px), in mix(farAlt, groundDeep, 0.35) with a lit cap mix(stone, light, 0.25)
 * of radii (0.8, 0.35) at its top; the bird stands on its crown. Songbird: the
 * dove/raven body at 0.75 of their size, coat body mix(barkLit, light, 0.3),
 * wing bark, the dove's beak and eye.
 */
function drawGroundBird(
  ctx: CanvasRenderingContext2D,
  animal: string,
  decor: Decor,
  frame: Frame,
  groundY: number,
  t: number,
  still: boolean,
  palette: Palette,
) {
  const { scale, pivotX } = frame;
  const spot = decor.groundBird;
  const x = pivotX + spot.side * spot.distance * scale;
  let y = groundY;
  if (spot.stone) {
    const rx = Math.max(2, 1.4 * scale);
    const ry = Math.max(1.2, 0.8 * scale);
    const stone = mix(palette.farAlt, palette.groundDeep, 0.35);
    ctx.fillStyle = stone;
    ctx.beginPath();
    ctx.ellipse(x, groundY, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mix(stone, palette.light, 0.25);
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.15, groundY - ry * 0.72, Math.max(1, 0.8 * scale), Math.max(0.5, 0.35 * scale), 0, 0, Math.PI * 2);
    ctx.fill();
    y = groundY - ry;
  }
  ctx.save();
  ctx.translate(x, y);
  // Every bird is drawn facing right; turn the one on the right to face the trunk.
  if (spot.side > 0) ctx.scale(-1, 1);
  if (animal === 'duif') drawPerchBird(ctx, 0, 0, scale, t, still, DOVE);
  else if (animal === 'raaf') drawPerchBird(ctx, 0, 0, scale, t, still, RAVEN);
  else if (animal === 'uil') drawOwl(ctx, 0, 0, scale, t, still, palette.night);
  else
    drawPerchBird(ctx, 0, 0, scale * 0.75, t, still, {
      body: mix(palette.barkLit, palette.light, 0.3),
      wing: palette.bark,
      beak: DOVE.beak,
      eye: DOVE.eye,
    });
  ctx.restore();
}

/** Asleep by day, eyes open at night - with the odd blink. */
function drawOwl(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, still: boolean, night: boolean) {
  const s = Math.max(2.5, 2.2 * scale);
  const brown = '#8A6A48';
  const face = '#D9C4A0';
  const dark = '#4A3A28';
  const awake = night && (still || Math.sin(t * 0.0009) < 0.97);
  ctx.fillStyle = brown;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.7, s * 0.7, s * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ear tufts.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * s * 0.5, y - s * 1.55);
    ctx.lineTo(x + side * s * 0.6, y - s * 2.05);
    ctx.lineTo(x + side * s * 0.2, y - s * 1.65);
    ctx.closePath();
    ctx.fill();
  }
  // Folded wings.
  ctx.fillStyle = dark;
  ctx.globalAlpha = 0.35;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * s * 0.45, y - s * 0.6, s * 0.25, s * 0.55, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Face.
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 1.2, s * 0.55, s * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    const ex = x + side * s * 0.22;
    const ey = y - s * 1.22;
    if (awake) {
      ctx.fillStyle = '#F2C14E';
      ctx.beginPath();
      ctx.arc(ex, ey, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(ex, ey, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = dark;
      ctx.lineWidth = Math.max(0.6, s * 0.06);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, ey - s * 0.04, s * 0.14, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }
  // Beak.
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.07, y - s * 1.08);
  ctx.lineTo(x + s * 0.07, y - s * 1.08);
  ctx.lineTo(x, y - s * 0.94);
  ctx.closePath();
  ctx.fill();
}

/** Sitting on the left of the trunk, looking at it. */
function drawFox(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, still: boolean) {
  const s = Math.max(3, 1.7 * scale);
  const body = '#D2692E';
  const dark = '#8E4A1E';
  const cream = '#F4EDE2';
  const wag = still ? 0 : Math.sin(t * 0.002) * 0.08;
  // The tail curls round the front.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x - s * 1.1, y - s * 0.45, s * 1.3, s * 0.5, -0.5 + wag, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.arc(x - s * 2.1, y - s * 0.85, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Body, chest.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 1.0, s * 0.85, s * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(x + s * 0.25, y - s * 0.75, s * 0.4, s * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head and ears.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x + s * 0.35, y - s * 2.05, s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.05, y - s * 2.4);
  ctx.lineTo(x + s * 0.2, y - s * 3.0);
  ctx.lineTo(x + s * 0.45, y - s * 2.45);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y - s * 2.45);
  ctx.lineTo(x + s * 0.75, y - s * 3.0);
  ctx.lineTo(x + s * 0.85, y - s * 2.35);
  ctx.closePath();
  ctx.fill();
  // Snout, nose, eye, paws.
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(x + s * 0.7, y - s * 1.95, s * 0.35, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(x + s * 0.98, y - s * 1.97, Math.max(0.5, s * 0.08), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.5, y - s * 2.15, Math.max(0.5, s * 0.07), 0, Math.PI * 2);
  ctx.fill();
  for (const px of [0.35, 0.75]) {
    ctx.beginPath();
    ctx.ellipse(x + s * px, y - s * 0.05, s * 0.22, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Standing on the right, facing the tree. */
function drawDonkey(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, still: boolean) {
  const s = Math.max(3, 1.9 * scale);
  const grey = '#8C8A86';
  const dark = '#5E5C58';
  const light = '#C9C4BB';
  const flick = still ? 0 : Math.max(0, Math.sin(t * 0.003)) * 0.3;
  ctx.strokeStyle = dark;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, s * 0.2);
  for (const lx of [-0.95, -0.5, 0.5, 0.95]) {
    ctx.beginPath();
    ctx.moveTo(x + lx * s, y - s * 1.05);
    ctx.lineTo(x + lx * s, y);
    ctx.stroke();
  }
  ctx.fillStyle = grey;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 1.45, s * 1.5, s * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  // Neck, head, muzzle.
  ctx.strokeStyle = grey;
  ctx.lineWidth = Math.max(1.5, s * 0.5);
  ctx.beginPath();
  ctx.moveTo(x - s * 1.2, y - s * 1.7);
  ctx.lineTo(x - s * 1.75, y - s * 2.55);
  ctx.stroke();
  ctx.fillStyle = grey;
  ctx.beginPath();
  ctx.ellipse(x - s * 1.95, y - s * 2.7, s * 0.55, s * 0.38, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(x - s * 2.35, y - s * 2.55, s * 0.3, s * 0.22, 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Ears.
  ctx.fillStyle = grey;
  ctx.beginPath();
  ctx.ellipse(x - s * 1.75, y - s * 3.3, s * 0.14, s * 0.5, -0.25 - flick, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x - s * 1.5, y - s * 3.2, s * 0.14, s * 0.5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Mane, eye, tail.
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(0.8, s * 0.12);
  ctx.beginPath();
  for (let i = 0; i < 3; i += 1) {
    const mx = x - s * (1.25 + i * 0.18);
    const my = y - s * (1.85 + i * 0.28);
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + s * 0.2, my - s * 0.12);
  }
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(x - s * 2.05, y - s * 2.8, Math.max(0.5, s * 0.07), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 1.4, y - s * 1.6);
  ctx.lineTo(x + s * 1.75, y - s * 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + s * 1.78, y - s * 0.82, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

/** On one leg, on the right, facing the tree. */
function drawStork(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, still: boolean) {
  const s = Math.max(3, 2 * scale);
  const white = '#F6F6F2';
  const black = '#2B2B2E';
  const red = '#D9432F';
  const nod = still ? 0 : Math.sin(t * 0.0015) * 0.06;
  ctx.strokeStyle = red;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.8, s * 0.12);
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.6);
  ctx.lineTo(x, y);
  ctx.moveTo(x + s * 0.1, y - s * 1.6);
  ctx.lineTo(x + s * 0.35, y - s * 1.0);
  ctx.lineTo(x + s * 0.1, y - s * 0.75);
  ctx.stroke();
  ctx.fillStyle = white;
  ctx.beginPath();
  ctx.ellipse(x + s * 0.1, y - s * 2.1, s * 0.9, s * 0.5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = black;
  ctx.beginPath();
  ctx.ellipse(x + s * 0.7, y - s * 2.05, s * 0.45, s * 0.28, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Neck and head.
  const hy = y - s * (3.55 - nod);
  ctx.strokeStyle = white;
  ctx.lineWidth = Math.max(1.5, s * 0.28);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 2.3);
  ctx.lineTo(x - s * 0.85, hy + s * 0.15);
  ctx.stroke();
  ctx.fillStyle = white;
  ctx.beginPath();
  ctx.arc(x - s * 0.9, hy, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.moveTo(x - s * 1.1, hy);
  ctx.lineTo(x - s * 2.0, hy + s * 0.2);
  ctx.lineTo(x - s * 1.1, hy + s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = black;
  ctx.beginPath();
  ctx.arc(x - s * 0.98, hy - s * 0.07, Math.max(0.5, s * 0.06), 0, Math.PI * 2);
  ctx.fill();
}

/** Lying down on the right, facing the tree, tail tip twitching. */
function drawLion(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, still: boolean) {
  const s = Math.max(3, 2.1 * scale);
  const tan = '#C9973F';
  const mane = '#8E5E1E';
  const dark = '#5C3A12';
  const cream = '#EBD9A8';
  const sway = still ? 0 : Math.sin(t * 0.0018) * 0.15;
  ctx.strokeStyle = tan;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.8, s * 0.14);
  ctx.beginPath();
  ctx.moveTo(x + s * 1.6, y - s * 0.7);
  ctx.quadraticCurveTo(x + s * 2.2, y - s * 0.7, x + s * (2.4 + sway), y - s * 0.2);
  ctx.stroke();
  ctx.fillStyle = mane;
  ctx.beginPath();
  ctx.arc(x + s * (2.45 + sway), y - s * 0.18, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tan;
  ctx.beginPath();
  ctx.ellipse(x + s * 0.2, y - s * 0.75, s * 1.7, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [ox, oy] of [
    [-1.0, -0.25],
    [-0.8, -0.1],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x + s * ox, y + s * oy, s * 0.7, s * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = mane;
  ctx.beginPath();
  ctx.arc(x - s * 1.05, y - s * 1.5, s * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tan;
  ctx.beginPath();
  ctx.arc(x - s * 1.15, y - s * 1.45, s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  for (const ex of [-0.75, -1.45]) {
    ctx.beginPath();
    ctx.arc(x + s * ex, y - s * 1.95, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(x - s * 1.35, y - s * 1.3, s * 0.32, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(x - s * 1.6, y - s * 1.38, Math.max(0.5, s * 0.08), 0, Math.PI * 2);
  ctx.fill();
  for (const ex of [-1.3, -1.0]) {
    ctx.beginPath();
    ctx.arc(x + s * ex, y - s * 1.6, Math.max(0.5, s * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The ellipse bees and butterflies fly on, in pixels: the bounds, or `ORBIT_MIN` round a small tree. */
function orbitOf(scene: TreeScene, frame: Frame) {
  const { scale, originX, originY } = frame;
  const b = scene.bounds;
  const rx = Math.max((b.maxX - b.minX) / 2, ORBIT_MIN.rx);
  const ry = Math.max((GROUND_Y - b.minY) / 2, ORBIT_MIN.ry);
  const cy = Math.min((b.minY + GROUND_Y) / 2, GROUND_Y - ry);
  return { cx: originX + ((b.minX + b.maxX) / 2) * scale, cy: originY + cy * scale, rx: rx * scale, ry: ry * scale };
}

function drawBees(ctx: CanvasRenderingContext2D, decor: Decor, scene: TreeScene, frame: Frame, t: number, still: boolean) {
  const { scale } = frame;
  const { cx, cy, rx, ry } = orbitOf(scene, frame);
  const size = Math.max(1.2, 0.6 * scale);
  for (const bee of decor.bees) {
    const p = bee.phase * Math.PI * 2;
    const tt = still ? 0 : t * 0.0011 * bee.speed;
    const x = cx + Math.cos(tt + p) * rx * bee.rx;
    const y = cy + Math.sin(tt * 1.7 + p) * ry * bee.ry + (still ? 0 : Math.sin(t * 0.02 + p) * size * 0.3);
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.7;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + side * size * 0.4, y - size * 0.7, size * 0.45, size * 0.3, side * -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#F2C744';
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3B3330';
    ctx.fillRect(x - size * 0.18, y - size * 0.6, size * 0.36, size * 1.2);
  }
}

/** A silhouette circling high in the sky, in viewport fractions. */
function drawEagle(ctx: CanvasRenderingContext2D, decor: Decor, frame: Frame, t: number, still: boolean, colour: string) {
  const { width: w, height: h } = frame;
  const cx = w * 0.5;
  const cy = h * 0.16;
  const rx = w * 0.3;
  const ry = h * 0.06;
  const a = (still ? 0 : t * 0.00035) + decor.eaglePhase * Math.PI * 2;
  const x = cx + Math.cos(a) * rx;
  const y = cy + Math.sin(a) * ry;
  const heading = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx);
  const s = Math.max(4, w * 0.03);
  const glide = 1 + (still ? 0 : 0.08 * Math.sin(t * 0.006));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.6 * glide);
  ctx.quadraticCurveTo(-s * 0.45, -s * 0.8, -s * 0.1, 0);
  ctx.quadraticCurveTo(-s * 0.45, s * 0.8, 0, s * 1.6 * glide);
  ctx.quadraticCurveTo(s * 0.25, s * 0.8, s * 0.15, 0);
  ctx.quadraticCurveTo(s * 0.25, -s * 0.8, 0, -s * 1.6 * glide);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.6, 0, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawSheep(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, facing: number, t: number, still: boolean) {
  const s = Math.max(3, 1.8 * scale);
  const graze = still ? 0 : Math.max(0, Math.sin(t * 0.0012 + x)) * 0.25;
  // Legs.
  ctx.strokeStyle = '#3B3330';
  ctx.lineWidth = Math.max(1, s * 0.18);
  ctx.lineCap = 'round';
  for (const lx of [-0.9, -0.35, 0.35, 0.9]) {
    ctx.beginPath();
    ctx.moveTo(x + lx * s, y - s * 0.5);
    ctx.lineTo(x + lx * s, y);
    ctx.stroke();
  }
  // Fleece: three overlapping lumps.
  ctx.fillStyle = '#F2EFE6';
  for (const [ox, oy, r] of [
    [-0.7, -0.95, 0.75],
    [0.1, -1.05, 0.85],
    [0.8, -0.9, 0.7],
  ]) {
    ctx.beginPath();
    ctx.arc(x + ox * s, y + oy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.8, s * 1.5, s * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head, dipping to graze.
  const hx = x + facing * s * 1.55;
  const hy = y - s * (0.85 - graze);
  ctx.fillStyle = '#3B3330';
  ctx.beginPath();
  ctx.ellipse(hx, hy, s * 0.42, s * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ear.
  ctx.beginPath();
  ctx.ellipse(hx - facing * s * 0.3, hy - s * 0.35, s * 0.28, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawDeer(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, still: boolean) {
  const s = Math.max(3, 2 * scale);
  const nod = still ? 0 : Math.sin(t * 0.0009) * 0.08;
  const body = '#8B6A4A';
  const dark = '#5C4530';
  ctx.strokeStyle = dark;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, s * 0.16);
  // Legs.
  for (const lx of [-1.1, -0.6, 0.6, 1.1]) {
    ctx.beginPath();
    ctx.moveTo(x + lx * s, y - s * 1.1);
    ctx.lineTo(x + lx * s * 1.05, y);
    ctx.stroke();
  }
  // Body.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 1.5, s * 1.7, s * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  // Neck and head, facing the tree (left).
  const nx = x - s * 1.5;
  const ny = y - s * 2.1;
  ctx.lineWidth = Math.max(1.5, s * 0.5);
  ctx.strokeStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - s * 1.2, y - s * 1.6);
  ctx.lineTo(nx, ny - s * (0.9 - nod));
  ctx.stroke();
  const hx = nx - s * 0.2;
  const hy = ny - s * (1.15 - nod);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(hx, hy, s * 0.62, s * 0.38, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Ears and antlers.
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, s * 0.14);
  ctx.beginPath();
  ctx.moveTo(hx + s * 0.2, hy - s * 0.3);
  ctx.lineTo(hx + s * 0.45, hy - s * 0.75);
  ctx.moveTo(hx + s * 0.35, hy - s * 0.25);
  ctx.lineTo(hx + s * 0.55, hy - s * 1.15);
  ctx.moveTo(hx + s * 0.45, hy - s * 0.7);
  ctx.lineTo(hx + s * 0.75, hy - s * 1.0);
  ctx.moveTo(hx + s * 0.5, hy - s * 0.95);
  ctx.lineTo(hx + s * 0.3, hy - s * 1.35);
  ctx.stroke();
  // Eye and tail.
  ctx.fillStyle = '#2B2B2B';
  ctx.beginPath();
  ctx.arc(hx - s * 0.25, hy - s * 0.08, Math.max(0.5, s * 0.07), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F2EFE6';
  ctx.beginPath();
  ctx.arc(x + s * 1.65, y - s * 1.6, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function drawButterflies(
  ctx: CanvasRenderingContext2D,
  decor: Decor,
  scene: TreeScene,
  frame: Frame,
  t: number,
  still: boolean,
) {
  const { scale } = frame;
  const { cx, cy, rx, ry } = orbitOf(scene, frame);
  const colours = ['#F6C453', '#F28CB1', '#7EC8E3'];
  const size = Math.max(2, 1.1 * scale);
  for (const fly of decor.butterflies) {
    const p = fly.phase * Math.PI * 2;
    const tt = still ? 0 : t * 0.0004 * fly.speed;
    const x = cx + Math.cos(tt + p) * rx * fly.rx;
    const y = cy + Math.sin(tt * 1.6 + p) * ry * fly.ry;
    const flap = still ? 0.85 : 0.35 + 0.65 * Math.abs(Math.sin(t * 0.018 + p));
    ctx.fillStyle = colours[fly.hue % colours.length];
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + side * size * 0.55 * flap, y, size * 0.6 * flap, size * 0.45, side * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3B3330';
    ctx.lineWidth = Math.max(0.6, size * 0.16);
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.45);
    ctx.lineTo(x, y + size * 0.45);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ frame */

/**
 * What a ground animal needs in frame, in tree units beside the trunk and above
 * the ground, for the camera's guard (`camera.ts` `extents`). Widths are the
 * old frame margins; heights are each animal's drawn height at world size.
 * A perching bird counts only while it waits on the ground.
 */
function animalExtents(animal: string, decor: Decor, perched: boolean): FrameExtents | undefined {
  switch (animal) {
    case 'schaap':
      return { left: -decor.sheep[0] + 5, right: decor.sheep[1] + 5, top: 4 };
    case 'hert':
      return { right: decor.deer + 6, top: 10 };
    case 'vos':
      return { left: -decor.fox + 5, top: 6 };
    case 'ezel':
      return { right: decor.donkey + 7, top: 8 };
    case 'ooievaar':
      return { right: decor.stork + 4, top: 8 };
    case 'leeuw':
      return { right: decor.lion + 8, top: 5 };
    default: {
      if (!PERCHING.has(animal) || perched) return undefined;
      const reach = decor.groundBird.distance + 4;
      return decor.groundBird.side < 0 ? { left: reach, top: 7 } : { right: reach, top: 7 };
    }
  }
}

function frameFor(width: number, height: number, scene: TreeScene, framing: TreeFraming, animal: string, decor: Decor): Frame {
  const extents = framing === 'scene' ? animalExtents(animal, decor, scene.perch !== null) : undefined;
  return { width, height, ...measureFrame(width, height, scene, framing, extents) };
}

/* --------------------------------------------------------------- component */

export default function TreeCanvas({
  seed,
  level,
  frac,
  health = 1,
  species = 'eik',
  scene: sceneId = 'waterbeken',
  animal = 'geen',
  framing = 'scene',
  reveal = 1,
  reducedMotion,
  still: stillProp = false,
  className,
  palette: paletteOverride,
  timeOfDay = 'auto',
  celebration = false,
  bloomFruit = null,
  ariaLabel,
  floor = null,
  from = null,
  tweenMs,
  onTweenEnd,
  at = null,
}: TreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Portraits tell 20 positions per step apart, scenes 50 (sceneCache.ts):
  // an XP tick never regenerates a tree nobody could see change.
  const bucket = framing === 'portrait' ? 20 : POSITION_BUCKET;
  // Objects arrive inline from callers; the memos key on their values.
  const floorFrom = floor?.from;
  const floorTo = floor?.to;
  const atPosition = at?.position;
  const atStep = at?.step;
  const scene = useMemo(
    () =>
      cachedTree(
        {
          seed,
          level,
          frac,
          health,
          species,
          floor: floorFrom != null && floorTo != null ? { from: floorFrom, to: floorTo } : null,
          at: atPosition != null ? { position: atPosition, step: atStep } : null,
        },
        bucket,
      ),
    [seed, level, frac, health, species, floorFrom, floorTo, atPosition, atStep, bucket],
  );

  // Scene A of the growth tween. `from.floor` left out means the current floor.
  const fromLevel = from?.level;
  const fromFrac = from?.frac;
  const fromFloor = from ? (from.floor === undefined ? floor : from.floor) : null;
  const fromFloorFrom = fromFloor?.from;
  const fromFloorTo = fromFloor?.to;
  const fromScene = useMemo(
    () =>
      fromLevel == null
        ? null
        : cachedTree(
            {
              seed,
              level: fromLevel,
              frac: fromFrac ?? 0,
              health,
              species,
              floor: fromFloorFrom != null && fromFloorTo != null ? { from: fromFloorFrom, to: fromFloorTo } : null,
            },
            bucket,
          ),
    [seed, fromLevel, fromFrac, health, species, fromFloorFrom, fromFloorTo, bucket],
  );
  /** One tween per distinct start: the same `from` again only retargets. */
  const fromKey = fromScene ? `${seed}|${species}|${fromLevel}|${fromFrac}|${fromFloorFrom ?? '-'},${fromFloorTo ?? '-'}` : null;

  // The device clock only ever touches colour, so it is read once per mount
  // rather than being threaded through the generator.
  const fixedTimeOfDay = timeOfDay && timeOfDay !== 'auto' ? timeOfDay : null;
  const palette = useMemo(
    () => paletteOverride ?? paletteForNow(health, new Date(), { scene: sceneId, species, timeOfDay: fixedTimeOfDay }),
    [paletteOverride, health, sceneId, species, fixedTimeOfDay],
  );

  const decor = useMemo(() => buildDecor(seed), [seed]);
  const animalId = typeof animal === 'string' ? animal : 'geen';
  const sp = speciesParams(species);

  // The per-frame inputs of a grow-in or a celebration are read through refs,
  // so an animation that sets `reveal` sixty times a second changes what the
  // next frame draws without tearing the loop, the observers and the branch
  // layer down and up again each time - which is what left a blank canvas
  // whenever a resize callback landed between two of those rebuilds.
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  const celebrationRef = useRef(celebration);
  celebrationRef.current = celebration;
  const bloomRef = useRef(bloomFruit);
  bloomRef.current = bloomFruit;
  /** Repaints a still canvas; set by the effect below, called when a ref changes. */
  const repaintRef = useRef<(() => void) | null>(null);
  /**
   * The running growth tween. A ref, so a palette or animal change mid-tween
   * (which rebuilds the drawing effect) carries on instead of starting over.
   */
  const tweenRef = useRef<{ fromKey: string; from: TreeScene; start: number; ms: number; ended: boolean } | null>(null);
  const onTweenEndRef = useRef(onTweenEnd);
  onTweenEndRef.current = onTweenEnd;

  useEffect(() => {
    repaintRef.current?.();
  }, [reveal, celebration, bloomFruit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: Frame = {
      width: 1,
      height: 1,
      scale: 1,
      originX: 0,
      originY: 0,
      pivotX: 0,
      pivotY: 0,
      groundTop: 0,
      guarded: false,
    };
    let raf = 0;
    let visible = true;
    let running = false;
    let still = stillProp || (reducedMotion ?? prefersReducedMotion());
    let dpr = 1;

    // --- the growth tween (plan §9.2, §9.3) ------------------------------
    let tween = tweenRef.current;
    if (fromScene && fromKey) {
      const ms = Math.max(0, tweenMs ?? tweenMsFor(fromScene, scene));
      tween =
        tween && tween.fromKey === fromKey
          ? // Same start, new target: keep the clock (an ended tween stays ended).
            { ...tween, from: fromScene, ms }
          : { fromKey, from: fromScene, start: performance.now(), ms, ended: false };
    } else {
      tween = null;
    }
    tweenRef.current = tween;
    let tweenEnded = false;

    /** The scene to draw now: B, or A→B while the tween runs. Ends the tween once its time is up. */
    const sceneNow = (now: number): TreeScene => {
      const tw = tweenRef.current;
      if (!tw || tw.ended) return scene;
      const u = still || tw.ms <= 0 ? 1 : (now - tw.start) / tw.ms;
      if (u >= 1) {
        tw.ended = true;
        tweenEnded = true;
        return scene;
      }
      return lerpScenes(tw.from, scene, tweenEase(u));
    };
    let drawn = sceneNow(performance.now());
    const matureOf = (s: TreeScene) => matureDetails(s, seed);
    let mature = matureOf(drawn);

    // The branch layer, rebuilt only when the drawn geometry, the box or the
    // reveal changes - every frame of a tween, otherwise almost never.
    const layer = document.createElement('canvas');
    const layerCtx = layer.getContext('2d');
    let layerReveal = -1;
    let layerScene: TreeScene | null = null;

    const ensureLayer = () => {
      const reveal = revealRef.current;
      if (!layerCtx || (layerReveal === reveal && layerScene === drawn)) return;
      layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layerCtx.clearRect(0, 0, frame.width, frame.height);
      drawBranches(layerCtx, drawn, palette, frame, reveal, mature);
      layerReveal = reveal;
      layerScene = drawn;
    };

    /** Point the camera at the drawn scene: during a tween it eases with the tree. */
    const reframe = () => {
      frame = frameFor(frame.width, frame.height, drawn, framing, animalId, decor);
    };

    const measure = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // An avatar is a still image: at this size a sway is sub-pixel and the
      // loop would only be heating the phone.
      if (width <= STILL_BELOW_PX && height <= STILL_BELOW_PX) still = true;

      frame = frameFor(width, height, drawn, framing, animalId, decor);

      layer.width = canvas.width;
      layer.height = canvas.height;
      layerReveal = -1;
      layerScene = null;
      ensureLayer();
    };

    const drawSky = (t: number) => {
      const { width, height, groundTop } = frame;
      if (framing === 'portrait') {
        const disc = ctx.createRadialGradient(width / 2, height * 0.38, 0, width / 2, height * 0.38, Math.max(width, height) * 0.75);
        disc.addColorStop(0, palette.skyBottom);
        disc.addColorStop(1, palette.skyTop);
        ctx.fillStyle = disc;
        ctx.fillRect(0, 0, width, height);
        return;
      }
      const sky = ctx.createLinearGradient(0, 0, 0, groundTop);
      sky.addColorStop(0, palette.skyTop);
      sky.addColorStop(1, palette.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      if (palette.night) {
        for (const star of decor.stars) {
          const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.0008 + star.phase * 6.283));
          ctx.globalAlpha = twinkle * 0.8;
          ctx.fillStyle = palette.light;
          ctx.beginPath();
          // Sky decoration is placed in viewport fractions, not tree space:
          // the tree is framed to its own bounds, so following it would bunch
          // the stars around the canopy instead of filling the sky.
          ctx.arc((star.x / 100) * width, (star.y / 100) * groundTop, Math.max(0.5, star.r * frame.scale), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };

    const drawGround = (t: number) => {
      const { width, height, scale, pivotX, pivotY, groundTop } = frame;
      if (framing === 'portrait') {
        // A soft shadow and a thin arc of ground sized to the trunk (paint.ts
        // MOUND): enough to stand on, not a landscape.
        const disc = portraitDiscFor(trunkWidthOf(drawn));
        const rx = Math.max(3, disc.rx * scale);
        const ry = Math.max(1.2, disc.ry * scale);
        ctx.fillStyle = palette.ground;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(pivotX, pivotY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = palette.bark;
        ctx.beginPath();
        ctx.ellipse(pivotX, pivotY + 0.4 * scale, rx * 0.7, Math.max(0.8, ry * 0.7), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }

      // The glow, centred on the canopy wherever it happens to be for this level.
      const glowY = frame.originY + ((drawn.bounds.minY + GROUND_Y) / 2) * scale;
      const glowR = Math.max(30, (GROUND_Y - drawn.bounds.minY) * 0.7) * scale;
      const glow = ctx.createRadialGradient(pivotX, glowY, 0, pivotX, glowY, glowR);
      glow.addColorStop(0, `${palette.glow}66`);
      glow.addColorStop(1, `${palette.glow}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, groundTop);

      drawFarBackdrop(ctx, palette, decor, frame, t, still);

      // The earth band, with a low mound where the trunk goes in - sized to
      // the trunk (paint.ts MOUND), so a kiem stands on a handful of earth.
      const earth = ctx.createLinearGradient(0, groundTop, 0, height);
      earth.addColorStop(0, palette.ground);
      earth.addColorStop(1, palette.groundDeep);
      ctx.fillStyle = earth;
      ctx.fillRect(0, groundTop, width, height - groundTop);
      const mound = moundFor(trunkWidthOf(drawn));
      ctx.fillStyle = palette.ground;
      ctx.beginPath();
      ctx.ellipse(pivotX, groundTop + 0.2 * scale, Math.max(3, mound.rx * scale), Math.max(1, mound.ry * scale), 0, Math.PI, 0);
      ctx.fill();

      drawNearBackdrop(ctx, palette, decor, frame, t, still);

      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = mix(palette.groundDeep, palette.bark, 0.5);
      ctx.beginPath();
      ctx.ellipse(pivotX, pivotY + 0.6 * scale, Math.max(2, mound.shadowRx * scale), Math.max(0.8, mound.shadowRy * scale), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawTree = (t: number) => {
      const { width, height, scale, originX, originY, pivotX, pivotY } = frame;
      const reveal = revealRef.current;
      const bloomFruit = bloomRef.current;
      ensureLayer();
      const sway = still ? 0 : Math.sin(t * 0.00042) * SWAY_DEGREES + Math.sin(t * 0.00097) * SWAY_DEGREES * 0.3;

      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(sway * DEG);
      ctx.translate(-pivotX, -pivotY);
      ctx.drawImage(layer, 0, 0, width, height);

      const leafScale = (1.1 + 0.8 * drawn.growth) * scale;
      const shape = sp.leafShape;
      if (shape === 'needle') {
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, 0.42 * scale);
      }
      // Seed leaves: two colours per frame, yellowing as the seedling ages (paint.ts).
      const seedLeaf = cotyledonColor(palette, false, drawn);
      const seedLeafAlt = cotyledonColor(palette, true, drawn);
      for (const leaf of drawn.leaves) {
        if (!leaf.visible || !(leaf.size > 0)) continue;
        const grown = revealAt(reveal, leaf.depth, drawn.maxDepth);
        if (grown <= 0) continue;

        const shimmer = still ? 0 : Math.sin(t * 0.0021 + leaf.phase * 6.283);
        const x = originX + (leaf.x + shimmer * 0.35) * scale;
        const y = originY + leaf.y * scale;
        // A bud is a smaller, tighter version of the same leaf, so unfurling is
        // a size change rather than a pop-in.
        const size = leaf.size * leafScale * grown * (leaf.open ? 1 : 0.45);
        const angle = leaf.angle + shimmer * (shape === 'frond' ? 2 : 6);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle * DEG);
        // A bud is translucent; a seed leaf or whorl fades as it goes.
        ctx.globalAlpha = (leaf.open ? 1 : 0.75) * leafFadeAlpha(leaf.fade);
        if (leaf.kind === 'cotyledon') {
          // Rounder and fleshier than any species leaf (a conifer's are needles).
          const c = cotyledonShape(drawn.form, size);
          ctx.fillStyle = leaf.phase > 0.5 ? seedLeafAlt : seedLeaf;
          ctx.beginPath();
          ctx.ellipse(c.cx, 0, c.rx, c.ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          continue;
        }
        const colour = leaf.phase > 0.5 ? palette.leafAlt : palette.leaf;
        // World-down in this leaf's frame, for the frond's droop.
        const down: [number, number] = [Math.cos((90 - angle) * DEG), Math.sin((90 - angle) * DEG)];
        leafPath(ctx, shape, size, scale, down);
        if (shape === 'needle') {
          ctx.strokeStyle = colour;
          ctx.stroke();
        } else {
          ctx.fillStyle = colour;
          ctx.fill();
          if (shape === 'frond' || shape === 'large' || shape === 'feather') {
            ctx.strokeStyle = palette.leafAlt === colour ? palette.leaf : palette.leafAlt;
            ctx.lineWidth = Math.max(0.5, size * 0.08);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size * (shape === 'frond' ? 2.9 : shape === 'feather' ? 1.7 : 1.5), 0);
            ctx.stroke();
            // Leaflets either side of the rib, where there is room to see them.
            if ((shape === 'frond' || shape === 'feather') && scale > 1.4) {
              const pairs = shape === 'frond' ? 6 : 4;
              const length = size * (shape === 'frond' ? 3.2 : 1.8);
              const reachMax = size * (shape === 'frond' ? 0.9 : 0.4);
              ctx.lineWidth = Math.max(0.5, size * 0.06);
              ctx.beginPath();
              for (let k = 1; k <= pairs; k += 1) {
                const at = (k / (pairs + 1)) * length;
                const reach = reachMax * (1 - k / (pairs + 3));
                ctx.moveTo(at, 0);
                ctx.lineTo(at + reach * 0.55, -reach);
                ctx.moveTo(at, 0);
                ctx.lineTo(at + reach * 0.55, reach);
              }
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (palette.blossom) {
        ctx.fillStyle = palette.blossom;
        for (const blossom of drawn.blossoms) {
          if (!(blossom.size > 0)) continue;
          const size = blossom.size * leafScale * BLOSSOM_RADIUS;
          ctx.beginPath();
          ctx.arc(originX + blossom.x * scale, originY + blossom.y * scale, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const fruit of drawn.fruits) {
        // A fruit arriving in a tween swells in; the 1.4 px floor must not pop it.
        if (!(fruit.size > 0)) continue;
        const x = originX + fruit.x * scale;
        const y = originY + fruit.y * scale;
        // The fruit a level-up just unlocked swells and carries a soft bloom,
        // so the eye is told which one is new.
        const blooming = bloomFruit != null && fruit.index === bloomFruit;
        const swell = blooming && !still ? 1 + 0.28 * (0.5 + 0.5 * Math.sin(t * 0.0026)) : 1;
        const size = Math.max(1.4, fruit.size * leafScale * 1.15) * swell;

        if (blooming) {
          const bloom = ctx.createRadialGradient(x, y, 0, x, y, size * 4.5);
          bloom.addColorStop(0, `${palette.light}88`);
          bloom.addColorStop(1, `${palette.light}00`);
          ctx.fillStyle = bloom;
          ctx.beginPath();
          ctx.arc(x, y, size * 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        drawFruit(ctx, sp.fruitStyle, x, y, size, palette);
      }

      // --- snow on the branches (level 25+, winter) ------------------------
      // Drawn inside the swaying transform so the load rides with the tree.
      if (level >= SEASONS_TRAIT_LEVEL && palette.season === 'winter') {
        ctx.fillStyle = '#F2F6FA';
        ctx.globalAlpha = 0.9;
        for (const branch of drawn.branches) {
          if (branch.depth < drawn.maxDepth - 2 || !(branch.w0 > 0)) continue;
          if (revealAt(reveal, branch.depth, drawn.maxDepth) <= 0) continue;
          const [nx, ny] = normal(branch.x1 - branch.cx, branch.y1 - branch.cy);
          // Only the upward-facing side carries snow.
          const side = ny < 0 ? 1 : -1;
          const w = Math.max(0.7, branch.w0 * scale * 0.75);
          ctx.beginPath();
          ctx.ellipse(originX + branch.cx * scale + nx * side * w, originY + branch.cy * scale + ny * side * w, w * 1.5, w * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // In the crown once it has a twig that holds a bird; until then the bird
      // waits on the ground (drawForeground).
      if (drawn.perch && PERCHING.has(animalId)) {
        const x = originX + drawn.perch.x * scale;
        const y = originY + drawn.perch.y * scale;
        if (animalId === 'vogel') drawBird(ctx, x, y, scale, palette.bark);
        else if (animalId === 'duif') drawPerchBird(ctx, x, y, scale, t, still, DOVE);
        else if (animalId === 'raaf') drawPerchBird(ctx, x, y, scale, t, still, RAVEN);
        else drawOwl(ctx, x, y, scale, t, still, palette.night);
      }

      ctx.restore();
    };

    const drawForeground = (t: number) => {
      const { width, height, scale, originX, originY, pivotX, pivotY } = frame;
      const groundY = framing === 'portrait' ? pivotY : pivotY + 0.4 * scale;

      if (animalId === 'schaap') {
        drawSheep(ctx, pivotX + decor.sheep[0] * scale, groundY, scale, 1, t, still);
        drawSheep(ctx, pivotX + decor.sheep[1] * scale, groundY, scale, -1, t, still);
      }
      if (animalId === 'hert') drawDeer(ctx, pivotX + decor.deer * scale, groundY, scale, t, still);
      if (animalId === 'vos') drawFox(ctx, pivotX + decor.fox * scale, groundY, scale, t, still);
      if (animalId === 'ezel') drawDonkey(ctx, pivotX + decor.donkey * scale, groundY, scale, t, still);
      if (animalId === 'ooievaar') drawStork(ctx, pivotX + decor.stork * scale, groundY, scale, t, still);
      if (animalId === 'leeuw') drawLion(ctx, pivotX + decor.lion * scale, groundY, scale, t, still);
      if (animalId === 'vlinders') drawButterflies(ctx, decor, drawn, frame, t, still);
      if (animalId === 'bijen') drawBees(ctx, decor, drawn, frame, t, still);
      // The eagle needs a sky: it circles in the scene framing only.
      if (animalId === 'adelaar' && framing === 'scene') drawEagle(ctx, decor, frame, t, still, palette.bark);
      // A bird with no twig to sit on yet waits beside the tree. Scene only:
      // an avatar is about the tree, and its disc would cut the bird in half.
      if (!drawn.perch && PERCHING.has(animalId) && framing === 'scene') {
        drawGroundBird(ctx, animalId, decor, frame, groundY, t, still, palette);
      }

      if (animalId === 'vuurvliegjes' && palette.night) {
        const b = drawn.bounds;
        for (const fly of decor.fireflies) {
          const pulse = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.0013 + fly.phase * 6.283));
          const drift = still ? 0 : Math.sin(t * 0.0005 + fly.phase * 6.283) * 1.6;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#FFE9A8';
          ctx.beginPath();
          ctx.arc(originX + (b.minX + fly.x * (b.maxX - b.minX) + drift) * scale, originY + (b.minY + fly.y * (GROUND_Y - b.minY)) * scale, Math.max(0.8, 0.6 * scale), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (framing === 'portrait') return;

      // --- drifting petals and falling leaves ------------------------------
      // Autumn drops the occasional leaf for everyone; the blossom storm is the
      // level-25 `seasons` trait and only blows in spring. Both are the same
      // drifters, so a season change costs a colour and nothing else.
      const hasSeasons = level >= SEASONS_TRAIT_LEVEL;
      const drifterColor =
        palette.season === 'autumn' && !sp.evergreen
          ? palette.leafAlt
          : hasSeasons && palette.season === 'spring' && palette.blossom
            ? palette.blossom
            : null;
      if (drifterColor) {
        // Three at a time in autumn - "occasional" is the point, and a constant
        // fall reads as the tree dying rather than as the season.
        const shown = palette.season === 'autumn' ? 3 : decor.drifters.length;
        ctx.fillStyle = drifterColor;
        ctx.globalAlpha = 0.75;
        for (let i = 0; i < shown; i += 1) {
          const drifter = decor.drifters[i];
          const fall = still ? 0 : (t * 0.0055 * drifter.speed) % 130;
          const y = ((((drifter.y + fall) % 130) + 130) % 130) - 15;
          if (y > 100 || y < 0) continue;
          const swayX = still ? 0 : Math.sin(t * 0.0012 + drifter.phase * 6.283) * drifter.drift * 3;
          ctx.save();
          ctx.translate(((drifter.x + swayX) / 100) * width, (y / 100) * height);
          ctx.rotate(still ? 0 : t * 0.0016 + drifter.phase * 6.283);
          ctx.beginPath();
          ctx.ellipse(0, 0, drifter.size * scale, drifter.size * 0.5 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // --- the level-up column of light (§8.4) -----------------------------
      if (celebrationRef.current && !still) {
        ctx.fillStyle = palette.light;
        for (let i = 0; i < 22; i += 1) {
          const phase = (i / 22 + t * 0.00022) % 1;
          const y = pivotY - phase * (pivotY - originY);
          const spread = (1 - phase) * 9 * scale;
          ctx.globalAlpha = 0.5 * Math.sin(phase * Math.PI);
          ctx.beginPath();
          ctx.arc(pivotX + Math.sin(t * 0.0015 + i) * spread, y, Math.max(0.7, 0.7 * scale), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Pollen in the sunbeam. Cheap, and it is most of what makes a still
      // image read as a living scene.
      ctx.fillStyle = palette.light;
      for (const mote of decor.motes) {
        const rise = still ? 0 : (t * 0.004 * mote.speed) % 100;
        const y = (((mote.y - rise) % 100) + 100) % 100;
        const wobble = still ? 0 : Math.sin(t * 0.0009 + mote.phase * 6.283) * 1.2;
        ctx.globalAlpha = 0.16 + 0.14 * Math.sin(t * 0.001 + mote.phase * 6.283);
        ctx.beginPath();
        ctx.arc(((mote.x + wobble) / 100) * width, (y / 100) * height, Math.max(0.6, mote.r * scale), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const draw = (time: number) => {
      const next = sceneNow(performance.now());
      if (next !== drawn) {
        drawn = next;
        mature = matureOf(drawn);
        reframe();
      }
      const t = still ? 0 : time;
      drawSky(t);
      drawGround(t);
      drawTree(t);
      drawForeground(t);
      if (tweenEnded) {
        // After the paint, so the caller's next step never races the end state.
        tweenEnded = false;
        onTweenEndRef.current?.();
      }
    };

    const loop = (time: number) => {
      draw(time);
      if (running) raf = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || still || !visible || document.hidden) return;
      running = true;
      raf = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    measure();
    draw(0);
    start();
    // A still canvas repaints when a grow-in or celebration input changes.
    repaintRef.current = () => {
      if (!running) draw(0);
    };

    const resizeObserver = new ResizeObserver(() => {
      // Resizing the bitmap clears it; always paint straight back, running or
      // not, so a frame is never lost between two loop ticks.
      measure();
      draw(0);
    });
    resizeObserver.observe(canvas);

    // Off-screen or backgrounded means nobody is looking; both are free frames
    // to give back on a laptop battery or a low-end phone.
    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
      else stop();
    });
    intersectionObserver.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    // A tween that runs while nobody is looking (scrolled away, tab hidden)
    // still ends on time: paint the end state and tell the caller.
    let endTimer = 0;
    const running0 = tweenRef.current;
    if (running0 && !running0.ended) {
      const remaining = Math.max(0, running0.start + running0.ms - performance.now());
      endTimer = window.setTimeout(() => {
        if (!running) draw(0);
      }, remaining + 50);
    }

    return () => {
      stop();
      window.clearTimeout(endTimer);
      repaintRef.current = null;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scene, fromScene, fromKey, tweenMs, seed, palette, decor, reducedMotion, stillProp, level, framing, animalId, sp]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={ariaLabel ?? `Je boom op niveau ${scene.level}`}
    />
  );
}
