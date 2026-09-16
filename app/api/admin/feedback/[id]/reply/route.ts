import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/adminGuard";
import { replyToFeedback } from "../../../../../../lib/feedbackReply";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * `POST /api/admin/feedback/:id/reply` `{ text, markStatus? }`
 *
 * Stores the reply on the feedback document and mails it to the author when
 * email is configured. Answers `{ ok, emailStatus }` - `skipped` means no
 * RESEND_API_KEY, `no_recipient` an anonymous submission without an address;
 * in both cases the reply is still stored and shown in "Mijn feedback".
 */
export async function POST(req: Request, { params }: RouteContext) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const result = await replyToFeedback(id, body);
  return NextResponse.json(result.body, { status: result.status });
}
