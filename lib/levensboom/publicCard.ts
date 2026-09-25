import { describeLevel, levelForXp } from '../gamification';
import { resolveIsPro } from '../mobilePremium';
import { readTreeHealth } from './health';
import type { StageId } from './stages';
import { fracOf } from './client';
import { growthInfo, type GrowthFloor } from './growth';
import { floorForUser } from './legacy';
import { normaliseChoice, resolveAvatar, unlockedKeys, type AvatarChoice } from './catalog';
import type { LevensboomPrefs } from './summary';

/**
 * What *other* people get to see of a tree: enough to draw it, nothing else.
 *
 * Group member lists and the public profile page hand this out. It carries
 * no XP, no streak and no preferences - the seed (the user id, which the
 * viewer already has), the level, the resolved avatar and the health, which
 * is the same set a viewer could infer by looking at the tree anyway.
 *
 * `growth` is where the tree stands, computed here with the account's floor
 * so another person's screen draws the same tree its owner sees. Read-only: a
 * public card never captures `legacyXp` (lib/levensboom/legacy.ts). `frac` is
 * cut to whole percents, which is all a drawing needs and keeps the exact XP
 * out of it.
 */

export type PublicLevensboomCard = {
  seed: string;
  level: number;
  /** `growth.phase`, the shape v1 served. */
  stage: { id: string; name: string; index: number };
  growth: {
    position: number;
    step: number;
    frac: number;
    floor: GrowthFloor | null;
    phase: { id: StageId; name: string; index: number };
  };
  avatar: AvatarChoice;
  health: number;
  /** "Boom tonen" off means no tree anywhere, other people's screens included. */
  disabled: boolean;
};

/** The User fields `publicLevensboomCard` reads; pass to `.select()` / `populate`. */
export const PUBLIC_CARD_FIELDS =
  'xp createdAt badges streak longestStreak lastStreakDate levensboom subscribed storePremium storePremiumPlatform storePremiumExpiresAt';

export type PublicCardSource = {
  _id: { toString(): string };
  xp?: number | null;
  createdAt?: Date | null;
  badges?: string[] | null;
  streak?: number | null;
  longestStreak?: number | null;
  lastStreakDate?: Date | null;
  levensboom?: LevensboomPrefs | null;
  subscribed?: boolean;
  storePremium?: boolean;
  storePremiumPlatform?: 'apple' | 'google' | null;
  storePremiumExpiresAt?: Date | null;
};

export function publicLevensboomCard(doc: PublicCardSource, now: Date = new Date()): PublicLevensboomCard {
  const level = levelForXp(doc.xp ?? 0);
  const isPro = resolveIsPro(doc, false);
  const badges = Array.isArray(doc.badges) ? doc.badges : [];
  const unlocked = unlockedKeys({
    level,
    badges: isPro && !badges.includes('premium') ? [...badges, 'premium'] : badges,
    longestStreak: Math.max(doc.streak ?? 0, doc.longestStreak ?? 0),
    isPro,
  });
  const frac = Math.floor(fracOf(describeLevel(doc.xp ?? 0)) * 100) / 100;
  const growth = growthInfo(level, frac, floorForUser(doc));
  const phase = { id: growth.phase.id, name: growth.phase.name, index: growth.phase.index };
  return {
    seed: doc._id.toString(),
    level,
    stage: { ...phase },
    growth: { position: growth.position, step: growth.step, frac, floor: growth.floor, phase },
    avatar: resolveAvatar(normaliseChoice(doc.levensboom, { isPro }), unlocked),
    health: readTreeHealth(doc.lastStreakDate, now).health,
    disabled: Boolean(doc.levensboom?.disabled),
  };
}
