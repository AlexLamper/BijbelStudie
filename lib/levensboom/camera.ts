import { GROUND_Y, TRUNK_X, type TreeScene } from './generate';
import { fillPortrait, fillScene, PORTRAIT_FIT_BELOW_PX } from './growth';

/**
 * Where the tree sits in a frame, growth v2 (plan §4.8).
 *
 * v1 fitted the tree to the frame, so from level 3 on every tree filled it and
 * growth was invisible as size. Now the landscape stays put and the tree
 * takes a designed share of it: `fillScene(position)`, about 22 % at step 1 to
 * 84 % at step 20, of whichever dimension binds (a tall, narrow frame like the
 * lesson card shows growth as width, a wide one as height). The share is exact
 * for every seed, so every step is bigger on screen than the last and a
 * level-up never zooms out past the tree. Bounds include wilted leaves, so
 * health never moves the camera.
 *
 * One function for every renderer: `svg.ts`, `TreeCanvas.tsx`, and the app's
 * `measureTreeFrame` in `backdrop_painter.dart`, which mirrors it.
 */

export type TreeFraming = 'scene' | 'portrait';

export type Frame = {
  scale: number;
  originX: number;
  originY: number;
  /** The trunk base on screen. */
  pivotX: number;
  pivotY: number;
  /** Top of the earth band (scene) or of the ground disc (portrait). */
  groundTop: number;
  /** True when `extents` (a ground animal) forced the camera out past the designed fill. */
  guarded: boolean;
};

/** Share of a scene frame's height that is earth under the ground line. */
export const EARTH_BAND = 0.12;

/** Share of the frame width either side of the trunk a scene may use. */
export const HALF_WIDTH = 0.48;

/** Extra room, in tree units either side of the trunk / above the ground, that must stay in frame (a ground animal). */
export type FrameExtents = { left?: number; right?: number; top?: number };

export function measureFrame(
  width: number,
  height: number,
  scene: Pick<TreeScene, 'bounds' | 'position'>,
  framing: TreeFraming,
  extents?: FrameExtents,
): Frame {
  const { minX, maxX, minY } = scene.bounds;
  const treeH = Math.max(1, GROUND_Y - minY);

  if (framing === 'portrait') {
    const padX = width * 0.1;
    const padY = height * 0.1;
    const contentW = Math.max(1, maxX - minX);
    const fit = Math.min((width - 2 * padX) / contentW, (height - 2 * padY) / treeH);
    // Below 32 px legibility beats the growth story: fit the bounds.
    const scale = Math.min(width, height) >= PORTRAIT_FIT_BELOW_PX ? fit * fillPortrait(scene.position) : fit;
    const originX = width / 2 - ((minX + maxX) / 2) * scale;
    const pivotY = height - padY * 1.15;
    const originY = pivotY - GROUND_Y * scale;
    return { scale, originX, originY, pivotX: originX + TRUNK_X * scale, pivotY, groundTop: pivotY, guarded: false };
  }

  const band = height * EARTH_BAND;
  const groundTop = height - band;
  const half = Math.max(TRUNK_X - minX, maxX - TRUNK_X, 1e-6);
  const designed = fillScene(scene.position) * Math.min(groundTop / treeH, (width * HALF_WIDTH) / half);
  // Centred on the trunk base, so an asymmetric crown never slides the tree
  // sideways as it grows.
  const room = Math.max(half, extents?.left ?? 0, extents?.right ?? 0);
  const guard = Math.min((groundTop * 0.95) / Math.max(treeH, extents?.top ?? 0), (width * HALF_WIDTH) / room);
  const scale = Math.min(designed, guard);
  const pivotY = groundTop + 0.6 * scale;
  const originX = width / 2 - TRUNK_X * scale;
  const originY = pivotY - GROUND_Y * scale;
  return { scale, originX, originY, pivotX: width / 2, pivotY, groundTop, guarded: designed > guard };
}
