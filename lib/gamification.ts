import connectMongoDB from './mongodb';
import User from '../models/User';
import StudyProgress from '../models/StudyProgress.js';
import PlanEnrollment from '../models/PlanEnrollment.js';

/**
 * XP, levels and badges.
 *
 * The weighting is the argument the feature is built on: finishing a plan day
 * you actually studied is worth six read chapters. Volume is cheap here on
 * purpose - the app should reward understanding a small portion, not covering
 * a large one.
 *
 * Before this existed, `badges` was written in exactly one place (the streak
 * route) and only ever held `streak30/60/90`; the other sixteen ids rendered by
 * components/profile/badges.tsx were unreachable.
 */

export type XpEvent =
  | 'chapter_read'
  | 'plan_day_read'
  | 'plan_day_studied'
  | 'study_lesson'
  | 'study_completed'
  | 'plan_completed'
  | 'streak_day';

export const XP_VALUES: Record<XpEvent, number> = {
  chapter_read: 5,
  plan_day_read: 10,
  plan_day_studied: 30,
  study_lesson: 25,
  study_completed: 60,
  plan_completed: 150,
  streak_day: 3,
};

export const XP_LABELS: Record<XpEvent, string> = {
  chapter_read: 'Hoofdstuk gelezen',
  plan_day_read: 'Plandag gelezen',
  plan_day_studied: 'Plandag bestudeerd',
  study_lesson: 'Les afgerond',
  study_completed: 'Studie voltooid',
  plan_completed: 'Leesplan voltooid',
  streak_day: 'Dagelijkse reeks',
};

/** Cumulative XP required to reach a level: 100, 300, 600, 1000, 1500, … */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * level;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < 200 && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export type LevelInfo = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercentage: number;
};

export function describeLevel(xp: number): LevelInfo {
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

export type BadgeContext = {
  streak: number;
  xp: number;
  isPro: boolean;
  hasImage: boolean;
  accountCreatedAt?: Date | null;
  studiesCompleted: number;
  plansCompleted: number;
  lessonsCompleted: number;
};

/**
 * Which of the badge ids in components/profile/badges.tsx the user has now
 * earned. `verified`, `contributor`, `invite` and `tester` are deliberately
 * absent - those are granted by hand, not by activity.
 */
export function evaluateBadges(ctx: BadgeContext): string[] {
  const earned: string[] = [];

  // Streaks. Not chained with `else if`: a user restored from a backup or
  // crossing two thresholds at once should get both, which the streak route's
  // original chain silently prevented.
  if (ctx.streak >= 30) earned.push('streak30');
  if (ctx.streak >= 60) earned.push('streak60');
  if (ctx.streak >= 90) earned.push('streak90');
  if (ctx.streak >= 120) earned.push('streak120');

  // The `points*` ids predate this system (they were quiz points, and the quiz
  // was removed). Reusing them for XP keeps the profile grid intact.
  if (ctx.xp >= 100) earned.push('points100');
  if (ctx.xp >= 500) earned.push('points500');
  if (ctx.xp >= 1000) earned.push('points1000');

  const completed = ctx.studiesCompleted + ctx.plansCompleted;
  if (completed >= 1) earned.push('completed1');
  if (completed >= 5) earned.push('completed5');
  if (completed >= 10) earned.push('completed10');

  if (ctx.lessonsCompleted >= 1) earned.push('firstlesson');
  if (ctx.isPro) earned.push('premium');
  if (ctx.hasImage) earned.push('profilepic');

  if (ctx.accountCreatedAt) {
    const year = 365 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(ctx.accountCreatedAt).getTime() >= year) {
      earned.push('anniversary');
    }
  }

  return earned;
}

export type GrantResult = {
  xp: number;
  level: number;
  levelledUp: boolean;
  awarded: number;
  newBadges: string[];
};

/**
 * Adds XP and re-evaluates badges in one place.
 *
 * The increment uses `$inc` rather than a read-modify-write so two completions
 * landing together cannot cancel each other out; the level is derived from the
 * value the update returns, so it is always consistent with the stored XP even
 * if the two requests interleave.
 */
export async function grantXp(
  userId: string,
  event: XpEvent,
  options?: { isPro?: boolean; multiplier?: number },
): Promise<GrantResult> {
  await connectMongoDB();

  const amount = Math.max(0, Math.round(XP_VALUES[event] * (options?.multiplier ?? 1)));

  const before = await User.findById(userId).select('xp level badges image createdAt streak subscribed');
  const levelBefore = before ? levelForXp(before.xp ?? 0) : 1;

  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { xp: amount } },
    { new: true, select: 'xp level badges image createdAt streak' },
  );
  if (!updated) {
    return { xp: 0, level: 1, levelledUp: false, awarded: 0, newBadges: [] };
  }

  const xp = updated.xp ?? 0;
  const level = levelForXp(xp);

  const [lessonsCompleted, plansCompleted, studiesCompleted] = await Promise.all([
    StudyProgress.countDocuments({ userId }),
    PlanEnrollment.countDocuments({ userId, status: 'completed' }),
    StudyProgress.distinct('studyId', { userId, source: 'curated' }).then(
      (ids: unknown[]) => ids.filter(Boolean).length,
    ),
  ]);

  const earned = evaluateBadges({
    streak: updated.streak ?? 0,
    xp,
    isPro: Boolean(options?.isPro),
    hasImage: Boolean(updated.image),
    accountCreatedAt: updated.createdAt,
    studiesCompleted,
    plansCompleted,
    lessonsCompleted,
  });

  const existing: string[] = updated.badges ?? [];
  const newBadges = earned.filter((id) => !existing.includes(id));

  if (newBadges.length > 0 || (updated.level ?? 1) !== level) {
    await User.findByIdAndUpdate(userId, {
      $set: { level },
      ...(newBadges.length > 0 ? { $addToSet: { badges: { $each: newBadges } } } : {}),
    });
  }

  return { xp, level, levelledUp: level > levelBefore, awarded: amount, newBadges };
}

/** Read-only view used by the profile and the dashboard. */
export async function readProgressSummary(userId: string, isPro: boolean) {
  await connectMongoDB();

  const user = await User.findById(userId).select('xp level badges streak freezeCount image createdAt');
  if (!user) return null;

  const [lessonsCompleted, plansCompleted, plansActive, studyIds] = await Promise.all([
    StudyProgress.countDocuments({ userId }),
    PlanEnrollment.countDocuments({ userId, status: 'completed' }),
    PlanEnrollment.countDocuments({ userId, status: 'active' }),
    StudyProgress.distinct('studyId', { userId, source: 'curated' }),
  ]);
  const studiesCompleted = (studyIds as unknown[]).filter(Boolean).length;

  const xp = user.xp ?? 0;
  const earned = evaluateBadges({
    streak: user.streak ?? 0,
    xp,
    isPro,
    hasImage: Boolean(user.image),
    accountCreatedAt: user.createdAt,
    studiesCompleted,
    plansCompleted,
    lessonsCompleted,
  });

  // Manual badges already on the account must survive the merge.
  const badges = Array.from(new Set([...(user.badges ?? []), ...earned]));

  return {
    ...describeLevel(xp),
    badges,
    streak: user.streak ?? 0,
    freezes: user.freezeCount ?? 0,
    lessonsCompleted,
    studiesCompleted,
    plansCompleted,
    plansActive,
  };
}
