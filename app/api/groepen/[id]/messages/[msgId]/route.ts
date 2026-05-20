import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/authOptions"
import connectMongoDB from "../../../../../../lib/mongodb"
import StudyGroup from "../../../../../../models/StudyGroup"
import GroupMessage from "../../../../../../models/GroupMessage"
import User from "../../../../../../models/User"

// DELETE — soft-delete a message (own message or leader)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; msgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).lean() as unknown as { _id: { toString(): string } } | null
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = user._id.toString()

  const [group, msg] = await Promise.all([
    StudyGroup.findById(params.id).lean() as unknown as Promise<{ members: Array<{ userId: { toString(): string }; role: string }> } | null>,
    GroupMessage.findById(params.msgId).lean() as unknown as Promise<{ userId: { toString(): string }; deletedAt: Date | null } | null>,
  ])

  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })
  if (!msg)   return NextResponse.json({ error: "Bericht niet gevonden" }, { status: 404 })
  if (msg.deletedAt) return NextResponse.json({ error: "Al verwijderd" }, { status: 400 })

  const member = group.members.find(m => m.userId.toString() === userId)
  if (!member) return NextResponse.json({ error: "Geen toegang" }, { status: 403 })

  const isOwner = msg.userId.toString() === userId
  const isLeader = member.role === "leader"

  if (!isOwner && !isLeader) {
    return NextResponse.json({ error: "Geen toestemming om dit bericht te verwijderen" }, { status: 403 })
  }

  await GroupMessage.findByIdAndUpdate(params.msgId, { $set: { deletedAt: new Date() } })

  return NextResponse.json({ message: "Bericht verwijderd" })
}
