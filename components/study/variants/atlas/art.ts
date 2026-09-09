/**
 * Atlas (ontwerp 1) - de horizon per studie.
 *
 * STUDY_VISUAL_PLAN.md richting (d): de variatie komt uit de palet-ruimte en uit
 * gezaaide geometrie, niet uit acht vaste backdrops. Alles hier is puur en
 * klokvrij - de seizoen- en tijdkeuze komt uit de seed, nooit uit `new Date()`,
 * anders verschilt de server-HTML van de client-render en logt React een
 * hydration mismatch.
 *
 * Dit bestand is bewust GEEN `lib/studyArt.ts`: die naam hoort bij het
 * geaccepteerde plan. Dit is het hulpmiddel van dit ene ontwerpvoorstel en
 * leeft daarom in de variantmap.
 *
 * Geen enkele kleur wordt hier zelf verzonnen. Alles komt uit
 * `lib/levensboom/palette.ts`; een kleur die daar ontbreekt is een bug daar.
 * `hillPath()` in `lib/levensboom/svg.ts` is niet geexporteerd, dus de
 * rugvorm staat hier in dezelfde vorm opnieuw - lezen mag, wijzigen niet.
 */

import { buildPalette, type Palette, type Season, type TimeOfDay } from '../../../../lib/levensboom/palette';
import { SCENE_IDS, sceneSpec, type SceneId } from '../../../../lib/levensboom/scenes';
import { seededRng } from '../../../../lib/levensboom/rng';
import type { StudyType } from '../../../../lib/data/curated-studies';

/** De vier parameters van een heuvellijn, precies als in `hillPath()`. */
export interface Horizon {
  amp: number;
  freq: number;
  phase: number;
  lift: number;
}

export interface Star {
  x: number;
  y: number;
  r: number;
}

export interface StudyArt {
  scene: SceneId;
  /** "Meer van Galilea" - de naam uit `scenes.ts`, voor het onderschrift. */
  sceneName: string;
  season: Season;
  /** Na het oordeel van de scene: `sterrennacht` meldt nacht, ook om twaalf uur. */
  timeOfDay: TimeOfDay;
  palette: Palette;
  /** De verre rug, achter. */
  far: Horizon;
  /** De nabije rug, ervoor. */
  near: Horizon;
  /** Alleen bij nacht gevuld. Gezaaid, dus stabiel per studie. */
  stars: Star[];
  /** "Meer van Galilea - zomer, avondlicht". Nederlands, voor bijschrift en label. */
  caption: string;
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: 'lente',
  summer: 'zomer',
  autumn: 'herfst',
  winter: 'winter',
};

export const TIME_LABEL: Record<TimeOfDay, string> = {
  dawn: 'ochtendlicht',
  day: 'daglicht',
  dusk: 'avondlicht',
  night: 'nacht',
};

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const TIMES: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];

/**
 * Welke scenes bij welk soort studie passen.
 *
 * De keuze is bewust niet vlak over alle acht: het genre houdt het beeld
 * betekenisvol (Exodus in de woestijn, Openbaring onder de sterren), de seed
 * houdt buren van elkaar te onderscheiden. De sleutels zijn de `kind`-waarden
 * uit `CATALOGUE_ENTRIES` plus de `StudyType`-waarden als terugval.
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
  /** Het `kind` uit de catalogus ("Wet", "Evangelie", "Persoon"). */
  kind?: string;
  type?: StudyType;
}

/**
 * 77 studies, eenmaal per proces berekend. Geen LRU: de catalogus is eindig en
 * de uitkomst verandert nooit.
 */
const CACHE = new Map<string, StudyArt>();

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

/** Puur, gezaaid en stabiel zolang de studie-id bestaat. */
export function studyArtFor({ id, kind, type }: StudyArtInput): StudyArt {
  const cached = CACHE.get(id);
  if (cached) return cached;

  // Genaamd `studie:` zodat deze stroom nooit kan botsen met de stroom van de
  // boom van een lezer - dezelfde voorzorg als `${seed}:decor` in TreeCanvas.
  const rand = seededRng(`studie:${id}`);

  const candidates =
    (kind ? CANDIDATES[kind] : undefined) ?? (type ? CANDIDATES[type] : undefined) ?? SCENE_IDS;

  const scene = pick(rand, candidates);
  const season = pick(rand, SEASONS);
  const timeOfDay = pick(rand, TIMES);
  const palette = buildPalette(season, timeOfDay, 1, { scene });

  const far: Horizon = {
    amp: 0.09 + rand() * 0.07,
    freq: 0.8 + rand() * 1.1,
    phase: rand() * Math.PI * 2,
    lift: 0.03 + rand() * 0.05,
  };
  const near: Horizon = {
    amp: 0.05 + rand() * 0.05,
    freq: 1.4 + rand() * 1.6,
    phase: rand() * Math.PI * 2,
    lift: 0,
  };

  const stars: Star[] = [];
  if (palette.night) {
    const count = 5 + Math.floor(rand() * 5);
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: 4 + rand() * 92,
        y: 3 + rand() * 16,
        r: 0.35 + rand() * 0.45,
      });
    }
  }

  const art: StudyArt = {
    scene,
    sceneName: sceneSpec(scene).name,
    season,
    timeOfDay: palette.timeOfDay,
    palette,
    far,
    near,
    stars,
    caption: `${sceneSpec(scene).name} — ${SEASON_LABEL[season]}, ${TIME_LABEL[palette.timeOfDay]}`,
  };

  CACHE.set(id, art);
  return art;
}

/** Het tekenvlak van elke horizon. Vast, zodat elk formaat dezelfde vorm rekt. */
export const VIEW_WIDTH = 100;
export const VIEW_HEIGHT = 40;

/** Waar de aardband begint. Beide ruggen staan hierop. */
export const GROUND_TOP = 31;

function f(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/**
 * De rugvorm, in het vaste 100x40-vlak. Zelfde reeks als `hillPath()`: een
 * sinus met amplitude, frequentie, fase en optel-hoogte, gesloten naar onder.
 */
export function ridgePath(horizon: Horizon, baseY = GROUND_TOP, steps = 26): string {
  let d = `M0 ${f(VIEW_HEIGHT)}`;
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * VIEW_WIDTH;
    const wave = 0.5 + 0.5 * Math.sin((i / steps) * horizon.freq * Math.PI * 2 + horizon.phase);
    const y = baseY - horizon.lift * VIEW_HEIGHT - horizon.amp * VIEW_HEIGHT * wave;
    d += `L${f(x)} ${f(y)}`;
  }
  return `${d}L${f(VIEW_WIDTH)} ${f(VIEW_HEIGHT)}Z`;
}

/** De lucht als CSS-verloop, zodat een klein merk nul SVG-knopen kost. */
export function skyGradient(palette: Palette): string {
  return `linear-gradient(180deg, ${palette.skyTop} 0%, ${palette.skyBottom} 76%)`;
}
