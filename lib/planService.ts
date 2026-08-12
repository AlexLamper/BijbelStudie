import connectMongoDB from './mongodb';
import BiblePlan from '../models/BiblePlan.js';
import PlanEnrollment from '../models/PlanEnrollment.js';
import StudyProgress from '../models/StudyProgress.js';
import { grantXp } from './gamification';
import { isPace, type Pace } from './planGenerator';
import { CATEGORY_LABELS, type PlanCategory } from './planCanon';
import type { ActivePlanCard, DayMode, PlanDTO, PlanDayDTO, PlanReading } from './planTypes';

export type { ActivePlanCard, DayMode, PlanDTO, PlanDayDTO } from './planTypes';

/**
 * All plan reads and writes go through here so the website's
 * `/api/bible-plans/*` and the app's `/api/v1/plans/*` cannot drift apart
 * again — they previously disagreed on whether `completedDays` was a count or
 * an array, and only one of them knew about the free-tier cap.
 */

export class PlanError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'PlanError';
  }
}

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

export function serialisePlan(
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
 * Returns the caller's enrollment, migrating it out of the plan document the
 * first time it is touched.
 *
 * Progress used to live in `BiblePlan.progress[]`. Rather than a migration
 * script against a live database, the old shape is lifted into a
 * `PlanEnrollment` on first access and left in place; the legacy array is never
 * written again, so it simply goes stale.
 */
export async function findEnrollment(userId: string, planId: string): Promise<EnrollmentDoc | null> {
  const existing = await PlanEnrollment.findOne({ userId, planId });
  if (existing) return existing as unknown as EnrollmentDoc;

  const plan = await BiblePlan.findById(planId).select('enrolledUsers progress');
  if (!plan) return null;

  const wasEnrolled = (plan.enrolledUsers ?? []).some(
    (id: { toString(): string }) => id.toString() === userId,
  );
  if (!wasEnrolled) return null;

  const legacy = (plan.progress ?? []).find(
    (p: { userId?: { toString(): string } }) => p.userId?.toString() === userId,
  );

  const migrated = await PlanEnrollment.create({
    userId,
    planId,
    startedAt: legacy?.lastReadDate ?? new Date(),
    lastActivityAt: legacy?.lastReadDate ?? new Date(),
    // Legacy progress recorded no depth, so it can only be claimed as read.
    days: (legacy?.completedDays ?? []).map((day: number) => ({
      day,
      mode: 'read' as const,
      completedAt: legacy?.lastReadDate ?? new Date(),
    })),
  });

  return migrated as unknown as EnrollmentDoc;
}

export async function listPlans(
  userId: string,
  options?: { type?: string | null; category?: string | null },
): Promise<PlanDTO[]> {
  await connectMongoDB();

  const type = options?.type;
  let query: Record<string, unknown>;

  if (type === 'public') {
    query = { isPublic: true };
  } else if (type === 'my') {
    query = { createdBy: userId };
  } else if (type === 'enrolled') {
    const ids = await PlanEnrollment.find({ userId }).distinct('planId');
    query = { _id: { $in: ids } };
  } else {
    query = { $or: [{ isPublic: true }, { createdBy: userId }] };
  }

  if (options?.category && options.category !== 'all') {
    query = { ...query, category: options.category };
  }

  const plans = await BiblePlan.find(query).populate('createdBy', 'name').sort({ createdAt: -1 }).lean();
  const enrollments = await PlanEnrollment.find({
    userId,
    planId: { $in: plans.map((p) => p._id) },
  });

  const byPlan = new Map<string, EnrollmentDoc>();
  for (const enrollment of enrollments) {
    byPlan.set(String(enrollment.planId), enrollment as unknown as EnrollmentDoc);
  }

  return plans.map((plan) =>
    serialisePlan(
      plan as Record<string, unknown>,
      byPlan.get(String(plan._id)) ?? null,
      userId,
    ),
  );
}

export async function getPlan(userId: string, planId: string): Promise<PlanDTO> {
  await connectMongoDB();

  // `models/BiblePlan.js` is untyped, so `.lean()` yields an any-shaped union.
  const plan = (await BiblePlan.findById(planId)
    .populate('createdBy', 'name')
    .lean()) as Record<string, unknown> | null;
  if (!plan) throw new PlanError('NOT_FOUND', 404, 'Leesplan niet gevonden');

  const isOwner = String((plan as { createdBy?: { _id?: unknown } }).createdBy?._id ?? '') === userId;
  if (!plan.isPublic && !isOwner) {
    // A private plan is still readable by someone already enrolled in it, which
    // is how a group's shared plan keeps working after the owner unpublishes.
    const enrolled = await PlanEnrollment.exists({ userId, planId });
    if (!enrolled) throw new PlanError('FORBIDDEN', 403, 'Geen toegang tot dit leesplan');
  }

  const enrollment = await findEnrollment(userId, planId);
  return serialisePlan(plan as Record<string, unknown>, enrollment, userId);
}

export async function enrol(
  userId: string,
  planId: string,
  options: { isPro: boolean; pace?: unknown },
): Promise<PlanDTO> {
  await connectMongoDB();

  const plan = await BiblePlan.findById(planId);
  if (!plan) throw new PlanError('NOT_FOUND', 404, 'Leesplan niet gevonden');

  const existing = await findEnrollment(userId, planId);
  if (existing && existing.status === 'active') {
    throw new PlanError('ALREADY_ENROLLED', 409, 'Je doet al mee aan dit leesplan');
  }

  if (!options.isPro) {
    const active = await PlanEnrollment.countDocuments({ userId, status: 'active' });
    if (active >= 1) {
      throw new PlanError(
        'FREE_LIMIT_REACHED',
        403,
        'Upgrade naar Pro om aan meerdere leesplannen tegelijk mee te doen.',
      );
    }
  }

  const pace: Pace = isPace(options.pace) ? options.pace : 'gestaag';

  if (existing) {
    // Restarting an abandoned or finished plan clears the old run rather than
    // leaving it half-ticked, which would make day 1 look already done.
    await PlanEnrollment.updateOne(
      { _id: existing._id },
      { $set: { status: 'active', pace, days: [], startedAt: new Date(), completedAt: null, lastActivityAt: new Date() } },
    );
  } else {
    await PlanEnrollment.create({ userId, planId, pace, startedAt: new Date() });
  }

  // Kept in sync so the legacy website routes and the group pages, which still
  // read `enrolledUsers`, do not see the user vanish.
  await BiblePlan.updateOne({ _id: planId }, { $addToSet: { enrolledUsers: userId } });

  return getPlan(userId, planId);
}

export async function unenrol(userId: string, planId: string): Promise<void> {
  await connectMongoDB();
  await PlanEnrollment.deleteOne({ userId, planId });
  await BiblePlan.updateOne(
    { _id: planId },
    { $pull: { enrolledUsers: userId, progress: { userId } } },
  );
}

export type SetDayResult = {
  plan: PlanDTO;
  xp: { awarded: number; xp: number; level: number; levelledUp: boolean; newBadges: string[] } | null;
  planCompleted: boolean;
};

/**
 * Marks (or unmarks) a plan day.
 *
 * `mode` is the whole point: a day ticked as `studied` is worth three times a
 * day ticked as `read`, and only a studied day writes a `StudyProgress` row.
 * Un-ticking never takes XP back — clawing back points for correcting a
 * mistake teaches users not to correct mistakes.
 */
export async function setDay(
  userId: string,
  planId: string,
  day: number,
  options: { completed: boolean; mode?: unknown; isPro: boolean },
): Promise<SetDayResult> {
  await connectMongoDB();

  const plan = (await BiblePlan.findById(planId).lean()) as Record<string, unknown> | null;
  if (!plan) throw new PlanError('NOT_FOUND', 404, 'Leesplan niet gevonden');

  const enrollment = await findEnrollment(userId, planId);
  if (!enrollment) throw new PlanError('NOT_ENROLLED', 400, 'Je doet niet mee aan dit leesplan');

  const readings = ((plan.readings as RawReading[]) ?? []).filter((r) => r.day === day);
  if (readings.length === 0) {
    throw new PlanError('INVALID_DAY', 400, `Dag ${day} bestaat niet in dit leesplan`);
  }

  const mode: DayMode = options.mode === 'studied' ? 'studied' : 'read';
  const already = (enrollment.days ?? []).find((d) => d.day === day);
  let xp: SetDayResult['xp'] = null;
  let planCompleted = false;

  if (options.completed) {
    if (already) {
      // Upgrading a day from read to studied is a real second act, so it earns
      // the difference; downgrading changes nothing.
      if (already.mode !== 'studied' && mode === 'studied') {
        await PlanEnrollment.updateOne(
          { _id: enrollment._id, 'days.day': day },
          { $set: { 'days.$.mode': mode, 'days.$.completedAt': new Date(), lastActivityAt: new Date() } },
        );
        const grant = await grantXp(userId, 'plan_day_studied', { isPro: options.isPro });
        xp = { ...grant, awarded: grant.awarded };
      }
    } else {
      await PlanEnrollment.updateOne(
        { _id: enrollment._id },
        {
          $push: { days: { day, mode, completedAt: new Date() } },
          $set: { lastActivityAt: new Date() },
        },
      );
      const grant = await grantXp(userId, mode === 'studied' ? 'plan_day_studied' : 'plan_day_read', {
        isPro: options.isPro,
      });
      xp = { ...grant, awarded: grant.awarded };
    }

    if (mode === 'studied') {
      // One row per reading in the day: the study signal is per passage, not
      // per plan day, so it can be counted alongside curated-study lessons.
      await StudyProgress.insertMany(
        readings.map((reading) => ({
          userId,
          source: 'plan',
          planId,
          planDay: day,
          book: reading.book,
          chapter: reading.chapter,
        })),
        { ordered: false },
      ).catch(() => undefined);
    }
  } else if (already) {
    await PlanEnrollment.updateOne(
      { _id: enrollment._id },
      { $pull: { days: { day } }, $set: { lastActivityAt: new Date(), status: 'active', completedAt: null } },
    );
    await StudyProgress.deleteMany({ userId, planId, planDay: day });
  }

  const fresh = await PlanEnrollment.findById(enrollment._id);
  const duration = (plan.duration as number) ?? 0;
  const doneCount = fresh?.days?.length ?? 0;

  if (duration > 0 && doneCount >= duration && fresh?.status !== 'completed') {
    await PlanEnrollment.updateOne(
      { _id: enrollment._id },
      { $set: { status: 'completed', completedAt: new Date() } },
    );
    const grant = await grantXp(userId, 'plan_completed', { isPro: options.isPro });
    planCompleted = true;
    xp = xp
      ? { ...grant, awarded: xp.awarded + grant.awarded, newBadges: [...xp.newBadges, ...grant.newBadges] }
      : { ...grant, awarded: grant.awarded };
  }

  return { plan: await getPlan(userId, planId), xp, planCompleted };
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
