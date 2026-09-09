/**
 * Seeded horizon art for design variant 2, "Vensters".
 *
 * REVIEW-ONLY. This module exists so /studies/versie-2, /studies/versie-2/[id]
 * and /studie/versie-2/[id]/[day] can be judged as a whole; it is deliberately
 * NOT lib/studyArt.ts, which is the name the accepted plan
 * (STUDY_VISUAL_PLAN.md §3.1) reserves for the real implementation. Delete this
 * folder together with the versie-* routes once a direction is chosen.
 *
 * The rules it follows, from that plan:
 *
 *  - Every colour comes from `buildPalette()`. Nothing here invents a hex that
 *    the levensboom palette does not already have, apart from the neutral
 *    slate-950 scrim behind text and literal white on top of it - those are
 *    contrast machinery, not colour.
 *  - The only randomness is `seededRng`, namespaced `studie:` so a study's
 *    stream can never collide with a reader's own tree stream.
 *  - Season and time of day come from the SEED, never from the clock, so the
 *    server HTML and the client render can never disagree.
 *  - Nothing here touches lib/levensboom/ - it only reads from it. `hillPath`
 *    is copied rather than imported because svg.ts keeps it module-private, and
 *    a preview variant may not edit the parity surface.
 */

import { buildPalette, mix, type Palette, type Season, type TimeOfDay } from '../../../../lib/levensboom/palette';
import { SCENE_IDS, sceneSpec, type SceneId } from '../../../../lib/levensboom/scenes';
import { fnv1a32, seededRng } from '../../../../lib/levensboom/rng';
import type { StudyType } from '../../../../lib/data/curated-studies';

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const TIMES: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];

/**
 * Which scenes a study may be drawn in.
 *
 * Biased rather than flat, so the picture stays MEANINGFUL - Exodus in the
 * desert, Openbaring under stars - while the seed keeps neighbours DISTINCT
 * inside that bias. Keyed by `CatalogueEntry.kind` first (the book genre, or
 * "Persoon"/"Gedeelte"/"Thema" for the authored studies), then by the study
 * type as a floor.
 */
const CANDIDATES: Record<string, SceneId[]> = {
  Wet: ['woestijn', 'berg'],
  Geschiedenis: ['stadsmuur', 'heuvels'],
  'Poëzie en wijsheid': ['waterbeken', 'hof', 'sterrennacht'],
  'Grote profeten': ['berg', 'stadsmuur'],
  'Kleine profeten': ['heuvels', 'woestijn'],
  Evangelie: ['meer', 'heuvels'],
  Brief: ['stadsmuur', 'meer'],
  Apocalyptiek: ['sterrennacht', 'berg'],
  Persoon: ['heuvels', 'woestijn'],
  Gedeelte: ['meer', 'hof'],
  Thema: ['waterbeken', 'sterrennacht'],
  Onderwerp: ['waterbeken', 'sterrennacht'],
  Boek: [...SCENE_IDS],
};

export interface StudyArtInput {
  id: string;
  type: StudyType;
  /** `CatalogueEntry.kind`: the genre for a book study, else the type in words. */
  kind?: string;
}

export interface Ridge {
  amp: number;
  freq: number;
  phase: number;
  lift: number;
}

export interface StudyArt {
  id: string;
  scene: SceneId;
  season: Season;
  timeOfDay: TimeOfDay;
  palette: Palette;
  /** The two silhouettes, back to front. */
  far: Ridge;
  near: Ridge;
  /** Where the ground band starts, in the 0-60 view space. */
  groundTop: number;
  /** Sun or moon, as a fraction of the frame. */
  light: { x: number; y: number };
  /** Seeded star field; empty unless the palette says it is night. */
  stars: { x: number; y: number; r: number }[];
  /** Peaks for a mountain scene, wall teeth for a city wall. Empty otherwise. */
  crest: number[];
  /** A stable, collision-free suffix for SVG element ids. */
  key: string;
}

/** 77 studies, computed once per process or tab. No invalidation: it is pure. */
const CACHE = new Map<string, StudyArt>();

/** Pure, seeded, and stable for the life of a study id. */
export function studyArtFor(input: StudyArtInput): StudyArt {
  const cached = CACHE.get(input.id);
  if (cached) return cached;

  const rand = seededRng(`studie:${input.id}`);
  const pool = CANDIDATES[input.kind ?? ''] ?? CANDIDATES[input.type] ?? [...SCENE_IDS];
  const scene = pool[Math.floor(rand() * pool.length)] ?? SCENE_IDS[0];
  const season = SEASONS[Math.floor(rand() * SEASONS.length)];
  const timeOfDay = TIMES[Math.floor(rand() * TIMES.length)];
  const palette = buildPalette(season, timeOfDay, 1, { scene });

  const art: StudyArt = {
    id: input.id,
    scene,
    season,
    timeOfDay,
    palette,
    far: { amp: 4 + rand() * 5, freq: 0.8 + rand() * 1.1, phase: rand() * 6.28, lift: 2 + rand() * 4 },
    near: { amp: 3 + rand() * 4, freq: 1.4 + rand() * 1.6, phase: rand() * 6.28, lift: 0 },
    groundTop: 40 + rand() * 6,
    light: { x: 12 + rand() * 74, y: lightHeight(palette.timeOfDay, rand()) },
    stars: palette.night ? starField(rand) : [],
    crest: crestFor(sceneSpec(scene).backdrop, rand),
    key: fnv1a32(`studie:${input.id}`).toString(36),
  };

  CACHE.set(input.id, art);
  return art;
}

/**
 * The same place, a different hour.
 *
 * A lesson thumbnail keeps the study's palette and scene and re-draws only the
 * silhouette, so the filmstrip on the detail screen reads as one landscape seen
 * from twelve points along a walk rather than twelve unrelated pictures.
 */
export function lessonArtFor(art: StudyArt, day: number): StudyArt {
  const rand = seededRng(`studie:${art.id}:les:${day}`);
  return {
    ...art,
    far: { amp: 4 + rand() * 5, freq: 0.8 + rand() * 1.1, phase: rand() * 6.28, lift: 2 + rand() * 4 },
    near: { amp: 3 + rand() * 4, freq: 1.4 + rand() * 1.6, phase: rand() * 6.28, lift: 0 },
    groundTop: 40 + rand() * 6,
    light: { x: 12 + rand() * 74, y: art.light.y },
    stars: art.palette.night ? starField(rand) : [],
    crest: crestFor(sceneSpec(art.scene).backdrop, rand),
    key: `${art.key}-${day}`,
  };
}

function lightHeight(timeOfDay: TimeOfDay, roll: number): number {
  // Low and warm at dawn and dusk, high at noon, high and small at night.
  if (timeOfDay === 'day') return 14 + roll * 16;
  if (timeOfDay === 'night') return 12 + roll * 18;
  return 44 + roll * 14;
}

/**
 * Sky only, and in percentages of the frame rather than view units: the stars
 * are drawn as DOM dots outside the stretched SVG, because a `<circle>` inside a
 * `preserveAspectRatio="none"` viewBox turns into a streak on a 21:5 band.
 */
function starField(rand: () => number): { x: number; y: number; r: number }[] {
  return Array.from({ length: 18 }, () => ({
    x: 2 + rand() * 96,
    y: 4 + rand() * 52,
    r: 1 + Math.round(rand() * 2),
  }));
}

function crestFor(backdrop: string, rand: () => number): number[] {
  if (backdrop === 'mountain') {
    // Eight peak heights, as a fraction of the sky band.
    return Array.from({ length: 8 }, () => 0.16 + rand() * 0.34);
  }
  if (backdrop === 'wall') {
    // Twelve merlons: 1 means a tooth, 0 an embrasure. Seeded so two walled
    // studies do not share the same battlement.
    return Array.from({ length: 12 }, () => (rand() > 0.42 ? 1 : 0));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * The window's drawing space. Everything is composed inside it and the SVG is
 * rendered with `preserveAspectRatio="none"`, so a window composes to fit at
 * 21:5, 16:10 or 3:2 and never crops - which is the third problem
 * STUDY_VISUAL_PLAN.md §1.3 records about today's 96x64 `object-cover` thumb.
 */
export const VIEW_W = 100;
export const VIEW_H = 60;

const f = (n: number) => (Math.round(n * 100) / 100).toString();

/** Copied verbatim from lib/levensboom/svg.ts, which keeps it module-private. */
function hillPath(width: number, baseY: number, amp: number, freq: number, phase: number, lift: number): string {
  let d = `M0 ${f(baseY + amp * 2)}`;
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * width;
    const y = baseY - lift - amp * (0.5 + 0.5 * Math.sin((i / steps) * freq * Math.PI * 2 + phase));
    d += `L${f(x)} ${f(y)}`;
  }
  return `${d}L${f(width)} ${f(baseY + amp * 2)}Z`;
}

export interface HorizonShape {
  d: string;
  fill: string;
  opacity?: number;
}

export interface Horizon {
  groundTop: number;
  shapes: HorizonShape[];
}

/** Every silhouette behind the ground band, back to front. */
export function horizonOf(art: StudyArt): Horizon {
  const p = art.palette;
  const top = art.groundTop;
  const shapes: HorizonShape[] = [];
  const backdrop = sceneSpec(art.scene).backdrop;

  switch (backdrop) {
    case 'mountain': {
      const step = VIEW_W / (art.crest.length - 1);
      let d = `M-6 ${f(top)}`;
      art.crest.forEach((height, index) => {
        d += `L${f(index * step)} ${f(top - height * top)}`;
      });
      d += `L106 ${f(top)}Z`;
      shapes.push({ d, fill: p.far });
      shapes.push({ d: hillPath(VIEW_W, top, art.near.amp, art.near.freq, art.near.phase, 0), fill: p.farAlt });
      break;
    }
    case 'wall': {
      const wallTop = top - 10;
      const toothW = VIEW_W / art.crest.length;
      let d = `M0 ${f(top)}L0 ${f(wallTop)}`;
      art.crest.forEach((tooth, index) => {
        const x0 = index * toothW;
        const y = tooth ? wallTop - 2.6 : wallTop;
        d += `L${f(x0)} ${f(y)}L${f(x0 + toothW)} ${f(y)}`;
      });
      d += `L${VIEW_W} ${f(top)}Z`;
      shapes.push({ d: hillPath(VIEW_W, wallTop, art.far.amp * 0.5, art.far.freq, art.far.phase, 0), fill: p.farAlt, opacity: 0.7 });
      shapes.push({ d, fill: p.far });
      break;
    }
    case 'lake': {
      const horizon = top - 9;
      shapes.push({ d: hillPath(VIEW_W, horizon, art.far.amp * 0.6, art.far.freq, art.far.phase, 0), fill: p.far });
      shapes.push({ d: band(horizon, top - horizon), fill: p.water ?? p.far });
      break;
    }
    case 'dunes': {
      shapes.push({ d: hillPath(VIEW_W, top, art.far.amp, art.far.freq * 0.7, art.far.phase, art.far.lift), fill: p.farAlt });
      shapes.push({ d: hillPath(VIEW_W, top, art.near.amp, art.near.freq * 0.6, art.near.phase, 0), fill: p.far });
      break;
    }
    case 'meadow': {
      shapes.push({ d: hillPath(VIEW_W, top, art.far.amp * 0.7, art.far.freq, art.far.phase, art.far.lift), fill: p.farAlt, opacity: 0.75 });
      shapes.push({ d: hillPath(VIEW_W, top, art.near.amp * 0.6, art.near.freq, art.near.phase, 0), fill: p.far, opacity: 0.9 });
      // Waterbeken has water in the palette; a meadow without it is a field.
      if (p.water) shapes.push({ d: band(top + 4, 3.4), fill: p.water, opacity: 0.85 });
      break;
    }
    default: {
      // hills, garden, stars. svg.ts draws nothing at all behind `stars`,
      // because the tree is the subject there. A window has no tree, and a
      // night sky with no horizon is not a place - so the ridge stays, drawn in
      // the scene's own near-black far colours.
      shapes.push({ d: hillPath(VIEW_W, top, art.far.amp, art.far.freq, art.far.phase, art.far.lift), fill: p.farAlt });
      shapes.push({ d: hillPath(VIEW_W, top, art.near.amp, art.near.freq, art.near.phase, 0), fill: p.far });
      if (p.water) shapes.push({ d: band(top + 5, 2.8), fill: p.water, opacity: 0.7 });
      break;
    }
  }

  return { groundTop: top, shapes };
}

function band(y: number, height: number): string {
  return `M0 ${f(y)}H${VIEW_W}V${f(y + height)}H0Z`;
}

// ---------------------------------------------------------------------------
// Contrast
// ---------------------------------------------------------------------------

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0-1. */
export function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const r = channel(parseInt(value.slice(0, 2), 16));
  const g = channel(parseInt(value.slice(2, 4), 16));
  const b = channel(parseInt(value.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const INK_DARK = '#0f172a';
const INK_LIGHT = '#f1f5f9';

/**
 * A study's accent, pushed until it is readable as TEXT on the page ground.
 *
 * `sterrennacht`'s accent is #F5F0C8 - a pale star yellow, correct in the sky
 * and invisible as a hairline on a white page. Rather than throw the palette
 * away and pick a token, the colour is mixed toward slate until it clears
 * roughly 6:1 on white (or toward near-white until it clears the same on the
 * dark ground). The hue survives; the contrast is guaranteed.
 */
export function readableInk(color: string, mode: 'light' | 'dark'): string {
  const target = mode === 'light' ? 0.115 : 0.42;
  const toward = mode === 'light' ? INK_DARK : INK_LIGHT;
  let out = color.toLowerCase();
  for (let step = 0; step <= 20; step += 1) {
    out = mix(color, toward, step / 20);
    const l = luminance(out);
    if (mode === 'light' ? l <= target : l >= target) return out;
  }
  return toward;
}

export function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The scrims.
 *
 * Slate-950 at a literal alpha, never a theme token: a window keeps its own
 * palette in both themes, so the thing guaranteeing white text stays readable
 * has to be independent of the theme. The stops are placed so that anything
 * sitting in the bottom 38% of a window is over at least 0.78 alpha - about
 * 10:1 against white even over the brightest sky the palette can produce
 * (the summer noon dune, #f6e3c0).
 */
export const SCRIM_CARD =
  'linear-gradient(to top, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.80) 38%, rgba(2,6,23,0.40) 66%, rgba(2,6,23,0) 100%)';
export const SCRIM_HERO =
  'linear-gradient(to top, rgba(2,6,23,0.94) 0%, rgba(2,6,23,0.84) 44%, rgba(2,6,23,0.52) 72%, rgba(2,6,23,0.14) 100%)';
export const SCRIM_TOP =
  'linear-gradient(to bottom, rgba(2,6,23,0.62) 0%, rgba(2,6,23,0.22) 44%, rgba(2,6,23,0) 100%)';
/**
 * For the lesson strip, where text sits across the whole width rather than low,
 * so the floor has to hold everywhere. 0.74 is the thinnest point: over the
 * brightest sky in the set that is still about 10:1 against white.
 */
export const SCRIM_STRIP =
  'linear-gradient(to right, rgba(2,6,23,0.90) 0%, rgba(2,6,23,0.74) 52%, rgba(2,6,23,0.82) 100%)';

/** White on a scrim. Literal, for the same reason the scrim is literal. */
export const ON_ART = '#ffffff';
export const ON_ART_MUTED = 'rgba(255,255,255,0.86)';
export const ON_ART_FAINT = 'rgba(255,255,255,0.68)';

/**
 * The page tint: CSS custom properties derived from one study's palette, plus
 * the hover and focus rules that use them.
 *
 * Scoped to an element id so two tinted regions can never leak into each other,
 * and split light/dark because `darkMode: ["class"]` puts `.dark` on <html>.
 * The brand teal is NOT replaced - it stays the primary action colour; the
 * study's own colour takes the eyebrows, the rules and the hover.
 */
export function tintCss(scopeId: string, palette: Palette): string {
  const light = readableInk(palette.accent, 'light');
  const dark = readableInk(palette.accent, 'dark');
  /**
   * `--vs-solid` is the light-mode ink in BOTH themes, and it is the only one
   * that ever sits under white text (the primary button's hover). The dark-mode
   * ink is deliberately bright so it can be read as text on a dark ground -
   * which makes it exactly the wrong thing to put behind a white label.
   */
  const vars = (ink: string) =>
    `--vs-ink:${ink};--vs-rule:${rgba(ink, 0.28)};--vs-wash:${rgba(ink, 0.07)};--vs-edge:${rgba(ink, 0.16)};--vs-solid:${light}`;

  return [
    `#${scopeId}{${vars(light)}}`,
    `.dark #${scopeId}{${vars(dark)}}`,
    `#${scopeId} .vs-ink{color:var(--vs-ink)}`,
    `#${scopeId} .vs-rule{background-color:var(--vs-rule)}`,
    `#${scopeId} .vs-wash{background-color:var(--vs-wash)}`,
    `#${scopeId} .vs-edge{border-color:var(--vs-edge)}`,
    `#${scopeId} .vs-primary{background-color:#0D9488}`,
    `#${scopeId} .vs-primary:hover{background-color:var(--vs-solid)}`,
    `#${scopeId} .vs-hover:hover{color:var(--vs-ink)}`,
    `#${scopeId} .vs-edge-hover:hover{border-color:var(--vs-ink)}`,
    `#${scopeId} .vs-focus:focus-visible{outline:2px solid var(--vs-ink);outline-offset:2px;border-radius:0.5rem}`,
    // A control standing ON the picture cannot take the study's ink - half the
    // palettes would put a dark ring on a dark sky. White is the only colour
    // guaranteed against every scrim, which is the same reason the text is white.
    `#${scopeId} .vs-focus-art:focus-visible{outline:2px solid #ffffff;outline-offset:2px;border-radius:0.5rem}`,
  ].join('');
}
