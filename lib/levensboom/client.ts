import type { LevensboomPayload } from './summary';

/**
 * The shapes the browser holds. Kept apart from `lib/gamification.ts`, which
 * is a server module (it pulls in Mongoose), so client components can type the
 * payload without dragging the database into the bundle.
 */

export type GamificationSummary = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercentage: number;
  badges: string[];
  streak: number;
  freezes: number;
  lessonsCompleted: number;
  studiesCompleted: number;
  plansCompleted: number;
  plansActive: number;
  levensboom: LevensboomPayload;
  xpTable: { event: string; value: number; label: string }[];
};

export type GrantResult = {
  xp: number;
  level: number;
  levelledUp: boolean;
  awarded: number;
  newBadges: string[];
};

/** Mirrors lib/gamification.ts; duplicated because that module needs Mongoose. */
export function xpForLevel(level: number): number {
  return level <= 1 ? 0 : 50 * (level - 1) * level;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < 200 && xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

export function describeLevel(xp: number) {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = Math.max(1, ceiling - floor);
  return {
    xp,
    level,
    xpIntoLevel: xp - floor,
    xpForNextLevel: ceiling - floor,
    progressPercentage: Math.min(100, Math.round(((xp - floor) / span) * 100)),
  };
}

/** xpIntoLevel / xpForNextLevel, guarded. */
export function fracOf(summary: Pick<GamificationSummary, 'xpIntoLevel' | 'xpForNextLevel'>): number {
  return summary.xpForNextLevel > 0 ? Math.min(1, Math.max(0, summary.xpIntoLevel / summary.xpForNextLevel)) : 0;
}
