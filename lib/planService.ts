import connectMongoDB from './mongodb';
import BiblePlan from '../models/BiblePlan.js';
import PlanEnrollment from '../models/PlanEnrollment.js';
import type { Pace } from './planGenerator';
import { CATEGORY_LABELS, type PlanCategory } from './planCanon';
import type { ActivePlanCard, DayMode, PlanDTO, PlanDayDTO, PlanReading } from './planTypes';

/**
 * Plan reads for `/api/v1/dashboard` go through here, so no caller can drift
 * apart again - separate copies previously disagreed on whether
 * `completedDays` was a count or an array.
 */

type RawReading = PlanReading;
type RawDay = { day: number; mode: DayMode; completedAt: Date };

type EnrollmentDoc = {
  _id: unknown;
  planId: unknown;
  pace: Pace;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt: Date | null;
  days: RawDay[];
  lastActivityAt: Date;
};

function groupDays(readings: RawReading[], duration: number): Omit<PlanDayDTO, 'completed' | 'mode' | 'completedAt'>[] {
  const byDay = new Map<number, { title: string | null; readings: { book: string; chapter: number }[] }>();
  for (const reading of readings) {
    const entry = byDay.get(reading.day) ?? { title: null, readings: [] };
    entry.readings.push({ book: reading.book, chapter: reading.chapter });
    if (reading.title && !entry.title) entry.title = reading.title;
    byDay.set(reading.day, entry);
  }

  const highest = Math.max(duration, ...(readings.length ? readings.map((r) => r.day) : [0]));
  const days: Omit<PlanDayDTO, 'completed' | 'mode' | 'completedAt'>[] = [];
  for (let day = 1; day <= highest; day++) {
    const entry = byDay.get(day);
    if (!entry) continue;
    days.push({ day, title: entry.title, readings: entry.readings });
  }
  return days;
}

function daysSince(start: Date): number {
  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  };
  return Math.floor((startOfDay(new Date()) - startOfDay(start)) / 86400000);
}

function serialisePlan(
  plan: Record<string, unknown>,
  enrollment: EnrollmentDoc | null,
  userId: string,
): PlanDTO {
  const readings = ((plan.readings as RawReading[]) ?? []).slice().sort((a, b) => a.day - b.day);
  const duration = (plan.duration as number) ?? 0;

  const done = new Map<number, RawDay>();
  for (const entry of enrollment?.days ?? []) done.set(entry.day, entry);

  const skeleton = groupDays(readings, duration);
  const days: PlanDayDTO[] = skeleton.map((day) => {
    const entry = done.get(day.day);
    return {
      ...day,
      completed: Boolean(entry),
      mode: entry?.mode ?? null,
      completedAt: entry?.completedAt ?? null,
    };
  });

  const completedDays = [...done.keys()].sort((a, b) => a - b);
  const studiedDays = [...done.values()]
    .filter((d) => d.mode === 'studied')
    .map((d) => d.day)
    .sort((a, b) => a - b);

  const currentDay = days.find((d) => !d.completed)?.day ?? null;
  const createdBy = plan.createdBy as { _id?: { toString(): string }; name?: string } | undefined;
  const category = ((plan.category as string) ?? 'overig') as PlanCategory;

  return {
    id: String((plan._id as { toString(): string }).toString()),
    title: (plan.title as string) ?? '',
    description: (plan.description as string) ?? '',
    duration,
    category,
    categoryLabel: CATEGORY_LABELS[category] ?? category,
    isPublic: Boolean(plan.isPublic),
    author: createdBy?.name ?? null,
    isOwner: createdBy?._id?.toString() === userId || String(createdBy ?? '') === userId,
    createdAt: plan.createdAt as Date,
    readings,
    days,
    isEnrolled: Boolean(enrollment),
    pace: enrollment?.pace ?? null,
    status: enrollment?.status ?? null,
    startedAt: enrollment?.startedAt ?? null,
    completedDays,
    studiedDays,
    progressPercentage: duration > 0 ? Math.round((completedDays.length / duration) * 100) : 0,
    currentDay,
    scheduledDay: enrollment
      ? Math.min(duration || 1, Math.max(1, daysSince(enrollment.startedAt) + 1))
      : null,
  };
}

/**
 * The dashboard's plan card.
 *
 * The old query took the enrolled plan with the *highest* completion, so a
 * plan sitting at 97% permanently outranked the one the user actually started
 * this morning. Most recent activity is the honest signal.
 */
export async function getActivePlanCard(userId: string): Promise<ActivePlanCard | null> {
  await connectMongoDB();

  const enrollment = await PlanEnrollment.findOne({ userId, status: 'active' }).sort({
    lastActivityAt: -1,
  });
  if (!enrollment) return null;

  const plan = (await BiblePlan.findById(enrollment.planId).lean()) as Record<string, unknown> | null;
  if (!plan) return null;

  const dto = serialisePlan(
    plan,
    enrollment as unknown as EnrollmentDoc,
    userId,
  );
  const today = dto.days.find((d) => d.day === dto.currentDay);

  return {
    id: dto.id,
    title: dto.title,
    duration: dto.duration,
    completedDays: dto.completedDays.length,
    progressPercentage: dto.progressPercentage,
    currentDay: dto.currentDay,
    scheduledDay: dto.scheduledDay,
    today: today
      ? today.readings.map((r) => ({ book: r.book, chapter: r.chapter, title: today.title }))
      : [],
  };
}
