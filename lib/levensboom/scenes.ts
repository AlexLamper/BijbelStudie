/**
 * The fifteen omgevingen the tree can stand in.
 *
 * A scene is colour plus a backdrop the renderer draws behind the tree. It is
 * never a generator input: the branches and leaves of a tree are the same in
 * every scene, which is what lets the studio preview a scene by repainting
 * rather than regenerating, and what keeps the parity fixtures scene-free.
 *
 * Mirror: `lib/features/levensboom/domain/scenes.dart`. Contract: spec §7.2.
 */

import type { TimeOfDay } from './palette';

export type SceneId =
  | 'waterbeken'
  | 'heuvels'
  | 'meer'
  | 'woestijn'
  | 'berg'
  | 'stadsmuur'
  | 'hof'
  | 'sterrennacht'
  | 'jordaan'
  | 'wijngaard'
  | 'graanveld'
  | 'kust'
  | 'regenboog'
  | 'dageraad'
  | 'herdersveld';

export const SCENE_IDS: readonly SceneId[] = [
  'waterbeken',
  'heuvels',
  'meer',
  'woestijn',
  'berg',
  'stadsmuur',
  'hof',
  'sterrennacht',
  'jordaan',
  'wijngaard',
  'graanveld',
  'kust',
  'regenboog',
  'dageraad',
  'herdersveld',
];

export const DEFAULT_SCENE: SceneId = 'waterbeken';

/** What the renderer paints behind the tree. One routine per value. */
export type Backdrop =
  | 'meadow'
  | 'hills'
  | 'lake'
  | 'dunes'
  | 'mountain'
  | 'wall'
  | 'garden'
  | 'stars'
  | 'river'
  | 'vineyard'
  | 'field'
  | 'sea'
  | 'rainbow'
  | 'sunrise'
  | 'shepherds';

export type SkyStops = { top: string; bottom: string; glow: string; light: string };

export type SceneSpec = {
  id: SceneId;
  name: string;
  backdrop: Backdrop;
  /** Per-time-of-day sky overrides; anything missing keeps the default sky. */
  sky: Partial<Record<TimeOfDay, SkyStops>>;
  /** Ground band top and bottom colour. `null` keeps the seasonal ground. */
  ground: { top: string; bottom: string } | null;
  /** Distant shapes: hills, dunes, the range, the wall. */
  far: string;
  farAlt: string;
  /** Water, where the scene has any. */
  water: string | null;
  /** Small colour accents: flowers, the sail, reflections. */
  accent: string;
  /** Pins the time of day whatever the clock says: the starry night, the dawn. */
  forceTime: TimeOfDay | null;
};

export const SCENES: Record<SceneId, SceneSpec> = {
  waterbeken: {
    id: 'waterbeken',
    name: 'Waterbeken',
    backdrop: 'meadow',
    sky: {},
    ground: null,
    far: '#5E8C57',
    farAlt: '#4E7C49',
    water: '#5FA8C8',
    accent: '#DFF3F7',
    forceTime: null,
  },
  heuvels: {
    id: 'heuvels',
    name: 'Heuvels van Galilea',
    backdrop: 'hills',
    sky: { day: { top: '#8FCBE6', bottom: '#F0E9D2', glow: '#FFF1C9', light: '#FFFFFF' } },
    ground: { top: '#7C9B4A', bottom: '#5C7433' },
    far: '#8FA86A',
    farAlt: '#6F8C52',
    water: null,
    accent: '#4F6B3A',
    forceTime: null,
  },
  meer: {
    id: 'meer',
    name: 'Meer van Galilea',
    backdrop: 'lake',
    sky: { day: { top: '#79BEE0', bottom: '#E6F4FA', glow: '#FFF6DE', light: '#FFFFFF' } },
    ground: { top: '#8A9A62', bottom: '#6B7A46' },
    far: '#7FA3B8',
    farAlt: '#6B8FA6',
    water: '#4F9CC4',
    accent: '#F4EFE2',
    forceTime: null,
  },
  woestijn: {
    id: 'woestijn',
    name: 'Woestijn-oase',
    backdrop: 'dunes',
    sky: {
      day: { top: '#8FC3E8', bottom: '#F6E3C0', glow: '#FFEAB8', light: '#FFFFFF' },
      dusk: { top: '#5A3E6E', bottom: '#F0A56B', glow: '#FFC98A', light: '#FFE0B8' },
    },
    ground: { top: '#D9B77A', bottom: '#B48F55' },
    far: '#E2C48C',
    farAlt: '#C9A467',
    water: '#5AA9C8',
    accent: '#7FB069',
    forceTime: null,
  },
  berg: {
    id: 'berg',
    name: 'De berg',
    backdrop: 'mountain',
    sky: { day: { top: '#6FAED6', bottom: '#DCEBF3', glow: '#F4F7FB', light: '#FFFFFF' } },
    ground: { top: '#6F7F5C', bottom: '#55634A' },
    far: '#6E7C90',
    farAlt: '#8A96A6',
    water: null,
    accent: '#F4F7FB',
    forceTime: null,
  },
  stadsmuur: {
    id: 'stadsmuur',
    name: 'Stadsmuur',
    backdrop: 'wall',
    sky: { day: { top: '#86C0E0', bottom: '#F3E6CF', glow: '#FFEFCF', light: '#FFFFFF' } },
    ground: { top: '#B8A275', bottom: '#8E7A52' },
    far: '#C9B189',
    farAlt: '#A8905F',
    water: null,
    accent: '#7A6444',
    forceTime: null,
  },
  hof: {
    id: 'hof',
    name: 'De hof',
    backdrop: 'garden',
    sky: { day: { top: '#8ED0E8', bottom: '#E9F7EA', glow: '#FFF7DA', light: '#FFFFFF' } },
    ground: { top: '#4E9A4F', bottom: '#3B7A3D' },
    far: '#3F8A5A',
    farAlt: '#2F6B48',
    water: '#5FB0CC',
    accent: '#F28CB1',
    forceTime: null,
  },
  sterrennacht: {
    id: 'sterrennacht',
    name: 'Sterrennacht',
    backdrop: 'stars',
    sky: { night: { top: '#060A1C', bottom: '#1B2450', glow: '#3C4B86', light: '#DCE4FF' } },
    ground: { top: '#2B3550', bottom: '#1A2138' },
    far: '#141B36',
    farAlt: '#1E2747',
    water: null,
    accent: '#F5F0C8',
    forceTime: 'night',
  },
  jordaan: {
    id: 'jordaan',
    name: 'De Jordaan',
    backdrop: 'river',
    sky: { day: { top: '#84C4E4', bottom: '#EAF3E6', glow: '#FFF4D6', light: '#FFFFFF' } },
    ground: { top: '#7FA25A', bottom: '#5E7A3E' },
    far: '#7FA86C',
    farAlt: '#628A55',
    water: '#4F9CC4',
    accent: '#C9E2B0',
    forceTime: null,
  },
  wijngaard: {
    id: 'wijngaard',
    name: 'Wijngaard',
    backdrop: 'vineyard',
    sky: { day: { top: '#8CC6E4', bottom: '#F4E9CF', glow: '#FFF1C9', light: '#FFFFFF' } },
    ground: { top: '#8E7A4E', bottom: '#6B5A36' },
    far: '#8FA65E',
    farAlt: '#6E8A48',
    water: null,
    accent: '#5B3A6E',
    forceTime: null,
  },
  graanveld: {
    id: 'graanveld',
    name: 'Graanveld',
    backdrop: 'field',
    sky: { day: { top: '#8EC8E8', bottom: '#F8ECC8', glow: '#FFF0BE', light: '#FFFFFF' } },
    ground: { top: '#D8B85E', bottom: '#B08F3E' },
    far: '#D9BE6A',
    farAlt: '#B79A4E',
    water: null,
    accent: '#F2D98A',
    forceTime: null,
  },
  kust: {
    id: 'kust',
    name: 'De kust',
    backdrop: 'sea',
    sky: { day: { top: '#6FB6E0', bottom: '#E3F1F7', glow: '#FFF6DE', light: '#FFFFFF' } },
    ground: { top: '#E4D3A6', bottom: '#C4AE7C' },
    far: '#3F86B0',
    farAlt: '#5FA3C8',
    water: '#3F86B0',
    accent: '#F4F8FA',
    forceTime: null,
  },
  regenboog: {
    id: 'regenboog',
    name: 'Regenboog',
    backdrop: 'rainbow',
    sky: { day: { top: '#7CB9DC', bottom: '#DDEBEF', glow: '#FFF4D6', light: '#FFFFFF' } },
    ground: null,
    far: '#5E8C57',
    farAlt: '#4E7C49',
    water: null,
    accent: '#F4F7FB',
    forceTime: null,
  },
  dageraad: {
    id: 'dageraad',
    name: 'Dageraad',
    backdrop: 'sunrise',
    sky: { dawn: { top: '#3A4A73', bottom: '#F9C89A', glow: '#FFD9A0', light: '#FFE8CC' } },
    ground: { top: '#7A7F55', bottom: '#585E3E' },
    far: '#5C5A7A',
    farAlt: '#7B6E8E',
    water: null,
    accent: '#FFD27A',
    forceTime: 'dawn',
  },
  herdersveld: {
    id: 'herdersveld',
    name: 'Velden van Efratha',
    backdrop: 'shepherds',
    sky: { night: { top: '#0A1030', bottom: '#26305A', glow: '#4A5A96', light: '#E2E8FF' } },
    ground: { top: '#33405A', bottom: '#1F283E' },
    far: '#1A2340',
    farAlt: '#26304F',
    water: null,
    accent: '#FFF3C4',
    forceTime: 'night',
  },
};

export function isSceneId(value: unknown): value is SceneId {
  return typeof value === 'string' && (SCENE_IDS as readonly string[]).includes(value);
}

export function sceneSpec(id: SceneId | string | null | undefined): SceneSpec {
  return SCENES[isSceneId(id) ? id : DEFAULT_SCENE];
}
