/**
 * Variant 3 - "Weg". The route art, and the vocabulary the three screens share.
 *
 * One metaphor: a study is a road you walk. Every screen draws the same road -
 * as a horizon on the overview cards and the detail hero, and as a plan-view
 * ribbon in the itinerary and the lesson rail. Teal is always the part behind
 * you; sand is always the part still ahead.
 *
 * Deliberately NOT `lib/studyArt.ts` - that name is reserved for the accepted
 * plan in STUDY_VISUAL_PLAN.md. This is the design-review copy, and it lives
 * with the variant it belongs to.
 *
 * Everything here is pure and seeded: `seededRng('studie:' + id)`, colour from
 * `buildPalette()`, scene from `lib/levensboom/scenes.ts`. No clock (a picture
 * derived from `new Date()` renders differently on the server and the client and
 * costs a hydration mismatch), no `Math.random()`, and no colour that the
 * palette does not already contain. The return value is plain data on purpose,
 * so a server component can compute it once and hand it to a client island.
 */

import {
  buildPalette,
  mix,
  type Season,
  type TimeOfDay,
} from '../../../../lib/levensboom/palette';
import {
  SCENE_IDS,
  sceneSpec,
  type Backdrop,
  type SceneId,
} from '../../../../lib/levensboom/scenes';
import { seededRng } from '../../../../lib/levensboom/rng';
import type { CuratedStudy, StudyType } from '../../../../lib/data/curated-studies';

/** Brand teal. Hardcoded inline everywhere, never a Tailwind token. */
export const TEAL = '#0D9488';

/** Where the ground meets the sky, as a fraction of the strip height. */
export const HORIZON = 0.62;

export interface RidgeSpec {
  /** Fraction of the strip height. */
  amp: number;
  freq: number;
  phase: number;
  /** Fraction of the strip height. */
  lift: number;
}

export interface Star {
  x: number;
  y: number;
  r: number;
}

/**
 * Everything a renderer needs, and nothing it does not. Plain values only:
 * this crosses the server/client boundary as props.
 */
export interface RouteArt {
  scene: SceneId;
  sceneName: string;
  backdrop: Backdrop;
  season: Season;
  timeOfDay: TimeOfDay;
  night: boolean;
  skyTop: string;
  skyBottom: string;
  glow: string;
  far: string;
  farAlt: string;
  ground: string;
  groundDeep: string;
  water: string | null;
  /** The road surface and its shoulder, both mixed out of the palette. */
  road: string;
  roadEdge: string;
  ridgeFar: RidgeSpec;
  ridgeNear: RidgeSpec;
  /** Mountain silhouette heights, as fractions of the strip height. */
  peaks: number[];
  stars: Star[];
  /** How far the road leans off centre, -1 (left) to 1 (right). */
  bend: number;
}

/**
 * Which scenes a study may land in, biased by what it is about.
 *
 * A flat draw over all eight would put Openbaring in a meadow. Genre keeps the
 * picture meaningful; the seed keeps two neighbouring rows in the catalogue
 * distinct. Keys are the `kind` strings `CATALOGUE_ENTRIES` already produces -
 * a book genre for the sixty-six, "Persoon" / "Gedeelte" / "Thema" for the rest.
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
};

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const TIMES: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];

/** 77 entries, computed once per process. No invalidation - a study id's art
 *  is stable for the life of the id, which is the whole point. */
const CACHE = new Map<string, RouteArt>();

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

export function routeArtFor(input: {
  id: string;
  type: StudyType;
  kind?: string;
}): RouteArt {
  const cached = CACHE.get(input.id);
  if (cached) return cached;

  // Namespaced so a study's stream can never collide with a reader's own tree
  // stream, the same way TreeCanvas namespaces its decor stream.
  const rand = seededRng(`studie:${input.id}`);

  const candidates =
    CANDIDATES[input.kind ?? ''] ?? CANDIDATES[input.type] ?? SCENE_IDS;
  const scene = pick(rand, candidates);
  const season = pick(rand, SEASONS);
  const timeOfDay = pick(rand, TIMES);
  const palette = buildPalette(season, timeOfDay, 1, { scene });
  const spec = sceneSpec(scene);

  // Both are drawn from the stream whatever the scene turns out to be, so a
  // study's ridge and bend never shift because of a rendering optimisation;
  // only the storing is conditional, to keep the props handed to the client
  // island small across seventy-seven rows.
  const stars: Star[] = [];
  for (let i = 0; i < 22; i += 1) {
    stars.push({
      x: rand(),
      y: rand() * HORIZON * 0.92,
      r: 0.6 + rand() * 0.9,
    });
  }

  const peaks: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    peaks.push(0.14 + rand() * 0.3);
  }

  const art: RouteArt = {
    scene,
    sceneName: spec.name,
    backdrop: spec.backdrop,
    season,
    timeOfDay: palette.timeOfDay,
    night: palette.night,
    skyTop: palette.skyTop,
    skyBottom: palette.skyBottom,
    glow: palette.glow,
    far: palette.far,
    farAlt: palette.farAlt,
    ground: palette.ground,
    groundDeep: palette.groundDeep,
    water: palette.water,
    road: mix(palette.ground, palette.light, 0.6),
    roadEdge: mix(palette.groundDeep, palette.light, 0.28),
    ridgeFar: {
      amp: 0.06 + rand() * 0.06,
      freq: 0.8 + rand() * 1.5,
      phase: rand() * Math.PI * 2,
      lift: 0.02 + rand() * 0.05,
    },
    ridgeNear: {
      amp: 0.035 + rand() * 0.04,
      freq: 1.2 + rand() * 2.2,
      phase: rand() * Math.PI * 2,
      lift: 0,
    },
    peaks: spec.backdrop === 'mountain' ? peaks : [],
    stars: spec.backdrop === 'stars' ? stars : [],
    bend: rand() * 1.6 - 0.8,
  };

  CACHE.set(input.id, art);
  return art;
}

// ---------------------------------------------------------------------------
// Geometry. All of it pure, all of it in the strip's own coordinate space.
// ---------------------------------------------------------------------------

/** Two decimals is plenty at these sizes, and keeps the markup short. */
function f(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * A sine ridge across the strip. Same shape as `hillPath` in
 * `lib/levensboom/svg.ts`; copied rather than imported because that one is not
 * exported and this variant must not modify an existing file.
 */
export function hillPath(
  width: number,
  baseY: number,
  amp: number,
  freq: number,
  phase: number,
  lift: number,
): string {
  let d = `M0 ${f(baseY + amp * 2)}`;
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * width;
    const y = baseY - lift - amp * (0.5 + 0.5 * Math.sin((i / steps) * freq * Math.PI * 2 + phase));
    d += `L${f(x)} ${f(y)}`;
  }
  return `${d}L${f(width)} ${f(baseY + amp * 2)}Z`;
}

export function ridgePath(
  width: number,
  height: number,
  groundTop: number,
  spec: RidgeSpec,
): string {
  return hillPath(width, groundTop, height * spec.amp, spec.freq, spec.phase, height * spec.lift);
}

/** Quadratic Bézier, one axis at a time. */
function quad(t: number, a: number, b: number, c: number): number {
  const u = 1 - t;
  return u * u * a + 2 * u * t * b + t * t * c;
}

export interface RoadPoint {
  x: number;
  y: number;
  /** Half the road's width at this point. */
  half: number;
}

/**
 * The road, in perspective: it leaves the bottom of the frame at your feet and
 * narrows to a point on the horizon. `t` runs 0 (here) to 1 (the horizon), so
 * "how far you have walked" is simply how much of the road is teal.
 */
export function roadPoint(t: number, width: number, height: number, bend: number): RoadPoint {
  const horizonY = height * HORIZON;
  const x0 = width * (0.5 - bend * 0.34);
  const y0 = height * 1.04;
  const x1 = width * (0.5 - bend * 0.05);
  const y1 = horizonY + (height - horizonY) * 0.45;
  const x2 = width * (0.5 + bend * 0.2);
  const y2 = horizonY;

  const baseHalf = width * 0.15;
  const topHalf = Math.max(0.5, width * 0.007);

  return {
    x: quad(t, x0, x1, x2),
    y: quad(t, y0, y1, y2),
    half: topHalf + (baseHalf - topHalf) * Math.pow(1 - t, 1.6),
  };
}

/** A closed ribbon between two points along the road. */
export function roadRibbon(
  width: number,
  height: number,
  bend: number,
  from = 0,
  to = 1,
): string {
  const steps = 16;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = from + ((to - from) * i) / steps;
    const point = roadPoint(t, width, height, bend);
    left.push(`${f(point.x - point.half)} ${f(point.y)}`);
    right.push(`${f(point.x + point.half)} ${f(point.y)}`);
  }
  right.reverse();
  return `M${left.join('L')}L${right.join('L')}Z`;
}

// ---------------------------------------------------------------------------
// Reading the catalogue in the language of a journey
// ---------------------------------------------------------------------------

/** "Johannes 20" - where a study sets out, and where it ends. */
export function routeEnds(study: CuratedStudy): { from: string; to: string } {
  const lessons = study.lessons;
  const first = lessons[0];
  const last = lessons[lessons.length - 1];
  return {
    from: first ? `${first.book} ${first.chapter}` : study.startBook,
    to: last ? `${last.book} ${last.chapter}` : study.startBook,
  };
}

/** "Johannes 20:19–31" - one stop, written out. */
export function stopReference(lesson: {
  book: string;
  chapter: number;
  verseRange?: string | null;
}): string {
  return `${lesson.book} ${lesson.chapter}${lesson.verseRange ? `:${lesson.verseRange}` : ''}`;
}

export type RouteBand = 'kort' | 'maand' | 'lang';

/**
 * How long the walk is, in the only units a reader actually weighs: how many
 * days of it there are. The boundaries are a week and a month, because those
 * are the two commitments people already know the size of.
 */
export function routeBand(lessonCount: number): RouteBand {
  if (lessonCount <= 7) return 'kort';
  if (lessonCount <= 31) return 'maand';
  return 'lang';
}

export const BAND_LABELS: Record<RouteBand, { title: string; blurb: string }> = {
  kort: {
    title: 'Kort — een week of minder',
    blurb: 'Zeven stops of minder. Uit te lopen voor de zondag weer komt.',
  },
  maand: {
    title: 'Een maand onderweg',
    blurb: 'Acht tot eenendertig stops. Lang genoeg om ritme te krijgen.',
  },
  lang: {
    title: 'Lange tocht — door een heel boek',
    blurb: 'Meer dan een maand. Hoofdstuk voor hoofdstuk, in volgorde.',
  },
};

/** "3 stops" / "1 stop". */
export function stopCount(count: number): string {
  return `${count} ${count === 1 ? 'stop' : 'stops'}`;
}

/**
 * One catalogue row, flattened.
 *
 * Built on the server and handed to the client island as plain data, so the
 * sixty-six books' prose in `lib/content/bibleBooks` never reaches the browser
 * and the art is derived once instead of seventy-seven times per tab.
 */
export interface RouteRow {
  id: string;
  title: string;
  description: string;
  /** "Evangelie", "Persoon", "Thema" - the terrain, in one word. */
  kind: string;
  category: 'ot' | 'nt' | 'personen' | 'themas';
  lessonCount: number;
  /** "2,5 uur" - the whole walk, already formatted. */
  totalLabel: string;
  from: string;
  to: string;
  band: RouteBand;
  /** Canonical position, for the "Bijbelvolgorde" sort. */
  order: number;
  /** Everything a search should match, lowercased once on the server. */
  haystack: string;
  art: RouteArt;
  /** Demo progress. `null` means the reader has not set out. */
  walked: { done: number; completed: boolean } | null;
}
