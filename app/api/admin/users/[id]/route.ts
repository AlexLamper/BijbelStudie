import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminGuard";
import { deleteAdminUserPayload, updateAdminUserPayload } from "../../../../../lib/adminUsers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

  const result = await updateAdminUserPayload(id, body, guard.email);
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const result = await deleteAdminUserPayload(id, guard.email);
  return NextResponse.json(result.body, { status: result.status });
}
