/**
 * Which state a reader is in, so each one is only asked what they can know.
 *
 * A reader three days old cannot tell you whether lesson nine is well written.
 * A reader on a forty-day streak cannot tell you why the setup was confusing,
 * because they no longer remember it being confusing. The segment is resolved
 * server-side at ask time, stored on every answer (models/Feedback.js), and is
 * what makes an answer readable a year later.
 *
 * Definitions come from FEEDBACK_PLAN.md section 2.6. The ORDER of the checks
 * is the rule: cancelled beats dormant beats lapsed beats deep beats active
 * beats new, because the more specific state is always the more informative
 * one. A Pro reader who cancelled is `opgezegd`, not `verdiepend`.
 */

import type { Segment } from './feedbackPrompts';

const DAY_MS = 86_400_000;

/** Only what the decision needs, so a caller can pass a lean projection. */
export interface SegmentInput {
  createdAt?: Date | string | null;
  /** Stripe / store entitlement, already resolved (lib/mobilePremium.ts). */
  isPro?: boolean | null;
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  streak?: number | null;
  /** Completed lessons, from the StudyProgress ledger. */
  lessonsCompleted?: number | null;
  /** The newest `lastActivityAt` across this reader's enrollments. */
  lastActivityAt?: Date | string | null;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysAgo(value: Date | string | null | undefined, now: Date): number | null {
  const d = toDate(value);
  return d ? (now.getTime() - d.getTime()) / DAY_MS : null;
}

export function resolveSegment(input: SegmentInput, now: Date = new Date()): Segment {
  const cancelled =
    Boolean(input.cancelAtPeriodEnd) ||
    input.subscriptionStatus === 'canceled' ||
    input.subscriptionStatus === 'cancelled';
  if (cancelled) return 'opgezegd';

  const idleDays = daysAgo(input.lastActivityAt, now);
  if (idleDays !== null && idleDays >= 30) return 'slapend';
  if (idleDays !== null && idleDays >= 8) return 'afhakend';

  const lessons = Math.max(0, Math.floor(input.lessonsCompleted ?? 0));
  if (input.isPro && lessons >= 10) return 'verdiepend';

  const ageDays = daysAgo(input.createdAt, now);
  const isNew = (ageDays !== null && ageDays < 7) || lessons < 2;
  if (isNew) return 'nieuw';

  const streak = Math.max(0, Math.floor(input.streak ?? 0));
  if (streak >= 3 || (idleDays !== null && idleDays <= 7)) return 'actief';

  // Everything left is someone with a history who is neither recently active
  // nor idle long enough to count as lapsed. "actief" is the honest default:
  // they have used the product enough to have an opinion about it.
  return 'actief';
}

/** Buckets for the context block. An exact figure is closer to identifying. */
export function streakBucket(streak: number | null | undefined): string {
  const n = Math.max(0, Math.floor(streak ?? 0));
  if (n === 0) return '0';
  if (n < 7) return '1_6';
  if (n < 30) return '7_29';
  return '30_plus';
}

export function lessonsBucket(lessons: number | null | undefined): string {
  const n = Math.max(0, Math.floor(lessons ?? 0));
  if (n === 0) return '0';
  if (n < 5) return '1_4';
  if (n < 20) return '5_19';
  return '20_plus';
}
