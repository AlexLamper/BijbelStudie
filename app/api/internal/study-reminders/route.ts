import { type NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import StudyEnrollment from '../../../../models/StudyEnrollment.js';
import { computeNextReminderAt } from '../../../../lib/studyReminders';
import { curatedStudies } from '../../../../lib/data/curated-studies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_BATCH = 200;

/**
 * Study reminders, on a schedule.
 *
 * DRY RUN BY DEFAULT, and deliberately not wired to `vercel.json` yet: there is
 * no email or push sender in this codebase at all. Shipping the query now proves
 * the partial index on StudyEnrollment works against real data, and makes
 * attaching a sender later a small diff instead of a design exercise.
 *
 * Pass `?send=1` once a sender exists. Until then it only advances the schedule
 * when explicitly asked, so running it cannot silently skip someone's reminder.
 *
 * Access is gated exactly like app/api/internal/reconcile-subscriptions: a
 * shared secret via `Authorization: Bearer ...` or `x-cron-secret`, failing
 * closed when no secret is configured.
 */
function isAuthorized(req: NextRequest, secrets: string[]): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const header = req.headers.get('x-cron-secret') ?? '';
  return secrets.some((secret) => bearer === secret || header === secret);
}

interface DueEnrollment {
  _id: unknown;
  userId: unknown;
  studyId: string;
  rhythm: string;
  reminderDays: number[];
  remindersEnabled: boolean;
  reminderMinutes: number | null;
  reminderTimezone: string | null;
  reminderChannel: string;
  currentLessonDay: number;
  nextReminderAt: Date | null;
  reminderSentCount: number;
}

export async function GET(req: NextRequest) {
  const secrets = [process.env.STUDY_REMINDER_CRON_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => !!value,
  );

  if (secrets.length === 0) {
    console.error('[internal/study-reminders] Missing STUDY_REMINDER_CRON_SECRET/CRON_SECRET');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (!isAuthorized(req, secrets)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  // Opt IN to advancing the schedule, rather than opting out of it.
  const send = url.searchParams.get('send') === '1';
  const limit = Math.min(Number(url.searchParams.get('limit')) || DEFAULT_BATCH, 500);

  try {
    await connectMongoDB();
    const now = new Date();

    // The only query this route makes, and the reason for the partial index on
    // StudyEnrollment: rows that are paused, finished or opted out are not in
    // the index at all, so this scans who is due rather than everyone.
    const due = await StudyEnrollment.find({
      status: 'active',
      remindersEnabled: true,
      nextReminderAt: { $lte: now },
    })
      .sort({ nextReminderAt: 1 })
      .limit(limit)
      .lean<DueEnrollment[]>();

    const titles = new Map(curatedStudies.map((study) => [study.id, study.title]));
    const results: {
      studyId: string;
      studyTitle: string;
      lessonDay: number;
      channel: string;
      dueAt: Date | null;
      rescheduledTo: Date | null;
    }[] = [];

    for (const enrollment of due) {
      const user = await User.findById(enrollment.userId)
        .select('preferences.reminderMinutes preferences.reminderTimezone')
        .lean<{ preferences?: { reminderMinutes?: number; reminderTimezone?: string } }>();

      const nextAt = computeNextReminderAt(
        {
          rhythm: enrollment.rhythm as never,
          reminderDays: enrollment.reminderDays,
          remindersEnabled: enrollment.remindersEnabled,
          reminderMinutes: enrollment.reminderMinutes,
          reminderTimezone: enrollment.reminderTimezone,
        },
        {
          reminderMinutes: user?.preferences?.reminderMinutes ?? null,
          reminderTimezone: user?.preferences?.reminderTimezone ?? null,
        },
        now,
      );

      results.push({
        studyId: enrollment.studyId,
        studyTitle: titles.get(enrollment.studyId) ?? enrollment.studyId,
        lessonDay: enrollment.currentLessonDay,
        channel: enrollment.reminderChannel,
        dueAt: enrollment.nextReminderAt,
        rescheduledTo: nextAt,
      });

      if (send) {
        // TODO: hand off to an email/push sender here, then set
        // lastReminderSentAt and increment reminderSentCount on success.
        await StudyEnrollment.updateOne(
          { _id: enrollment._id },
          {
            $set: { nextReminderAt: nextAt, lastReminderSentAt: now },
            $inc: { reminderSentCount: 1 },
          },
        );
      }
    }

    console.log(
      `[internal/study-reminders] ${results.length} due, mode=${send ? 'send' : 'dry-run'}`,
    );

    // No email addresses or user ids in the response: this is an operational
    // check, and it should not become a way to enumerate the user base.
    return NextResponse.json({
      ok: true,
      mode: send ? 'send' : 'dry-run',
      due: results.length,
      reachedLimit: due.length === limit,
      results,
    });
  } catch (error) {
    console.error('[internal/study-reminders] Failed:', error);
    return NextResponse.json({ error: 'Reminder run failed' }, { status: 500 });
  }
}
