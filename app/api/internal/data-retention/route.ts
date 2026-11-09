import { createHash, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import connectMongoDB from "../../../../lib/mongodb";
import {
  anonymiseExpiredFeedback,
  purgeExpiredDeletedAccounts,
} from "../../../../lib/dataRetention";
import { flushDueContactAlerts, purgeStaleContactBooks } from "../../../../lib/friends/contactAlerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without a configured
 * secret nothing is authorised: this route deletes data.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return timingSafeEqual(sha256(header), sha256(`Bearer ${secret}`));
}

/**
 * Daily retention job (vercel.json `crons`). Makes the bewaartermijnen on
 * /privacybeleid and /account-verwijderen true without anyone remembering to
 * run a script:
 *  - `deletedaccounts` rows older than 90 days are deleted (admin copies kept);
 *  - feedback older than 2 years is anonymised;
 *  - a hashed address book kept for contact alerts that the app has not
 *    refreshed for 180 days is deleted (lib/friends/contactAlerts.ts).
 * All steps are idempotent, so a retry or a manual call is harmless.
 *
 * It also sends the grouped contact alerts that waited out their one-a-day
 * window, because this is the one job that runs daily anyway: otherwise a
 * contact who joined an hour after the last alert would wait for somebody else
 * to join before anyone was told.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    if (!process.env.CRON_SECRET) {
      console.error("[internal/data-retention] CRON_SECRET is not set; refusing to run");
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const errors: { step: string; error: string }[] = [];
  const fail = (step: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[internal/data-retention] ${step} failed:`, message);
    errors.push({ step, error: message });
  };

  await connectMongoDB();

  let deletedAccounts = null;
  try {
    deletedAccounts = await purgeExpiredDeletedAccounts({ now });
    console.log(
      `[internal/data-retention] deletedaccounts: purged ${deletedAccounts.purged}/${deletedAccounts.expired} older than ${deletedAccounts.cutoff}` +
        ` (kept ${deletedAccounts.keptProtected} admin); userIds=${deletedAccounts.purgedUserIds.join(",") || "-"}`,
    );
  } catch (error) {
    fail("deletedAccounts", error);
  }

  let feedback = null;
  try {
    feedback = await anonymiseExpiredFeedback({ now });
    console.log(
      `[internal/data-retention] feedback: anonymised ${feedback.anonymised} older than ${feedback.cutoff}`,
    );
  } catch (error) {
    fail("feedback", error);
  }

  let contactBooks = null;
  try {
    contactBooks = await purgeStaleContactBooks(now);
    console.log(
      `[internal/data-retention] friendcontactbooks: deleted ${contactBooks.deleted} not refreshed since ${contactBooks.cutoff}`,
    );
  } catch (error) {
    fail("contactBooks", error);
  }

  let contactAlerts = null;
  try {
    contactAlerts = await flushDueContactAlerts(now);
    console.log(
      `[internal/data-retention] contact alerts: ${contactAlerts.sent} sent of ${contactAlerts.checked} due`,
    );
  } catch (error) {
    fail("contactAlerts", error);
  }

  return NextResponse.json(
    {
      ok: errors.length === 0,
      deletedAccounts,
      feedback,
      contactBooks,
      contactAlerts,
      errors,
      checkedAt: now.toISOString(),
    },
    { status: errors.length === 0 ? 200 : 500 },
  );
}
