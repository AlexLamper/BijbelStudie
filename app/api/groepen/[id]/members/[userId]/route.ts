import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/authOptions"
import connectMongoDB from "../../../../../../lib/mongodb"
import StudyGroup from "../../../../../../models/StudyGroup"
import User from "../../../../../../models/User"

// PATCH — promote or demote a member (leader only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const caller = await User.findOne({ email: session.user.email }).lean() as unknown as { _id: { toString(): string } } | null
  if (!caller) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const callerId = caller._id.toString()

  const group = await StudyGroup.findById(id).lean() as unknown as {
    members: Array<{ userId: { toString(): string }; role: string }>;
  } | null
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const callerMember = group.members.find(m => m.userId.toString() === callerId)
  if (!callerMember || callerMember.role !== "leader") {
    return NextResponse.json({ error: "Alleen groepsleiders kunnen rollen aanpassen" }, { status: 403 })
  }

  const body = await req.json()
  const { role } = body
  if (!["leader", "member"].includes(role)) {
    return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 })
  }

  // Prevent demoting self if only leader
  if (userId === callerId && role === "member") {
    const leaderCount = group.members.filter(m => m.role === "leader").length
    if (leaderCount <= 1) {
      return NextResponse.json({ error: "U kunt uzelf niet degraderen als enige leider" }, { status: 400 })
    }
  }

  await StudyGroup.updateOne(
    { _id: id, "members.userId": userId },
    { $set: { "members.$.role": role } }
  )

  return NextResponse.json({ message: "Rol bijgewerkt" })
}

// DELETE — remove a member (leader only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const caller = await User.findOne({ email: session.user.email }).lean() as unknown as { _id: { toString(): string } } | null
  if (!caller) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const callerId = caller._id.toString()

  const group = await StudyGroup.findById(id).lean() as unknown as {
    members: Array<{ userId: { toString(): string }; role: string }>;
  } | null
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const callerMember = group.members.find(m => m.userId.toString() === callerId)
  if (!callerMember || callerMember.role !== "leader") {
    return NextResponse.json({ error: "Alleen groepsleiders kunnen leden verwijderen" }, { status: 403 })
  }

  if (userId === callerId) {
    return NextResponse.json({ error: "Gebruik 'Groep verlaten' om uzelf te verwijderen" }, { status: 400 })
  }

  await StudyGroup.updateOne(
    { _id: id },
    { $pull: { members: { userId: userId } } }
  )

  return NextResponse.json({ message: "Lid verwijderd" })
}
