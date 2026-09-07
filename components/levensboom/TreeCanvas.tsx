'use client';

import { useEffect, useMemo, useRef } from 'react';
import { generateTree, GROUND_Y, TRUNK_X, type TreeScene } from '../../lib/levensboom/generate';
import { mix, paletteForNow, type Palette } from '../../lib/levensboom/palette';
import { seededRng } from '../../lib/levensboom/rng';

/**
 * The Levensboom, drawn to a canvas.
 *
 * Two layers, for a reason. The branches barely move, so they are rendered once
 * to an offscreen canvas and re-drawn each frame under a single small rotation
 * about the trunk base - that is the whole-canopy sway, for the cost of one
 * `drawImage`. Everything that has to move independently (leaves shimmering on
 * their own phase, fruit, fireflies, motes) is drawn live on top. Without the
 * split, a level-20 tree means re-tessellating ~300 tapered bezier outlines
 * sixty times a second for no visible gain.
 *
 * The loop stops when the tab is hidden or the canvas scrolls out of view, and
 * never starts at all under reduced motion - one static frame instead.
 */

const DEG = Math.PI / 180;
const SWAY_DEGREES = 0.85;
const MOTE_COUNT = 18;
const STAR_COUNT = 60;
const DRIFTER_COUNT = 14;
/** The `seasons` trait (docs/levensboom-spec.md §6) arrives here. */
const SEASONS_TRAIT_LEVEL = 25;

export type TreeCanvasProps = {
  seed: string;
  level: number;
  /** xpIntoLevel / xpForNextLevel. */
  frac: number;
  /** 0.3..1; below 1 the tree droops and sheds. */
  health?: number;
  /** 0..1. Below 1 the tree is mid grow-in; the level-up sequence drives this. */
  reveal?: number;
  reducedMotion?: boolean;
  className?: string;
  /** Overrides the device clock. Only the level-up dialog uses this (night). */
  palette?: Palette;
  /** Adds the rising column of light motes the level-up sequence calls for. */
  celebration?: boolean;
  /** Index of a fruit to swell with a soft bloom, when a level-up unlocked one. */
  bloomFruit?: number | null;
};

type Mote = { x: number; y: number; r: number; speed: number; phase: number };
type Star = { x: number; y: number; r: number; phase: number };
/** Petals and falling leaves: same shape, different season. */
type Drifter = { x: number; y: number; size: number; speed: number; drift: number; phase: number };

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

function drawBranches(
  ctx: CanvasRenderingContext2D,
  scene: TreeScene,
  palette: Palette,
  scale: number,
  originX: number,
  originY: number,
  reveal: number,
) {
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

export default function TreeCanvas({
  seed,
  level,
  frac,
  health = 1,
  reveal = 1,
  reducedMotion,
  className,
  palette: paletteOverride,
  celebration = false,
  bloomFruit = null,
}: TreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const scene = useMemo(
    () => generateTree({ seed, level, frac, health }),
    [seed, level, frac, health],
  );

  // The device clock only ever touches colour, so it is read once per mount
  // rather than being threaded through the generator.
  const palette = useMemo(
    () => paletteOverride ?? paletteForNow(health),
    [paletteOverride, health],
  );

  const decor = useMemo(() => {
    // A separate stream, so adding a mote can never shift the tree's own draws.
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
    return { motes, stars, drifters };
  }, [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const still = reducedMotion ?? prefersReducedMotion();

    let width = 0;
    let height = 0;
    let scale = 1;
    let originX = 0;
    let originY = 0;
    let frame = 0;
    let visible = true;
    let running = false;

    // The branch layer, rebuilt only when the geometry or the box changes.
    const layer = document.createElement('canvas');
    const layerCtx = layer.getContext('2d');

    const measure = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Frame what the tree actually occupies rather than the design box: a
      // sapling and a level-30 tree are wildly different heights, and a fixed
      // box leaves one a speck in an empty sky and the other cramped.
      const { minX, maxX, minY, maxY } = scene.bounds;
      const contentW = Math.max(1, maxX - minX);
      const contentH = Math.max(1, maxY - minY);
      scale = Math.min(width / contentW, height / contentH);
      originX = (width - contentW * scale) / 2 - minX * scale;
      // Bottom-anchored, so the ground line sits on the bottom edge.
      originY = height - contentH * scale - minY * scale;

      layer.width = canvas.width;
      layer.height = canvas.height;
      if (layerCtx) {
        layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        layerCtx.clearRect(0, 0, width, height);
        drawBranches(layerCtx, scene, palette, scale, originX, originY, reveal);
      }
    };

    const draw = (time: number) => {
      const t = still ? 0 : time;
      const sway = Math.sin(t * 0.00042) * SWAY_DEGREES + Math.sin(t * 0.00097) * SWAY_DEGREES * 0.3;
      const pivotX = originX + TRUNK_X * scale;
      const pivotY = originY + GROUND_Y * scale;

      // --- sky ------------------------------------------------------------
      const sky = ctx.createLinearGradient(0, 0, 0, height);
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
          ctx.arc(
            (star.x / 100) * width,
            (star.y / 100) * height,
            Math.max(0.5, star.r * scale),
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // --- glow behind the canopy ----------------------------------------
      // Centred on the canopy, wherever the canopy happens to be for this level.
      const glowY = originY + ((scene.bounds.minY + GROUND_Y) / 2) * scale;
      const glowR = Math.max(30, (GROUND_Y - scene.bounds.minY) * 0.7) * scale;
      const glow = ctx.createRadialGradient(pivotX, glowY, 0, pivotX, glowY, glowR);
      glow.addColorStop(0, `${palette.glow}66`);
      glow.addColorStop(1, `${palette.glow}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // --- ground ---------------------------------------------------------
      // A band of earth the tree stands on, plus a soft shadow at the foot of
      // the trunk. An opaque mound here reads as a brown lens floating in the
      // sky, which is what the first pass drew.
      const groundTop = pivotY + 1.5 * scale;
      const earth = ctx.createLinearGradient(0, groundTop, 0, height);
      earth.addColorStop(0, palette.ground);
      earth.addColorStop(1, mix(palette.ground, palette.bark, 0.7));
      ctx.fillStyle = earth;
      ctx.fillRect(0, groundTop, width, height - groundTop);

      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = palette.bark;
      ctx.beginPath();
      ctx.ellipse(pivotX, groundTop + 0.8 * scale, 13 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- tree -----------------------------------------------------------
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(sway * DEG);
      ctx.translate(-pivotX, -pivotY);
      ctx.drawImage(layer, 0, 0, width, height);

      const leafScale = (1.1 + 0.8 * scene.growth) * scale;
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

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((leaf.angle + shimmer * 6) * DEG);
        ctx.fillStyle = leaf.phase > 0.5 ? palette.leafAlt : palette.leaf;
        ctx.globalAlpha = leaf.open ? 1 : 0.75;
        ctx.beginPath();
        ctx.ellipse(size * 0.6, 0, size, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
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
        // so the eye is told which one is new (§8.4).
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

        ctx.fillStyle = palette.fruit;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        // One highlight dot: enough to read as round rather than as a sticker.
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = palette.light;
        ctx.beginPath();
        ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
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
          ctx.ellipse(
            originX + branch.cx * scale + nx * side * w,
            originY + branch.cy * scale + ny * side * w,
            w * 1.5,
            w * 0.7,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (scene.bird) {
        const x = originX + scene.bird.x * scale;
        const y = originY + scene.bird.y * scale;
        const s = Math.max(2, 2.6 * scale);
        ctx.strokeStyle = palette.bark;
        ctx.lineWidth = Math.max(1, 0.45 * scale);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y);
        ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y);
        ctx.stroke();
      }

      ctx.restore();

      // --- foreground ------------------------------------------------------
      if (palette.night && scene.fireflies.length > 0) {
        for (const fly of scene.fireflies) {
          const pulse = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.0013 + fly.phase * 6.283));
          const drift = still ? 0 : Math.sin(t * 0.0005 + fly.phase * 6.283) * 1.6;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#FFE9A8';
          ctx.beginPath();
          ctx.arc(
            originX + (fly.x + drift) * scale,
            originY + fly.y * scale,
            0.6 * scale,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // --- drifting petals and falling leaves ------------------------------
      // Autumn drops the occasional leaf for everyone; the blossom storm is the
      // level-25 `seasons` trait and only blows in spring. Both are the same
      // drifters, so a season change costs a colour and nothing else.
      const hasSeasons = level >= SEASONS_TRAIT_LEVEL;
      const drifterColor =
        palette.season === 'autumn'
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
          const y = (((drifter.y + fall) % 130) + 130) % 130 - 15;
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
      if (celebration && !still) {
        const columnX = originX + TRUNK_X * scale;
        ctx.fillStyle = palette.light;
        for (let i = 0; i < 22; i += 1) {
          const phase = (i / 22 + t * 0.00022) % 1;
          const y = pivotY - phase * (pivotY - originY);
          const spread = (1 - phase) * 9 * scale;
          ctx.globalAlpha = 0.5 * Math.sin(phase * Math.PI);
          ctx.beginPath();
          ctx.arc(
            columnX + Math.sin(t * 0.0015 + i) * spread,
            y,
            Math.max(0.7, 0.7 * scale),
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Pollen in the sunbeam. Cheap, and it is most of what makes a still
      // image read as a living scene.
      ctx.fillStyle = palette.light;
      for (const mote of decor.motes) {
        const rise = still ? 0 : (t * 0.004 * mote.speed) % 100;
        const y = ((mote.y - rise) % 100 + 100) % 100;
        const wobble = still ? 0 : Math.sin(t * 0.0009 + mote.phase * 6.283) * 1.2;
        ctx.globalAlpha = 0.16 + 0.14 * Math.sin(t * 0.001 + mote.phase * 6.283);
        ctx.beginPath();
        ctx.arc(
          ((mote.x + wobble) / 100) * width,
          (y / 100) * height,
          Math.max(0.6, mote.r * scale),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (time: number) => {
      draw(time);
      if (running) frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || still || !visible || document.hidden) return;
      running = true;
      frame = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    measure();
    draw(0);
    start();

    const resizeObserver = new ResizeObserver(() => {
      measure();
      if (!running) draw(0);
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
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scene, palette, decor, reveal, reducedMotion, celebration, bloomFruit, level]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={`Je levensboom op niveau ${scene.level}`}
    />
  );
}
