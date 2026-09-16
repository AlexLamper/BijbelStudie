import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { dashboardFeedbackSlot } from '../../../../../lib/feedbackDashboard';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * `GET /api/v1/feedback/dashboard` - what the dashboard's feedback slot shows.
 *
 * `{ kind: "reply", reply }` | `{ kind: "prompt", prompt, context }` | `{ kind: "none" }`.
 *
 * Serving a prompt spends its budget (see `nextPrompt`), so call this once per
 * dashboard mount, never speculatively.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const slot = await dashboardFeedbackSlot(auth.id);
    return jsonV1(slot, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleV1Error(error);
  }
}
