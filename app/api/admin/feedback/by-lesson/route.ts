import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminGuard";
import { adminFeedbackByLesson } from "../../../../../lib/adminFeedback";

/**
 * Prompted answers per study and lesson. The "where" behind the list view -
 * which lesson is confusing people, and which lesson's quiz does not match the
 * passage it was built from.
 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const { status, body } = await adminFeedbackByLesson(url.searchParams.get("limit"));
  return NextResponse.json(body, { status });
}
