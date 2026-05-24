import { NextResponse } from "next/server";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import Note from "../../../../models/Note";
import { requireAdmin } from "../../../../lib/adminGuard";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  await connectMongoDB();

  const url = new URL(req.url);
  const search = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 1), 500);

  const filter: Record<string, unknown> = {};
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: safe, $options: "i" } }, { email: { $regex: safe, $options: "i" } }];
  }

  const users = await User.find(filter)
    .select("name email image isAdmin subscribed streak createdAt lastStreakDate stripeCustomerId preferences.onboardingCompleted")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const ids = users.map((u) => u._id);
  const noteCounts = await Note.aggregate<{ _id: unknown; count: number }>([
    { $match: { userId: { $in: ids } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  const noteMap = new Map(noteCounts.map((n) => [String(n._id), n.count]));

  return NextResponse.json({
    users: users.map((u) => ({
      _id: String(u._id),
      name: u.name,
      email: u.email,
      image: u.image,
      isAdmin: !!u.isAdmin,
      subscribed: !!u.subscribed,
      streak: u.streak || 0,
      createdAt: u.createdAt,
      lastStreakDate: u.lastStreakDate,
      hasStripe: !!u.stripeCustomerId,
      onboardingCompleted: !!u.preferences?.onboardingCompleted,
      noteCount: noteMap.get(String(u._id)) || 0,
    })),
  });
}
