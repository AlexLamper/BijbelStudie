import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/authOptions"
import connectMongoDB from "../../../../../lib/mongodb"
import StudyGroup from "../../../../../models/StudyGroup"
import GroupMessage from "../../../../../models/GroupMessage"
import User from "../../../../../models/User"
import mongoose from "mongoose"

async function getAuth(email: string) {
  const user = await User.findOne({ email }).lean() as unknown as { _id: mongoose.Types.ObjectId } | null
  return user
}

function getMemberRole(
  members: Array<{ userId: { toString(): string }; role: string }>,
  userId: string
): "leader" | "member" | null {
  const m = members.find(m => m.userId.toString() === userId)
  return m ? (m.role as "leader" | "member") : null
}

// GET — paginated discussion feed
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await getAuth(session.user.email)
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = user._id.toString()

  const group = await StudyGroup.findById(id).lean() as unknown as { members: Array<{ userId: { toString(): string }; role: string }> } | null
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const role = getMemberRole(group.members, userId)
  if (!role) return NextResponse.json({ error: "Geen toegang" }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const page      = Math.max(1, parseInt(sp.get("page")  ?? "1"))
  const limit     = Math.min(50, parseInt(sp.get("limit") ?? "20"))
  const parentId  = sp.get("parentId") || null
  const skip      = (page - 1) * limit

  const filter: Record<string, unknown> = {
    groupId:   id,
    deletedAt: null,
    parentId:  parentId ? new mongoose.Types.ObjectId(parentId) : null,
  }

  // Aggregate: count replies per top-level message
  const [messages, totalCount] = await Promise.all([
    GroupMessage.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // count replies
      {
        $lookup: {
          from: "groupmessages",
          let: { msgId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ["$parentId", "$$msgId"] },
              { $eq: ["$deletedAt", null] },
            ]}}},
            { $count: "n" },
          ],
          as: "_replies",
        },
      },
      { $addFields: { replyCount: { $ifNull: [{ $arrayElemAt: ["$_replies.n", 0] }, 0] } } },
      { $unset: "_replies" },
      // join userId
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, image: 1 } }],
          as: "_user",
        },
      },
      { $addFields: { userId: { $arrayElemAt: ["$_user", 0] } } },
      { $unset: "_user" },
    ]),
    GroupMessage.countDocuments(filter),
  ])

  return NextResponse.json({
    messages,
    pagination: { page, totalPages: Math.ceil(totalCount / limit), totalCount },
  })
}

// POST — create a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await getAuth(session.user.email)
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = user._id.toString()

  const group = await StudyGroup.findById(id).lean() as unknown as { members: Array<{ userId: { toString(): string }; role: string }> } | null
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const role = getMemberRole(group.members, userId)
  if (!role) return NextResponse.json({ error: "Geen toegang" }, { status: 403 })

  const body = await req.json()
  const { type = "bericht", content, verseRef, parentId } = body

  if (!content?.trim()) return NextResponse.json({ error: "Inhoud is verplicht" }, { status: 400 })
  if (content.length > 2000) return NextResponse.json({ error: "Maximaal 2000 tekens" }, { status: 400 })
  if (!["bericht", "gebedsverzoek", "aankondiging"].includes(type)) {
    return NextResponse.json({ error: "Ongeldig berichttype" }, { status: 400 })
  }
  if (type === "aankondiging" && role !== "leader") {
    return NextResponse.json({ error: "Alleen leiders kunnen aankondigingen plaatsen" }, { status: 403 })
  }

  const msg = await GroupMessage.create({
    groupId:  id,
    userId:   user._id,
    type,
    content:  content.trim(),
    verseRef: verseRef ?? null,
    parentId: parentId ?? null,
  })

  const populated = await GroupMessage.findById(msg._id)
    .populate("userId", "name image")
    .lean()

  return NextResponse.json({ message: { ...populated, replyCount: 0 } }, { status: 201 })
}
