import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { getActivePlanCard } from '../../../../../lib/planService';
import { suggestPlans } from '../../../../../lib/planGenerator';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * The dashboard's plan card in one call: the plan the user is actually working
 * on plus today's reading, or — when there is none — what to offer instead, so
 * the card has something to show rather than disappearing.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const activePlan = await getActivePlanCard(auth.id);

    if (activePlan) return jsonV1({ activePlan, suggestions: [] });

    await connectMongoDB();
    const user = await User.findById(auth.id).select('lastReadChapter readChapters');

    const readChapters: Record<string, number[]> = {};
    if (user?.readChapters) {
      for (const [book, chapters] of user.readChapters.entries()) {
        readChapters[book] = chapters;
      }
    }

    return jsonV1({
      activePlan: null,
      suggestions: suggestPlans({
        lastReadBook: user?.lastReadChapter?.book ?? null,
        readChapters,
        limit: 1,
      }),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
