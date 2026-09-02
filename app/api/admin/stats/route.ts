import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminGuard";
import { adminStatsPayload } from "../../../../lib/adminStats";

/**
 * Numbers for /admin. The figures themselves live in lib/adminStats so the
 * mobile app's bearer-authenticated /api/v1/admin/stats reports exactly the
 * same thing; this route is the website's cookie-authenticated door to them.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { status, body } = await adminStatsPayload();
  return NextResponse.json(body, { status });
}
