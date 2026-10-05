import { badgeLabel } from '../badgeCatalog';
import { postMilestone } from './service';

/**
 * The bridge between the events the product already detects and the
 * vriendenkring feed (VRIENDENKRING_PLAN.md §8).
 *
 * `postMilestone` had zero callers: the feed could only ever hold what someone
 * shared by hand, so a kring of readers who never tapped "deel" looked dead.
 * This module is the one place that knows which events are worth a card and
 * what they say in Dutch, so the copy cannot drift between four call sites.
 *
 * Three rules hold for every function here:
 *
 * 1. **It never throws.** Each call is wrapped, and a failure is logged and
 *    dropped. These run next to a progress write - a plan day, a finished
 *    lesson, XP - and losing a reader's progress because a feed card could
 *    not be written would be the wrong trade by a wide margin. The same
 *    arrangement `grantXp` already uses for `creditReferrerIfActivated`.
 * 2. **Dedupe is the `sourceId`.** `postMilestone` guards on
 *    `{userId, kind, sourceId}` (indexed in models/FriendPost.js), so the ids
 *    built here are deterministic: earning the same badge twice, recomputing a
 *    streak, or a retry from a second device writes one card.
 * 3. **The switch is not re-checked.** `FriendProfile.autoShare.milestones`
 *    is honoured inside `postMilestone`; checking it again here would be a
 *    second copy of the rule that could disagree with the first.
 *
 * The await is deliberate rather than a floating promise: a Vercel lambda may
 * freeze the moment the response is sent, so a detached promise is a card that
 * sometimes never lands. "Fire and forget" here means the caller does not care
 * whether it succeeded, not that nobody waits for it.
 */

/** Streaks worth telling a kring about. Every day would be noise. */
export const STREAK_MILESTONES: readonly number[] = [7, 30, 100];

async function announce(
  label: string,
  userId: string,
  milestone: { sourceId: string; body: string; reference?: string },
): Promise<void> {
  try {
    await postMilestone(userId, milestone);
  } catch (error) {
    // Logged, never rethrown. See rule 1 above.
    console.error(`[friends-milestone] ${label} niet geplaatst voor ${userId}`, error);
  }
}

/**
 * A finished day of "Bijbel in een jaar".
 *
 * Keyed on the enrollment as well as the day: a reader who restarts the plan
 * is on a new run, and day 1 of that run is a real event again.
 */
export async function announcePlanDay(
  userId: string,
  input: { enrollmentId: string; day: number; totalDays: number },
): Promise<void> {
  if (!Number.isFinite(input.day) || input.day < 1) return;
  await announce('plandag', userId, {
    sourceId: `plan-day:${input.enrollmentId}:${input.day}`,
    body: `Dag ${input.day} van ${input.totalDays} van Bijbel in een jaar gelezen.`,
    reference: 'Bijbel in een jaar',
  });
}

/** The last lesson of a curated study. */
export async function announceStudyCompleted(
  userId: string,
  input: { studyId: string; title?: string | null },
): Promise<void> {
  const title = (input.title ?? '').trim();
  await announce('studie voltooid', userId, {
    sourceId: `study:${input.studyId}`,
    body: title ? `De studie ${title} afgerond.` : 'Een studie afgerond.',
    reference: title || undefined,
  });
}

/**
 * A badge. `lib/gamification.ts` `grantXp` is the only place badges are
 * awarded, and it already reports which ones are new, so this is one card per
 * genuinely new badge and none for a re-evaluation that found nothing.
 */
export async function announceBadges(userId: string, badgeIds: readonly string[]): Promise<void> {
  for (const id of badgeIds) {
    await announce(`badge ${id}`, userId, {
      sourceId: `badge:${id}`,
      // Never the id itself: "completed10" is storage, not a sentence.
      body: `Nieuwe badge verdiend: ${badgeLabel(id)}.`,
      reference: badgeLabel(id),
    });
  }
}

/**
 * A streak crossing 7, 30 or 100 days.
 *
 * `sourceId` is the milestone, not the day, so a streak that is recomputed, or
 * one that breaks and climbs back to 30, posts once. That is the honest
 * reading of "je reeks van 30 dagen": the kring was already told.
 */
export async function announceStreak(userId: string, streak: number): Promise<void> {
  if (!STREAK_MILESTONES.includes(streak)) return;
  await announce('reeks', userId, {
    sourceId: `streak:${streak}`,
    body: `${streak} dagen op rij gelezen.`,
    reference: 'Reeks',
  });
}
