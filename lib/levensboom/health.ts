/**
 * How the tree looks when the user has been away.
 *
 * Pure function of `lastStreakDate`, which already exists on every account, so
 * no migration and no new write path. Deliberately floors at 0.3: on a Bible
 * app a dead tree is the wrong message, and "you'll lose your tree" is the dark
 * pattern this feature is explicitly not.
 *
 * Recovery is a side effect of the streak flow the app already runs on open -
 * `lastStreakDate` moves to today, so the next read of this returns 1.0.
 * `freezeCount` needs nothing here: a spent freeze keeps `lastStreakDate`
 * current, so a Pro user's tree stays healthy on its own.
 *
 * Contract: docs/levensboom-spec.md §5.
 */

export const HEALTH_FLOOR = 0.3;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysSinceActive(lastStreakDate: Date | null | undefined, now: Date = new Date()): number {
  if (!lastStreakDate) return 0;
  const last = startOfDay(new Date(lastStreakDate));
  if (Number.isNaN(last.getTime())) return 0;
  const diff = startOfDay(now).getTime() - last.getTime();
  // A date in the future (clock skew, a restored backup) is not "away".
  return Math.max(0, Math.floor(diff / 86400000));
}

export function healthForDays(days: number): number {
  if (days <= 1) return 1;
  if (days === 2) return 0.75;
  if (days <= 4) return 0.5;
  return HEALTH_FLOOR;
}

export type TreeHealth = {
  health: number;
  wilting: boolean;
  daysSinceActive: number;
};

export function readTreeHealth(
  lastStreakDate: Date | null | undefined,
  now: Date = new Date(),
): TreeHealth {
  const days = daysSinceActive(lastStreakDate, now);
  const health = healthForDays(days);
  return { health, wilting: health < 1, daysSinceActive: days };
}
