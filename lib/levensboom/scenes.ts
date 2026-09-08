/**
 * The eight omgevingen the tree can stand in.
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
  | 'sterrennacht';

export const SCENE_IDS: readonly SceneId[] = [
  'waterbeken',
  'heuvels',
  'meer',
  'woestijn',
  'berg',
  'stadsmuur',
  'hof',
  'sterrennacht',
];

export const DEFAULT_SCENE: SceneId = 'waterbeken';

/** What the renderer paints behind the tree. One routine per value. */
export type Backdrop = 'meadow' | 'hills' | 'lake' | 'dunes' | 'mountain' | 'wall' | 'garden' | 'stars';

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
  /** Always night, whatever the clock says. */
  forceNight: boolean;
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
    forceNight: false,
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
    forceNight: false,
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
    forceNight: false,
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
    forceNight: false,
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
    forceNight: false,
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
    forceNight: false,
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
    forceNight: false,
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
    forceNight: true,
  },
};

export function isSceneId(value: unknown): value is SceneId {
  return typeof value === 'string' && (SCENE_IDS as readonly string[]).includes(value);
}

export function sceneSpec(id: SceneId | string | null | undefined): SceneSpec {
  return SCENES[isSceneId(id) ? id : DEFAULT_SCENE];
}
