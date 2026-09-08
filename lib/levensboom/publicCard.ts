import { levelForXp } from '../gamification';
import { resolveIsPro } from '../mobilePremium';
import { readTreeHealth } from './health';
import { stageForLevel } from './stages';
import { normaliseChoice, resolveAvatar, unlockedKeys, type AvatarChoice } from './catalog';
import type { LevensboomPrefs } from './summary';

/**
 * What *other* people get to see of a tree: enough to draw it, nothing else.
 *
 * Group member lists and the public profile page hand this out. It carries
 * no XP, no streak and no preferences - the seed (the user id, which the
 * viewer already has), the level, the resolved avatar and the health, which
 * is the same set a viewer could infer by looking at the tree anyway.
 */

export type PublicLevensboomCard = {
  seed: string;
  level: number;
  stage: { id: string; name: string; index: number };
  avatar: AvatarChoice;
  health: number;
  /** "Boom tonen" off means no tree anywhere, other people's screens included. */
  disabled: boolean;
};

/** The User fields `publicLevensboomCard` reads; pass to `.select()` / `populate`. */
export const PUBLIC_CARD_FIELDS =
  'xp badges streak longestStreak lastStreakDate levensboom subscribed storePremium storePremiumPlatform storePremiumExpiresAt';

export type PublicCardSource = {
  _id: { toString(): string };
  xp?: number | null;
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
  const stage = stageForLevel(level);
  return {
    seed: doc._id.toString(),
    level,
    stage: { id: stage.id, name: stage.name, index: stage.index },
    avatar: resolveAvatar(normaliseChoice(doc.levensboom, { isPro }), unlocked),
    health: readTreeHealth(doc.lastStreakDate, now).health,
    disabled: Boolean(doc.levensboom?.disabled),
  };
}
