'use client';

import { useEffect, useMemo, useRef } from 'react';
import { GROUND_Y, MIN_SCENE_HEIGHT, MIN_SCENE_WIDTH, TRUNK_X, type TreeScene } from '../../lib/levensboom/generate';
import { cachedTree } from '../../lib/levensboom/sceneCache';
import { mix, paletteForNow, type Palette, type TimeOfDay } from '../../lib/levensboom/palette';
import { seededRng } from '../../lib/levensboom/rng';
import { speciesParams, type LeafShape, type SpeciesId } from '../../lib/levensboom/species';
import { sceneSpec, type SceneId } from '../../lib/levensboom/scenes';
import { type AnimalId } from '../../lib/levensboom/catalog';

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
 * sky disc, cropped to its own bounds, for the navbar and every other place a
 * 28 px face has to read.
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
  /** 0..1. Below 1 the tree is mid grow-in; the level-up sequence drives this. */
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
};

type Mote = { x: number; y: number; r: number; speed: number; phase: number };
type Star = { x: number; y: number; r: number; phase: number };
/** Petals and falling leaves: same shape, different season. */
type Drifter = { x: number; y: number; size: number; speed: number; drift: number; phase: number };
type Firefly = { x: number; y: number; phase: number };
type Butterfly = { rx: number; ry: number; speed: number; phase: number; hue: number };

type Decor = {
  motes: Mote[];
  stars: Star[];
  drifters: Drifter[];
  fireflies: Firefly[];
  butterflies: Butterfly[];
  /** Backdrop details: stone/flower/olive positions, extra stars. 0..1 pairs. */
  dots: { x: number; y: number; r: number; k: number }[];
  /** Where the ground animals stand, in tree units left/right of the trunk. */
  sheep: [number, number];
  deer: number;
};

type Frame = {
  width: number;
  height: number;
  scale: number;
  originX: number;
  originY: number;
  pivotX: number;
  pivotY: number;
  /** Top edge of the earth band (scene) or of the shadow (portrait). */
  groundTop: number;
};

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

  const scene = seededRng(`${seed}:scene`);
  const dots = Array.from({ length: 120 }, () => ({
    x: scene(),
    y: scene(),
    r: scene(),
    k: scene(),
  }));
  const sheep: [number, number] = [-(13 + scene() * 8), 11 + scene() * 7];
  const deer = 15 + scene() * 6;

  return { motes, stars, drifters, fireflies, butterflies, dots, sheep, deer };
}

function drawBranches(
  ctx: CanvasRenderingContext2D,
  scene: TreeScene,
  palette: Palette,
  frame: Frame,
  reveal: number,
) {
  const { scale, originX, originY } = frame;
  for (const branch of scene.branches) {
    const t = revealAt(reveal, branch.depth, scene.maxDepth);
    if (t <= 0) continue;

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
    const gradient = ctx.createLinearGradient(x0 - w0, y0, x0 + w0, y0);
    gradient.addColorStop(0, palette.barkLit);
    gradient.addColorStop(1, palette.bark);
    ctx.fillStyle = gradient;
    ctx.fill();
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
    case 'needle': {
      // A tuft of needles. At avatar sizes a single stroke is all that
      // survives the downsample, so the fan collapses to one.
      const length = size * 1.6;
      const fan = scale > 1.6 ? [-40, -20, 0, 20, 40] : [0];
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

function drawFarBackdrop(ctx: CanvasRenderingContext2D, palette: Palette, decor: Decor, frame: Frame) {
  const { width: w, height: h, groundTop } = frame;
  const spec = sceneSpec(palette.scene);
  switch (spec.backdrop) {
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
function drawNearBackdrop(ctx: CanvasRenderingContext2D, palette: Palette, decor: Decor, frame: Frame) {
  const { width: w, height: h, groundTop } = frame;
  const band = h - groundTop;
  const spec = sceneSpec(palette.scene);
  switch (spec.backdrop) {
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

function drawDove(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, still: boolean) {
  const s = Math.max(2.5, 2.4 * scale);
  const flap = still ? 0 : Math.sin(t * 0.004) * 0.25;
  ctx.fillStyle = '#F4F4F0';
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
  ctx.fillStyle = '#E2E2D8';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, y - s * 0.55);
  ctx.quadraticCurveTo(x - s * 0.2, y - s * (1.35 + flap), x + s * 0.7, y - s * (1.05 + flap));
  ctx.lineTo(x + s * 0.4, y - s * 0.45);
  ctx.closePath();
  ctx.fill();
  // Beak and eye.
  ctx.fillStyle = '#E0A458';
  ctx.beginPath();
  ctx.moveTo(x + s * 1.2, y - s * 0.82);
  ctx.lineTo(x + s * 1.5, y - s * 0.72);
  ctx.lineTo(x + s * 1.18, y - s * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2B2B2B';
  ctx.beginPath();
  ctx.arc(x + s * 0.95, y - s * 0.86, Math.max(0.5, s * 0.08), 0, Math.PI * 2);
  ctx.fill();
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
  const { scale, originX, originY } = frame;
  const b = scene.bounds;
  const cx = originX + ((b.minX + b.maxX) / 2) * scale;
  const cy = originY + ((b.minY + GROUND_Y) / 2) * scale;
  const rx = ((b.maxX - b.minX) / 2) * scale;
  const ry = ((GROUND_Y - b.minY) / 2) * scale;
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

/** Ground animals stand beside the trunk; the frame has to hold them too. */
function extentWithAnimals(scene: TreeScene, animal: string, decor: Decor): { minX: number; maxX: number } {
  let { minX, maxX } = scene.bounds;
  if (animal === 'schaap') {
    minX = Math.min(minX, TRUNK_X + decor.sheep[0] - 5);
    maxX = Math.max(maxX, TRUNK_X + decor.sheep[1] + 5);
  }
  if (animal === 'hert') maxX = Math.max(maxX, TRUNK_X + decor.deer + 6);
  return { minX, maxX };
}

function measureFrame(width: number, height: number, scene: TreeScene, framing: TreeFraming, animal: string, decor: Decor): Frame {
  const { minX, maxX } = extentWithAnimals(scene, animal, decor);
  const { minY } = scene.bounds;
  const contentW = Math.max(1, maxX - minX);
  const treeH = Math.max(1, GROUND_Y - minY);

  if (framing === 'portrait') {
    // The tree alone, centred, standing on a soft shadow near the bottom.
    const padX = width * 0.1;
    const padY = height * 0.1;
    const scale = Math.min((width - 2 * padX) / contentW, (height - 2 * padY) / treeH);
    const originX = width / 2 - ((minX + maxX) / 2) * scale;
    const pivotY = height - padY * 1.15;
    const originY = pivotY - GROUND_Y * scale;
    return { width, height, scale, originX, originY, pivotX: originX + TRUNK_X * scale, pivotY, groundTop: pivotY };
  }

  // The scene: a fixed earth band (never scaled from the tree, which for a
  // kiem swallowed the whole frame), a minimum framed extent so a small tree
  // stands small in a real landscape, and the trunk base just below the band's
  // top edge so the tree stands in the ground rather than on a line above it.
  const band = height * 0.12;
  const sceneW = Math.max(contentW, MIN_SCENE_WIDTH);
  const sceneH = Math.max(treeH, MIN_SCENE_HEIGHT);
  const scale = Math.min((width * 0.9) / sceneW, ((height - band) * 0.84) / sceneH);
  const groundTop = height - band;
  const pivotY = groundTop + 0.6 * scale;
  const originX = width / 2 - ((minX + maxX) / 2) * scale;
  const originY = pivotY - GROUND_Y * scale;
  return { width, height, scale, originX, originY, pivotX: originX + TRUNK_X * scale, pivotY, groundTop };
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
}: TreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const scene = useMemo(
    () => cachedTree({ seed, level, frac, health, species }, framing === 'portrait' ? 20 : 0),
    [seed, level, frac, health, species, framing],
  );

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

  useEffect(() => {
    repaintRef.current?.();
  }, [reveal, celebration, bloomFruit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: Frame = { width: 1, height: 1, scale: 1, originX: 0, originY: 0, pivotX: 0, pivotY: 0, groundTop: 0 };
    let raf = 0;
    let visible = true;
    let running = false;
    let still = stillProp || (reducedMotion ?? prefersReducedMotion());
    let dpr = 1;

    // The branch layer, rebuilt only when the geometry, the box or the reveal
    // changes.
    const layer = document.createElement('canvas');
    const layerCtx = layer.getContext('2d');
    let layerReveal = -1;

    const ensureLayer = () => {
      const reveal = revealRef.current;
      if (!layerCtx || layerReveal === reveal) return;
      layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layerCtx.clearRect(0, 0, frame.width, frame.height);
      drawBranches(layerCtx, scene, palette, frame, reveal);
      layerReveal = reveal;
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

      frame = measureFrame(width, height, scene, framing, animalId, decor);

      layer.width = canvas.width;
      layer.height = canvas.height;
      layerReveal = -1;
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

    const drawGround = () => {
      const { width, height, scale, pivotX, pivotY, groundTop } = frame;
      if (framing === 'portrait') {
        // A soft shadow and a thin arc of ground: enough to stand on, not a
        // landscape.
        const { minX, maxX } = extentWithAnimals(scene, animalId, decor);
        const rx = Math.max(6, ((maxX - minX) / 2) * scale * 0.55);
        ctx.fillStyle = palette.ground;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(pivotX, pivotY, rx, Math.max(1.5, 1.6 * scale), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = palette.bark;
        ctx.beginPath();
        ctx.ellipse(pivotX, pivotY + 0.4 * scale, rx * 0.7, Math.max(1, 1.1 * scale), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }

      // The glow, centred on the canopy wherever it happens to be for this level.
      const glowY = frame.originY + ((scene.bounds.minY + GROUND_Y) / 2) * scale;
      const glowR = Math.max(30, (GROUND_Y - scene.bounds.minY) * 0.7) * scale;
      const glow = ctx.createRadialGradient(pivotX, glowY, 0, pivotX, glowY, glowR);
      glow.addColorStop(0, `${palette.glow}66`);
      glow.addColorStop(1, `${palette.glow}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, groundTop);

      drawFarBackdrop(ctx, palette, decor, frame);

      // The earth band, with a low mound where the trunk goes in.
      const earth = ctx.createLinearGradient(0, groundTop, 0, height);
      earth.addColorStop(0, palette.ground);
      earth.addColorStop(1, palette.groundDeep);
      ctx.fillStyle = earth;
      ctx.fillRect(0, groundTop, width, height - groundTop);
      ctx.fillStyle = palette.ground;
      ctx.beginPath();
      ctx.ellipse(pivotX, groundTop + 0.2 * scale, Math.max(8, 14 * scale), Math.max(2, 2.2 * scale), 0, Math.PI, 0);
      ctx.fill();

      drawNearBackdrop(ctx, palette, decor, frame);

      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = mix(palette.groundDeep, palette.bark, 0.5);
      ctx.beginPath();
      ctx.ellipse(pivotX, pivotY + 0.6 * scale, Math.max(6, 11 * scale), Math.max(1.2, 1.6 * scale), 0, 0, Math.PI * 2);
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

      const leafScale = (1.1 + 0.8 * scene.growth) * scale;
      const shape = sp.leafShape;
      if (shape === 'needle') {
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(0.8, 0.32 * scale);
      }
      for (const leaf of scene.leaves) {
        if (!leaf.visible) continue;
        const grown = revealAt(reveal, leaf.depth, scene.maxDepth);
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
        const colour = leaf.phase > 0.5 ? palette.leafAlt : palette.leaf;
        ctx.globalAlpha = leaf.open ? 1 : 0.75;
        // World-down in this leaf's frame, for the frond's droop.
        const down: [number, number] = [Math.cos((90 - angle) * DEG), Math.sin((90 - angle) * DEG)];
        leafPath(ctx, shape, size, scale, down);
        if (shape === 'needle') {
          ctx.strokeStyle = colour;
          ctx.stroke();
        } else {
          ctx.fillStyle = colour;
          ctx.fill();
          if (shape === 'frond' || shape === 'large') {
            ctx.strokeStyle = palette.leafAlt === colour ? palette.leaf : palette.leafAlt;
            ctx.lineWidth = Math.max(0.5, size * 0.08);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size * (shape === 'frond' ? 2.9 : 1.5), 0);
            ctx.stroke();
            // Leaflets either side of the rib, where there is room to see them.
            if (shape === 'frond' && scale > 1.4) {
              const length = size * 3.2;
              ctx.lineWidth = Math.max(0.5, size * 0.06);
              ctx.beginPath();
              for (let k = 1; k <= 6; k += 1) {
                const at = (k / 7) * length;
                const reach = size * 0.9 * (1 - k / 9);
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
        for (const blossom of scene.blossoms) {
          const size = blossom.size * leafScale * 0.8;
          ctx.beginPath();
          ctx.arc(originX + blossom.x * scale, originY + blossom.y * scale, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const fruit of scene.fruits) {
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
        for (const branch of scene.branches) {
          if (branch.depth < scene.maxDepth - 2) continue;
          if (revealAt(reveal, branch.depth, scene.maxDepth) <= 0) continue;
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

      if (scene.perch && (animalId === 'vogel' || animalId === 'duif')) {
        const x = originX + scene.perch.x * scale;
        const y = originY + scene.perch.y * scale;
        if (animalId === 'vogel') drawBird(ctx, x, y, scale, palette.bark);
        else drawDove(ctx, x, y, scale, t, still);
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
      if (animalId === 'vlinders') drawButterflies(ctx, decor, scene, frame, t, still);

      if (animalId === 'vuurvliegjes' && palette.night) {
        const b = scene.bounds;
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
      const t = still ? 0 : time;
      drawSky(t);
      drawGround();
      drawTree(t);
      drawForeground(t);
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

    return () => {
      stop();
      repaintRef.current = null;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scene, palette, decor, reducedMotion, stillProp, level, framing, animalId, sp]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={ariaLabel ?? `Je boom op niveau ${scene.level}`}
    />
  );
}
