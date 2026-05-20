import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../../lib/authOptions"
import connectMongoDB from "../../../../../../../lib/mongodb"
import StudyGroup from "../../../../../../../models/StudyGroup"
import GroupMessage from "../../../../../../../models/GroupMessage"
import User from "../../../../../../../models/User"

// POST — toggle a reaction emoji on a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { id, msgId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).lean() as unknown as { _id: { toString(): string } } | null
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = user._id.toString()

  const group = await StudyGroup.findById(id).lean() as unknown as { members: Array<{ userId: { toString(): string } }> } | null
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const isMember = group.members.some(m => m.userId.toString() === userId)
  if (!isMember) return NextResponse.json({ error: "Geen toegang" }, { status: 403 })

  const body = await req.json()
  const { emoji } = body
  if (!emoji || typeof emoji !== "string") {
    return NextResponse.json({ error: "Emoji is verplicht" }, { status: 400 })
  }

  const msg = await GroupMessage.findById(msgId)
  if (!msg) return NextResponse.json({ error: "Bericht niet gevonden" }, { status: 404 })
  if (msg.deletedAt) return NextResponse.json({ error: "Bericht is verwijderd" }, { status: 400 })

  // Toggle: if already reacted with same emoji, remove; otherwise add
  const existingIdx = msg.reactions.findIndex(
    (r: { userId: { toString(): string }; emoji: string }) =>
      r.userId.toString() === userId && r.emoji === emoji
  )

  if (existingIdx >= 0) {
    msg.reactions.splice(existingIdx, 1)
  } else {
    msg.reactions.push({ userId: user._id, emoji })
  }

  await msg.save()

  return NextResponse.json({ reactions: msg.reactions })
}
