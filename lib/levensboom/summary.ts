import { readTreeHealth } from './health';
import { fruitAtLevel, fruitsForLevel, nextTrait, traitsForLevel, TRAIT_LABELS, type TreeTrait } from './traits';

/**
 * The `levensboom` block of `GET /api/v1/gamification`.
 *
 * Everything here is derived - from `xp`, `level` and `lastStreakDate`, all of
 * which every account already has. Nothing about the tree's shape is stored, so
 * the forty existing users see a grown, level-appropriate tree on first load
 * with no migration and no backfill.
 *
 * `traitsUnlocked` is served rather than left to the client so a phone running
 * an older build still gets the right list when the trait table moves.
 */

export type LevensboomPrefs = {
  lastSeenLevel?: number | null;
  lastSeenAt?: Date | null;
  reducedMotion?: boolean | null;
  disabled?: boolean | null;
};

export type LevensboomPayload = {
  seed: string;
  health: number;
  wilting: boolean;
  daysSinceActive: number;
  lastSeenLevel: number;
  traitsUnlocked: TreeTrait[];
  traitLabels: Record<string, string>;
  fruits: { name: string; reference: string; level: number }[];
  fruitAtLevel: { name: string; reference: string; level: number } | null;
  nextTrait: { trait: TreeTrait; level: number; label: string } | null;
  reducedMotion: boolean;
  disabled: boolean;
};

export function buildLevensboomPayload(input: {
  userId: string;
  level: number;
  lastStreakDate?: Date | null;
  prefs?: LevensboomPrefs | null;
  now?: Date;
}): LevensboomPayload {
  const level = Math.max(1, Math.floor(input.level));
  const { health, wilting, daysSinceActive } = readTreeHealth(input.lastStreakDate, input.now);
  const next = nextTrait(level);

  return {
    // The user id doubles as the seed. It is already known to the client that
    // is asking, it never changes, and it is what makes the tree the same one
    // on web and on the phone.
    seed: input.userId,
    health,
    wilting,
    daysSinceActive,
    lastSeenLevel: Math.max(1, Math.floor(input.prefs?.lastSeenLevel ?? 1)),
    traitsUnlocked: traitsForLevel(level),
    traitLabels: TRAIT_LABELS,
    fruits: fruitsForLevel(level),
    fruitAtLevel: fruitAtLevel(level),
    nextTrait: next ? { ...next, label: TRAIT_LABELS[next.trait] } : null,
    reducedMotion: Boolean(input.prefs?.reducedMotion),
    disabled: Boolean(input.prefs?.disabled),
  };
}
