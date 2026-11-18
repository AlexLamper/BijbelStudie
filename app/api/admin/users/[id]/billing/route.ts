import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/adminGuard";
import { accountBillingPayload } from "../../../../../../lib/adminBilling";

/**
 * GET /api/admin/users/[id]/billing - the full billing answer for one account:
 * which step it is on, what it chose, and whether Stripe actually collected
 * anything (Alex, Nov 2026: "ik wil precies kunnen zien op welke stap de
 * gebruiker zit, of er betaald is, voor welk abonnement ze hebben gekozen").
 *
 * Per account rather than in the list, because it talks to Stripe: the list
 * labels 500 accounts from their own fields, this confirms one against the
 * money.
 */
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const result = await accountBillingPayload(id);
  return NextResponse.json(result.body, { status: result.status });
}
