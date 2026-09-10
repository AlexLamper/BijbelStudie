import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminGuard";
import { adminFeedbackUpdateStatus } from "../../../../../lib/adminFeedback";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Sets `status` on one submission - the only triage this phase needs. */
export async function PATCH(req: Request, { params }: RouteContext) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  if (typeof body.status !== "string") {
    return NextResponse.json({ error: "status is verplicht" }, { status: 400 });
  }

  const result = await adminFeedbackUpdateStatus(id, body.status);
  return NextResponse.json(result.body, { status: result.status });
}
