import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/authOptions";
import connectMongoDB from "../../../../lib/mongodb";
import ReadingSession from "../../../../models/ReadingSession";
import User from "../../../../models/User";
import { dayKey, frozenDays, lastSevenDays, weekWindowStart } from "../../../../lib/streak";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const now = new Date();

    const sessions = await ReadingSession.find({
      userId: user._id,
      createdAt: { $gte: weekWindowStart(now) },
    })
      .select("createdAt")
      .lean();

    // Days and buckets are Dutch calendar days, the same ones the streak
    // counts (lib/streak). Keyed in UTC, as this route used to be, a read
    // after midnight local landed on the previous day and the strip showed a
    // gap on a day the streak had already credited.
    const strip = lastSevenDays(now);
    const counts = new Map(strip.map(d => [d.key, 0]));
    for (const s of sessions) {
      const key = dayKey((s as unknown as { createdAt: Date }).createdAt);
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // The days a freeze covered. They are not gaps, and the strip must not
    // draw them as one.
    const frozen = frozenDays(
      {
        streak: user.streak,
        freezeCount: user.freezeCount,
        freezesUsedInRun: user.freezesUsedInRun,
        freezeDays: user.freezeDays,
        lastStreakDate: user.lastStreakDate,
      },
      { now }
    );

    const maxCount = Math.max(...counts.values(), 1);
    const result = strip.map(d => {
      const count = counts.get(d.key) ?? 0;
      return {
        label: d.label,
        count,
        heightPct: Math.round((count / maxCount) * 100),
        isToday: d.isToday,
        frozen: count === 0 && frozen.has(d.key),
      };
    });

    return NextResponse.json({
      days: result,
      totalThisWeek: result.reduce((n, d) => n + d.count, 0),
    });
  } catch (err) {
    console.error("[weekly-stats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
