import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminGuard";
import { adminUsersPayload } from "../../../../lib/adminUsers";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const { status, body } = await adminUsersPayload({
    search: url.searchParams.get("q"),
    limit: url.searchParams.get("limit"),
  });
  return NextResponse.json(body, { status });
}
