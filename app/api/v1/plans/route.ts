import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import BiblePlan from '../../../../models/BiblePlan.js';
import PlanEnrollment from '../../../../models/PlanEnrollment.js';
import { listPlans, getPlan } from '../../../../lib/planService';
import { generateReadings, isPace } from '../../../../lib/planGenerator';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** `?type=public|my|all|enrolled` - defaults to public plans plus the caller's own. */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const { searchParams } = new URL(req.url);

    const plans = await listPlans(auth.id, {
      type: searchParams.get('type'),
      category: searchParams.get('category'),
    });

    return jsonV1({ plans });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Creates a personal plan.
 *
 * Two shapes are accepted. `readings` is the explicit one the old API took.
 * `bookNames` + `durationDays` is the one the builder UI sends: the server
 * generates the day-by-day split so the phone and the browser cannot produce
 * different plans from the same choices.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json()) ?? {};
    const { title, description, category, isPublic, autoEnrol } = body;

    let readings = Array.isArray(body.readings) ? body.readings : null;
    let duration = Number(body.duration ?? body.durationDays);
    let resolvedCategory = category;
    let warnings: string[] = [];

    if (!readings) {
      const bookNames: unknown = body.bookNames;
      if (!Array.isArray(bookNames) || bookNames.length === 0) {
        return errorV1(
          'MISSING_FIELDS',
          400,
          'Geef readings mee, of bookNames met durationDays.',
        );
      }
      if (!Number.isFinite(duration) || duration < 1) {
        return errorV1('MISSING_FIELDS', 400, 'durationDays moet minstens 1 zijn');
      }

      const generated = generateReadings({
        bookNames: bookNames.map(String),
        durationDays: duration,
      });
      if (generated.readings.length === 0) {
        return errorV1('INVALID_BOOKS', 400, 'Geen van de opgegeven boeken werd herkend');
      }

      readings = generated.readings;
      duration = generated.duration;
      resolvedCategory = category || generated.category;
      warnings = generated.warnings;
    }

    if (!title || !description || !Number.isFinite(duration) || duration < 1) {
      return errorV1('MISSING_FIELDS', 400, 'title, description en duration zijn verplicht');
    }

    await connectMongoDB();

    const plan = await BiblePlan.create({
      title,
      description,
      duration,
      category: resolvedCategory || 'overig',
      readings,
      isPublic: Boolean(auth.isAdmin && isPublic),
      createdBy: auth.id,
    });

    // A self-built plan the user never joins is dead on arrival, so the builder
    // enrols by default; the free-tier cap still applies and is not an error
    // here - the plan is created either way.
    if (autoEnrol !== false) {
      const active = await PlanEnrollment.countDocuments({ userId: auth.id, status: 'active' });
      if (auth.isPro || active === 0) {
        await PlanEnrollment.create({
          userId: auth.id,
          planId: plan._id,
          pace: isPace(body.pace) ? body.pace : 'gestaag',
          startedAt: new Date(),
        });
        await BiblePlan.updateOne({ _id: plan._id }, { $addToSet: { enrolledUsers: auth.id } });
      } else {
        warnings.push('Het plan is aangemaakt maar niet gestart: gratis accounts kunnen één actief leesplan hebben.');
      }
    }

    return jsonV1({ plan: await getPlan(auth.id, String(plan._id)), warnings }, { status: 201 });
  } catch (error) {
    return handleV1Error(error);
  }
}

/** `?id=<planId>` - creator or admin only. */
export async function DELETE(req: Request) {
  try {
    const auth = await requireUser(req);
    const planId = new URL(req.url).searchParams.get('id');
    if (!planId) return errorV1('MISSING_FIELDS', 400, 'id is required');

    await connectMongoDB();
    const plan = await BiblePlan.findById(planId);
    if (!plan) return errorV1('NOT_FOUND', 404);

    if (plan.createdBy.toString() !== auth.id && !auth.isAdmin) {
      return errorV1('FORBIDDEN', 403);
    }

    await BiblePlan.findByIdAndDelete(planId);
    await PlanEnrollment.deleteMany({ planId });

    return jsonV1({ deleted: planId });
  } catch (error) {
    return handleV1Error(error);
  }
}
