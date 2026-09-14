/**
 * A study's own horizon.
 *
 * Every study gets a picture that is generated, not authored: a sky, a land and
 * a ridge line drawn from the same vocabulary the tree stands in
 * (`lib/levensboom/scenes.ts`, `palette.ts`, `backdrop.ts`). One study id in,
 * one stable landscape out, at no asset weight - which is the point. It sits
 * under the study's cover photo (`lib/studyPhotos.ts`) as placeholder and
 * fallback.
 *
 * Two rules this file must never break.
 *
 * 1. **Deterministic, and clock-free.** Season and time of day come from the
 *    SEED, not from `paletteForNow()`. A study that looked like dusk on the
 *    server and noon after hydration is a hydration mismatch, and a study whose
 *    picture changes at 21:00 is not an identity. Never call `Date` here.
 * 2. **Seeded, never random.** One `seededRng` stream per study, drawn in a
 *    fixed order. Adding a draw shifts every later one, so append at the end.
 */

import { hillPath } from './levensboom/backdrop';
import { buildPalette, type Palette, type Season, type TimeOfDay } from './levensboom/palette';
import { seededRng } from './levensboom/rng';
import { sceneSpec, type SceneId } from './levensboom/scenes';

/** The four kinds `curatedStudies` uses, plus the generated book studies. */
export type StudyArtKind = 'Gedeelte' | 'Persoon' | 'Onderwerp' | 'Boek';

/**
 * Which scenes each kind draws from.
 *
 * A bias, not a rule: it keeps a study about a person out of an empty starfield
 * and a topical study out of a city wall, without collapsing the variety. Every
 * scene appears in at least two lists, so nothing is unreachable.
 */
const SCENES_FOR: Record<StudyArtKind, readonly SceneId[]> = {
  Gedeelte: ['waterbeken', 'meer', 'heuvels', 'hof', 'berg'],
  Persoon: ['heuvels', 'woestijn', 'stadsmuur', 'berg', 'meer'],
  Onderwerp: ['hof', 'waterbeken', 'sterrennacht', 'heuvels', 'berg'],
  Boek: ['waterbeken', 'heuvels', 'meer', 'woestijn', 'berg', 'stadsmuur', 'hof', 'sterrennacht'],
};

const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
const TIMES: readonly TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];

export type StudyArt = {
  /** The study id this was derived from. */
  id: string;
  scene: SceneId;
  season: Season;
  /** Before the scene's say: `sterrennacht` still reports night in `palette`. */
  timeOfDay: TimeOfDay;
  palette: Palette;
  /** 0..1 seeded knobs the horizon geometry reads. Stable per study. */
  shape: { amp: number; freq: number; phase: number; lift: number };
};

const cache = new Map<string, StudyArt>();

/**
 * The art for one study. Memoised, because a list page asks for the same 77
 * studies on every render and the derivation is pure.
 */
export function studyArtFor(id: string, kind: StudyArtKind = 'Boek'): StudyArt {
  const key = `${id}|${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;

  // One stream, fixed draw order. Append new draws at the end, never in front.
  const rand = seededRng(`studie:${id}`);
  const candidates = SCENES_FOR[kind];
  const scene = candidates[Math.floor(rand() * candidates.length)];
  const season = SEASONS[Math.floor(rand() * SEASONS.length)];
  const timeOfDay = TIMES[Math.floor(rand() * TIMES.length)];
  const shape = {
    amp: 0.055 + rand() * 0.06,
    freq: 0.9 + rand() * 1.5,
    phase: rand() * Math.PI * 2,
    lift: rand() * 0.05,
  };

  const art: StudyArt = {
    id,
    scene,
    season,
    timeOfDay,
    palette: buildPalette(season, timeOfDay, 1, { scene }),
    shape,
  };
  cache.set(key, art);
  return art;
}

export type HorizonLayer = { d: string; fill: string; opacity?: number };
export type HorizonStar = { cx: number; cy: number; r: number };

export type StudyHorizon = {
  art: StudyArt;
  width: number;
  height: number;
  /** Where the land begins, in the same units as `height`. */
  groundTop: number;
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundDeep: string;
  /** Ridges and water, back to front. */
  layers: HorizonLayer[];
  /** Only ever populated for a night sky. */
  stars: HorizonStar[];
};

/**
 * The horizon as data rather than as a string, so React can render it as real
 * elements. Deliberately composed at whatever ratio it will be drawn at - the
 * banner it replaces was authored at 16:6 and then `object-cover`-cropped by a
 * third in the list, which is a third of a picture thrown away.
 *
 * Never a canvas: this is frequently the LCP element of a study page, and a
 * canvas paints nothing until hydration.
 */
export function studyHorizon(art: StudyArt, width: number, height: number): StudyHorizon {
  const p = art.palette;
  const spec = sceneSpec(art.scene);
  const groundTop = height * 0.74;
  const layers: HorizonLayer[] = [];
  const stars: HorizonStar[] = [];
  const { amp, freq, phase, lift } = art.shape;

  switch (spec.backdrop) {
    case 'hills':
    case 'garden':
    case 'river':
    case 'vineyard':
    case 'field':
    case 'sunrise':
    case 'shepherds':
      layers.push({ d: hillPath(width, groundTop, height * (amp + 0.03), freq, phase, height * lift), fill: p.farAlt });
      layers.push({ d: hillPath(width, groundTop, height * amp, freq * 1.6, phase + 1.8, 0), fill: p.far });
      break;
    case 'dunes':
      layers.push({ d: hillPath(width, groundTop, height * (amp + 0.04), freq * 0.7, phase, height * lift), fill: p.farAlt });
      layers.push({ d: hillPath(width, groundTop, height * amp, freq * 1.1, phase + 2.2, 0), fill: p.far });
      break;
    case 'lake':
    case 'sea': {
      const horizon = groundTop - height * 0.16;
      layers.push({ d: hillPath(width, horizon, height * (amp * 0.6), freq * 1.2, phase, 0), fill: p.far });
      layers.push({
        d: `M0 ${horizon}L${width} ${horizon}L${width} ${groundTop}L0 ${groundTop}Z`,
        fill: p.water ?? p.far,
      });
      break;
    }
    case 'mountain': {
      // The range is the one shape that is not a sine: peaks read as peaks only
      // if they are irregular, so they are seeded offsets on a fixed skeleton.
      const rand = seededRng(`studie:${art.id}:peaks`);
      const peaks: [number, number][] = [];
      const count = 7;
      for (let i = 0; i <= count; i += 1) {
        const t = -0.06 + (i / count) * 1.12;
        peaks.push([t, 0.12 + rand() * 0.34]);
      }
      let d = `M${-width * 0.1} ${groundTop}`;
      for (const [px, py] of peaks) d += `L${px * width} ${groundTop - py * height}`;
      d += `L${width * 1.1} ${groundTop}Z`;
      layers.push({ d, fill: p.far });
      layers.push({ d: hillPath(width, groundTop, height * amp, freq, phase + 3.4, 0), fill: p.farAlt });
      break;
    }
    case 'wall': {
      const wallTop = groundTop - height * 0.19;
      layers.push({ d: hillPath(width, groundTop, height * amp * 0.7, freq, phase, 0), fill: p.farAlt });
      layers.push({
        d: `M0 ${wallTop}L${width} ${wallTop}L${width} ${groundTop}L0 ${groundTop}Z`,
        fill: p.far,
      });
      break;
    }
    case 'stars':
      // A night sky with no ground is not a place. The tree renderer can omit
      // the ridge because the tree itself is standing there; a study banner has
      // nothing in it, so it keeps a low horizon.
      layers.push({ d: hillPath(width, groundTop, height * amp * 0.5, freq * 0.8, phase, 0), fill: p.far, opacity: 0.85 });
      break;
    case 'meadow':
    case 'rainbow':
    default:
      layers.push({ d: hillPath(width, groundTop, height * amp * 0.7, freq, phase, 0), fill: p.far, opacity: 0.55 });
      break;
  }

  if (p.night) {
    const rand = seededRng(`studie:${art.id}:stars`);
    const count = art.scene === 'sterrennacht' ? 46 : 22;
    for (let i = 0; i < count; i += 1) {
      stars.push({
        cx: rand() * width,
        cy: rand() * groundTop * 0.82,
        r: (0.12 + rand() * 0.3) * (height / 100),
      });
    }
  }

  return {
    art,
    width,
    height,
    groundTop,
    skyTop: p.skyTop,
    skyBottom: p.skyBottom,
    ground: p.ground,
    groundDeep: p.groundDeep,
    layers,
    stars,
  };
}
