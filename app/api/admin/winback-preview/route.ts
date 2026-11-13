import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/adminGuard";
import { sendWinbackPreview } from "../../../../lib/winback";

/**
 * Sends the signed-in admin ONE win-back mail - the exact mail readers get
 * after 3, 7 or 14 days away, built from the admin's own account - to the
 * admin's own address. There is no recipient parameter on purpose: this can
 * only ever mail the person who is asking.
 *
 *   GET /api/admin/winback-preview?stage=3   (3, 7 or 14; default 3)
 *
 * A GET so it works by tapping a link on a phone; admin-only and self-only.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const raw = Number(new URL(req.url).searchParams.get("stage") ?? 3);
  const stage = raw === 7 ? 7 : raw === 14 ? 14 : 3;

  const result = await sendWinbackPreview(guard.email, stage);
  if (result.status === "sent") {
    return NextResponse.json({ ok: true, sentTo: result.to, subject: result.subject, stage });
  }
  return NextResponse.json({ ok: false, reason: result.error }, { status: 500 });
}
