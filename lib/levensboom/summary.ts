import { readTreeHealth } from './health';
import { fruitAtLevel, fruitsForLevel, nextTrait, traitsForLevel, TRAIT_LABELS, type TreeTrait } from './traits';
import { phaseForStep, type Stage } from './stages';
import { growthInfo, type GrowthFloor, type GrowthInfo } from './growth';
import {
  CATALOG_VERSION,
  nextLevelUnlock,
  normaliseChoice,
  resolveAvatar,
  unlockedKeys,
  type AvatarChoice,
  type UnlockContext,
} from './catalog';

/**
 * The `levensboom` block of `GET /api/v1/gamification`.
 *
 * Everything here is derived - from `xp`, `level`, `lastStreakDate`, badges,
 * the longest streak, Pro and the stored studio choice, all of which every
 * account already has. The one stored growth input is `legacyXp`, from which
 * the caller derives the never-shrink floor (`lib/levensboom/legacy.ts`).
 *
 * `avatar` is what a client draws: the stored `chosen` after the unlock check
 * (`resolveAvatar`), so a lapsed Pro item falls back to the default without
 * the stored choice being touched. `unlocked` is served so a tile can show its
 * lock state without the client re-implementing the rules. `growth` is where
 * the tree stands (position, step, phase, floor); `stage` is its phase in the
 * v1 shape, kept so an older build still shows the right name.
 */

export type LevensboomPrefs = {
  lastSeenLevel?: number | null;
  lastSeenAt?: Date | null;
  reducedMotion?: boolean | null;
  disabled?: boolean | null;
  timeOfDay?: string | null;
  species?: string | null;
  scene?: string | null;
  animal?: string | null;
  ring?: string | null;
  planted?: Date | null;
  introSeen?: boolean | null;
  publicProfile?: boolean | null;
  seenItems?: string[] | null;
  /** XP at the first read after the growth-v2 launch; written once. */
  legacyXp?: number | null;
  legacyAt?: Date | null;
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
  /** 'auto' follows the device clock; any other value pins the scene's time of day. */
  timeOfDay: 'auto' | 'dawn' | 'day' | 'dusk' | 'night';
  /** `growth.phase` in the v1 stage shape; `nextLevel` is a step. */
  stage: Stage;
  growth: GrowthInfo;
  /** What is stored. May name items the account is not entitled to right now. */
  chosen: AvatarChoice;
  /** What to draw: `chosen` after the unlock check. */
  avatar: AvatarChoice;
  /** `kind:id` keys the account may pick today. */
  unlocked: string[];
  catalogVersion: number;
  /** The nearest level-gated item still locked, for the progress strip. */
  nextUnlock: { kind: string; id: string; name: string; level: number } | null;
  longestStreak: number;
  planted: boolean;
  introSeen: boolean;
  publicProfile: boolean;
  seenItems: string[];
};

export function buildLevensboomPayload(input: {
  userId: string;
  level: number;
  /** How far into `level`, 0..1 (`fracOf`). */
  frac?: number | null;
  /** From `floorForUser`; null for an account without a head start. */
  floor?: GrowthFloor | null;
  lastStreakDate?: Date | null;
  prefs?: LevensboomPrefs | null;
  now?: Date;
  badges?: readonly string[] | null;
  streak?: number | null;
  longestStreak?: number | null;
  isPro?: boolean | null;
}): LevensboomPayload {
  const level = Math.max(1, Math.floor(input.level));
  const growth = growthInfo(level, input.frac ?? 0, input.floor ?? null);
  const { health, wilting, daysSinceActive } = readTreeHealth(input.lastStreakDate, input.now);
  const next = nextTrait(level);
  const prefs = input.prefs ?? null;

  const longestStreak = Math.max(input.streak ?? 0, input.longestStreak ?? 0);
  const ctx: UnlockContext = {
    level,
    badges: input.badges ?? [],
    longestStreak,
    isPro: Boolean(input.isPro),
  };
  const unlocked = unlockedKeys(ctx);
  const chosen = normaliseChoice(prefs, { isPro: ctx.isPro });
  const nextItem = nextLevelUnlock(ctx);

  return {
    // The user id doubles as the seed. It is already known to the client that
    // is asking, it never changes, and it is what makes the tree the same one
    // on web and on the phone.
    seed: input.userId,
    health,
    wilting,
    daysSinceActive,
    lastSeenLevel: Math.max(1, Math.floor(prefs?.lastSeenLevel ?? 1)),
    traitsUnlocked: traitsForLevel(level),
    traitLabels: TRAIT_LABELS,
    fruits: fruitsForLevel(level),
    fruitAtLevel: fruitAtLevel(level),
    nextTrait: next ? { ...next, label: TRAIT_LABELS[next.trait] } : null,
    reducedMotion: Boolean(prefs?.reducedMotion),
    disabled: Boolean(prefs?.disabled),
    timeOfDay: (['dawn', 'day', 'dusk', 'night'] as const).includes(prefs?.timeOfDay as 'dawn' | 'day' | 'dusk' | 'night')
      ? (prefs!.timeOfDay as 'dawn' | 'day' | 'dusk' | 'night')
      : 'auto',
    stage: phaseForStep(growth.step),
    growth,
    chosen,
    avatar: resolveAvatar(chosen, unlocked),
    unlocked,
    catalogVersion: CATALOG_VERSION,
    nextUnlock: nextItem
      ? {
          kind: nextItem.item.kind,
          id: nextItem.item.id,
          name: nextItem.item.name,
          level: (nextItem.unlock as { level: number }).level,
        }
      : null,
    longestStreak,
    planted: Boolean(prefs?.planted),
    introSeen: Boolean(prefs?.introSeen),
    publicProfile: Boolean(prefs?.publicProfile),
    seenItems: Array.isArray(prefs?.seenItems) ? prefs!.seenItems!.filter((s) => typeof s === 'string') : [],
  };
}
