import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/authOptions"
import connectMongoDB from "../../../../../lib/mongodb"
import StudyGroup from "../../../../../models/StudyGroup"
import User from "../../../../../models/User"
import Note from "../../../../../models/Note"
import BiblePlan from "../../../../../models/BiblePlan"

interface ActivityItem {
  type: "note_shared" | "day_completed" | "member_joined"
  userId: string
  userName: string
  userImage: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).lean() as unknown as { _id: { toString(): string } } | null
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = user._id.toString()

  const group = await StudyGroup.findById(id)
    .populate("members.userId", "name image")
    .lean() as unknown as {
      members: Array<{ userId: { _id: { toString(): string }; name: string; image?: string }; joinedAt: Date }>;
      planId: { toString(): string } | null;
    } | null
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const isMember = group.members.some(m => m.userId._id.toString() === userId)
  if (!isMember) return NextResponse.json({ error: "Geen toegang" }, { status: 403 })

  const days = Math.max(1, Math.min(30, parseInt(req.nextUrl.searchParams.get("days") ?? "14")))
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const memberIds = group.members.map(m => m.userId._id.toString())

  // Build user map for plan progress lookups
  const userMap = new Map(group.members.map(m => [m.userId._id.toString(), m.userId]))

  const activities: ActivityItem[] = []

  // 1. Shared notes
  const sharedNotes = await Note.find({
    groupId: id,
    createdAt: { $gte: cutoff },
  })
    .populate("userId", "name image")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean() as unknown as Array<{
      userId: { _id: { toString(): string }; name: string; image?: string };
      verseReference?: string; book?: string; chapter?: number;
      createdAt: Date;
    }>

  for (const n of sharedNotes) {
    activities.push({
      type:      "note_shared",
      userId:    n.userId._id.toString(),
      userName:  n.userId.name,
      userImage: n.userId.image ?? null,
      metadata:  { verseReference: n.verseReference, book: n.book, chapter: n.chapter },
      createdAt: n.createdAt.toISOString(),
    })
  }

  // 2. Plan day completions
  if (group.planId) {
    const plan = await BiblePlan.findById(group.planId).lean() as unknown as {
      title: string;
      progress: Array<{ userId: { toString(): string }; completedDays: number[]; lastReadDate?: Date }>;
    } | null

    if (plan?.progress) {
      for (const p of plan.progress) {
        if (!memberIds.includes(p.userId.toString())) continue
        if (!p.lastReadDate || p.lastReadDate < cutoff) continue
        const u = userMap.get(p.userId.toString())
        if (!u) continue
        activities.push({
          type:      "day_completed",
          userId:    p.userId.toString(),
          userName:  u.name,
          userImage: u.image ?? null,
          metadata:  { planTitle: plan.title, lastReadDate: p.lastReadDate.toISOString() },
          createdAt: p.lastReadDate.toISOString(),
        })
      }
    }
  }

  // 3. Recent joins
  for (const m of group.members) {
    if (!m.joinedAt || m.joinedAt < cutoff) continue
    activities.push({
      type:      "member_joined",
      userId:    m.userId._id.toString(),
      userName:  m.userId.name,
      userImage: m.userId.image ?? null,
      metadata:  {},
      createdAt: m.joinedAt.toISOString(),
    })
  }

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({ activities: activities.slice(0, 50) })
}
