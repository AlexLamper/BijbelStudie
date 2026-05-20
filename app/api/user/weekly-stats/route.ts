import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/authOptions";
import connectMongoDB from "../../../../lib/mongodb";
import ReadingSession from "../../../../models/ReadingSession";
import User from "../../../../models/User";

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
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const sessions = await ReadingSession.find({
      userId: user._id,
      createdAt: { $gte: sevenDaysAgo },
    })
      .select("createdAt")
      .lean();

    const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
    const days: { label: string; count: number; date: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayKey = d.toISOString().slice(0, 10);
      const jsDay = d.getDay();
      const label = DAY_LABELS[jsDay === 0 ? 6 : jsDay - 1];
      days.push({ label, date: dayKey, count: 0 });
    }

    for (const s of sessions) {
      const sDay = (s as unknown as { createdAt: Date }).createdAt.toISOString().slice(0, 10);
      const entry = days.find(d => d.date === sDay);
      if (entry) entry.count++;
    }

    const maxCount = Math.max(...days.map(d => d.count), 1);
    const result = days.map(d => ({
      label: d.label,
      count: d.count,
      heightPct: Math.round((d.count / maxCount) * 100),
      isToday: d.date === now.toISOString().slice(0, 10),
    }));

    return NextResponse.json({ days: result, totalThisWeek: sessions.length });
  } catch (err) {
    console.error("[weekly-stats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
