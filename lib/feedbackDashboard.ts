/**
 * The dashboard's one feedback slot: at most one thing at a time.
 *
 * Order, most deserved first:
 *   1. an answer from the maker the reader has not seen yet (closing the loop),
 *   2. "hoe vond je die studie?" on the visit after a study was finished,
 *   3. "welkom terug" for an enrolled reader back after 14+ quiet days.
 *
 * The decision is split the usual way: `pickDashboardTouchpoint` is pure and
 * tested; `dashboardFeedbackSlot` does the reads. On a normal visit that is two
 * indexed reads (one Feedback, one StudyEnrollment) and no write - a prompt is
 * only served, and its budget only spent, when one of the touchpoints applies.
 */

import connectMongoDB from './mongodb';
import Feedback from '../models/Feedback';
import StudyEnrollment from '../models/StudyEnrollment.js';
import { nextPrompt } from './feedbackService';
import type { SerialisedPrompt } from './feedbackPrompts';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** A reader back after this many quiet days gets the "welkom terug" question. */
export const DORMANT_DAYS = 14;
/** A finished study is asked about only within this window... */
export const STUDY_COMPLETE_MAX_AGE_DAYS = 30;
/** ...and not in the same sitting as the finish itself: "the NEXT visit". */
export const STUDY_COMPLETE_MIN_AGE_MS = HOUR_MS;

export interface EnrollmentLike {
  studyId: string;
  status?: string | null;
  completedAt?: Date | string | null;
  lastActivityAt?: Date | string | null;
}

export type DashboardTouchpoint =
  | { touchpoint: 'study_complete'; studyId: string }
  | { touchpoint: 'dormant_return'; studyId: null }
  | null;

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = (value instanceof Date ? value : new Date(value)).getTime();
  return Number.isNaN(t) ? null : t;
}

export function pickDashboardTouchpoint(enrollments: EnrollmentLike[], now: Date): DashboardTouchpoint {
  if (enrollments.length === 0) return null;
  const nowMs = now.getTime();

  const finished = enrollments
    .map((row) => ({ row, at: toTime(row.completedAt) }))
    .filter(
      (entry): entry is { row: EnrollmentLike; at: number } =>
        entry.at !== null &&
        (entry.row.status === 'completed' || entry.row.status == null) &&
        nowMs - entry.at >= STUDY_COMPLETE_MIN_AGE_MS &&
        nowMs - entry.at <= STUDY_COMPLETE_MAX_AGE_DAYS * DAY_MS,
    )
    .sort((a, b) => b.at - a.at)[0];
  if (finished) return { touchpoint: 'study_complete', studyId: finished.row.studyId };

  const lastActivity = Math.max(...enrollments.map((row) => toTime(row.lastActivityAt) ?? 0));
  if (lastActivity > 0 && nowMs - lastActivity >= DORMANT_DAYS * DAY_MS) {
    return { touchpoint: 'dormant_return', studyId: null };
  }
  return null;
}

export type UnseenReply = {
  feedbackId: string;
  subject: string;
  excerpt: string;
  status: string;
  reply: { at: string; body: string };
};

export type DashboardSlot =
  | { kind: 'reply'; reply: UnseenReply }
  | { kind: 'prompt'; prompt: SerialisedPrompt; context: { studyId: string | null } }
  | { kind: 'none' };

/** The Mongo filter for "has a reply this reader has not opened yet". */
export function unseenReplyFilter(userId: string): Record<string, unknown> {
  return {
    userId,
    lastReplyAt: { $ne: null },
    $expr: { $gt: ['$lastReplyAt', { $ifNull: ['$userSeenReplyAt', new Date(0)] }] },
  };
}

export async function dashboardFeedbackSlot(userId: string, now: Date = new Date()): Promise<DashboardSlot> {
  await connectMongoDB();

  const replied = await Feedback.findOne(unseenReplyFilter(userId))
    .sort({ lastReplyAt: -1 })
    .select('subject message status replies')
    .lean<{
      _id: unknown;
      subject?: string;
      message?: string;
      status?: string;
      replies?: { at: Date; body: string }[];
    }>();
  if (replied) {
    const last = (replied.replies ?? [])[(replied.replies ?? []).length - 1];
    if (last) {
      return {
        kind: 'reply',
        reply: {
          feedbackId: String(replied._id),
          subject: replied.subject || '',
          excerpt: (replied.message || '').slice(0, 140),
          status: replied.status || 'new',
          reply: { at: new Date(last.at).toISOString(), body: last.body },
        },
      };
    }
  }

  const enrollments = await StudyEnrollment.find({ userId })
    .select('studyId status completedAt lastActivityAt')
    .lean<EnrollmentLike[]>();
  const picked = pickDashboardTouchpoint(enrollments ?? [], now);
  if (!picked) return { kind: 'none' };

  const prompt = await nextPrompt({
    userId,
    touchpoint: picked.touchpoint,
    context: { studyId: picked.studyId },
    now,
  });
  return prompt ? { kind: 'prompt', prompt, context: { studyId: picked.studyId } } : { kind: 'none' };
}
