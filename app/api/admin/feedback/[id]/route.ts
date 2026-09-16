import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminGuard";
import { adminFeedbackUpdate } from "../../../../../lib/adminFeedback";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Triage on one submission: any of `status`, `adminNote`, `themes`,
 * `sentiment`. Only the fields sent are written.
 */
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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const result = await adminFeedbackUpdate(id, body);
  return NextResponse.json(result.body, { status: result.status });
}
