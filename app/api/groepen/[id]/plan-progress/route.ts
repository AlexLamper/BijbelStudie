import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/authOptions"
import connectMongoDB from "../../../../../lib/mongodb"
import StudyGroup from "../../../../../models/StudyGroup"
import User from "../../../../../models/User"
import BiblePlan from "../../../../../models/BiblePlan"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).lean() as unknown as { _id: { toString(): string } } | null
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = user._id.toString()

  const group = await StudyGroup.findById(params.id).lean() as unknown as {
    members: Array<{ userId: { toString(): string }; role: string }>;
    planId: { toString(): string } | null;
  } | null
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const isMember = group.members.some(m => m.userId.toString() === userId)
  if (!isMember) return NextResponse.json({ error: "Geen toegang" }, { status: 403 })

  if (!group.planId) {
    return NextResponse.json({ error: "Geen leesplan gekoppeld aan deze groep" }, { status: 404 })
  }

  const memberIds = group.members.map(m => m.userId.toString())

  const [plan, memberUsers] = await Promise.all([
    BiblePlan.findById(group.planId).lean() as unknown as Promise<{
      _id: unknown; title: string; duration: number;
      readings: Array<{ day: number; book: string; chapter: number; title?: string }>;
      progress: Array<{ userId: { toString(): string }; completedDays: number[]; lastReadDate?: Date }>;
    } | null>,
    User.find({ _id: { $in: memberIds } }).select("name image").lean() as unknown as Promise<Array<{ _id: { toString(): string }; name: string; image?: string }>>,
  ])

  if (!plan) return NextResponse.json({ error: "Leesplan niet gevonden" }, { status: 404 })

  // Build per-member progress
  const memberProgress = memberUsers.map(u => {
    const uid = u._id.toString()
    const progress = plan.progress?.find(p => p.userId.toString() === uid)
    const completedDays = progress?.completedDays ?? []
    const progressPct = plan.duration > 0
      ? Math.round((completedDays.length / plan.duration) * 100)
      : 0
    return { userId: uid, name: u.name, image: u.image ?? null, completedDays, progressPct }
  })

  // Group progress = average of all members' percentages
  const groupProgressPct = memberProgress.length > 0
    ? Math.round(memberProgress.reduce((s, m) => s + m.progressPct, 0) / memberProgress.length)
    : 0

  return NextResponse.json({
    plan: {
      _id:      plan._id,
      title:    plan.title,
      duration: plan.duration,
      readings: plan.readings,
    },
    members: memberProgress,
    groupProgressPct,
  })
}
