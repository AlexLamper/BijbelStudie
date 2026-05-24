import { NextResponse } from "next/server";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import Note from "../../../../models/Note";
import ReadingSession from "../../../../models/ReadingSession";
import StudyGroup from "../../../../models/StudyGroup";
import BiblePlan from "../../../../models/BiblePlan";
import { requireAdmin } from "../../../../lib/adminGuard";

const PRICE_EUR = 9.99;

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  await connectMongoDB();

  const now = new Date();
  const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    premiumUsers,
    adminUsers,
    usersLast24h,
    usersLast7d,
    usersLast30d,
    totalNotes,
    notesLast7d,
    totalReadingSessions,
    sessionsLast7d,
    totalGroups,
    totalPlans,
    activeStreakUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ subscribed: true }),
    User.countDocuments({ isAdmin: true }),
    User.countDocuments({ createdAt: { $gte: start24h } }),
    User.countDocuments({ createdAt: { $gte: start7d } }),
    User.countDocuments({ createdAt: { $gte: start30d } }),
    Note.countDocuments(),
    Note.countDocuments({ createdAt: { $gte: start7d } }),
    ReadingSession.countDocuments(),
    ReadingSession.countDocuments({ createdAt: { $gte: start7d } }),
    StudyGroup.countDocuments(),
    BiblePlan.countDocuments(),
    User.countDocuments({ streak: { $gte: 1 }, lastStreakDate: { $gte: start7d } }),
  ]);

  const mrrEur = premiumUsers * PRICE_EUR;

  return NextResponse.json({
    users: {
      total: totalUsers,
      premium: premiumUsers,
      admins: adminUsers,
      newLast24h: usersLast24h,
      newLast7d: usersLast7d,
      newLast30d: usersLast30d,
      activeStreak: activeStreakUsers,
      premiumPercent: totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 1000) / 10 : 0,
    },
    revenue: {
      mrrEur: Math.round(mrrEur * 100) / 100,
      priceEur: PRICE_EUR,
    },
    content: {
      notes: totalNotes,
      notesLast7d,
      readingSessions: totalReadingSessions,
      sessionsLast7d,
      groups: totalGroups,
      plans: totalPlans,
    },
  });
}
