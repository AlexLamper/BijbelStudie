import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminGuard";
import { adminFeedbackPayload } from "../../../../lib/adminFeedback";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const { status, body } = await adminFeedbackPayload({
    status: url.searchParams.get("status"),
    category: url.searchParams.get("category"),
    touchpoint: url.searchParams.get("touchpoint"),
    limit: url.searchParams.get("limit"),
  });
  return NextResponse.json(body, { status });
}
