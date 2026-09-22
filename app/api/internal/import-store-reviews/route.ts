import { createHash, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import connectMongoDB from "../../../../lib/mongodb";
import { importStoreReviews } from "../../../../lib/storeReviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without a configured
 * secret nothing is authorised: this route writes to the database and talks to
 * paid third-party APIs on our credentials.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return timingSafeEqual(sha256(header), sha256(`Bearer ${secret}`));
}

/**
 * Daily store-review import (vercel.json `crons`).
 *
 * Daily is not a preference: Google Play's reviews endpoint only returns the
 * last seven days, so a slower cadence loses reviews for good. Apple's feed has
 * no such window, but running both together keeps one schedule to reason about.
 *
 * Everything is an upsert keyed on (platform, reviewId). Nothing is ever
 * deleted, because an empty response from either store is a normal answer - the
 * RSS feed returns no `entry` key for a storefront with no reviews, and Play
 * returns nothing outside its seven-day window - and must never be read as
 * "these reviews are gone". Re-running the job is therefore harmless.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    if (!process.env.CRON_SECRET) {
      console.error("[internal/import-store-reviews] CRON_SECRET is not set; refusing to run");
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await connectMongoDB();
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: "Database unavailable", ranAt: new Date().toISOString() },
      { status: 503 },
    );
  }

  const summary = await importStoreReviews();

  for (const platform of summary.platforms) {
    console.log(
      `[internal/import-store-reviews] ${platform.platform} via ${platform.source}: ` +
        `fetched ${platform.fetched}, new ${platform.created}, updated ${platform.updated}, ` +
        `unchanged ${platform.skipped}${platform.note ? ` (${platform.note})` : ""}`,
    );
  }

  // 500 only when something actually failed; a platform that deliberately did
  // nothing (Android, unshipped) is a success.
  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}
