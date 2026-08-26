import { NextResponse } from "next/server";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import Note from "../../../../models/Note";
import ReadingSession from "../../../../models/ReadingSession";
import { requireAdmin } from "../../../../lib/adminGuard";

/**
 * Daily series for /admin/insights.
 *
 * The subscriber series used to bucket on `updatedAt` filtered by
 * `subscribed: true`. That is not a conversion date: `updatedAt` moves every
 * time a subscriber changes a preference or reads a chapter, so the chart
 * counted activity, not signups - and it went to zero the moment the
 * `subscribed` flag itself was wrong, which is exactly when you most need it.
 * It now buckets on `subscriptionStartedAt`, which is written from Stripe's own
 * `start_date` and never moves.
 *
 * `cancellations` is new: a conversion chart with no churn line beside it tells
 * you half the story.
 */

interface BucketDoc {
  _id: string;
  count: number;
}

function emptyDays(days: number): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return out;
}

function mergeBuckets(
  base: { date: string; count: number }[],
  buckets: BucketDoc[]
): { date: string; count: number }[] {
  const map = new Map(buckets.map((b) => [b._id, b.count]));
  return base.map((row) => ({ ...row, count: map.get(row.date) ?? 0 }));
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  await connectMongoDB();

  const url = new URL(req.url);
  const range = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30", 10) || 30, 7), 365);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (range - 1));

  const bucketOn = (field: string) => ({
    $dateToString: { format: "%Y-%m-%d", date: `$${field}` },
  });

  const [signupBuckets, noteBuckets, sessionBuckets, subscriberBuckets, cancellationBuckets] =
    await Promise.all([
      User.aggregate<BucketDoc>([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: bucketOn("createdAt"), count: { $sum: 1 } } },
      ]),
      Note.aggregate<BucketDoc>([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: bucketOn("createdAt"), count: { $sum: 1 } } },
      ]),
      ReadingSession.aggregate<BucketDoc>([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: bucketOn("createdAt"), count: { $sum: 1 } } },
      ]),
      // Every account that started a subscription in the window, whatever its
      // status is now. A subscription that started and was cancelled inside the
      // range still happened, and hiding it makes conversion look worse than it was.
      User.aggregate<BucketDoc>([
        { $match: { subscriptionStartedAt: { $gte: startDate, $ne: null } } },
        { $group: { _id: bucketOn("subscriptionStartedAt"), count: { $sum: 1 } } },
      ]),
      User.aggregate<BucketDoc>([
        {
          $match: {
            subscriptionStatus: { $in: ["canceled", "unpaid"] },
            updatedAt: { $gte: startDate },
          },
        },
        { $group: { _id: bucketOn("updatedAt"), count: { $sum: 1 } } },
      ]),
    ]);

  const base = emptyDays(range);

  return NextResponse.json({
    range,
    signups: mergeBuckets(base, signupBuckets),
    notes: mergeBuckets(base, noteBuckets),
    readingSessions: mergeBuckets(base, sessionBuckets),
    newSubscribers: mergeBuckets(base, subscriberBuckets),
    cancellations: mergeBuckets(base, cancellationBuckets),
  });
}
