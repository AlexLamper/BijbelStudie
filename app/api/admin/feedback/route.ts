import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminGuard";
import { adminFeedbackPayload, adminFeedbackSummary } from "../../../../lib/adminFeedback";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);

  // `?summary=1`: just the number of new items, for the /beheer card.
  if (url.searchParams.get("summary") === "1") {
    return NextResponse.json(await adminFeedbackSummary());
  }

  const { status, body } = await adminFeedbackPayload({
    status: url.searchParams.get("status"),
    category: url.searchParams.get("category"),
    touchpoint: url.searchParams.get("touchpoint"),
    limit: url.searchParams.get("limit"),
    platform: url.searchParams.get("platform"),
    rating: url.searchParams.get("rating"),
    unanswered: url.searchParams.get("unanswered"),
    q: url.searchParams.get("q"),
    cursor: url.searchParams.get("cursor"),
    id: url.searchParams.get("id"),
  });
  return NextResponse.json(body, { status });
}
