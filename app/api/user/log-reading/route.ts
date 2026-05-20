import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/authOptions";
import connectMongoDB from "../../../../lib/mongodb";
import ReadingSession from "../../../../models/ReadingSession";
import User from "../../../../models/User";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Debounce: only log once per 30 minutes per user
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recent = await ReadingSession.findOne({
      userId: user._id,
      createdAt: { $gte: thirtyMinutesAgo },
    });

    if (!recent) {
      await ReadingSession.create({ userId: user._id });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[log-reading]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
