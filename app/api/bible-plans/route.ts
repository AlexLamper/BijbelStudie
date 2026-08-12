import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '../../../lib/apiAuth';
import connectMongoDB from '../../../lib/mongodb';
import BiblePlan from '../../../models/BiblePlan.js';
import PlanEnrollment from '../../../models/PlanEnrollment.js';
import { listPlans, getPlan } from '../../../lib/planService';
import { planErrorResponse, withLegacyId } from '../../../lib/planLegacy';
import { generateReadings, isPace } from '../../../lib/planGenerator';

/**
 * The website's plan API. Every handler now delegates to `lib/planService`,
 * the same module `/api/v1/plans/*` uses — the two surfaces previously
 * disagreed about what `completedDays` even was (a count here, an array there)
 * and only the mobile one enforced the free-tier cap.
 */
function fail(error: unknown) {
  return planErrorResponse(error, 'api/bible-plans');
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    const { searchParams } = new URL(request.url);

    const plans = await listPlans(auth.id, {
      type: searchParams.get('type'),
      category: searchParams.get('category'),
    });

    return NextResponse.json({ plans: plans.map(withLegacyId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    const body = await request.json();
    const { title, description, category, isPublic, autoEnrol } = body ?? {};

    let readings = Array.isArray(body?.readings) ? body.readings : null;
    let duration = Number(body?.duration ?? body?.durationDays);
    let resolvedCategory = category;
    const warnings: string[] = [];

    if (!readings) {
      const bookNames = body?.bookNames;
      if (!Array.isArray(bookNames) || bookNames.length === 0 || !Number.isFinite(duration)) {
        return NextResponse.json(
          { error: 'Geef readings mee, of bookNames met durationDays.' },
          { status: 400 },
        );
      }

      const generated = generateReadings({ bookNames: bookNames.map(String), durationDays: duration });
      if (generated.readings.length === 0) {
        return NextResponse.json({ error: 'Geen van de opgegeven boeken werd herkend' }, { status: 400 });
      }

      readings = generated.readings;
      duration = generated.duration;
      resolvedCategory = category || generated.category;
      warnings.push(...generated.warnings);
    }

    if (!title || !description || !Number.isFinite(duration) || duration < 1) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    if (autoEnrol !== false) {
      const active = await PlanEnrollment.countDocuments({ userId: auth.id, status: 'active' });
      if (auth.isPro || active === 0) {
        await PlanEnrollment.create({
          userId: auth.id,
          planId: plan._id,
          pace: isPace(body?.pace) ? body.pace : 'gestaag',
          startedAt: new Date(),
        });
        await BiblePlan.updateOne({ _id: plan._id }, { $addToSet: { enrolledUsers: auth.id } });
      } else {
        warnings.push(
          'Het plan is aangemaakt maar niet gestart: gratis accounts kunnen één actief leesplan hebben.',
        );
      }
    }

    const dto = await getPlan(auth.id, String(plan._id));
    return NextResponse.json({ plan: withLegacyId(dto), warnings }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    const planId = new URL(request.url).searchParams.get('id');
    if (!planId) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

    await connectMongoDB();
    const plan = await BiblePlan.findById(planId);
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    if (plan.createdBy.toString() !== auth.id && !auth.isAdmin) {
      return NextResponse.json({ error: 'Not authorized to delete this plan' }, { status: 403 });
    }

    await BiblePlan.findByIdAndDelete(planId);
    await PlanEnrollment.deleteMany({ planId });

    return NextResponse.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    return fail(error);
  }
}
