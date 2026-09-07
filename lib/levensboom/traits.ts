/**
 * What the tree gains, and when.
 *
 * Continuous growth is the baseline; these are the punctuation - the moments
 * where a level-up adds something the user can name rather than a slightly
 * larger silhouette. All cosmetic, all free, nothing stored per trait: the set
 * is derived from `level` here, in the Dart mirror
 * (`lib/features/levensboom/domain/traits.dart`) and in the API response, so a
 * client that has not been updated still gets a correct list from the server.
 *
 * Contract: docs/levensboom-spec.md §6.
 */

export type TreeTrait = 'canopy' | 'blossom' | 'fruit' | 'bird' | 'twin' | 'fireflies' | 'seasons';

export const TRAIT_LEVELS: Record<TreeTrait, number> = {
  canopy: 3,
  blossom: 5,
  fruit: 8,
  bird: 12,
  twin: 16,
  fireflies: 20,
  seasons: 25,
};

const TRAIT_ORDER: TreeTrait[] = ['canopy', 'blossom', 'fruit', 'bird', 'twin', 'fireflies', 'seasons'];

/** Dutch, one line, shown in the detail sheet next to the level it arrives at. */
export const TRAIT_LABELS: Record<TreeTrait, string> = {
  canopy: 'Je boom krijgt een echte kroon',
  blossom: 'Bloesem in het voorjaar',
  fruit: 'De eerste vrucht van de Geest',
  bird: 'Een vogel keert terug naar je boom',
  twin: 'Een tweede stam - je boom komt tot zijn recht',
  fireflies: "Vuurvliegjes 's nachts",
  seasons: 'Zeldzame seizoenen: sneeuw en bloesemstorm',
};

export function traitsForLevel(level: number): TreeTrait[] {
  return TRAIT_ORDER.filter((trait) => level >= TRAIT_LEVELS[trait]);
}

export function hasTrait(level: number, trait: TreeTrait): boolean {
  return level >= TRAIT_LEVELS[trait];
}

/** The next trait the user has not reached yet, for "wat komt hierna?". */
export function nextTrait(level: number): { trait: TreeTrait; level: number } | null {
  for (const trait of TRAIT_ORDER) {
    if (level < TRAIT_LEVELS[trait]) return { trait, level: TRAIT_LEVELS[trait] };
  }
  return null;
}

/**
 * Galatians 5:22-23, in order. These are the app's word for "milestone": the
 * number is still there for people who like numbers, but what the tree grows is
 * fruit, not points.
 */
export type SpiritFruit = { name: string; reference: string; level: number };

const FRUIT_NAMES = [
  'Liefde',
  'Blijdschap',
  'Vrede',
  'Geduld',
  'Vriendelijkheid',
  'Goedheid',
  'Geloof',
  'Zachtmoedigheid',
  'Zelfbeheersing',
];

export const FRUIT_REFERENCE = 'Galaten 5:22-23';

/** One fruit at level 8, then one every second level, ending at nine. */
export function fruitCount(level: number): number {
  if (level < TRAIT_LEVELS.fruit) return 0;
  return Math.min(9, Math.floor((level - TRAIT_LEVELS.fruit) / 2) + 1);
}

export function fruitLevel(index: number): number {
  return TRAIT_LEVELS.fruit + index * 2;
}

/** Every fruit with the level it arrives at; `unlocked` is the caller's cut. */
export function allFruits(): SpiritFruit[] {
  return FRUIT_NAMES.map((name, index) => ({
    name,
    reference: FRUIT_REFERENCE,
    level: fruitLevel(index),
  }));
}

export function fruitsForLevel(level: number): SpiritFruit[] {
  return allFruits().slice(0, fruitCount(level));
}

/**
 * The fruit a level-up hands over, if that level unlocks one. Drives the
 * celebration card's title - "Niveau 10 - Blijdschap" reads very differently
 * from "Niveau 10".
 */
export function fruitAtLevel(level: number): SpiritFruit | null {
  if (level < TRAIT_LEVELS.fruit) return null;
  if ((level - TRAIT_LEVELS.fruit) % 2 !== 0) return null;
  const index = (level - TRAIT_LEVELS.fruit) / 2;
  return index < FRUIT_NAMES.length ? allFruits()[index] : null;
}
