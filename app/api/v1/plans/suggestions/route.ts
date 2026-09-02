import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import BiblePlan from '../../../../../models/BiblePlan.js';
import PlanEnrollment from '../../../../../models/PlanEnrollment.js';
import { generateReadings, isPace, suggestPlans, type Pace } from '../../../../../lib/planGenerator';
import { getPlan } from '../../../../../lib/planService';
import { readChaptersFrom } from '../../../../../lib/readChaptersCanon';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

async function readingContext(userId: string) {
  await connectMongoDB();
  // `.lean()`: a hydrated document loses `readChapters` entirely when one key
  // in it will not cast. See lib/readChaptersCanon `readChaptersFrom`.
  const user = await User.findById(userId)
    .select('lastReadChapter readChapters')
    .lean<{ lastReadChapter?: { book?: string } | null; readChapters?: unknown } | null>();
  const readChapters = readChaptersFrom(user?.readChapters);

  return { lastReadBook: user?.lastReadChapter?.book ?? null, readChapters };
}

/**
 * Plans worth starting, given what the user has been reading.
 *
 * The brief's example drives the first rule: someone whose last chapter was in
 * Job is offered a Job plan.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const paceParam = new URL(req.url).searchParams.get('pace');
    const pace: Pace = isPace(paceParam) ? paceParam : 'gestaag';

    const { lastReadBook, readChapters } = await readingContext(auth.id);
    const suggestions = suggestPlans({ lastReadBook, readChapters, pace });

    return jsonV1({ suggestions, lastReadBook, pace });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * One-tap start: turns a suggestion into a real plan and enrols the caller.
 *
 * The phone should not have to compose a create-plan payload to accept a
 * suggestion it was just handed, so the server rebuilds it from the key.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json()) ?? {};
    if (!body.key) return errorV1('MISSING_FIELDS', 400, 'key is required');

    const pace: Pace = isPace(body.pace) ? body.pace : 'gestaag';
    const { lastReadBook, readChapters } = await readingContext(auth.id);
    const suggestion = suggestPlans({ lastReadBook, readChapters, pace, limit: 12 }).find(
      (s) => s.key === body.key,
    );
    if (!suggestion) return errorV1('NOT_FOUND', 404, 'Onbekende suggestie');

    const durationDays = Number(body.durationDays ?? suggestion.recommendedDays);
    if (!Number.isFinite(durationDays) || durationDays < 1) {
      return errorV1('MISSING_FIELDS', 400, 'durationDays moet minstens 1 zijn');
    }

    const generated = generateReadings({ bookNames: suggestion.bookNames, durationDays });
    if (generated.readings.length === 0) {
      return errorV1('INVALID_BOOKS', 400, 'Deze suggestie kon niet worden omgezet in een plan');
    }

    if (!auth.isPro) {
      const active = await PlanEnrollment.countDocuments({ userId: auth.id, status: 'active' });
      if (active >= 1) {
        return errorV1(
          'FREE_LIMIT_REACHED',
          403,
          'Upgrade naar Pro om aan meerdere leesplannen tegelijk mee te doen.',
        );
      }
    }

    const plan = await BiblePlan.create({
      title: suggestion.title,
      description: suggestion.description,
      duration: generated.duration,
      category: generated.category,
      readings: generated.readings,
      isPublic: false,
      createdBy: auth.id,
    });

    await PlanEnrollment.create({
      userId: auth.id,
      planId: plan._id,
      pace,
      startedAt: new Date(),
    });
    await BiblePlan.updateOne({ _id: plan._id }, { $addToSet: { enrolledUsers: auth.id } });

    return jsonV1(
      { plan: await getPlan(auth.id, String(plan._id)), warnings: generated.warnings },
      { status: 201 },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
