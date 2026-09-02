import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminGuard";
import { adminInsightsPayload } from "../../../../lib/adminInsights";

/**
 * Everything /admin/insights renders. The aggregations live in
 * lib/adminInsights, shared with /api/v1/admin/insights.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const days = new URL(req.url).searchParams.get("days");
  const { status, body } = await adminInsightsPayload(days ?? 30);
  return NextResponse.json(body, { status });
}
