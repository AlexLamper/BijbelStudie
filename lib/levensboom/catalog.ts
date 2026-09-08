/**
 * What the reader can pick for their tree, and what each pick costs in
 * progress. One table, three copies that must agree: this file,
 * `lib/features/levensboom/domain/catalog.dart`, and docs/levensboom-spec.md
 * §9.
 *
 * Nothing about an unlock is ever stored. `unlockedIds()` is a pure function of
 * what the account already records (level, badges, longest streak, Pro), which
 * is what lets a lapsed subscription fall back silently and come back on
 * renewal without any bookkeeping: `resolveAvatar()` simply re-checks the
 * stored choice against today's unlocks on every read.
 *
 * Pure: no Mongoose, no DOM. The API route and the client both import it.
 */

import { DEFAULT_SPECIES, SPECIES_IDS, type SpeciesId } from './species';
import { DEFAULT_SCENE, SCENE_IDS, type SceneId } from './scenes';

export const CATALOG_VERSION = 1;

export type AnimalId = 'geen' | 'vogel' | 'vlinders' | 'schaap' | 'duif' | 'vuurvliegjes' | 'hert';
export const ANIMAL_IDS: readonly AnimalId[] = ['geen', 'vogel', 'vlinders', 'schaap', 'duif', 'vuurvliegjes', 'hert'];
export const DEFAULT_ANIMAL: AnimalId = 'geen';

export type RingId = 'teal' | 'goud';
export const RING_IDS: readonly RingId[] = ['teal', 'goud'];
export const DEFAULT_RING: RingId = 'teal';

export type ItemKind = 'species' | 'scene' | 'animal' | 'ring';
export const ITEM_KINDS: readonly ItemKind[] = ['species', 'scene', 'animal', 'ring'];

export type Unlock =
  | { kind: 'free' }
  | { kind: 'level'; level: number }
  | { kind: 'streak'; days: number }
  | { kind: 'badge'; badge: string; label: string }
  | { kind: 'pro' };

export type CatalogItem = {
  id: string;
  kind: ItemKind;
  name: string;
  /** One line under the name in the studio. */
  blurb: string;
  /** The verse the item borrows its meaning from, where it has one. */
  verse?: string;
  unlock: Unlock;
};

const free: Unlock = { kind: 'free' };
const level = (n: number): Unlock => ({ kind: 'level', level: n });
const streak = (days: number): Unlock => ({ kind: 'streak', days });
const badge = (id: string, label: string): Unlock => ({ kind: 'badge', badge: id, label });
const pro: Unlock = { kind: 'pro' };

export const CATALOG: readonly CatalogItem[] = [
  // Boomsoorten
  { id: 'eik', kind: 'species', name: 'Eik', blurb: 'Breed en sterk, met eikels in de herfst.', verse: 'Genesis 18:1', unlock: free },
  { id: 'olijf', kind: 'species', name: 'Olijfboom', blurb: 'Knoestig en altijd groen.', verse: 'Psalm 52:10', unlock: free },
  { id: 'vijg', kind: 'species', name: 'Vijgenboom', blurb: 'Laag en wijd, met grote bladeren.', verse: 'Micha 4:4', unlock: level(4) },
  { id: 'palm', kind: 'species', name: 'Palmboom', blurb: 'Eén hoge stam en een kroon van bladeren.', verse: 'Psalm 92:13', unlock: level(8) },
  { id: 'amandel', kind: 'species', name: 'Amandelboom', blurb: 'Bloeit als eerste, ieder voorjaar.', verse: 'Jeremia 1:11', unlock: level(12) },
  { id: 'ceder', kind: 'species', name: 'Ceder van de Libanon', blurb: 'Hoog en kegelvormig, altijd groen.', verse: 'Psalm 92:13', unlock: pro },

  // Omgevingen
  { id: 'waterbeken', kind: 'scene', name: 'Waterbeken', blurb: 'Een beek langs de wortels.', verse: 'Psalm 1:3', unlock: free },
  { id: 'heuvels', kind: 'scene', name: 'Heuvels van Galilea', blurb: 'Glooiende heuvels met olijfgaarden.', unlock: level(3) },
  { id: 'meer', kind: 'scene', name: 'Meer van Galilea', blurb: 'De oever, met een bootje op het water.', unlock: level(6) },
  { id: 'woestijn', kind: 'scene', name: 'Woestijn-oase', blurb: 'Zand, warmte en een bron.', verse: 'Jesaja 35:1', unlock: streak(7) },
  { id: 'berg', kind: 'scene', name: 'De berg', blurb: 'Rotsen en een verre bergketen.', verse: 'Psalm 121:1', unlock: streak(30) },
  { id: 'stadsmuur', kind: 'scene', name: 'Stadsmuur', blurb: 'Onder de muren van Jeruzalem.', verse: 'Psalm 122', unlock: badge('completed5', '5 studies voltooid') },
  { id: 'hof', kind: 'scene', name: 'De hof', blurb: 'Een tuin met bloemen en een rivier.', verse: 'Genesis 2:8', unlock: pro },
  { id: 'sterrennacht', kind: 'scene', name: 'Sterrennacht', blurb: 'Kijk omhoog en tel de sterren.', verse: 'Genesis 15:5', unlock: pro },

  // Dieren
  { id: 'geen', kind: 'animal', name: 'Geen', blurb: 'Alleen de boom.', unlock: free },
  { id: 'vogel', kind: 'animal', name: 'Vogel', blurb: 'Nestelt in je kroon.', verse: 'Psalm 84:4', unlock: level(5) },
  { id: 'vlinders', kind: 'animal', name: 'Vlinders', blurb: 'Drie vlinders rond je boom.', unlock: level(7) },
  { id: 'schaap', kind: 'animal', name: 'Schapen', blurb: 'Twee schapen grazen bij de stam.', verse: 'Psalm 23:2', unlock: badge('completed1', 'Eerste studie voltooid') },
  { id: 'duif', kind: 'animal', name: 'Duif', blurb: 'Een witte duif op de hoogste tak.', verse: 'Genesis 8:11', unlock: streak(14) },
  { id: 'vuurvliegjes', kind: 'animal', name: 'Vuurvliegjes', blurb: "Lichtjes in je boom, 's nachts.", unlock: level(15) },
  { id: 'hert', kind: 'animal', name: 'Hert', blurb: 'Een hert naast je boom.', verse: 'Psalm 42:2', unlock: streak(60) },

  // Ring
  { id: 'teal', kind: 'ring', name: 'Groene ring', blurb: 'De standaard voortgangsring.', unlock: free },
  { id: 'goud', kind: 'ring', name: 'Gouden ring', blurb: 'Een gouden ring om je boom.', unlock: pro },
];

export type AvatarChoice = {
  species: SpeciesId;
  scene: SceneId;
  animal: AnimalId;
  ring: RingId;
};

export const DEFAULT_AVATAR: AvatarChoice = {
  species: DEFAULT_SPECIES,
  scene: DEFAULT_SCENE,
  animal: DEFAULT_ANIMAL,
  ring: DEFAULT_RING,
};

/** Everything an unlock rule can look at. All of it already exists on User. */
export type UnlockContext = {
  level: number;
  badges: readonly string[];
  longestStreak: number;
  isPro: boolean;
};

export function itemsOfKind(kind: ItemKind): CatalogItem[] {
  return CATALOG.filter((item) => item.kind === kind);
}

export function catalogItem(kind: ItemKind, id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.kind === kind && item.id === id);
}

export function isUnlocked(item: CatalogItem, ctx: UnlockContext): boolean {
  const rule = item.unlock;
  switch (rule.kind) {
    case 'free':
      return true;
    case 'level':
      return ctx.level >= rule.level;
    case 'streak':
      return ctx.longestStreak >= rule.days;
    case 'badge':
      return ctx.badges.includes(rule.badge);
    case 'pro':
      return ctx.isPro;
  }
}

/** `kind:id` keys, so two kinds can never collide on an id. */
export function itemKey(item: Pick<CatalogItem, 'kind' | 'id'>): string {
  return `${item.kind}:${item.id}`;
}

export function unlockedKeys(ctx: UnlockContext): string[] {
  return CATALOG.filter((item) => isUnlocked(item, ctx)).map(itemKey);
}

function pick<T extends string>(
  kind: ItemKind,
  value: unknown,
  ids: readonly T[],
  fallback: T,
  unlocked: ReadonlySet<string>,
): T {
  if (typeof value !== 'string' || !(ids as readonly string[]).includes(value)) return fallback;
  return unlocked.has(`${kind}:${value}`) ? (value as T) : fallback;
}

/**
 * The avatar to draw: the stored choice, with anything the account is not (or
 * no longer) entitled to swapped for that kind's default. The stored choice is
 * never rewritten, so a lapsed Pro item comes straight back on renewal.
 */
export function resolveAvatar(
  chosen: Partial<Record<keyof AvatarChoice, unknown>> | null | undefined,
  unlocked: readonly string[] | ReadonlySet<string>,
): AvatarChoice {
  const set = unlocked instanceof Set ? (unlocked as ReadonlySet<string>) : new Set(unlocked as readonly string[]);
  return {
    species: pick('species', chosen?.species, SPECIES_IDS, DEFAULT_SPECIES, set),
    scene: pick('scene', chosen?.scene, SCENE_IDS, DEFAULT_SCENE, set),
    animal: pick('animal', chosen?.animal, ANIMAL_IDS, DEFAULT_ANIMAL, set),
    ring: pick('ring', chosen?.ring, RING_IDS, DEFAULT_RING, set),
  };
}

/**
 * The ring an account gets when it has never chosen one. Pro accounts default
 * to the gold ring: it is the one thing Pro visibly adds to every tree, and an
 * account that paid before the ring existed should not have to find it in the
 * studio. An explicit choice - either ring - always wins over this default,
 * which is why models/User.js stores no default for `levensboom.ring`.
 */
export function defaultRingFor(isPro: boolean): RingId {
  return isPro ? 'goud' : DEFAULT_RING;
}

/**
 * Normalises whatever is stored into a full choice, without checking unlocks.
 * `isPro` only decides the ring an account with no stored ring falls back to
 * (see `defaultRingFor`); `resolveAvatar()` still swaps that ring for teal
 * when the account is not entitled to it.
 */
export function normaliseChoice(
  chosen: Partial<Record<keyof AvatarChoice, unknown>> | null | undefined,
  opts: { isPro?: boolean } = {},
): AvatarChoice {
  const has = <T extends string>(ids: readonly T[], value: unknown, fallback: T): T =>
    typeof value === 'string' && (ids as readonly string[]).includes(value) ? (value as T) : fallback;
  return {
    species: has(SPECIES_IDS, chosen?.species, DEFAULT_SPECIES),
    scene: has(SCENE_IDS, chosen?.scene, DEFAULT_SCENE),
    animal: has(ANIMAL_IDS, chosen?.animal, DEFAULT_ANIMAL),
    ring: has(RING_IDS, chosen?.ring, defaultRingFor(Boolean(opts.isPro))),
  };
}

/** The Dutch line under a locked tile. */
export function unlockLabel(unlock: Unlock): string {
  switch (unlock.kind) {
    case 'free':
      return 'Gratis';
    case 'level':
      return `Niveau ${unlock.level}`;
    case 'streak':
      return `Reeks van ${unlock.days} dagen`;
    case 'badge':
      return unlock.label;
    case 'pro':
      return 'Pro';
  }
}

export type NextUnlock = {
  item: CatalogItem;
  unlock: Unlock;
};

/**
 * The nearest level-gated item the reader has not reached, for the progress
 * strip's "nog 340 XP → Palmboom". Streak, badge and Pro items are not
 * "nearer" in any XP sense, so they never show up here.
 */
export function nextLevelUnlock(ctx: UnlockContext): NextUnlock | null {
  let best: NextUnlock | null = null;
  for (const item of CATALOG) {
    if (item.unlock.kind !== 'level') continue;
    if (item.unlock.level <= ctx.level) continue;
    if (!best || item.unlock.level < (best.unlock as { level: number }).level) {
      best = { item, unlock: item.unlock };
    }
  }
  return best;
}

/** Items that unlock at exactly this level - what a level-up card announces. */
export function itemsUnlockedAtLevel(level: number): CatalogItem[] {
  return CATALOG.filter((item) => item.unlock.kind === 'level' && item.unlock.level === level);
}
