import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { getPlan } from '../../../../../lib/planService';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Plan detail, including the caller's own day-by-day progress.
 *
 * Listed as required in IOS_APP_BRIEF.md but never built, which is why the app
 * had to fetch the whole plan list to render one plan.
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const { id } = await context.params;
    return jsonV1({ plan: await getPlan(auth.id, id) });
  } catch (error) {
    return handleV1Error(error);
  }
}
